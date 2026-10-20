import { CITIZEN_REFERENCE_HEIGHT } from '../../../src/client/town/architecture/piece.ts';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getPalette } from '../../../src/client/visuals/palette.ts';
import type { ArchitectureContext } from '../../../src/client/visuals/town-types.ts';
import { createMaterialKit } from '../../../src/client/town/materials.ts';
import { createSampleCharacter } from '../../../src/client/town/assets/character.ts';

function setup() {
  const model = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.4, 1, 0.3);
  geometry.translate(0, 0.5, 0);
  const source = new THREE.MeshStandardMaterial();
  model.add(new THREE.Mesh(geometry, source));
  const head = new THREE.Bone(); head.name = 'head'; head.position.y = 0.8;
  const left = new THREE.Bone(); left.name = 'arm-left';
  const right = new THREE.Bone(); right.name = 'arm-right';
  model.add(head, left, right);
  model.animations = ['idle', 'walk', 'sprint'].map((name, index) => new THREE.AnimationClip(name, 1, [
    new THREE.NumberKeyframeTrack('head.position[x]', [0, 1], [0, index + 1]),
  ]));
  const materials = createMaterialKit(getPalette('a'));
  const ctx: ArchitectureContext = { palette: getPalette('a'), materials,
    assets: { loadGltf: async () => model } };
  return { model, geometry, source, materials, ctx, head, left, right };
}
const options = { modelUrl: '/models/characters/kenney-mini/character-male-a.glb', height: CITIZEN_REFERENCE_HEIGHT, paper: 'red' as const };

describe('sample character', () => {
  it('normalizes height and poses exact real clips reproducibly, mapping run to sprint', async () => {
    const { ctx, head, materials } = setup();
    const actor = await createSampleCharacter(ctx, options);
    expect(actor.object.scale.y).toBeCloseTo(CITIZEN_REFERENCE_HEIGHT);
    actor.setPose('walk', 0.25); expect(head.position.x).toBeCloseTo(0.5);
    actor.setPose('run', 0.25); expect(head.position.x).toBeCloseTo(0.75);
    actor.setPose('walk', 0.25); expect(head.position.x).toBeCloseTo(0.5);
    expect(() => actor.setPose('walk', -1)).toThrow('time');
    actor.dispose(); materials.dispose();
  });

  it('provides reading and cheering poses and stable reduced-motion feedback', async () => {
    const { ctx, left, right, materials } = setup();
    const actor = await createSampleCharacter(ctx, options);
    actor.setPose('read', 0.3);
    expect(left.rotation.x).toBeLessThan(-0.5);
    expect(actor.object.getObjectByName('reading-paper')?.visible).toBe(true);
    actor.setPose('cheer', 0.3);
    expect(right.rotation.x).toBeLessThan(-2);
    expect(actor.object.getObjectByName('reading-paper')?.visible).toBe(false);
    actor.setPose('cheer', 1, true); const fixed = left.quaternion.clone();
    actor.setPose('cheer', 9, true); expect(left.quaternion.equals(fixed)).toBe(true);
    actor.setPose('idle', 0); expect(left.rotation.x).toBeCloseTo(0);
    actor.dispose(); materials.dispose();
  });

  it('changes the fitted hat color and semantic non-color cue without changing source resources', async () => {
    const { ctx, geometry, source, materials, head } = setup();
    const actor = await createSampleCharacter(ctx, options);
    expect(head.getObjectByName('paper-hat')).toBeDefined();
    const cap = actor.object.getObjectByName('cap-crown') as THREE.Mesh;
    expect(cap.material).toBe(materials.surface(ctx.palette.paper.red.hex));
    expect(actor.object.getObjectByName('paper-cue:quill')?.visible).toBe(true);
    actor.setPaper('blue');
    expect(cap.material).toBe(materials.surface(ctx.palette.paper.blue.hex));
    expect(actor.object.getObjectByName('paper-cue:quill')?.visible).toBe(false);
    expect(actor.object.getObjectByName('paper-cue:megaphone')?.visible).toBe(true);
    actor.setPaper(null);
    expect(cap.material).toBe(materials.surface(ctx.palette.unsubscribed.hex));
    expect(actor.object.getObjectByName('paper-cue:megaphone')?.visible).toBe(false);
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const sourceDispose = vi.spyOn(source, 'dispose');
    const hatDispose = vi.spyOn(cap.geometry, 'dispose');
    actor.dispose(); actor.dispose();
    expect(() => actor.setPaper('red')).toThrow('disposed'); materials.dispose();
    expect(hatDispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).not.toHaveBeenCalled(); expect(sourceDispose).not.toHaveBeenCalled();
  });


  it('releases the cloned rig when an imported material cannot be preserved', async () => {
    const { ctx, model, materials } = setup();
    const mesh = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const count = mesh.geometry.getAttribute('position').count;
    mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
    mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(Array.from({ length: count }, () => [1, 0, 0, 0]).flat(), 4));
    const bone = new THREE.Bone(); mesh.add(bone); mesh.bind(new THREE.Skeleton([bone])); model.add(mesh);
    const skeletonDispose = vi.spyOn(mesh.skeleton, 'dispose');
    await expect(createSampleCharacter(ctx, options)).rejects.toThrow('MeshBasicMaterial');
    expect(skeletonDispose).toHaveBeenCalledTimes(1); materials.dispose();
  });

  it('rejects missing required rig/clip coverage and invalid scale', async () => {
    const first = setup(); first.model.remove(first.head);
    await expect(createSampleCharacter(first.ctx, options)).rejects.toThrow('head'); first.materials.dispose();
    const second = setup(); second.model.animations = [];
    await expect(createSampleCharacter(second.ctx, options)).rejects.toThrow('idle'); second.materials.dispose();
    const third = setup();
    await expect(createSampleCharacter(third.ctx, { ...options, height: 0 })).rejects.toThrow('height'); third.materials.dispose();
  });
});
