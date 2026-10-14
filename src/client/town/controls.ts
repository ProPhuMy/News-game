import type { TownCamera } from './camera.ts';

export function attachTownControls(
  canvas: HTMLCanvasElement,
  camera: TownCamera,
): () => void {
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  const activePointers = new Map<number, { x: number; y: number }>();
  let lastPinchDist = 0;

  const onPointerDown = (e: PointerEvent): void => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (typeof canvas.setPointerCapture === 'function') {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignore unsupported pointer capture
        }
      }
    } else if (activePointers.size === 2) {
      isDragging = false;
      const pts = Array.from(activePointers.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1) {
        lastPinchDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
      }
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1) {
        const currentDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        if (lastPinchDist > 0) {
          const delta = (lastPinchDist - currentDist) * 0.05;
          camera.zoomBy(delta);
        }
        lastPinchDist = currentDist;
      }
    } else if (isDragging && activePointers.size === 1) {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const panFactor = 0.05 * (camera.getDistance() / 38);
      camera.panBy(-dx * panFactor, -dy * panFactor);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    activePointers.delete(e.pointerId);
    if (typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore unsupported pointer capture release
      }
    }
    if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.values())[0];
      if (remaining) {
        isDragging = true;
        lastPointerX = remaining.x;
        lastPointerY = remaining.y;
      }
    } else {
      isDragging = false;
      lastPinchDist = 0;
    }
  };

  const onWheel = (e: WheelEvent): void => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const zoomDelta = e.deltaY * 0.02;
    camera.zoomBy(zoomDelta);
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
  };
}
