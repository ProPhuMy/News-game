import { describe, expect, it } from 'vitest';
import { createHeadlineRater } from '../../src/server/ratings.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { createMatchRunner } from '../../src/server/matches.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS, LOCATIONS, EVENT_CLAIMS } from '../../src/shared/ids.ts';
import type { Rating } from '../../src/shared/ai.ts';

describe('asynchronous rating lifecycle', () => {
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
      text: 'Bakery danger', location: LOCATIONS[0], claim: EVENT_CLAIMS[0], botPersonality: null });
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
