import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getPalette } from '../../src/client/visuals/palette.ts';
import { createMaterialKit } from '../../src/client/town/materials.ts';

describe('sample material kit', () => {
  it('caches toon surfaces and preserves atlas, alpha, side and vertex colors', () => {
    const kit = createMaterialKit(getPalette('a'));
    const surface = kit.surface(0x123456);
    expect(surface).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(kit.surface(0x123456)).toBe(surface);
    expect(kit.surface(0x123456, { emissive: 0x123456 })).not.toBe(surface);
    const texture = new THREE.Texture();
    const source = new THREE.MeshStandardMaterial({ map: texture, color: 0x654321,
      alphaMap: texture, alphaTest: 0.4, opacity: 0.8, transparent: true, side: THREE.DoubleSide, vertexColors: true });
    const converted = kit.preserve(source);
    expect(converted).toBeInstanceOf(THREE.MeshToonMaterial);
    if (!(converted instanceof THREE.MeshToonMaterial)) throw new Error('expected toon');
    expect(converted.map).toBe(texture);
    expect(converted.color.getHex()).toBe(0x654321);
    expect(converted.alphaMap).toBe(texture);
    expect(converted.alphaTest).toBe(0.4);
    expect(converted.opacity).toBe(0.8);
    expect(converted.transparent).toBe(true);
    expect(converted.side).toBe(THREE.DoubleSide);
    expect(converted.vertexColors).toBe(true);
    expect(kit.preserve(source)).toBe(converted);
    expect(converted.gradientMap?.magFilter).toBe(THREE.NearestFilter);
    const sourceDispose = vi.spyOn(source, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const convertedDispose = vi.spyOn(converted, 'dispose');
    const gradientDispose = vi.spyOn(converted.gradientMap!, 'dispose');
    kit.dispose(); kit.dispose();
    expect(convertedDispose).toHaveBeenCalledTimes(1);
    expect(gradientDispose).toHaveBeenCalledTimes(1);
    expect(sourceDispose).not.toHaveBeenCalled(); expect(textureDispose).not.toHaveBeenCalled();
    expect(() => kit.surface(0)).toThrow('disposed');
    source.dispose(); texture.dispose();
  });

  it('names unsupported classes instead of flattening them', () => {
    const kit = createMaterialKit(getPalette('a'));
    expect(() => kit.preserve(new THREE.MeshBasicMaterial())).toThrow('MeshBasicMaterial');
    kit.dispose();
  });

  it('uses edges for open static foliage and does not duplicate outlines', () => {
    const kit = createMaterialKit(getPalette('a'));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), kit.surface(0x334455));
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    kit.outline(mesh); kit.outline(mesh);
    expect(mesh.children).toHaveLength(1);
    const outline = mesh.children[0];
    expect(outline).toBeInstanceOf(THREE.LineSegments);
    if (!(outline instanceof THREE.LineSegments)) throw new Error('expected edges');
    expect(outline.geometry.getAttribute('position').count).toBe(8);
    expect(mesh.material).toMatchObject({ polygonOffset: true });
    const edgesDispose = vi.spyOn(outline.geometry, 'dispose');
    kit.dispose();
    expect(mesh.children).toHaveLength(0);
    expect(edgesDispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).not.toHaveBeenCalled(); mesh.geometry.dispose();
  });

  it('binds animated silhouette to the same bones without owning its skeleton', () => {
    const kit = createMaterialKit(getPalette('a'));
    const mesh = new THREE.SkinnedMesh(new THREE.BoxGeometry(), kit.surface(0xffffff));
    const bone = new THREE.Bone(); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone]));
    kit.outline(mesh); kit.outline(mesh);
    const hulls = mesh.children.filter(child => child instanceof THREE.SkinnedMesh);
    expect(hulls).toHaveLength(1);
    const hull = hulls[0] as THREE.SkinnedMesh;
    expect(hull.skeleton).toBe(mesh.skeleton);
    expect(hull.geometry).toBe(mesh.geometry);
    expect(hull.bindMatrix.equals(mesh.bindMatrix)).toBe(true);
    expect(hull.material).toMatchObject({ side: THREE.BackSide });
    const skeletonDispose = vi.spyOn(mesh.skeleton, 'dispose');
    kit.dispose(); expect(skeletonDispose).not.toHaveBeenCalled();
    mesh.skeleton.dispose(); mesh.geometry.dispose();
  });
});
