import { describe, expect, it } from 'vitest';
import { createTownCamera } from '../../src/client/town/camera.ts';

describe('TownCamera', () => {
  it('initializes with ~55 degree pitch perspective camera', () => {
    const townCamera = createTownCamera();
    expect(townCamera.camera).toBeDefined();

    // Pitch ~55 degrees: camera rotation.x is negative or looks down at ~55 deg
    // 55 deg in radians is ~0.9599 rad
    const pitchRad = Math.abs(townCamera.camera.rotation.x);
    expect(pitchRad).toBeGreaterThan(0.9);
    expect(pitchRad).toBeLessThan(1.05);
  });

  it('panBy moves camera and clamps within town bounds', () => {
    const townCamera = createTownCamera();
    const initialTarget = townCamera.getTarget();

    townCamera.panBy(5, 5);
    const newTarget = townCamera.getTarget();
    expect(newTarget.x).toBe(initialTarget.x + 5);
    expect(newTarget.z).toBe(initialTarget.z + 5);

    // Extreme pan is clamped
    townCamera.panBy(1000, 1000);
    const clampedTarget = townCamera.getTarget();
    expect(clampedTarget.x).toBeLessThanOrEqual(35);
    expect(clampedTarget.z).toBeLessThanOrEqual(35);
  });

  it('zoomBy adjusts distance and clamps to min/max', () => {
    const townCamera = createTownCamera();
    const initialDist = townCamera.getDistance();

    townCamera.zoomBy(5);
    expect(townCamera.getDistance()).toBe(initialDist + 5);

    // Clamp zoom min
    townCamera.zoomBy(-100);
    expect(townCamera.getDistance()).toBeGreaterThanOrEqual(20);

    // Clamp zoom max
    townCamera.zoomBy(1000);
    expect(townCamera.getDistance()).toBeLessThanOrEqual(70);
  });

  it('intro sweep updates target across time, but reduced motion completes instantly', () => {
    const standardCam = createTownCamera({ reducedMotion: false });
    standardCam.startIntroSweep(20);
    expect(standardCam.isSweeping()).toBe(true);

    standardCam.update(5);
    expect(standardCam.isSweeping()).toBe(true);

    standardCam.update(16);
    expect(standardCam.isSweeping()).toBe(false);

    // Reduced motion
    const reducedCam = createTownCamera({ reducedMotion: true });
    reducedCam.startIntroSweep(20);
    expect(reducedCam.isSweeping()).toBe(false);
  });
});
