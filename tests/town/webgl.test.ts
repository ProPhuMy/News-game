// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  attachContextLossHandler,
  checkWebGLSupport,
  createFallbackView,
} from '../../src/client/town/webgl.ts';

describe('WebGL detection and fallback view', () => {
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
        getContext: (type: string) => (type === 'webgl2' || type === 'webgl' ? {} : null),
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
});
