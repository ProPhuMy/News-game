import { FixtureSchema } from '../../shared/fixture.ts';
import { SERVER_EVENTS } from '../../shared/protocol.ts';
import type { ClientStore } from './store.ts';

export function createFixturePlayer(raw: unknown, store: ClientStore) {
  const fixture = FixtureSchema.parse(raw);
  if (fixture.frames.some((frame, index) => index > 0 && frame.atMs < fixture.frames[index - 1]!.atMs)) {
    throw new Error('Fixture frames must be ordered by time');
  }
  let index = 0;
  let originMs = 0;
  let elapsedMs = 0;
  let playing = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const advance = () => {
    if (!playing || disposed) return;
    const now = Date.now();
    while (index < fixture.frames.length && fixture.frames[index]!.atMs <= now - originMs) {
      const frame = fixture.frames[index++]!;
      store.receive(SERVER_EVENTS.public, { ...frame.public, deadlineMs: frame.public.deadlineMs + originMs });
      store.receive(SERVER_EVENTS.private, frame.private);
    }
    const next = fixture.frames[index];
    if (next) timer = setTimeout(advance, Math.max(0, next.atMs + originMs - Date.now()));
    else playing = false;
  };
  return {
    play() {
      if (disposed || playing) return;
      if (index === fixture.frames.length) { index = 0; elapsedMs = 0; }
      if (index === 0) {
        store.reset();
        store.setConnection('connected');
        store.receive(SERVER_EVENTS.room, fixture.room);
      }
      originMs = Date.now() - elapsedMs;
      playing = true;
      advance();
    },
    pause() {
      if (!playing) return;
      elapsedMs = Date.now() - originMs;
      playing = false;
      clearTimeout(timer);
    },
    dispose() { disposed = true; playing = false; clearTimeout(timer); },
  };
}
