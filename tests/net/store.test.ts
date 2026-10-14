import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientStore } from '../../src/client/net/store.ts';
import { createMatch, privateView, publicView } from '../../src/engine/index.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS } from '../../src/shared/ids.ts';
import { SERVER_EVENTS, type ClientMessage } from '../../src/shared/protocol.ts';

const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
const session = { code: 'ABCDE', seatId: 0, token: 'a'.repeat(32) };
const snapshots = () => {
  const match = createMatch({ content: SAMPLE_CONTENT, startMs: 0 }, 7,
    [{ kind: 'human', ...profile }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]);
  return { public: publicView(match), private: privateView(match, 0) };
};
const setup = () => {
  const sent: ClientMessage[] = [];
  const storage = new Map<string, string>();
  const store = createClientStore({ send: (message) => sent.push(message),
    storage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); } } });
  return { store, sent, storage };
};
afterEach(() => vi.useRealTimers());

describe('client store', () => {
  it('retries the identical action and ignores acknowledgments for other actions', async () => {
    vi.useFakeTimers();
    const { store, sent } = setup();
    const id = store.actions.createRoom(profile)!;
    const first = sent[0];
    store.receive(SERVER_EVENTS.ack, { actionId: 'unrelated', ok: true, serverNowMs: Date.now() });
    expect(store.getState().pending).toEqual([id]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sent[1]).toEqual(first);
    store.receive(SERVER_EVENTS.ack, { actionId: id, ok: true, session, serverNowMs: Date.now() });
    await vi.advanceTimersByTimeAsync(3000);
    expect(sent).toHaveLength(2);
    expect(store.getState().pending).toEqual([]);
    store.dispose();
  });

  it('discards stale snapshots and never pairs different versions', () => {
    const { store } = setup();
    const frames = snapshots();
    store.receive(SERVER_EVENTS.public, frames.public);
    store.receive(SERVER_EVENTS.private, frames.private);
    expect(store.getState().privateSnapshot?.seatId).toBe(0);
    store.receive(SERVER_EVENTS.public, { ...frames.public, version: 2, round: 1, phase: 'investigate' });
    expect(store.getState().privateSnapshot).toBeNull();
    store.receive(SERVER_EVENTS.private, { ...frames.private, version: 2 });
    store.receive(SERVER_EVENTS.public, frames.public);
    expect(store.getState().publicSnapshot?.version).toBe(2);
    expect(store.getState().privateSnapshot?.version).toBe(2);
    store.receive(SERVER_EVENTS.private, { ...frames.private, version: 3 });
    expect(store.getState().privateSnapshot).toBeNull();
    store.receive(SERVER_EVENTS.public, { ...frames.public, version: 3 });
    expect(store.getState().privateSnapshot?.version).toBe(3);
    store.dispose();
  });

  it('sends match round/phase and unique action IDs from current server snapshot', () => {
    const { store, sent } = setup();
    store.receive(SERVER_EVENTS.public, snapshots().public);
    store.actions.skipIntro();
    store.actions.skipIntro();
    expect(sent[0]).toMatchObject({ type: 'skipIntro', round: 0, phase: 'intro' });
    expect(sent[0]?.actionId).not.toBe(sent[1]?.actionId);
    store.dispose();
  });

  it('persists tokens per room and reconnects rather than joining', () => {
    const { store, sent, storage } = setup();
    const id = store.actions.createRoom(profile)!;
    store.receive(SERVER_EVENTS.ack, { actionId: id, ok: true, session, serverNowMs: Date.now() });
    expect([...storage.keys()]).toEqual(['news-town:ABCDE']);
    store.actions.reconnect('ABCDE');
    expect(sent.at(-1)).toMatchObject({ type: 'reconnect', code: 'ABCDE', token: session.token });
    store.receive(SERVER_EVENTS.ack, { actionId: sent.at(-1)!.actionId, ok: false, error: 'ROOM_NOT_FOUND', serverNowMs: Date.now() });
    expect(store.getState().error).toBe('The presses stopped — this match ended');
    expect(store.getState().session).toBeNull();
    expect(store.getState().privateSnapshot).toBeNull();
    store.dispose();
  });

  it('shows recoverability errors when browser storage throws', () => {
    const store = createClientStore({ send: () => {}, storage: {
      getItem: () => { throw new Error('storage denied'); }, setItem: () => { throw new Error('storage denied'); },
    } });
    expect(() => store.actions.reconnect('ABCDE')).not.toThrow();
    expect(store.getState().error).toContain('storage');
    store.dispose();
  });

  it('recovers with in-memory token when saving browser storage fails', () => {
    const sent: ClientMessage[] = [];
    const store = createClientStore({ send: (message) => sent.push(message), storage: {
      getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); },
    } });
    const id = store.actions.createRoom(profile)!;
    store.receive(SERVER_EVENTS.ack, { actionId: id, ok: true, session, serverNowMs: Date.now() });
    expect(store.getState().error).toContain('storage');
    store.actions.reconnect('abcde');
    expect(sent.at(-1)).toMatchObject({ type: 'reconnect', code: 'ABCDE', token: session.token });
    store.dispose();
  });

  it('times out after bounded retries and derives countdown without advancing phase', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const { store, sent } = setup();
    const id = store.actions.createRoom(profile)!;
    store.receive(SERVER_EVENTS.ack, { actionId: id, ok: true, serverNowMs: 2000 });
    store.receive(SERVER_EVENTS.public, { ...snapshots().public, deadlineMs: 4000 });
    expect(store.remainingMs()).toBe(2000);
    store.actions.startMatch();
    await vi.advanceTimersByTimeAsync(3000);
    expect(store.getState().error).toContain('acknowledgment');
    expect(sent).toHaveLength(4);
    expect(store.remainingMs()).toBe(0);
    expect(store.getState().publicSnapshot?.phase).toBe('intro');
    store.dispose();
  });
});
