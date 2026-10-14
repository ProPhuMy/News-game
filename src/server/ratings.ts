import { applyRating, type EngineEvent } from '../engine/index.ts';
import type { AiAdapter } from '../shared/ai.ts';
import type { Room, RoomManager } from './rooms.ts';

export function createHeadlineRater(rooms: RoomManager, ai: AiAdapter, publish: (room: Room) => void) {
  let disposed = false;
  return {
    async rate(room: Room, event: Extract<EngineEvent, { type: 'headlineLocked' }>) {
      const round = room.state?.round;
      const current = () => !disposed && rooms.rooms.get(room.code) === room && room.status === 'playing' &&
        room.state?.round === round && room.state?.phase === 'write';
      if (!current()) return;
      try {
        const exposed = event.exposedHeadlineText !== undefined ? { exposedHeadlineText: event.exposedHeadlineText } : {};
        const botText = event.botPersonality === null ? undefined : await ai.writeBotHeadline({
          personality: event.botPersonality, location: event.location, claim: event.claim, ...exposed,
        });
        if (!current()) return;
        const rating = await ai.rateHeadline({ text: botText ?? event.text, location: event.location, claim: event.claim,
          fallbackRating: event.fallbackRating, ...exposed });
        if (!current() || !room.state) return;
        const headline = room.state.headlines.find((headline) => headline.id === event.headlineId);
        if (!headline || headline.revealed || headline.rating !== null) return;
        room.state = applyRating(room.state, event.headlineId, rating, botText);
        publish(room);
      } catch {
        // Engine supplies reveal-time fallback even if an adapter violates its non-rejection contract.
      }
    },
    dispose() { disposed = true; },
  };
}
