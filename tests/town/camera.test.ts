import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { fakeContext } from './architecture/fake-context.ts';
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

  it('stops active intro sweep when setReducedMotion(true) is called dynamically', () => {
    const cam = createTownCamera({ reducedMotion: false });
    cam.startIntroSweep(20);
    expect(cam.isSweeping()).toBe(true);

    cam.setReducedMotion(true);
    expect(cam.isSweeping()).toBe(false);
    expect(cam.getTarget().x).toBe(0);
    expect(cam.getTarget().z).toBe(0);
  });

  it('stops active intro sweep when setTarget is called early (skipping intro to investigate)', () => {
    const cam = createTownCamera({ reducedMotion: false });
    cam.startIntroSweep(20);
    expect(cam.isSweeping()).toBe(true);

    cam.setTarget(0, 0);
    expect(cam.isSweeping()).toBe(false);
  });
});


for (const [width, height] of [[1280, 720], [390, 844]]) {
  it(`frames all actual building lots at ${width}x${height}`, () => {
    const buildings = createTownBuildings(createTownLayout(), fakeContext('b'));
    const bounds = new THREE.Box3();
    // C3 places the five targets and four offices before dressing.
    for (const root of buildings.group.children.slice(0, 9)) bounds.expandByObject(root, true);
    const cam = createTownCamera(); cam.frame(bounds); cam.resize(width!, height!);
    cam.camera.updateMatrixWorld(true);
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new THREE.Vector3(x, y, z).project(cam.camera);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(0.94);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(0.94);
        expect(p.z).toBeGreaterThan(-1); expect(p.z).toBeLessThan(1);
      }
    }
    buildings.dispose();
  });
}
