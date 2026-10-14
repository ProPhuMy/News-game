// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownView } from '../../src/client/town/index.ts';
import { createTownCamera } from '../../src/client/town/camera.ts';
import { attachTownControls } from '../../src/client/town/controls.ts';

describe('TownView Camera Controls (pan and zoom)', () => {
  it('configures touch-action: none, pans and zooms camera, and removes listeners on cleanup', () => {
    const mockCanvas = document.createElement('canvas');
    const camera = createTownCamera();

    const initialDistance = camera.getDistance();
    const initialTarget = { ...camera.getTarget() };

    const detach = attachTownControls(mockCanvas, camera);

    // Touch-action must be 'none' to prevent mobile browser gestures from interrupting controls
    expect(mockCanvas.style.touchAction).toBe('none');

    // 1. Pointer drag pans camera
    const pointerDown = new PointerEvent('pointerdown', {
      clientX: 200,
      clientY: 200,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerDown);

    const pointerMove = new PointerEvent('pointermove', {
      clientX: 250,
      clientY: 260,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerMove);

    const pannedTarget = { ...camera.getTarget() };
    expect(pannedTarget.x).not.toBe(initialTarget.x);
    expect(pannedTarget.z).not.toBe(initialTarget.z);

    const pointerUp = new PointerEvent('pointerup', {
      clientX: 250,
      clientY: 260,
      pointerId: 1,
      bubbles: true,
    });
    mockCanvas.dispatchEvent(pointerUp);

    // 2. Mouse wheel zooms camera
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    mockCanvas.dispatchEvent(wheelEvent);

    const zoomedDistance = camera.getDistance();
    expect(zoomedDistance).toBeGreaterThan(initialDistance);

    // 3. Detach controls and restore touch-action
    detach();
    expect(mockCanvas.style.touchAction).toBe('');

    // After cleanup, dispatching drag and wheel should NOT change camera target or distance
    mockCanvas.dispatchEvent(pointerDown);
    mockCanvas.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 300, clientY: 350, pointerId: 1, bubbles: true }),
    );
    mockCanvas.dispatchEvent(pointerUp);
    mockCanvas.dispatchEvent(wheelEvent);

    expect(camera.getTarget().x).toBe(pannedTarget.x);
    expect(camera.getTarget().z).toBe(pannedTarget.z);
    expect(camera.getDistance()).toBe(zoomedDistance);
  });

  it('wires controls via createTownView and cleans up touch-action on view.dispose()', () => {
    const container = document.createElement('div');
    const mockCanvas = document.createElement('canvas');
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

    expect(mockCanvas.style.touchAction).toBe('none');

    view.dispose();
    expect(mockCanvas.style.touchAction).toBe('');
  });
});
