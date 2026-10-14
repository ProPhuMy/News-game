// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createParticleSystem } from '../../src/client/town/particles.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';
import { createBubbleManager } from '../../src/client/town/bubbles.ts';

describe('Town Performance & Resource Lifecycle', () => {
  describe('Particle System', () => {
    it('does not dispose shared particle geometry on single particle expiry, only on system teardown', () => {
      const particles = createParticleSystem();
      particles.createBurst({ x: 0, y: 1, z: 0 });
      const disposeSpy = vi.spyOn(particles.getSharedGeometry(), 'dispose');

      particles.update(2.0); // particle expires
      expect(disposeSpy).not.toHaveBeenCalled();

      particles.dispose(); // full system teardown
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Route Interpolator Vector & Length Precomputation', () => {
    it('precomputes cumulative route lengths on setRoute', () => {
      const layout = createTownLayout();
      const interpolator = createRouteInterpolator(layout);
      const route = ['r0c0', 'r0c1', 'r0c2'];

      const prepared = interpolator.setRoute(route);
      expect(prepared.segmentLengths.length).toBe(2);
      expect(prepared.cumulativeLengths.length).toBe(2);
      expect(prepared.totalLength).toBeGreaterThan(0);
      expect(prepared.cumulativeLengths[1]).toBeCloseTo(prepared.totalLength, 4);
    });

    it('reuses scratch THREE.Vector3 buffer during interpolation frames', () => {
      const layout = createTownLayout();
      const interpolator = createRouteInterpolator(layout);
      const route = ['r0c0', 'r0c1'];

      const stateA = interpolator.interpolateRoute(route, 0.2);
      const posA = stateA.position;
      const xA = posA.x;

      const stateB = interpolator.interpolateRoute(route, 0.8);
      const posB = stateB.position;

      // Both references point to the reused scratch Vector3
      expect(posA).toBe(posB);
      expect(posB.x).not.toBeCloseTo(xA, 2);
    });
  });

  describe('Bubble Manager Projection Buffer Reuse', () => {
    it('does not clone anchor vector per frame update', () => {
      const container = document.createElement('div');
      const camera = new THREE.PerspectiveCamera(60, 1.33, 0.1, 1000);
      camera.position.set(0, 5, 10);
      camera.lookAt(0, 0, 0);

      const manager = createBubbleManager(container, camera);
      const anchorPos = new THREE.Vector3(0, 0, 0);
      const cloneSpy = vi.spyOn(anchorPos, 'clone');

      manager.showBubble(1, 'Hello world', () => anchorPos);
      manager.update();

      expect(cloneSpy).not.toHaveBeenCalled();
      manager.dispose();
    });
  });
});
