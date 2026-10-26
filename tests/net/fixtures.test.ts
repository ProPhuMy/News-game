import { content as nameFilterContent } from '../../src/content/index.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFixturePlayer } from '../../src/client/net/fixtures.ts';
import { createClientStore } from '../../src/client/net/store.ts';
import { createMatch, tick, publicView, privateView } from '../../src/engine/index.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS } from '../../src/shared/ids.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import honest from '../../src/sim/fixtures/solo-honest.json';
import exposures from '../../src/sim/fixtures/exposures.json';
import caretaker from '../../src/sim/fixtures/caretaker-pulled.json';

// Generate test frames from the real M0 engine; do not hand-edit Claude's recordings.
const recording = () => {
  const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
  const rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
  const session = rooms.create(profile, 'a', 'ip', 0);
  let match = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 1,
    [{ kind: 'human', ...profile }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
  const frames = [{ atMs: 0, public: publicView(match), private: privateView(match, 0) }];
  match = tick(match, TUNING.phaseMs.intro).state;
  frames.push({ atMs: TUNING.phaseMs.intro, public: publicView(match), private: privateView(match, 0) });
  return { name: 'test-match', description: 'M0 engine frames', room: rooms.snapshot(session.code, 0), frames };
};
afterEach(() => vi.useRealTimers());

describe('fixture playback', () => {
  it.each([honest, exposures, caretaker])('plays Claude recording $name through its final scoreboard', async (fixture) => {
    vi.useFakeTimers();
    const store = createClientStore({ send: () => { throw new Error('no fixture network'); } });
    const player = createFixturePlayer(fixture, store);
    player.play();
    await vi.runAllTimersAsync();
    expect(store.getState().publicSnapshot?.phase).toBe('ended');
    expect(store.getState().publicSnapshot?.round).toBe(5);
    expect(store.getState().publicSnapshot?.final?.winners.length).toBeGreaterThan(0);
    expect(store.getState().privateSnapshot?.version).toBe(store.getState().publicSnapshot?.version);
    player.play();
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    player.dispose();
    store.dispose();
  });
  it('plays validated snapshots through the store without network and offsets deadlines', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const store = createClientStore({ send: () => { throw new Error('fixture must not send'); } });
    const player = createFixturePlayer(recording(), store);
    player.play();
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    expect(store.getState().publicSnapshot?.deadlineMs).toBe(100_000 + TUNING.phaseMs.intro);
    await vi.advanceTimersByTimeAsync(TUNING.phaseMs.intro);
    expect(store.getState().publicSnapshot?.phase).toBe('investigate');
    expect(store.remainingMs()).toBe(TUNING.firstRoundInvestigateMs);
    expect(store.getState().privateSnapshot?.version).toBe(store.getState().publicSnapshot?.version);
    player.dispose();
    store.dispose();
  });

  it('clears the live server clock offset when switching to recorded playback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const store = createClientStore({ send: () => {} });
    const id = store.actions.startMatch()!;
    store.receive('ack', { actionId: id, ok: true, serverNowMs: 105_000 });
    const player = createFixturePlayer(recording(), store);
    player.play();
    expect(store.remainingMs()).toBe(TUNING.phaseMs.intro);
    player.dispose();
    store.dispose();
  });

  it('pauses and disposes without emitting future frames', async () => {
    vi.useFakeTimers();
    const store = createClientStore({ send: () => {} });
    const player = createFixturePlayer(recording(), store);
    player.play();
    await vi.advanceTimersByTimeAsync(TUNING.phaseMs.intro / 2);
    player.pause();
    await vi.advanceTimersByTimeAsync(TUNING.phaseMs.intro);
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    player.play();
    await vi.advanceTimersByTimeAsync(TUNING.phaseMs.intro / 2 - 1);
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
