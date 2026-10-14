import { describe, expect, it, vi } from 'vitest';
import { createHeadlineRater } from '../../src/server/ratings.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { createMatchRunner } from '../../src/server/matches.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS, LOCATIONS, EVENT_CLAIMS, PULLED_TEXT } from '../../src/shared/ids.ts';
import { publicView } from '../../src/engine/index.ts';
import type { Rating } from '../../src/shared/ai.ts';
import { createAiAdapter } from '../../src/ai/adapter.ts';
import { fallbackRating } from '../../src/engine/rating.ts';

const ratingSetup = (investigate = false) => {
  const rooms = createRoomManager();
  const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
  const session = rooms.create(profile, 'a', 'ip', 0);
  rooms.join(session.code, { ...profile, color: COLORS[1] }, 'b', 0);
  const room = rooms.require(session.code);
  let resolveRating: (rating: Rating) => void = () => {};
  let calls = 0;
  const runner = createMatchRunner(rooms, SAMPLE_CONTENT, () => {}, {
    rateHeadline: (input) => {
      if (input.text !== 'Bakery danger!') return Promise.resolve(input.fallbackRating ?? rated);
      calls++; return new Promise((resolve) => { resolveRating = resolve; });
    },
    writeBotHeadline: async ({ personality }) => `AI ${personality} headline`,
  });
  runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
  for (const seat of [0, 1]) runner.handle(room, seat, { type: 'skipIntro', actionId: `intro-${seat}`, round: 0, phase: 'intro' }, 1);
  for (const seat of [0, 1]) {
    if (seat === 0 && investigate) runner.handle(room, seat, { type: 'investigate', actionId: 'check', round: 1,
      phase: 'investigate', target: { kind: 'location', location: room.state!.seats[0]!.tip!.location } }, 2);
    else runner.handle(room, seat, { type: 'skipInvestigate', actionId: `investigate-${seat}`, round: 1, phase: 'investigate' }, 2);
  }
  return { runner, room, rooms, resolve: (rating: Rating) => resolveRating(rating), calls: () => calls };
};
const lock = { type: 'lockHeadline' as const, actionId: 'lock', round: 1, phase: 'write' as const,
  text: 'Bakery danger!', story: { kind: 'claim' as const, location: LOCATIONS[0], claim: EVENT_CLAIMS[0], attachEvidence: false } };
const rated = { juiciness: 5, onTopic: true, inappropriate: false, bubbles: ['Run!', 'Stay away!'] };

