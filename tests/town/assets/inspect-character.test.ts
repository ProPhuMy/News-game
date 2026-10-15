import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { inspectCharacter } from '../../../src/client/town/assets/inspect-character.ts';

describe('inspectCharacter', () => {
  it('measures actual mesh triangles, world bounds, bones and unique materials without modifying the model', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), material);
    mesh.position.set(0, 2, 0);
    root.add(mesh);
    const head = new THREE.Bone(); head.name = 'head'; root.add(head);
    const result = inspectCharacter(root, []);
    expect(result.triangles).toBe(12);
    expect(result.materials).toBe(1);
    expect(result.bounds.height).toBe(4);
    expect(result.bounds.width).toBe(2);
    expect(result.bounds.depth).toBe(6);
    expect(result.bones).toEqual(['head']);
    expect(root.children).toEqual([mesh, head]);
    mesh.geometry.dispose(); material.dispose();
  });

  it('reports missing animation bindings instead of certifying an incompatible clip', () => {
    const root = new THREE.Group();
    const head = new THREE.Bone(); head.name = 'head'; root.add(head);
    const clips = [new THREE.AnimationClip('nod', 1, [
      new THREE.NumberKeyframeTrack('head.rotation[x]', [0, 1], [0, 0.5]),
      new THREE.NumberKeyframeTrack('missing.position[x]', [0, 1], [0, 1]),
    ])];
    const result = inspectCharacter(root, clips);
    expect(result.clips).toEqual([{ name: 'nod', duration: 1, tracks: 2, unboundTracks: ['missing.position[x]'] }]);
  });

  it('counts non-indexed triangles and shared material once for multiple meshes', () => {
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry().toNonIndexed();
    const material = new THREE.MeshBasicMaterial();
    root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    expect(inspectCharacter(root, []).triangles).toBe(24);
    expect(inspectCharacter(root, []).materials).toBe(1);
    geometry.dispose(); material.dispose();
  });
});
