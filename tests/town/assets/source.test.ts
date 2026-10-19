import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAssetSource } from '../../../src/client/town/assets/source.ts';

afterEach(() => vi.restoreAllMocks());

function asset() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  const bone = new THREE.Bone(); bone.name = 'head';
  mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); scene.add(mesh);
  const animations = [new THREE.AnimationClip('idle', 1, [])];
  return { scene, geometry, texture, material, mesh, animations };
}

const URL = '/models/characters/kenney-mini/character-male-a.glb';
type Loaded = Awaited<ReturnType<GLTFLoader['loadAsync']>>;

describe('cached local asset source', () => {
  it('loads once and returns independent skeletons with shared geometry, maps and clips', async () => {
    const original = asset();
    const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue(original as unknown as Loaded);
    const source = createAssetSource();
    const [first, second] = await Promise.all([source.loadGltf(URL), source.loadGltf(URL)]);
    const one = first.children[0] as THREE.SkinnedMesh;
    const two = second.children[0] as THREE.SkinnedMesh;
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(URL);
    expect(first).not.toBe(second);
    expect(one.geometry).toBe(two.geometry);
    expect(one.material).toBe(two.material);
    expect(one.skeleton).not.toBe(two.skeleton);
    one.skeleton.bones[0]!.position.x = 9;
    expect(two.skeleton.bones[0]!.position.x).toBe(0);
    expect(original.mesh.skeleton.bones[0]!.position.x).toBe(0);
    expect(first.animations.map(clip => clip.name)).toEqual(['idle']);
    expect(first.animations[0]).toBe(original.animations[0]);
    first.position.x = 3;
    expect(second.position.x).toBe(0);
    one.skeleton.dispose(); two.skeleton.dispose(); source.dispose();
  });

  it('rejects external, traversing and non-model URLs before loading', async () => {
    const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
    const source = createAssetSource();
    for (const url of ['https://external.test/a.glb', '//external.test/a.glb', '/models/../a.glb',
      '/models/%2e%2e/a.glb', '/models/a.glb?remote=x', '/models/a.png', '/models/a\\b.glb']) {
      await expect(source.loadGltf(url)).rejects.toThrow('local /models/');
    }
    expect(load).not.toHaveBeenCalled(); source.dispose();
  });

  it('propagates load failure without leaving a permanently poisoned cache', async () => {
    const original = asset();
    const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockRejectedValueOnce(new Error('missing model'))
      .mockResolvedValueOnce(original as unknown as Loaded);
    const source = createAssetSource();
    await expect(source.loadGltf(URL)).rejects.toThrow('missing model');
    const instance = await source.loadGltf(URL);
    expect(instance.children).toHaveLength(1);
    expect(load).toHaveBeenCalledTimes(2);
    (instance.children[0] as THREE.SkinnedMesh).skeleton.dispose(); source.dispose();
  });

  it('disposes cache resources once even when source meshes share them', async () => {
    const original = asset();
    original.scene.add(new THREE.Mesh(original.geometry, original.material));
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue(original as unknown as Loaded);
    const geometry = vi.spyOn(original.geometry, 'dispose');
    const material = vi.spyOn(original.material, 'dispose');
    const texture = vi.spyOn(original.texture, 'dispose');
    const skeleton = vi.spyOn(original.mesh.skeleton, 'dispose');
    const source = createAssetSource();
    const instance = await source.loadGltf(URL);
    const rig = instance.children[0] as THREE.SkinnedMesh;
    const rigDispose = vi.spyOn(rig.skeleton, 'dispose');
    source.dispose(); source.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    expect(texture).toHaveBeenCalledTimes(1);
    expect(skeleton).toHaveBeenCalledTimes(1);
    expect(rigDispose).not.toHaveBeenCalled();
    rig.skeleton.dispose();
    await expect(source.loadGltf(URL)).rejects.toThrow('disposed');
  });

  it('releases late loads and rejects waiting callers after disposal', async () => {
    const original = asset();
    let resolve!: (value: Loaded) => void;
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockReturnValue(new Promise<Loaded>(done => { resolve = done; }));
    const geometry = vi.spyOn(original.geometry, 'dispose');
    const texture = vi.spyOn(original.texture, 'dispose');
    const source = createAssetSource();
    const pending = source.loadGltf(URL);
    source.dispose();
    resolve(original as unknown as Loaded);
    await expect(pending).rejects.toThrow('disposed');
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(texture).toHaveBeenCalledTimes(1);
  });
});
