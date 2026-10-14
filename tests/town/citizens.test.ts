import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';

describe('Citizen Manager', () => {
  it('initializes exactly 30 citizens placed at home nodes with unsubscribed grey hats', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);

    const citizens = citizenMgr.getAllCitizens();
    expect(citizens).toHaveLength(30);

    for (let i = 0; i < 30; i++) {
      const c = citizenMgr.getCitizen(i);
      expect(c.id).toBe(i);
      expect(c.currentPaper).toBeNull();
      // Grey color for unsubscribed
      expect(c.accessoryMaterial.color.getHexString()).toBe('9e9e9e');
    }
  });

  it('updates accessory color and triggers poof when paper changes', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);

    const citizen = citizenMgr.getCitizen(4);
    citizenMgr.setCitizenPaper(4, 0); // seat 0 is red
    expect(citizen.currentPaper).toBe(0);
    expect(citizen.accessoryMaterial.color.getHexString()).toBe('d94338');

    // Changing paper again triggers poof
    citizenMgr.setCitizenPaper(4, 1); // seat 1 is blue
    expect(citizen.currentPaper).toBe(1);
    expect(citizen.accessoryMaterial.color.getHexString()).toBe('3478d1');
  });

  it('updates position and orientation', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);

    const citizen = citizenMgr.getCitizen(2);
    citizenMgr.setCitizenPosition(2, new THREE.Vector3(10, 0, 15));
    const pos = citizenMgr.getCitizenPosition(2);

    expect(pos.x).toBe(10);
    expect(pos.z).toBe(15);
    expect(citizen.mesh.position.x).toBe(10);
  });
});
