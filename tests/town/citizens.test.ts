import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createSampleCharacter } from '../../src/client/town/assets/character.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { APPROVED_PALETTE, getPalette } from '../../src/client/visuals/palette.ts';
import { fakeContext } from './architecture/fake-context.ts';

vi.mock('../../src/client/town/assets/character.ts', () => ({ createSampleCharacter: vi.fn() }));
function rig() {
  return { object: new THREE.Group(), setPaper: vi.fn(), setPose: vi.fn(), dispose: vi.fn() };
}

describe('Citizen Manager', () => {
  it('keeps thirty synchronous roots and applies latest paper/position when delayed rigs arrive', async () => {
    const actors = Array.from({ length: 30 }, rig);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let index = 0;
    vi.mocked(createSampleCharacter).mockImplementation(async () => { const actor = actors[index++]!; await gate; return actor; });
    const ctx = fakeContext('b');
    const manager = createCitizenManager(undefined, undefined, undefined, { context: ctx });
    expect(manager.getAllCitizens()).toHaveLength(30);
    manager.setSeatColors({ 0: 'gold' }); manager.setCitizenPaper(0, 0, { immediate: true });
    manager.setCitizenPosition(0, new THREE.Vector3(10, 0, 15));
    manager.setCitizenRotation(0, 1.2);
    release();
    await expect(manager.whenReady()).resolves.toEqual({ degraded: [] });
    expect(createSampleCharacter).toHaveBeenCalledTimes(30);
    expect(new Set(manager.getAllCitizens().map(c => c.mesh)).size).toBe(30);
    expect(actors[0]!.setPaper).toHaveBeenLastCalledWith('gold');
    expect(actors[0]!.object.parent).toBe(manager.getCitizen(0).mesh);
    expect(manager.getCitizenPosition(0).toArray()).toEqual([10, 0, 15]);
    expect(manager.getCitizenRotation(0)).toBe(1.2);
    expect(manager.getCitizenHatColor(0)).toBe(ctx.palette.paper.gold.hex);
    manager.dispose(); manager.dispose();
    for (const actor of actors) expect(actor.dispose).toHaveBeenCalledTimes(1);
  });

  it('applies authoritative semantic paper changes immediately, including reduced motion', () => {
    const manager = createCitizenManager(undefined, undefined, undefined, { reducedMotion: true });
    expect(manager.getCitizenHatColor(0)).toBe(getPalette(APPROVED_PALETTE).unsubscribed.hex);
    manager.setCitizenPaper(0, 0);
    expect(manager.getCitizenHatColor(0)).toBe(getPalette(APPROVED_PALETTE).paper.red.hex);
    manager.setSeatColors({ 0: 'green' });
    expect(manager.getCitizenHatColor(0)).toBe(getPalette(APPROVED_PALETTE).paper.green.hex);
    manager.setCitizenPaper(0, null);
    expect(manager.getCitizenHatColor(0)).toBe(getPalette(APPROVED_PALETTE).unsubscribed.hex);
    manager.dispose();
  });

  it('releases late rigs after disposal without attaching them', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const actors = Array.from({ length: 30 }, rig); let index = 0;
    vi.mocked(createSampleCharacter).mockImplementation(async () => { const actor = actors[index++]!; await gate; return actor; });
    const scene = new THREE.Scene();
    const manager = createCitizenManager(undefined, scene, undefined, { context: fakeContext('b') });
    manager.dispose(); release();
    await expect(manager.whenReady()).rejects.toThrow('disposed');
    for (const actor of actors) { expect(actor.dispose).toHaveBeenCalledTimes(1); expect(actor.object.parent).toBeNull(); }
    expect(scene.children).toHaveLength(0);
  });

  it('rejects failed required models and frees already loaded rigs', async () => {
    const actor = rig();
    vi.mocked(createSampleCharacter).mockResolvedValue(actor).mockRejectedValueOnce(new Error('missing character'));
    const manager = createCitizenManager(createTownLayout(), undefined, undefined, { context: fakeContext('b') });
    await expect(manager.whenReady()).rejects.toThrow('missing character');
    expect(actor.dispose).toHaveBeenCalled();
  });
});

it('places all thirty home citizens on distinct, clearance-aware positions', () => {
  const manager = createCitizenManager();
  expect(new Set(manager.getAllCitizens().map(c => `${c.mesh.position.x}:${c.mesh.position.z}`)).size).toBe(30);
  manager.syncCitizens(manager.getAllCitizens().map(c => ({ id: c.id, home: c.homeNodeId, paper: null })), []);
  expect(new Set(manager.getAllCitizens().map(c => `${c.mesh.position.x}:${c.mesh.position.z}`)).size).toBe(30);
  manager.dispose();
});
