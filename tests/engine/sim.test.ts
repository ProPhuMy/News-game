import { describe, expect, it } from 'vitest';
import { publicView, type MatchState } from '../../src/engine/index.ts';
import { PublicSnapshotSchema } from '../../src/shared/snapshots.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { runMatch } from '../../src/sim/runner.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { HONEST, LIAR, MIXED } from '../../src/sim/strategies.ts';

describe('runMatch', () => {
  it('plays a full match with every strategy and a bot', () => {
    const frames: MatchState[] = [];
    const end = runMatch({ seed: 3, content: SAMPLE_CONTENT, lineup: [HONEST, LIAR, MIXED, null], onFrame: (s) => frames.push(s) });
    expect(end.phase).toBe('ended');
    for (const seat of end.seats) expect(seat.readers).toHaveLength(TUNING.rounds);
    for (const f of frames) PublicSnapshotSchema.parse(publicView(f));
    expect(end.headlines.filter((h) => h.seatId === 0).every((h) => h.isTrue)).toBe(true);
    expect(end.headlines.filter((h) => h.seatId === 1).every((h) => !h.isTrue)).toBe(true);
  });

  it('is deterministic per seed', () => {
    const a = runMatch({ seed: 5, content: SAMPLE_CONTENT, lineup: [MIXED, null, null, null] });
    const b = runMatch({ seed: 5, content: SAMPLE_CONTENT, lineup: [MIXED, null, null, null] });
    expect(publicView(a)).toEqual(publicView(b));
  });

  it('waits thinkMs before humans act', () => {
    const times: number[] = [];
    runMatch({ seed: 1, content: SAMPLE_CONTENT, lineup: [HONEST, null, null, null], thinkMs: 4_000, onFrame: (_s, now) => times.push(now) });
    expect(times).toContain(4_000);
  });
});
