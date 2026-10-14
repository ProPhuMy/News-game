import { useSyncExternalStore } from 'react';

// The town (src/client/town/webgl.ts) mounts this element in its container
// whenever WebGL is unavailable or the context is lost.
const FALLBACK_SELECTOR = '.town-fallback-container';
const TOWN_CONTAINER_ID = 'town-canvas-container';

function isTownFallback(): boolean {
  return document.querySelector(FALLBACK_SELECTOR) !== null;
}

function subscribe(onChange: () => void): () => void {
  const container = document.getElementById(TOWN_CONTAINER_ID);
  const target = container ?? document.body;
  const observer = new MutationObserver(onChange);
  // The fallback view is a direct child of the town container, so childList is enough there.
  observer.observe(target, { childList: true, subtree: container === null });
  return () => observer.disconnect();
}

export function useTownFallback(): boolean {
  return useSyncExternalStore(subscribe, isTownFallback, () => false);
}
