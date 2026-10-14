import { describe, expect, it } from 'vitest';
import { applyCommand, privateView, publicView, tick, type MatchState } from '../../src/engine/index.ts';
import type { MatchCommand } from '../../src/shared/protocol.ts';
import { duoMatch } from './helpers.ts';

/** Both humans: skip intro, hunt the latest rival headline from round 2 else check their tip, expose with proof else print the tip claim. */
function turn(s: MatchState, seatId: number, now: number): MatchState {
  const seat = s.seats[seatId]!;
  if (seat.acted || seat.controller !== 'human' || !['intro', 'investigate', 'write'].includes(s.phase)) return s;
  const meta = { actionId: `${s.round}${s.phase}${seatId}`, round: s.round, phase: s.phase };
  const tip = seat.tip;
  const rival = publicView(s).headlines.filter((h) => h.seatId !== seatId && !h.exposed).at(-1);
  const proof = privateView(s, seatId).proofs[0];
  let cmd: MatchCommand;
  if (s.phase === 'intro' || !tip) cmd = { type: 'skipIntro', ...meta };
  else if (s.phase === 'investigate') cmd = rival
    ? { type: 'investigate', ...meta, target: { kind: 'headline', headlineId: rival.id } }
    : { type: 'investigate', ...meta, target: { kind: 'location', location: tip.location } };
  else cmd = proof
    ? { type: 'lockHeadline', ...meta, story: { kind: 'expose', headlineId: proof.headlineId }, text: 'Exposed!' }
    : { type: 'lockHeadline', ...meta, story: { kind: 'claim', location: tip.location, claim: tip.claim, attachEvidence: false }, text: 'Scoop' };
  return applyCommand(s, seatId, cmd, now).state;
}

function play(seed: number, order: readonly number[]): MatchState {
  let s = duoMatch(seed);
  while (s.phase !== 'ended') {
    const now = s.deadlineMs - 1_000;
    for (const seatId of order) s = turn(s, seatId, now);
    const next = tick(s, now).state;
    s = next.version === s.version ? tick(s, s.deadlineMs).state : next;
  }
  return s;
}

describe('determinism', () => {
  it('replays identically for the same seed and inputs', () => {
    for (const seed of [1, 2, 3]) expect(play(seed, [0, 1])).toEqual(play(seed, [0, 1]));
  });

  it('gives the same outcome whatever order commands arrive in', () => {
    for (const seed of [4, 5, 6, 7]) {
      const a = play(seed, [0, 1]);
      const b = play(seed, [1, 0]);
      expect(publicView(b)).toEqual(publicView(a));
      expect(privateView(b, 0)).toEqual(privateView(a, 0));
      expect(privateView(b, 1)).toEqual(privateView(a, 1));
    }
  });
});
