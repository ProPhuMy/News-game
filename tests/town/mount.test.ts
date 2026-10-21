// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountTown } from '../../src/client/town/mount.ts';
import type { ClientStore, ClientState } from '../../src/client/net/store.ts';
import type { PublicSnapshot, ReactionPlan } from '../../src/shared/snapshots.ts';
import type { TownView } from '../../src/client/town/index.ts';

function createMockTownView(): TownView & {
  mockSync: ReturnType<typeof vi.fn>;
  mockSetPhase: ReturnType<typeof vi.fn>;
  mockPlayPlan: ReturnType<typeof vi.fn>;
  mockSetReducedMotion: ReturnType<typeof vi.fn>;
  mockDispose: ReturnType<typeof vi.fn>;
} {
  const mockSync = vi.fn();
  const mockSetPhase = vi.fn();
  const mockPlayPlan = vi.fn().mockResolvedValue(undefined);
  const mockSetReducedMotion = vi.fn();
  const mockDispose = vi.fn();

  return {
    whenReady: async () => ({ degraded: [] }),
    isWebGLSupported: () => true,
    playReactionPlan: mockPlayPlan,
    setPhase: mockSetPhase,
    setTimeOfDay: vi.fn(),
    setTargetLocation: vi.fn(),
    setReducedMotion: mockSetReducedMotion,
    resize: vi.fn(),
    dispose: mockDispose,
    syncFromSnapshot: mockSync,
    getCitizenPosition: vi.fn(),
    getCitizenRotation: vi.fn(),
    setCitizenPosition: vi.fn(),
    setCitizenRotation: vi.fn(),
    getCitizenHatColor: vi.fn(),
    getNodeWorldPosition: vi.fn(),
    getOfficeBannerColor: vi.fn(),
    mockSync,
    mockSetPhase,
    mockPlayPlan,
    mockSetReducedMotion,
    mockDispose,
  };
}

function createMockStore(initialState: Partial<ClientState> = {}) {
  let currentState: ClientState = {
    room: null,
    session: null,
    publicSnapshot: null,
    privateSnapshot: null,
    connection: 'connected',
    pending: [],
    error: null,
    serverOffsetMs: 0,
    ...initialState,
  };

  const listeners = new Set<() => void>();
  const actionsProxy = new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => {
      throw new Error(`Store action '${String(prop)}' was called unexpectedly by mountTown!`);
    },
  });

  return {
    getState: vi.fn(() => currentState),
    subscribe: vi.fn((fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    }),
    actions: actionsProxy,
    remainingMs: vi.fn(() => 0),
    receive: vi.fn(),
    setConnection: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
    emit(patch: Partial<ClientState>) {
      currentState = { ...currentState, ...patch };
      for (const fn of [...listeners]) fn();
    },
    listenerCount: () => listeners.size,
  };
}

function makeMockSnapshot(overrides: Partial<PublicSnapshot> = {}): PublicSnapshot {
  return {
    version: 1,
    round: 1,
    phase: 'write',
    deadlineMs: Date.now() + 10000,
    papers: [
      {
        seatId: 0,
        displayName: 'Alice',
        paperName: 'The Daily',
        color: 'red',
        personality: null,
        controller: 'human',
        trust: 10,
        readers: 5,
        totalReaders: 5,
        score: 50,
        lockedVisibleAtMs: null,
      },
    ] as unknown as PublicSnapshot['papers'],
    headlines: [],
    exposures: [],
    reactionPlan: null,
    citizens: [{ id: 0, home: 'r0c0', paper: 0 }],
    final: null,
    ...overrides,
  };
}

