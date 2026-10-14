import { applyRating, type EngineEvent } from '../engine/index.ts';
import type { AiAdapter } from '../shared/ai.ts';
import type { Room, RoomManager } from './rooms.ts';

export function createHeadlineRater(rooms: RoomManager, ai: AiAdapter, publish: (room: Room) => void) {
  let disposed = false;
  return {
    async rate(room: Room, event: Extract<EngineEvent, { type: 'headlineLocked' }>) {
      // shortcut: bot fallback context is missing, enable bot ratings after the contract request is resolved.
      if (disposed || event.botPersonality !== null) return;
      const round = room.state?.round;
      try {
        const rating = await ai.rateHeadline({ text: event.text, location: event.location, claim: event.claim,
          ...(event.exposedHeadlineText !== undefined ? { exposedHeadlineText: event.exposedHeadlineText } : {}) });
        if (disposed || rooms.rooms.get(room.code) !== room || room.status !== 'playing' || !room.state ||
          room.state.round !== round || room.state.phase !== 'write') return;
        const headline = room.state.headlines.find((headline) => headline.id === event.headlineId);
        if (!headline || headline.revealed || headline.rating !== null) return;
        room.state = applyRating(room.state, event.headlineId, rating);
        publish(room);
      } catch {
        // Engine supplies reveal-time fallback even if an adapter violates its non-rejection contract.
      }
    },
    dispose() { disposed = true; },
  };
}
