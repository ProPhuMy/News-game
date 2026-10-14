import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyCitizenBehaviorPose } from '../../src/client/town/behaviors.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { BEHAVIORS } from '../../src/shared/ids.ts';

describe('Citizen Behaviors', () => {
  it('applies pose deformation or bobbing across all 8 behavior states without throwing', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const citizen = citizenMgr.getCitizen(0);

    for (const b of BEHAVIORS) {
      expect(() => applyCitizenBehaviorPose(citizen, b, 0.5)).not.toThrow();
    }
  });

  it('differentiates motion between routine and agitated angry_mob', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const citizen = citizenMgr.getCitizen(1);

    applyCitizenBehaviorPose(citizen, 'routine', 0.25);
    const routineY = citizen.mesh.position.y;

    applyCitizenBehaviorPose(citizen, 'angry_mob', 0.25);
    const mobY = citizen.mesh.position.y;

    expect(mobY).not.toBe(routineY);
  });
});
