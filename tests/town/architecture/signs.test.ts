import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPieceParts } from '../../../src/client/town/architecture/piece.ts';
import { createSignboard } from '../../../src/client/town/architecture/signs.ts';
import { fakeContext } from './fake-context.ts';

const rgb = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

describe('pixel signboard', () => {
  it('builds a named group with one preserved textured material', () => {
    const ctx = fakeContext();
    const sign = createSignboard(ctx, createPieceParts(ctx), 'BANK', 0.9);
    expect(sign.name).toBe('sign-BANK');
    expect(ctx.preserved).toHaveLength(1);
    const src = ctx.preserved[0] as THREE.MeshStandardMaterial;
    const tex = src.map as THREE.DataTexture;
    expect(tex.magFilter).toBe(THREE.NearestFilter);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    const px = tex.image.data as Uint8Array;
    const has = (hex: number) => {
      const [r, g, b] = rgb(hex);
      for (let i = 0; i < px.length; i += 4) if (px[i] === r && px[i + 1] === g && px[i + 2] === b && px[i + 3] === 255) return true;
      return false;
    };
    expect(has(ctx.palette.town.outline)).toBe(true);
    expect(has(ctx.palette.town.trim)).toBe(true);
  });

  it('width follows text length', () => {
    const ctx = fakeContext();
    const parts = createPieceParts(ctx);
    const w = (t: string) => new THREE.Box3().setFromObject(createSignboard(ctx, parts, t, 0.9)).getSize(new THREE.Vector3()).x;
    expect(w('CLINIC')).toBeGreaterThan(w('BANK'));
  });

  it('dispose frees texture and material once, even twice', () => {
    const ctx = fakeContext();
    const parts = createPieceParts(ctx);
    createSignboard(ctx, parts, 'BANK', 0.9);
    const src = ctx.preserved[0] as THREE.MeshStandardMaterial;
    let texN = 0;
    let matN = 0;
    src.map!.addEventListener('dispose', () => { texN++; });
    src.addEventListener('dispose', () => { matN++; });
    parts.dispose();
    parts.dispose();
    expect([texN, matN]).toEqual([1, 1]);
  });

  it('unknown characters throw', () => {
    const ctx = fakeContext();
    expect(() => createSignboard(ctx, createPieceParts(ctx), 'BAN$', 0.9)).toThrow('no glyph for "$"');
  });
});
