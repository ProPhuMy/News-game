import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPreviewKit } from '../../src/client/visual-test/preview-kit.ts';

describe('preview kit', () => {
  it('preserve refuses clearly instead of flattening', () => {
    expect(() => createPreviewKit(0).preserve(new THREE.MeshStandardMaterial()))
      .toThrow(/preview kit does not convert materials: MeshStandardMaterial/);
  });
});
