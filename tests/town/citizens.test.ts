import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createCitizenManager,
  PAPER_COLOR_HEX,
  PAPER_GREY_HEX,
} from '../../src/client/town/citizens.ts';
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
      expect(citizenMgr.getCitizenHatColor(i)).toBe(PAPER_GREY_HEX);
      expect(c.accessoryMaterial.color.getHex()).toBe(PAPER_GREY_HEX);

      // No accessory icons active when unsubscribed
      expect(c.mesh.getObjectByName('accessory-feather')?.visible).toBe(false);
      expect(c.mesh.getObjectByName('accessory-horn')?.visible).toBe(false);
      expect(c.mesh.getObjectByName('accessory-ring')?.visible).toBe(false);
      expect(c.mesh.getObjectByName('accessory-star')?.visible).toBe(false);
    }
  });

  it('updates accessory color and triggers poof when paper changes', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);

    const citizen = citizenMgr.getCitizen(4);
    citizenMgr.setCitizenPaper(4, 0); // seat 0 is default red
    expect(citizen.currentPaper).toBe(0);
    expect(citizenMgr.getCitizenHatColor(4)).toBe(PAPER_COLOR_HEX.red);
    expect(citizen.mesh.getObjectByName('accessory-feather')?.visible).toBe(true);
    expect(citizen.mesh.getObjectByName('accessory-horn')?.visible).toBe(false);

    // Changing paper again triggers poof and changes color + accessory
    citizenMgr.setCitizenPaper(4, 1); // seat 1 is default blue
    expect(citizen.currentPaper).toBe(1);
    expect(citizenMgr.getCitizenHatColor(4)).toBe(PAPER_COLOR_HEX.blue);
    expect(citizen.mesh.getObjectByName('accessory-feather')?.visible).toBe(false);
    expect(citizen.mesh.getObjectByName('accessory-horn')?.visible).toBe(true);

    // Unsubscribing resets to grey and hides all accessories
    citizenMgr.setCitizenPaper(4, null);
    expect(citizen.currentPaper).toBeNull();
    expect(citizenMgr.getCitizenHatColor(4)).toBe(PAPER_GREY_HEX);
    expect(citizen.mesh.getObjectByName('accessory-horn')?.visible).toBe(false);
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

  it('maps seat colors to paper colors and updates citizen hat colors accordingly', () => {
    const manager = createCitizenManager();
    // Seat 0 assigned gold instead of default red
    manager.setSeatColors({ 0: 'gold', 1: 'blue', 2: 'green', 3: 'red' });
    manager.setCitizenPaper(0, 0); // citizen 0 reads seat 0
    const color = manager.getCitizenHatColor(0);
    expect(color).toBe(PAPER_COLOR_HEX.gold); // 0xd4ac0d
    const c0 = manager.getCitizen(0);
    expect(c0.mesh.getObjectByName('accessory-star')?.visible).toBe(true);
    expect(c0.mesh.getObjectByName('accessory-feather')?.visible).toBe(false);
  });

  it('updates already-subscribed citizens dynamically when seat colors change', () => {
    const manager = createCitizenManager();
    // Initially default colors: seat 0 is red, seat 1 is blue
    manager.setCitizenPaper(0, 0);
    expect(manager.getCitizenHatColor(0)).toBe(PAPER_COLOR_HEX.red);
    const c0 = manager.getCitizen(0);
    expect(c0.mesh.getObjectByName('accessory-feather')?.visible).toBe(true);

    // Swap seat 0 to green
    manager.setSeatColors({ 0: 'green', 1: 'blue', 2: 'red', 3: 'gold' });
    expect(manager.getCitizenHatColor(0)).toBe(PAPER_COLOR_HEX.green);
    expect(c0.mesh.getObjectByName('accessory-feather')?.visible).toBe(false);
    expect(c0.mesh.getObjectByName('accessory-ring')?.visible).toBe(true);
  });

  it('provides distinctive visual accessories for all 4 paper colors', () => {
    const manager = createCitizenManager();
    manager.setSeatColors({ 0: 'red', 1: 'blue', 2: 'green', 3: 'gold' });

    manager.setCitizenPaper(0, 0); // red: feather
    manager.setCitizenPaper(1, 1); // blue: horn
    manager.setCitizenPaper(2, 2); // green: ring
    manager.setCitizenPaper(3, 3); // gold: star

    expect(manager.getCitizen(0).mesh.getObjectByName('accessory-feather')?.visible).toBe(true);
    expect(manager.getCitizen(1).mesh.getObjectByName('accessory-horn')?.visible).toBe(true);
    expect(manager.getCitizen(2).mesh.getObjectByName('accessory-ring')?.visible).toBe(true);
    expect(manager.getCitizen(3).mesh.getObjectByName('accessory-star')?.visible).toBe(true);
  });
});


