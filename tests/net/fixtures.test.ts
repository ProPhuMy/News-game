import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFixturePlayer } from '../../src/client/net/fixtures.ts';
import { createClientStore } from '../../src/client/net/store.ts';
import { createMatch, tick, publicView, privateView } from '../../src/engine/index.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS } from '../../src/shared/ids.ts';

// Generate test frames from the real M0 engine; do not hand-edit Claude's recordings.
const recording = () => {
  const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
  const rooms = createRoomManager();
  const session = rooms.create(profile, 'a', 'ip', 0);
  let match = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 1,
    [{ kind: 'human', ...profile }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
  const frames = [{ atMs: 0, public: publicView(match), private: privateView(match, 0) }];
  match = tick(match, 20_000).state;
  frames.push({ atMs: 20_000, public: publicView(match), private: privateView(match, 0) });
  return { name: 'test-match', description: 'M0 engine frames', room: rooms.snapshot(session.code, 0), frames };
};
afterEach(() => vi.useRealTimers());

describe('fixture playback', () => {
  it('plays validated snapshots through the store without network and offsets deadlines', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const store = createClientStore({ send: () => { throw new Error('fixture must not send'); } });
    const player = createFixturePlayer(recording(), store);
    player.play();
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    expect(store.getState().publicSnapshot?.deadlineMs).toBe(120_000);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(store.getState().publicSnapshot?.phase).toBe('investigate');
    expect(store.getState().privateSnapshot?.version).toBe(store.getState().publicSnapshot?.version);
    player.dispose();
    store.dispose();
  });

  it('pauses and disposes without emitting future frames', async () => {
    vi.useFakeTimers();
    const store = createClientStore({ send: () => {} });
    const player = createFixturePlayer(recording(), store);
    player.play();
    await vi.advanceTimersByTimeAsync(10_000);
    player.pause();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    player.play();
    await vi.advanceTimersByTimeAsync(9999);
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    player.dispose();
    await vi.advanceTimersByTimeAsync(1);
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    store.dispose();
  });

  it('rejects invalid or out-of-order recordings before playback', () => {
    const store = createClientStore({ send: () => {} });
    expect(() => createFixturePlayer({}, store)).toThrow();
    const fixture = recording();
    fixture.frames.reverse();
    expect(() => createFixturePlayer(fixture, store)).toThrow('ordered');
    store.dispose();
  });
});