describe('asynchronous rating lifecycle', () => {
  it('writes bot text and preserves each engine-owned personality fallback', async () => {
    const rooms = createRoomManager();
    const session = rooms.create({ displayName: 'Editor', paperName: 'Daily', color: COLORS[0] }, 'a', 'ip', 0);
    const room = rooms.require(session.code);
    const adapter = createAiAdapter({ provider: 'none', content: SAMPLE_CONTENT });
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, () => {}, {
      ...adapter, writeBotHeadline: async ({ personality }) => `AI ${personality} headline`,
    });
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    runner.handle(room, 0, { type: 'skipIntro', actionId: 'intro', round: 0, phase: 'intro' }, 1);
    runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'investigate', round: 1, phase: 'investigate' }, 2);
    await vi.waitFor(() => {
      expect(room.state!.headlines.filter((headline) => headline.botAuthored)).toHaveLength(3);
      for (const headline of room.state!.headlines) {
        expect(headline.rating).toEqual(fallbackRating(room.state!, headline));
        expect(headline.text).toBe(`AI ${headline.authorPersonality} headline`);
      }
    });
    expect(room.state!.headlines.find((headline) => headline.authorPersonality === 'gazette')!.rating!.juiciness).toBe(2);
  });

  it('processes a new Caretaker headline event when a human disconnects', async () => {
    const { runner, room, rooms } = ratingSetup(true);
    rooms.disconnect('a', 3);
    runner.connection(room, 0, false, 3);
    await vi.waitFor(() => {
      const headline = room.state!.headlines.find((headline) => headline.id === 'h1-0')!;
      expect(headline.text).toBe('AI gazette headline');
      expect(headline.rating).toEqual(fallbackRating(room.state!, headline));
    });
  });

  it('never delays reveal for bot writing and ignores text completed after reveal', async () => {
    const rooms = createRoomManager();
    const session = rooms.create({ displayName: 'Editor', paperName: 'Daily', color: COLORS[0] }, 'a', 'ip', 0);
    const room = rooms.require(session.code);
    const writers: ((text: string) => void)[] = [];
    let ratings = 0;
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, () => {}, {
      writeBotHeadline: () => new Promise((resolve) => writers.push(resolve)),
      rateHeadline: async () => { ratings++; return rated; },
    });
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    runner.handle(room, 0, { type: 'skipIntro', actionId: 'intro', round: 0, phase: 'intro' }, 1);
    runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'investigate', round: 1, phase: 'investigate' }, 2);
    expect(writers).toHaveLength(3);
    runner.handle(room, 0, { type: 'skipWrite', actionId: 'skip', round: 1, phase: 'write' }, 3);
    expect(room.state!.phase).toBe('reveal');
    const original = structuredClone(room.state!.headlines);
    for (const resolve of writers) resolve('Late bot text');
    await Promise.resolve();
    expect(room.state!.headlines).toEqual(original);
    expect(ratings).toBe(0);
  });

  it('acknowledges a real lock without waiting and applies an early engine rating', async () => {
    const { runner, room, resolve, calls } = ratingSetup();
    expect(runner.handle(room, 0, lock, 3)).toBeUndefined();
    expect(room.state!.phase).toBe('write');
    expect(room.state!.headlines.find((headline) => headline.id === 'h1-0')?.rating).toBeNull();
    expect(calls()).toBe(1);
    resolve(rated);
    await Promise.resolve();
    expect(room.state!.headlines.find((headline) => headline.id === 'h1-0')?.rating).toEqual(rated);
  });

  it('keeps the engine fallback when a rating arrives after reveal', async () => {
    const { runner, room, resolve } = ratingSetup();
    runner.handle(room, 0, lock, 3);
    runner.handle(room, 1, { type: 'skipWrite', actionId: 'skip', round: 1, phase: 'write' }, 4);
    expect(room.state!.phase).toBe('reveal');
    const fallback = structuredClone(room.state!.headlines.find((headline) => headline.id === 'h1-0')!.rating);
    resolve(rated);
    await Promise.resolve();
    expect(room.state!.headlines.find((headline) => headline.id === 'h1-0')!.rating).toEqual(fallback);
  });

  it('displays the engine-pulled text after an inappropriate rating', async () => {
    const { runner, room, resolve } = ratingSetup();
    runner.handle(room, 0, lock, 3);
    resolve({ ...rated, inappropriate: true });
    await Promise.resolve();
    runner.handle(room, 1, { type: 'skipWrite', actionId: 'skip', round: 1, phase: 'write' }, 4);
    expect(publicView(room.state!).headlines.find((headline) => headline.id === 'h1-0'))
      .toMatchObject({ text: PULLED_TEXT, pulled: true });
  });

  it('hands back an actual Caretaker lock without allowing a replacement', () => {
    const { runner, room, rooms } = ratingSetup(true);
    rooms.disconnect('a', 3);
    runner.connection(room, 0, false, 3);
    const original = structuredClone(room.state!.headlines.find((headline) => headline.id === 'h1-0'));
    expect(original?.botAuthored).toBe(true);
    runner.connection(room, 0, true, 4);
    expect(runner.handle(room, 0, lock, 5)).toBe('ALREADY_ACTED');
    expect(room.state!.headlines.find((headline) => headline.id === 'h1-0')).toEqual(original);
  });
  it('ignores a provider result after room deletion without reviving state', async () => {
    const rooms = createRoomManager();
    const session = rooms.create({ displayName: 'Editor', paperName: 'Daily', color: COLORS[0] }, 'a', 'ip', 0);
    const room = rooms.require(session.code);
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, () => {});
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    runner.handle(room, 0, { type: 'skipIntro', actionId: 'skip', round: 0, phase: 'intro' }, 1);
    runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'skip2', round: 1, phase: 'investigate' }, 2);
    let resolveRating: (rating: Rating) => void = () => {};
    let published = false;
    const rater = createHeadlineRater(rooms, {
      rateHeadline: () => new Promise<Rating>((resolve) => { resolveRating = resolve; }),
      writeBotHeadline: async () => 'unused',
    }, () => { published = true; });
    const result = rater.rate(room, { type: 'headlineLocked', headlineId: 'h1-0', seatId: 0,
      text: 'Bakery danger', location: LOCATIONS[0], claim: EVENT_CLAIMS[0], botPersonality: null, fallbackRating: rated });
    rooms.remove(room.code);
    resolveRating({ juiciness: 4, onTopic: true, inappropriate: false, bubbles: ['Run!', 'Stay away!'] });
    await result;
    expect(rooms.rooms.size).toBe(0);
    expect(published).toBe(false);
  });

  it('rejects filtered locks without marking the seat acted', () => {
    const rooms = createRoomManager();
    const session = rooms.create({ displayName: 'Editor', paperName: 'Daily', color: COLORS[0] }, 'a', 'ip', 0);
    const room = rooms.require(session.code);
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, () => {});
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    runner.handle(room, 0, { type: 'skipIntro', actionId: 'skip', round: 0, phase: 'intro' }, 1);
    runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'skip2', round: 1, phase: 'investigate' }, 2);
    expect(runner.handle(room, 0, { type: 'lockHeadline', actionId: 'lock', round: 1, phase: 'write',
      text: 'darn-news', story: { kind: 'claim', location: LOCATIONS[0], claim: EVENT_CLAIMS[0], attachEvidence: false } }, 3)).toBe('FILTERED');
    expect(room.state!.seats[0]!.acted).toBe(false);
  });
});
