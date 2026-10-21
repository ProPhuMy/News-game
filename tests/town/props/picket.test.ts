import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SIGN_GLYPHS } from '../../../src/client/town/architecture/signs.ts';
import { PICKET_SIGN_TEXTS, createPicketSignKit } from '../../../src/client/town/props/picket.ts';
import { fakeContext, meshes, townHexes } from '../architecture/fake-context.ts';

const resources = (object: THREE.Object3D) => {
  const out = new Set<{ dispose(): void }>();
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    out.add(mesh.geometry);
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material.map) out.add(material.map);
  });
  return out;
};

describe('picket sign kit (interface §5c, as amended by Codex)', () => {
  it('has short family-friendly slogans in the pixel font', () => {
    expect(PICKET_SIGN_TEXTS.length).toBeGreaterThanOrEqual(3);
    for (const text of PICKET_SIGN_TEXTS) {
      expect(text.length, text).toBeLessThanOrEqual(6);
      for (const ch of text) expect(SIGN_GLYPHS[ch], `${text}: ${ch}`).toBeDefined();
    }
  });

  it.each(PICKET_SIGN_TEXTS)('"%s" holds at the grip: board above it facing +Z, about 1.3 tall', (text) => {
    const kit = createPicketSignKit(fakeContext('b'));
    const sign = kit.create(text);
    sign.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sign);
    expect(box.min.y).toBeLessThan(0);
    expect(box.max.y - box.min.y).toBeGreaterThanOrEqual(1.2);
    expect(box.max.y - box.min.y).toBeLessThanOrEqual(1.4);
    const face = sign.getObjectByName(`sign-face-${text}`)!;
    expect(new THREE.Box3().setFromObject(face).getCenter(new THREE.Vector3()).z).toBeGreaterThan(0);
    expect(new THREE.Box3().setFromObject(face).min.y).toBeGreaterThan(0.5);
    kit.dispose();
  });

  it('clones of one text share every resource with a single original', () => {
    const kit = createPicketSignKit(fakeContext('b'));
    const a = kit.create(PICKET_SIGN_TEXTS[0]!);
    const b = kit.create(PICKET_SIGN_TEXTS[0]!);
    expect(a).not.toBe(b);
    expect([...resources(a)]).toEqual([...resources(b)]);
    kit.dispose();
  });

  it('two kits never share resources; disposing one leaves the other intact', () => {
    const one = createPicketSignKit(fakeContext('b'));
    const two = createPicketSignKit(fakeContext('b'));
    const a = one.create(PICKET_SIGN_TEXTS[0]!);
    const b = two.create(PICKET_SIGN_TEXTS[0]!);
    const shared = [...resources(a)].filter((r) => resources(b).has(r));
    expect(shared).toEqual([]);
    const spies = [...resources(b)].map((r) => vi.spyOn(r, 'dispose'));
    one.dispose();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    two.dispose();
  });

  it('dispose detaches every clone, frees each resource once, and is idempotent', () => {
    const kit = createPicketSignKit(fakeContext('b'));
    const actor = new THREE.Group();
    const signs = [kit.create(PICKET_SIGN_TEXTS[0]!), kit.create(PICKET_SIGN_TEXTS[0]!), kit.create(PICKET_SIGN_TEXTS[1]!)];
    for (const sign of signs) actor.add(sign);
    const spies = [...new Set(signs.flatMap((s) => [...resources(s)]))].map((r) => vi.spyOn(r, 'dispose'));
    kit.dispose();
    kit.dispose();
    expect(actor.children).toHaveLength(0);
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(() => kit.create(PICKET_SIGN_TEXTS[0]!)).toThrow(/disposed/);
  });

  it('rejects text outside the slogan list', () => {
    const kit = createPicketSignKit(fakeContext('b'));
    expect(() => kit.create('HELLO')).toThrow(/not a picket slogan/);
    kit.dispose();
  });

  it('uses palette surfaces and outlines each original once', () => {
    const ctx = fakeContext('b');
    const kit = createPicketSignKit(ctx);
    const sign = kit.create(PICKET_SIGN_TEXTS[0]!);
    kit.create(PICKET_SIGN_TEXTS[0]!);
    const allowed = townHexes(ctx);
    for (const call of ctx.surfaces) expect(allowed).toContain(call.hex);
    expect(ctx.outlined).toHaveLength(1);
    expect(meshes(sign).length).toBeGreaterThanOrEqual(3);
    kit.dispose();
  });
});
