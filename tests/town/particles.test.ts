import { describe, expect, it } from 'vitest';
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
