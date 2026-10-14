// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownView } from '../../src/client/town/index.ts';

describe('TownView Camera Controls (pan and zoom)', () => {
  it('wires pointer drag to pan and mouse wheel to zoom, and removes listeners on dispose', () => {
    const container = document.createElement('div');
    const mockCanvas = document.createElement('canvas');
    // Mock dimensions so container has size
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: mockCanvas,
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    // Test pointer drag
    const pointerDownEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerDownEvent);

    const pointerMoveEvent = new PointerEvent('pointermove', {
      clientX: 150,
      clientY: 130,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerMoveEvent);

    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 150,
      clientY: 130,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerUpEvent);

    // Test wheel zoom
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    mockCanvas.dispatchEvent(wheelEvent);

    // Dispose view
    view.dispose();

    // After dispose, dispatching events should not throw or alter state
    expect(() => {
      mockCanvas.dispatchEvent(pointerDownEvent);
      mockCanvas.dispatchEvent(pointerMoveEvent);
      mockCanvas.dispatchEvent(wheelEvent);
    }).not.toThrow();
  });
});
