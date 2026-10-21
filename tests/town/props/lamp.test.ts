import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../../src/client/town/buildings.ts';
import { createTownLayout } from '../../../src/client/town/layout.ts';
import { LAMP_POOL_MAX_OPACITY, createGasLamp } from '../../../src/client/town/props/street.ts';
import { fakeContext } from '../architecture/fake-context.ts';

const pool = (root: THREE.Object3D) => root.getObjectByName('lamp-pool') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
const snapshot = (root: THREE.Object3D) => {
  const out: string[] = [];
  root.traverse((o) => out.push(`${o.name}|${o.position.toArray()}|${o.rotation.toArray()}|${o.scale.toArray()}|${o.visible}`));
  return out;
};

describe('gas lamp glow (interface §5c)', () => {
  it('has an unlit, unshadowed ground pool with its own additive material in the lamp color', () => {
    const ctx = fakeContext('b');
    const lamp = createGasLamp(ctx);
    const p = pool(lamp.object);
    expect(p).toBeDefined();
    expect(ctx.kitMaterials.has(p.material)).toBe(false);
    expect(p.material.blending).toBe(THREE.AdditiveBlending);
    expect(p.material.transparent).toBe(true);
    expect(p.material.depthWrite).toBe(false);
    expect(p.material.opacity).toBe(0);
    expect(p.material.color.getHex()).toBe(ctx.palette.town.lampGlow);
    expect(p.castShadow).toBe(false);
    expect(p.receiveShadow).toBe(false);
  });

  it('pool fades softly toward its edge (alpha map), so it reads as light, not a disc', () => {
    const p = pool(createGasLamp(fakeContext('b')).object);
    const map = p.material.alphaMap as THREE.DataTexture;
    expect(map).toBeTruthy();
    const { width, height, data } = map.image as { width: number; height: number; data: Uint8Array };
    const at = (x: number, y: number) => data[(y * width + x) * 4]!;
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    expect(at(cx, cy)).toBeGreaterThan(200);
    expect(at(cx + Math.floor(width / 4), cy)).toBeLessThan(at(cx, cy));
    expect(at(width - 1, cy)).toBe(0);
  });

  it('setLevel changes only the pool opacity, clamped to 0..1', () => {
    const lamp = createGasLamp(fakeContext('b'));
    const before = snapshot(lamp.object);
    lamp.setLevel(0.5);
    expect(pool(lamp.object).material.opacity).toBeCloseTo(LAMP_POOL_MAX_OPACITY / 2);
    lamp.setLevel(2);
    expect(pool(lamp.object).material.opacity).toBeCloseTo(LAMP_POOL_MAX_OPACITY);
    lamp.setLevel(-1);
    expect(pool(lamp.object).material.opacity).toBe(0);
    expect(snapshot(lamp.object)).toEqual(before);
  });

  it('frees the pool once and ignores setLevel after dispose', () => {
    const lamp = createGasLamp(fakeContext('b'));
    const p = pool(lamp.object);
    const material = vi.spyOn(p.material, 'dispose');
    const geometry = vi.spyOn(p.geometry, 'dispose');
    lamp.dispose();
    lamp.dispose();
    expect(() => lamp.setLevel(1)).not.toThrow();
    expect(p.material.opacity).toBe(0);
    expect(material).toHaveBeenCalledTimes(1);
    expect(geometry).toHaveBeenCalledTimes(1);
  });
});

describe('TownBuildings.setLampLevel', () => {
  it('lights every lamp in the town and is safe after dispose', () => {
    const town = createTownBuildings(createTownLayout(), fakeContext('b'));
    const pools: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
    town.group.traverse((o) => { if (o.name === 'lamp-pool') pools.push(o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>); });
    expect(pools.length).toBeGreaterThan(10);
    town.setLampLevel?.(1);
    for (const p of pools) expect(p.material.opacity).toBeCloseTo(LAMP_POOL_MAX_OPACITY);
    town.dispose();
    expect(town.setLampLevel).toBeTypeOf('function');
    expect(() => town.setLampLevel?.(0)).not.toThrow();
  });
});
