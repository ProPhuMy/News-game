// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachContextLossHandler,
  checkWebGLSupport,
  createFallbackView,
  isWebGL2Supported,
} from '../../src/client/town/webgl.ts';

const noticeHeightProperty = '--nt-town-fallback-height';

afterEach(() => {
  document.documentElement.style.removeProperty(noticeHeightProperty);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function observeNoticeHeight(initial: number) {
  let height = initial;
  const callbacks: (() => void)[] = [];
  const observed: Element[] = [];
  const disconnect = vi.fn();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 390, height));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { callbacks.push(callback); }
    observe(element: Element) { observed.push(element); }
    disconnect = disconnect;
  });
  return { observed, disconnect, resize(next: number) { height = next; callbacks.forEach(callback => callback()); } };
}

describe('WebGL detection and fallback view', () => {
  it('checks specifically for WebGL2 support', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation(
      (type) => (type === 'webgl2' ? null : ({} as RenderingContext)),
    );
    expect(isWebGL2Supported(canvas)).toBe(false);
  });

  it('isWebGL2Supported returns true when webgl2 context is available', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation(
      (type) => (type === 'webgl2' ? ({} as RenderingContext) : null),
    );
    expect(isWebGL2Supported(canvas)).toBe(true);
  });

  it('checkWebGLSupport returns false when canvas context returns null', () => {
    const mockDoc = {
      createElement: () => ({
        getContext: () => null,
      }),
    } as unknown as Document;

    expect(checkWebGLSupport(mockDoc)).toBe(false);
  });

  it('checkWebGLSupport returns true when webgl context is returned', () => {
    const mockDoc = {
      createElement: () => ({
        getContext: (type: string) => (type === 'webgl2' ? {} : null),
      }),
    } as unknown as Document;

    expect(checkWebGLSupport(mockDoc)).toBe(true);
  });

  it('createFallbackView mounts accessible message and cleans up on dispose', () => {
    const container = document.createElement('div');
    const fallback = createFallbackView(container);

    expect(container.children.length).toBe(1);
    const element = container.firstElementChild as HTMLElement;
    expect(element.getAttribute('role')).toBe('status');
    expect(element.textContent).toContain('3D town view unavailable');
    expect(element.textContent).toContain('playable via the game panels');

    fallback.dispose();
    expect(container.children.length).toBe(0);
  });

  it('createFallbackView triggers onRetry callback when retry button clicked', () => {
    const container = document.createElement('div');
    const onRetry = vi.fn();
    const fallback = createFallbackView(container, onRetry);

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    button?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);

    fallback.dispose();
  });

  it('reserves the complete measured notice and follows reflow', () => {
    const measurement = observeNoticeHeight(118.25);
    const container = document.createElement('div');
    const fallback = createFallbackView(container);
    try {
      expect(document.documentElement.style.getPropertyValue(noticeHeightProperty)).toBe('119px');
      expect(measurement.observed).toEqual([fallback.element]);
      expect(fallback.element.parentElement).toBe(container);
      measurement.resize(207.5);
      expect(document.documentElement.style.getPropertyValue(noticeHeightProperty)).toBe('208px');
    } finally { fallback.dispose(); }
  });

  it.each(['', '37px'])('restores prior notice space on dispose and ignores queued resize: %s', previous => {
    const measurement = observeNoticeHeight(140);
    const style = document.documentElement.style;
    if (previous) style.setProperty(noticeHeightProperty, previous, 'important');
    const fallback = createFallbackView(document.createElement('div'));
    fallback.dispose();
    fallback.dispose();
    expect(measurement.disconnect).toHaveBeenCalledTimes(1);
    expect(style.getPropertyValue(noticeHeightProperty)).toBe(previous);
    expect(style.getPropertyPriority(noticeHeightProperty)).toBe(previous ? 'important' : '');
    measurement.resize(300);
    expect(style.getPropertyValue(noticeHeightProperty)).toBe(previous);
    expect(fallback.element.parentElement).toBeNull();
  });

  it('keeps the notice measured on window resize without ResizeObserver', () => {
    const measurement = observeNoticeHeight(120);
    vi.stubGlobal('ResizeObserver', undefined);
    const fallback = createFallbackView(document.createElement('div'));
    try {
      expect(document.documentElement.style.getPropertyValue(noticeHeightProperty)).toBe('120px');
      measurement.resize(190);
      window.dispatchEvent(new Event('resize'));
      expect(document.documentElement.style.getPropertyValue(noticeHeightProperty)).toBe('190px');
    } finally { fallback.dispose(); }
    window.dispatchEvent(new Event('resize'));
    expect(document.documentElement.style.getPropertyValue(noticeHeightProperty)).toBe('');
  });

  it('attachContextLossHandler registers listeners and returns unbind cleanup', () => {
    const canvas = document.createElement('canvas');
    const onRestore = vi.fn();

    const cleanup = attachContextLossHandler(canvas, onRestore);

    const lostEvent = new Event('webglcontextlost');
    canvas.dispatchEvent(lostEvent);

    const restoredEvent = new Event('webglcontextrestored');
    canvas.dispatchEvent(restoredEvent);

    expect(onRestore).toHaveBeenCalledTimes(1);

    cleanup();
    canvas.dispatchEvent(restoredEvent);
    expect(onRestore).toHaveBeenCalledTimes(1); // not called again after unbind
  });

  it('supports onLost and onRestore callbacks object in attachContextLossHandler', () => {
    const canvas = document.createElement('canvas');
    const onLost = vi.fn();
    const onRestore = vi.fn();

    const cleanup = attachContextLossHandler(canvas, { onLost, onRestore });

    const lostEvent = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lostEvent);
    expect(lostEvent.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledTimes(1);

    const restoredEvent = new Event('webglcontextrestored');
    canvas.dispatchEvent(restoredEvent);
    expect(onRestore).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
