import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPoofEffect } from '../../src/client/town/particles.ts';

describe('Poof Particle Effect', () => {
  it('spawns particles in scene on triggerPoof and cleans up after duration', () => {
    const scene = new THREE.Scene();
    const poof = createPoofEffect(scene);

    const initialChildren = scene.children.length;
    poof.triggerPoof(new THREE.Vector3(0, 1, 0), 0xd94338, false);

    expect(scene.children.length).toBeGreaterThan(initialChildren);

    // Advance time past puff lifetime (0.5s)
    poof.update(0.6);

    // Particles should be deactivated or removed
    expect(poof.getActiveCount()).toBe(0);
  });

  it('respects reduced motion by skipping particle spawning', () => {
    const scene = new THREE.Scene();
    const poof = createPoofEffect(scene);

    poof.triggerPoof(new THREE.Vector3(0, 1, 0), 0x3478d1, true);
    expect(poof.getActiveCount()).toBe(0);
  });
});

it('clears active motion without releasing reusable particle geometry', () => {
  const scene = new THREE.Scene(); const poof = createPoofEffect(scene);
  const released = vi.spyOn(poof.getSharedGeometry(), 'dispose');
  poof.triggerPoof(new THREE.Vector3());
  poof.clear();
  expect(poof.getActiveCount()).toBe(0);
  expect(scene.children).toHaveLength(0);
  expect(released).not.toHaveBeenCalled();
  poof.triggerPoof(new THREE.Vector3());
  expect(poof.getActiveCount()).toBeGreaterThan(0);
  poof.dispose();
});