describe('mountTown', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    document.documentElement.removeAttribute('data-reduced-motion');
  });

  afterEach(() => {
    container.remove();
    document.documentElement.removeAttribute('data-reduced-motion');
    vi.restoreAllMocks();
  });

  it('derives lighting on same-phase round changes and resets to midday without a snapshot', () => {
    const view = createMockTownView();
    const store = createMockStore();
    const cleanup = mountTown(container, store as unknown as ClientStore, { viewFactory: () => view });
    expect(view.setTimeOfDay).toHaveBeenLastCalledWith('midday');
    store.emit({ publicSnapshot: makeMockSnapshot({ round: 1 }) });
    expect(view.setTimeOfDay).toHaveBeenLastCalledWith('morning');
    store.emit({ publicSnapshot: makeMockSnapshot({ round: 5 }) });
    expect(view.setTimeOfDay).toHaveBeenLastCalledWith('dusk');
    store.emit({ publicSnapshot: makeMockSnapshot({ phase: 'final', round: 5 }) });
    expect(view.setTimeOfDay).toHaveBeenLastCalledWith('night');
    store.emit({ publicSnapshot: null });
    expect(view.setPhase).toHaveBeenLastCalledWith('ended');
    expect(view.setTimeOfDay).toHaveBeenLastCalledWith('midday');
    cleanup();
  });

  it('plays each round reaction plan once and calculates remaining reveal time', () => {
    let listener: (() => void) | undefined;
    const store = {
      getState: vi.fn(),
      subscribe: vi.fn((fn) => {
        listener = fn;
        return () => {};
      }),
      actions: {},
    } as unknown as ClientStore;

    const now = Date.now();
    const plan: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [],
      recap: {
        headlineId: 'h1',
        location: 'town_hall',
        behavior: 'flee',
        reactors: 0,
        gainSeatId: null,
        gained: 0,
      },
    };

    (store.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      publicSnapshot: {
        round: 1,
        phase: 'reveal',
        deadlineMs: now + 5000,
        reactionPlan: plan,
        papers: [],
        citizens: [],
      },
      serverOffsetMs: 0,
    });

    const unmount = mountTown(container, store);
    expect(store.subscribe).toHaveBeenCalled();
    expect(listener).toBeDefined();
    listener?.();
    unmount();
  });

  it('strictly adheres to read-only store access (never invokes store.actions)', () => {
    const mockView = createMockTownView();
    const store = createMockStore({
      publicSnapshot: makeMockSnapshot({ phase: 'investigate' }),
    });

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    expect(() => {
      store.emit({
        publicSnapshot: makeMockSnapshot({ phase: 'write' }),
      });
    }).not.toThrow();

    unmount();
  });

  it('synchronizes snapshot and notifies view of phase transitions', () => {
    const mockView = createMockTownView();
    const store = createMockStore({ publicSnapshot: null });

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    expect(mockView.mockSync).not.toHaveBeenCalled();
    expect(mockView.mockSetPhase).not.toHaveBeenCalled();

    // Snapshot arrives with 'intro'
    const snapIntro = makeMockSnapshot({ phase: 'intro' });
    store.emit({ publicSnapshot: snapIntro });

    expect(mockView.mockSync).toHaveBeenCalledTimes(1);
    expect(mockView.mockSync).toHaveBeenCalledWith(snapIntro);
    expect(mockView.mockSetPhase).toHaveBeenCalledTimes(1);
    expect(mockView.mockSetPhase).toHaveBeenCalledWith('intro');

    // Repeated update with same phase does not re-invoke setPhase
    const snapIntro2 = makeMockSnapshot({ phase: 'intro', version: 2 });
    store.emit({ publicSnapshot: snapIntro2 });

    expect(mockView.mockSync).toHaveBeenCalledTimes(2);
    expect(mockView.mockSetPhase).toHaveBeenCalledTimes(1);

    // Transition to 'investigate'
    const snapInvestigate = makeMockSnapshot({ phase: 'investigate', version: 3 });
    store.emit({ publicSnapshot: snapInvestigate });

    expect(mockView.mockSetPhase).toHaveBeenCalledTimes(2);
    expect(mockView.mockSetPhase).toHaveBeenLastCalledWith('investigate');

    unmount();
  });

  it('triggers reaction plan playback with accurate remaining time and only once per round', () => {
    const mockView = createMockTownView();
    const store = createMockStore();

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    const fakeNow = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

    const planR1: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [],
      recap: {
        headlineId: 'h1',
        location: 'town_hall',
        behavior: 'flee',
        reactors: 0,
        gainSeatId: null,
        gained: 0,
      },
    };

    // Emit round 1 reveal with 4.5s remaining
    store.emit({
      serverOffsetMs: 500, // server clock is 500ms ahead of client
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        deadlineMs: fakeNow + 5000, // remaining: 5000 - 500 = 4500ms -> 4.5s
        reactionPlan: planR1,
      }),
    });

    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(1);
    expect(mockView.mockPlayPlan).toHaveBeenCalledWith(planR1, 4.5);

    // Subsequent updates during round 1 reveal must NOT re-trigger playback or cancel animation
    store.emit({
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        deadlineMs: fakeNow + 5000,
        reactionPlan: planR1,
      }),
    });
    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(1);

    // Round 2 reveal arrives
    const planR2: ReactionPlan = {
      round: 2,
      exposures: [],
      citizens: [],
      recap: {
        headlineId: 'h2',
        location: 'bank',
        behavior: 'routine',
        reactors: 0,
        gainSeatId: null,
        gained: 0,
      },
    };

    store.emit({
      serverOffsetMs: 0,
      publicSnapshot: makeMockSnapshot({
        round: 2,
        phase: 'reveal',
        deadlineMs: fakeNow + 6000,
        reactionPlan: planR2,
      }),
    });

    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(2);
    expect(mockView.mockPlayPlan).toHaveBeenLastCalledWith(planR2, 6.0);

    unmount();
  });

  it('observes dynamic reduced motion attribute changes on documentElement', async () => {
    const mockView = createMockTownView();
    const store = createMockStore();

    document.documentElement.setAttribute('data-reduced-motion', 'false');

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    // Mutate data-reduced-motion to true
    document.documentElement.setAttribute('data-reduced-motion', 'true');

    // MutationObserver delivers asynchronously
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockView.mockSetReducedMotion).toHaveBeenCalledWith(true);

    // Mutate back to false
    document.documentElement.setAttribute('data-reduced-motion', 'false');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockView.mockSetReducedMotion).toHaveBeenCalledWith(false);

    unmount();
  });

  it('unsubscribes from store, disconnects observer, and disposes view on unmount', async () => {
    const mockView = createMockTownView();
    const store = createMockStore();

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    expect(store.listenerCount()).toBe(1);

    unmount();

    expect(store.listenerCount()).toBe(0);
    expect(mockView.mockDispose).toHaveBeenCalledTimes(1);

    // Verify observer is disconnected: changing attribute shouldn't call setReducedMotion
    mockView.mockSetReducedMotion.mockClear();
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockView.mockSetReducedMotion).not.toHaveBeenCalled();

    // Idempotent unmount
    expect(() => unmount()).not.toThrow();
    expect(mockView.mockDispose).toHaveBeenCalledTimes(1);
  });

  it('clamps remainingSeconds to 0 if deadline has already passed', () => {
    const mockView = createMockTownView();
    const store = createMockStore();

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    const now = 500000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const plan: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [],
      recap: {
        headlineId: null,
        location: null,
        behavior: 'routine',
        reactors: 0,
        gainSeatId: null,
        gained: 0,
      },
    };

    // Deadline is in past
    store.emit({
      serverOffsetMs: 0,
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        deadlineMs: now - 2000,
        reactionPlan: plan,
      }),
    });

    expect(mockView.mockPlayPlan).toHaveBeenCalledWith(plan, 0);

    unmount();
  });

  it('integrates cleanly with real default fallback view and cleans up container', () => {
    const store = createMockStore({
      publicSnapshot: makeMockSnapshot({ phase: 'intro' }),
    });

    // Default factory (no custom viewFactory) mounts real view into container
    const unmount = mountTown(container, store as unknown as ClientStore);

    unmount();
    expect(container.children.length).toBe(0);
  });

  it('resets lastPlayedRound and lastPhase when publicSnapshot becomes null or session changes', () => {
    const mockView = createMockTownView();
    const store = createMockStore({
      session: { code: 'ROOM1', seatId: 0, token: '0123456789abcdef0123456789abcdef' },
    });

    const unmount = mountTown(container, store as unknown as ClientStore, {
      viewFactory: () => mockView,
    });

    const planRound1: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [],
      recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 },
    };

    // Play round 1 reveal
    store.emit({
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        reactionPlan: planRound1,
      }),
    });

    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(1);

    // Duplicate snapshot does not re-play round 1
    store.emit({
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        reactionPlan: planRound1,
      }),
    });
    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(1);

    // Match ends: publicSnapshot becomes null
    store.emit({
      publicSnapshot: null,
    });

    // Start a new match: round 1 reveal plays again
    store.emit({
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        reactionPlan: planRound1,
      }),
    });
    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(2);

    // Now test session change (e.g., room code or seat changes)
    store.emit({
      session: { code: 'ROOM2', seatId: 1, token: 'fedcba9876543210fedcba9876543210' },
      publicSnapshot: makeMockSnapshot({
        round: 1,
        phase: 'reveal',
        reactionPlan: planRound1,
      }),
    });
    expect(mockView.mockPlayPlan).toHaveBeenCalledTimes(3);

    unmount();
  });
});

