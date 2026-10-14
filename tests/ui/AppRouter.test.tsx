/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
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

    expect(screen.getAllByText("Our lawyers won't print that — try again").length).toBeGreaterThan(0);
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

  it('initiates transport connection on startup and retry', () => {
    const { store } = setupTestStore();
    const connect = vi.fn();
    const storeWithConnect = Object.assign(store, { connect });

    render(<AppRouter store={storeWithConnect} />);
    expect(connect).toHaveBeenCalledTimes(1);

    // Transition to disconnected
    act(() => {
      store.setConnection('disconnected');
    });

    expect(screen.getByText('Connection Lost')).toBeDefined();
    const retryBtn = screen.getByText('Reconnect Now');
    fireEvent.click(retryBtn);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('routes /r/CODE to JoinScreen when no session token exists in storage', () => {
    const { store, sent } = setupTestStore();
    store.setConnection('connected');
    window.history.pushState({}, '', '/r/EXTRA');

    render(<AppRouter store={store} />);

    expect(screen.getByText('Establish Your Press')).toBeDefined();
    expect(screen.getByTestId('join-room-badge')).toBeDefined();
    expect(screen.getByText('EXTRA')).toBeDefined();

    // Fill in name and paper, and claim press
    fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Jane Editor' } });
    fireEvent.change(screen.getByLabelText('Newspaper Name'), { target: { value: 'Daily Chronicle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Claim Printing Press' }));

    expect(sent.length).toBeGreaterThan(0);
    const lastMsg = sent[sent.length - 1];
    expect(lastMsg?.type).toBe('joinRoom');
    if (lastMsg?.type === 'joinRoom') {
      expect(lastMsg.code).toBe('EXTRA');
    }

    window.history.pushState({}, '', '/');
  });

  it('routes /r/CODE to reconnect action when saved session exists in storage', () => {
    window.localStorage.setItem('news-town:PRESS', session.token);

    const sent: ClientMessage[] = [];
    const store = createClientStore({
      send: (msg) => sent.push(msg),
      storage: {
        getItem: (k) => window.localStorage.getItem(k),
        setItem: (k, v) => window.localStorage.setItem(k, v),
      },
    });

    window.history.pushState({}, '', '/r/PRESS');
    render(<AppRouter store={store} />);

    expect(sent.some((m) => m.type === 'reconnect' && m.code === 'PRESS' && m.token === session.token)).toBe(true);

    window.localStorage.removeItem('news-town:PRESS');
    window.history.pushState({}, '', '/');
  });

  it('invokes store.disconnect and reconnects transport when host leaves lobby room', () => {
    const { store } = setupTestStore();
    const disconnect = vi.fn(() => store.reset());
    const connect = vi.fn();
    const storeWithLifecycle = Object.assign(store, { disconnect, connect });

    render(<AppRouter store={storeWithLifecycle} />);
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

    const leaveBtn = screen.getByText('Leave Room');
    fireEvent.click(leaveBtn);

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2); // 1 on mount, 1 after leave
    expect(screen.getByText('NEWS TOWN')).toBeDefined();
  });

  it('filters out already exposed headlines and current-round headlines from rival investigation', () => {
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

    // Round 3 public snapshot with 3 rival headlines:
    // 1. h1-1 (round 1, exposed: true) -> should be excluded
    // 2. h2-1 (round 2, exposed: false) -> should be included!
    // 3. h3-1 (round 3, exposed: false) -> should be excluded (current round)
    const customPub = {
      ...pub,
      version: 2,
      round: 3,
      phase: 'investigate' as const,
      headlines: [
        {
          id: 'h1-1',
          seatId: 1,
          round: 1,
          location: 'bakery' as const,
          claim: 'danger' as const,
          exposeOf: null,
          text: 'Rival Lie from Round 1',
          pulled: false,
          evidence: false,
          exposed: true,
          truth: 'lie' as const,
        },
        {
          id: 'h2-1',
          seatId: 1,
          round: 2,
          location: 'clinic' as const,
          claim: 'scandal' as const,
          exposeOf: null,
          text: 'Rival Unexposed Lie from Round 2',
          pulled: false,
          evidence: false,
          exposed: false,
          truth: 'unknown' as const,
        },
        {
          id: 'h3-1',
          seatId: 1,
          round: 3,
          location: 'town_hall' as const,
          claim: 'all_clear' as const,
          exposeOf: null,
          text: 'Rival Current Round Headline',
          pulled: false,
          evidence: false,
          exposed: false,
          truth: 'unknown' as const,
        },
      ],
    };

    act(() => {
      store.receive(SERVER_EVENTS.public, customPub);
      store.receive(SERVER_EVENTS.private, { ...priv, version: 2, seatId: 0 });
    });

    expect(screen.getByTestId('investigate-panel')).toBeDefined();
    expect(screen.getByText(/Rival Unexposed Lie from Round 2/)).toBeDefined();
    expect(screen.queryByText(/Rival Lie from Round 1/)).toBeNull();
    expect(screen.queryByText(/Rival Current Round Headline/)).toBeNull();
  });

  it('renders error banner during loading state when error occurs', () => {
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

    // Cause a store error while waiting for snapshots
    let startActionId = '';
    act(() => {
      startActionId = store.actions.startMatch()!;
    });

    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId: startActionId,
        ok: false,
        error: 'ROOM_NOT_FOUND',
        serverNowMs: 1000,
      });
    });

    const errorBanner = screen.getByTestId('loading-error');
    expect(errorBanner).toBeDefined();
    expect(screen.getByText('Room not found. Check the room code and try again.')).toBeDefined();
  });

  it('renders shared error feedback in HUD during intro phase', () => {
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
    act(() => {
      store.receive(SERVER_EVENTS.public, { ...pub, version: 1, phase: 'intro' });
      store.receive(SERVER_EVENTS.private, { ...priv, version: 1, seatId: 0 });
    });

    expect(screen.getByTestId('intro-screen')).toBeDefined();

    // Trigger an error during intro (e.g. invalid action ack)
    let introActionId = '';
    act(() => {
      introActionId = store.actions.skipIntro()!;
    });
    act(() => {
      store.receive(SERVER_EVENTS.ack, {
        actionId: introActionId,
        ok: false,
        error: 'NOT_ALLOWED',
        serverNowMs: 1050,
      });
    });

    expect(screen.getByTestId('hud-error')).toBeDefined();
    expect(screen.getByText('Action not allowed at this time.')).toBeDefined();
  });
});
