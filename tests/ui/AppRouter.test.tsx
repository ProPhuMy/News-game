/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { AppRouter } from '../../src/client/ui/screens/AppRouter';
import { createClientStore } from '../../src/client/net/store.ts';
import { SERVER_EVENTS, type ClientMessage } from '../../src/shared/protocol.ts';
import { createMatch, publicView, privateView } from '../../src/engine/index.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';

const profile = { displayName: 'Editor', paperName: 'Daily Gasp', color: 'red' as const };
const session = { code: 'ABCDE', seatId: 0, token: '12345678901234567890123456789012' };

function setupTestStore() {
  const sent: ClientMessage[] = [];
  const store = createClientStore({
    send: (msg) => sent.push(msg),
  });
  return { store, sent };
}

function createMatchSnapshots() {
  const match = createMatch(
    { content: SAMPLE_CONTENT, startMs: 0 },
    7,
    [{ kind: 'human', ...profile }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }]
  );
  return {
    pub: publicView(match),
    priv: privateView(match, 0),
  };
}

describe('AppRouter Integration with ClientStore', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders home screen, allows starting solo play, and dispatches playSolo action', () => {
    const { store, sent } = setupTestStore();
    render(<AppRouter store={store} />);

    expect(screen.getByText('NEWS TOWN')).toBeDefined();
    expect(screen.getByText('Play Solo')).toBeDefined();

    // Click Play Solo -> brings up JoinScreen
    fireEvent.click(screen.getByText('Play Solo'));
    expect(screen.getByText('Establish Your Press')).toBeDefined();

    // Fill in inputs and submit
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Jane Editor' } });
    fireEvent.change(screen.getByLabelText('Newspaper Name'), { target: { value: 'The Daily Post' } });
    fireEvent.click(screen.getByRole('button', { name: 'Claim Printing Press' }));

    expect(sent.length).toBeGreaterThan(0);
    const lastMsg = sent[sent.length - 1];
    expect(lastMsg?.type).toBe('playSolo');
    if (lastMsg?.type === 'playSolo') {
      expect(lastMsg.displayName).toBe('Jane Editor');
      expect(lastMsg.paperName).toBe('The Daily Post');
    }
  });

  it('transitions to LobbyScreen upon receiving room and session acks', () => {
    const { store } = setupTestStore();
    render(<AppRouter store={store} />);

    store.setConnection('connected');

    // Dispatch createRoom action so pending holds the actionId
    let actionId = '';
    act(() => {
      actionId = store.actions.createRoom(profile)!;
    });

    // Deliver session ack matching the actionId and room snapshot
    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId,
        ok: true,
        session,
        serverNowMs: 1000,
      });
      store.receive(SERVER_EVENTS.room, {
        code: 'ABCDE',
        status: 'lobby',
        hostSeatId: 0,
        you: 0,
        seats: [
          { seatId: 0, occupant: 'human', displayName: 'Jane', paperName: 'Daily Post', color: 'red', connected: true },
          { seatId: 1, occupant: 'ai', displayName: null, paperName: null, color: null, connected: true },
          { seatId: 2, occupant: 'ai', displayName: null, paperName: null, color: null, connected: true },
          { seatId: 3, occupant: 'ai', displayName: null, paperName: null, color: null, connected: true },
        ],
      });
    });

    expect(screen.getByTestId('lobby-screen')).toBeDefined();
    expect(screen.getByText(/Room Code: ABCDE/)).toBeDefined();
    expect(screen.getByText('Start Match')).toBeDefined();
  });

  it('advances through match phases based on authoritative store snapshots', () => {
    const { store } = setupTestStore();
    render(<AppRouter store={store} />);

    store.setConnection('connected');

    let actionId = '';
    act(() => {
      actionId = store.actions.createRoom(profile)!;
    });

    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId,
        ok: true,
        session,
        serverNowMs: 1000,
      });
      store.receive(SERVER_EVENTS.room, {
        code: 'ABCDE',
        status: 'playing',
        hostSeatId: 0,
        you: 0,
        seats: [
          { seatId: 0, occupant: 'human', displayName: 'Jane', paperName: 'Daily Post', color: 'red', connected: true },
          { seatId: 1, occupant: 'ai', displayName: 'Bot 1', paperName: 'Paper 1', color: 'blue', connected: true },
          { seatId: 2, occupant: 'ai', displayName: 'Bot 2', paperName: 'Paper 2', color: 'green', connected: true },
          { seatId: 3, occupant: 'ai', displayName: 'Bot 3', paperName: 'Paper 3', color: 'gold', connected: true },
        ],
      });
    });

    const { pub, priv } = createMatchSnapshots();

    // Deliver intro phase snapshots with matching version (version 1)
    act(() => {
      store.receive(SERVER_EVENTS.public, { ...pub, version: 1 });
      store.receive(SERVER_EVENTS.private, { ...priv, version: 1, seatId: 0 });
    });

    expect(screen.getByTestId('intro-screen')).toBeDefined();

    // Advance to investigate phase (version 2)
    act(() => {
      store.receive(SERVER_EVENTS.public, { ...pub, version: 2, phase: 'investigate' });
      store.receive(SERVER_EVENTS.private, { ...priv, version: 2, seatId: 0 });
    });

    expect(screen.getByTestId('investigate-panel')).toBeDefined();

    // Advance to write phase (version 3)
    act(() => {
      store.receive(SERVER_EVENTS.public, { ...pub, version: 3, phase: 'write' });
      store.receive(SERVER_EVENTS.private, { ...priv, version: 3, seatId: 0 });
    });

    expect(screen.getByTestId('write-screen')).toBeDefined();
  });

  it('displays filtered error message when server rejects locked headline with FILTERED', () => {
    const { store } = setupTestStore();
    render(<AppRouter store={store} />);

    store.setConnection('connected');

    let initActionId = '';
    act(() => {
      initActionId = store.actions.createRoom(profile)!;
    });

    act(() => {
      store.receive(SERVER_EVENTS.ack, { actionId: initActionId, ok: true, session, serverNowMs: 1000 });
      store.receive(SERVER_EVENTS.room, {
        code: 'ABCDE',
        status: 'playing',
        hostSeatId: 0,
        you: 0,
        seats: [
          { seatId: 0, occupant: 'human', displayName: 'Jane', paperName: 'Daily Post', color: 'red', connected: true },
          { seatId: 1, occupant: 'ai', displayName: 'Bot 1', paperName: 'Paper 1', color: 'blue', connected: true },
          { seatId: 2, occupant: 'ai', displayName: 'Bot 2', paperName: 'Paper 2', color: 'green', connected: true },
          { seatId: 3, occupant: 'ai', displayName: 'Bot 3', paperName: 'Paper 3', color: 'gold', connected: true },
        ],
      });
    });

    const { pub, priv } = createMatchSnapshots();
    act(() => {
      store.receive(SERVER_EVENTS.public, { ...pub, version: 3, phase: 'write' });
      store.receive(SERVER_EVENTS.private, { ...priv, version: 3, seatId: 0 });
    });

    expect(screen.getByTestId('write-screen')).toBeDefined();

    // Lock a headline
    let lockActionId = '';
    act(() => {
      lockActionId = store.actions.lockHeadline({
        story: { kind: 'claim', location: 'bakery', claim: 'danger', attachEvidence: false },
        text: 'Scandalous rumors about the mayor',
      })!;
    });

    // Server returns FILTERED ack
    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId: lockActionId,
        ok: false,
        error: 'FILTERED',
        serverNowMs: 1050,
      });
    });

    expect(screen.getByText("Our lawyers won't print that — try again")).toBeDefined();
  });

  it('displays ServerRestartScreen when match ended abruptly', () => {
    // Provide storage so reconnect can find a token
    const storage = new Map<string, string>();
    storage.set('news-town:ABCDE', session.token);

    const store = createClientStore({
      send: () => {},
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
      },
    });

    render(<AppRouter store={store} />);
    store.setConnection('connected');

    let recId = '';
    act(() => {
      recId = store.actions.reconnect('ABCDE')!;
    });

    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId: recId,
        ok: false,
        error: 'ROOM_NOT_FOUND',
        serverNowMs: 1000,
      });
    });

    expect(screen.getByTestId('server-restart-screen')).toBeDefined();
    expect(screen.getByText('The presses stopped — this match ended')).toBeDefined();
    expect(screen.getByText('Return to Home')).toBeDefined();
  });
});
