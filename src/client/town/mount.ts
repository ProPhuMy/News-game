import type { Phase } from '../../shared/ids.ts';
import type { ClientStore } from '../net/store.ts';
import { createTownView, type TownView, type TownViewOptions } from './index.ts';

export interface MountTownOptions extends TownViewOptions {
  viewFactory?: (options: TownViewOptions & { container: HTMLElement }) => TownView;
}

function checkReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement) {
    const attr = document.documentElement.getAttribute('data-reduced-motion');
    if (attr === 'true') return true;
    if (attr === 'false') return false;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  return false;
}

/**
 * Mounts a 3D or fallback town view into the container and binds it to ClientStore.
 * Strictly read-only subscription to store updates: never invokes store actions.
 * Returns a cleanup function that disposes the view, observer, and store listener.
 */
export function mountTown(
  container: HTMLElement,
  store: ClientStore,
  options?: MountTownOptions,
): () => void {
  const initialReducedMotion = options?.reducedMotion ?? checkReducedMotion();
  const factory = options?.viewFactory ?? createTownView;

  const view: TownView = factory({
    container,
    ...options,
    reducedMotion: initialReducedMotion,
  });

  let lastPhase: Phase | null = null;
  let lastPlayedRound = -1;
  let lastSessionKey: string | null = null;

  let observer: MutationObserver | null = null;
  if (
    typeof MutationObserver !== 'undefined' &&
    typeof document !== 'undefined' &&
    document.documentElement
  ) {
    observer = new MutationObserver(() => {
      view.setReducedMotion(checkReducedMotion());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduced-motion'],
    });
  }

  const mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  const onMediaChange = () => {
    view.setReducedMotion(checkReducedMotion());
  };

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onMediaChange);
    } else if (
      typeof (mediaQuery as unknown as { addListener?: (fn: () => void) => void }).addListener ===
      'function'
    ) {
      (mediaQuery as unknown as { addListener: (fn: () => void) => void }).addListener(
        onMediaChange,
      );
    }
  }

  const handleUpdate = () => {
    const state = store.getState();
    const currentSessionKey = state.session ? `${state.session.code}:${state.session.seatId}` : null;
    const sessionChanged = lastSessionKey !== null && currentSessionKey !== lastSessionKey;
    lastSessionKey = currentSessionKey;

    if (!state.publicSnapshot || sessionChanged) {
      lastPhase = null;
      lastPlayedRound = -1;
      if (!state.publicSnapshot) {
        return;
      }
    }

    const snapshot = state.publicSnapshot;
    if (snapshot.round < lastPlayedRound) {
      lastPlayedRound = -1;
    }

    // Avoid aborting an active reveal playback on duplicate snapshot events of the same round
    const isSameRevealRound =
      snapshot.phase === 'reveal' && snapshot.reactionPlan?.round === lastPlayedRound;

    if (!isSameRevealRound) {
      view.syncFromSnapshot(snapshot);
    }

    if (snapshot.phase !== lastPhase) {
      lastPhase = snapshot.phase;
      view.setPhase(snapshot.phase);
    }

    if (snapshot.phase === 'reveal' && snapshot.reactionPlan) {
      if (snapshot.reactionPlan.round !== lastPlayedRound) {
        lastPlayedRound = snapshot.reactionPlan.round;
        const serverOffsetMs = state.serverOffsetMs ?? 0;
        const remainingSeconds = Math.max(
          0,
          (snapshot.deadlineMs - (Date.now() + serverOffsetMs)) / 1000,
        );
        view.playReactionPlan(snapshot.reactionPlan, remainingSeconds).catch(() => {});
      }
    }
  };

  const unsubscribe = store.subscribe(handleUpdate);
  handleUpdate();

  let cleanedUp = false;
  return () => {
    if (cleanedUp) return;
    cleanedUp = true;

    unsubscribe();

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onMediaChange);
      } else if (
        typeof (
          mediaQuery as unknown as { removeListener?: (fn: () => void) => void }
        ).removeListener === 'function'
      ) {
        (
          mediaQuery as unknown as { removeListener: (fn: () => void) => void }
        ).removeListener(onMediaChange);
      }
    }

    view.dispose();
  };
}
