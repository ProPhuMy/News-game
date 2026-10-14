/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useTownFallback } from '../../src/client/ui/hooks/useTownFallback';

function makeTownContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'town-canvas-container';
  document.body.appendChild(container);
  return container;
}

function makeFallback(): HTMLElement {
  const fallback = document.createElement('div');
  fallback.className = 'town-fallback-container';
  return fallback;
}

describe('useTownFallback', () => {
  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
  });

  it('returns false when the town container has no fallback view', () => {
    makeTownContainer();
    const { result } = renderHook(() => useTownFallback());
    expect(result.current).toBe(false);
  });

  it('returns true when the fallback view is already mounted', () => {
    makeTownContainer().appendChild(makeFallback());
    const { result } = renderHook(() => useTownFallback());
    expect(result.current).toBe(true);
  });

  it('turns true when the WebGL context is lost after mount', async () => {
    const container = makeTownContainer();
    const { result } = renderHook(() => useTownFallback());
    container.appendChild(makeFallback());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('turns false when the WebGL context is restored after mount', async () => {
    const container = makeTownContainer();
    const fallback = makeFallback();
    container.appendChild(fallback);
    const { result } = renderHook(() => useTownFallback());
    container.removeChild(fallback);
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false when there is no town container', () => {
    const { result } = renderHook(() => useTownFallback());
    expect(result.current).toBe(false);
  });
});
