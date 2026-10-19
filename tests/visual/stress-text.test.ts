import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FixtureSchema, type Fixture } from '../../src/shared/fixture.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { stressFixture } from '../../src/client/visual-test/stress-text.ts';

const DIR = 'src/sim/fixtures';
const fixtures = readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => [f, FixtureSchema.parse(JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))] as [string, Fixture]);
const { displayNameChars, paperNameChars, headlineChars, bubbleChars } = TUNING.limits;

function texts(fixture: Fixture) {
  const names = [...fixture.room.seats.flatMap((s) => [s.displayName, s.paperName]),
    ...fixture.frames.flatMap((f) => f.public.papers.flatMap((p) => [p.displayName, p.paperName]))];
  const headlines = fixture.frames.flatMap((f) => [...f.public.headlines.map((h) => h.text), f.private.lockedHeadline?.text]);
  const bubbles = fixture.frames.flatMap((f) => f.public.reactionPlan?.citizens.map((c) => c.bubble) ?? []);
  return { names, headlines, bubbles };
}
const shape = (fixture: Fixture) => fixture.frames.map((f) => ({
  atMs: f.atMs, phase: f.public.phase, round: f.public.round,
  papers: f.public.papers.map((p) => [p.seatId, p.color, p.readers, p.totalReaders, p.score, p.trust]),
  headlines: f.public.headlines.map((h) => [h.id, h.seatId, h.round, h.exposed]),
  citizens: f.public.reactionPlan?.citizens.map((c) => c.citizenId) ?? [],
}));

describe.each(fixtures)('stressFixture on %s', (_name, fixture) => {
  const before = JSON.stringify(fixture);
  const stressed = stressFixture(fixture);

  it('leaves the input fixture unchanged and returns a valid fixture', () => {
    expect(JSON.stringify(fixture)).toBe(before);
    expect(stressed).not.toBe(fixture);
    expect(() => FixtureSchema.parse(stressed)).not.toThrow();
  });

  it('fills names, headlines and bubbles to the schema limits', () => {
    const { names, headlines, bubbles } = texts(stressed);
    const room = stressed.room.seats;
    for (const seat of room) {
      if (seat.displayName !== null) expect(seat.displayName).toHaveLength(displayNameChars);
      if (seat.paperName !== null) expect(seat.paperName).toHaveLength(paperNameChars);
    }
    for (const paper of stressed.frames.flatMap((f) => f.public.papers)) {
      expect(paper.displayName).toHaveLength(displayNameChars);
      expect(paper.paperName).toHaveLength(paperNameChars);
    }
    for (const text of headlines) if (text !== undefined) expect(text).toHaveLength(headlineChars);
    for (const bubble of bubbles) if (bubble !== null) expect(bubble).toHaveLength(bubbleChars);
    const all = [...names, ...headlines].filter((t): t is string => typeof t === 'string');
    expect(all.some((t) => t.includes(' '))).toBe(true);
    expect(all.some((t) => !t.includes(' '))).toBe(true);
  });

  it('keeps ids, numbers and relationships', () => {
    expect(shape(stressed)).toEqual(shape(fixture));
  });

  it('gives each seat and headline the same text everywhere', () => {
    const bySeat = new Map<number, string>();
    for (const paper of stressed.frames.flatMap((f) => f.public.papers)) {
      const key = `${paper.displayName}|${paper.paperName}`;
      expect(bySeat.get(paper.seatId) ?? key).toBe(key);
      bySeat.set(paper.seatId, key);
    }
    for (const seat of stressed.room.seats) {
      if (seat.paperName !== null) expect(bySeat.get(seat.seatId)).toBe(`${seat.displayName}|${seat.paperName}`);
    }
    const byId = new Map<string, string>();
    for (const h of stressed.frames.flatMap((f) => f.public.headlines)) {
      expect(byId.get(h.id) ?? h.text).toBe(h.text);
      byId.set(h.id, h.text);
    }
  });
});
