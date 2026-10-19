import * as THREE from 'three';
import { COLORS, COLOR_ICONS, type Color } from '../../../shared/ids.ts';
import type { ArchitectureContext } from '../../visuals/town-types.ts';

export type SamplePose = 'idle' | 'walk' | 'run' | 'read' | 'cheer';
export interface SampleCharacter {
  object: THREE.Group;
  setPose(pose: SamplePose, seconds: number, reducedMotion?: boolean): void;
  setPaper(paper: Color | null): void;
  dispose(): void;
}

export async function createSampleCharacter(
  ctx: ArchitectureContext,
  options: { modelUrl: string; height: number; paper: Color | null },
): Promise<SampleCharacter> {
  if (!Number.isFinite(options.height) || options.height <= 0) throw new Error('character height must be positive');
  const model = await ctx.assets.loadGltf(options.modelUrl);
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse(child => { if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton); });
  function releaseSkeletons(): void { for (const skeleton of skeletons) skeleton.dispose(); }
  const required = ['head', 'arm-left', 'arm-right'] as const;
  const bones = required.map(name => model.getObjectByName(name));
  const missing = required.find((_, index) => !(bones[index] instanceof THREE.Bone));
  if (missing) { releaseSkeletons(); throw new Error(`character missing bone: ${missing}`); }
  const head = bones[0]!; const left = bones[1]!; const right = bones[2]!;
  const clips = new Map(model.animations.map(clip => [clip.name, clip]));
  for (const name of ['idle', 'walk', 'sprint']) {
    if (!clips.has(name)) { releaseSkeletons(); throw new Error(`character missing clip: ${name}`); }
  }
  const object = new THREE.Group(); object.name = 'sample-citizen'; object.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const rest: { bone: THREE.Bone; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }[] = [];
  model.traverse(child => {
    if (child instanceof THREE.Bone) rest.push({ bone: child, position: child.position.clone(),
      quaternion: child.quaternion.clone(), scale: child.scale.clone() });
  });
  const geometries = new Set<THREE.BufferGeometry>();
  function mesh(geometry: THREE.BufferGeometry, hex: number): THREE.Mesh {
    geometries.add(geometry);
    const result = new THREE.Mesh(geometry, ctx.materials.surface(hex));
    result.castShadow = true; result.receiveShadow = true;
    return result;
  }
  function poseClip(name: string, seconds: number): void {
    mixer.stopAllAction();
    for (const saved of rest) {
      saved.bone.position.copy(saved.position); saved.bone.quaternion.copy(saved.quaternion); saved.bone.scale.copy(saved.scale);
    }
    const clip = clips.get(name);
    if (!clip) throw new Error(`character missing clip: ${name}`);
    mixer.clipAction(clip).reset().play(); mixer.setTime(seconds);
    model.updateMatrixWorld(true);
    for (const skeleton of skeletons) skeleton.update();
  }
  try {
    poseClip('idle', 0);
    const bounds = new THREE.Box3().setFromObject(model, true);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) {
      throw new Error('character has no visible height');
    }
    const headMesh = model.getObjectByName('head-mesh');
    const headBounds = headMesh instanceof THREE.Mesh ? new THREE.Box3().setFromObject(headMesh, true) : bounds;
    const headSize = headBounds.getSize(new THREE.Vector3());
    const headCenter = headBounds.getCenter(new THREE.Vector3());
    const hat = new THREE.Group(); hat.name = 'paper-hat';
    hat.position.copy(head.worldToLocal(new THREE.Vector3(headCenter.x, headBounds.max.y - headSize.y * 0.06, headCenter.z)));
    head.add(hat);
    const crown = mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), ctx.palette.unsubscribed.hex);
    crown.name = 'cap-crown';
    crown.scale.set(headSize.x * 0.53, headSize.y * 0.17, headSize.z * 0.54);
    hat.add(crown);
    const brim = mesh(new THREE.BoxGeometry(headSize.x * 0.86, headSize.y * 0.035, headSize.z * 0.48), ctx.palette.unsubscribed.hex);
    brim.position.set(0, 0, headSize.z * 0.42); hat.add(brim);
    const cues = new Map<Color, THREE.Mesh>();
    const w = headSize.x * 0.14;
    for (const color of COLORS) {
      let geometry: THREE.BufferGeometry;
      if (color === 'red') geometry = new THREE.ConeGeometry(w * 0.3, w * 1.8, 4);
      else if (color === 'blue') geometry = new THREE.ConeGeometry(w * 0.65, w * 1.3, 8);
      else if (color === 'green') geometry = new THREE.TorusGeometry(w * 0.65, w * 0.15, 6, 12);
      else {
        const shape = new THREE.Shape();
        shape.moveTo(0, w); shape.lineTo(-w * 0.6, -w * 0.1); shape.lineTo(0, -w * 0.1);
        shape.lineTo(-w * 0.2, -w); shape.lineTo(w * 0.65, w * 0.2); shape.lineTo(w * 0.1, w * 0.2);
        shape.closePath(); geometry = new THREE.ShapeGeometry(shape);
      }
      const cue = mesh(geometry, ctx.palette.town.trim);
      cue.name = `paper-cue:${COLOR_ICONS[color]}`;
      cue.position.set(0, headSize.y * 0.09, headSize.z * 0.52);
      if (color === 'red') cue.rotation.z = -0.4;
      if (color === 'blue') cue.rotation.x = Math.PI / 2;
      hat.add(cue); cues.set(color, cue);
    }
    const paper = new THREE.Group(); paper.name = 'reading-paper';
    const page = mesh(new THREE.BoxGeometry(size.y * 0.36, size.y * 0.23, size.y * 0.008), ctx.palette.town.trim);
    paper.add(page);
    for (const y of [-0.04, 0.015, 0.07]) {
      const ink = mesh(new THREE.BoxGeometry(size.y * 0.27, size.y * 0.012, size.y * 0.01), ctx.palette.town.outline);
      ink.position.set(0, size.y * y, size.y * 0.006); paper.add(ink);
    }
    paper.position.set(0, bounds.min.y + size.y * 0.48, headCenter.z + size.z * 0.6);
    paper.rotation.x = -0.25; model.add(paper);
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh) || geometries.has(child.geometry)) return;
      child.material = Array.isArray(child.material)
        ? child.material.map(material => ctx.materials.preserve(material)) : ctx.materials.preserve(child.material);
      child.castShadow = true; child.receiveShadow = true;
    });
    ctx.materials.outline(model);
    model.position.y = -bounds.min.y;
    object.scale.setScalar(options.height / size.y);
    let disposed = false;

    function setPaper(color: Color | null): void {
      if (disposed) throw new Error('character disposed');
      const material = ctx.materials.surface(color === null ? ctx.palette.unsubscribed.hex : ctx.palette.paper[color].hex);
      crown.material = material; brim.material = material;
      for (const [id, cue] of cues) cue.visible = id === color;
    }
    function setPose(pose: SamplePose, seconds: number, reducedMotion = false): void {
      if (disposed) throw new Error('character disposed');
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('character time must be nonnegative');
      const time = reducedMotion ? 0 : seconds;
      // Root placement/scale may change between poses; skin bindings need its current world matrix.
      object.updateWorldMatrix(true, false);
      poseClip(pose === 'walk' ? 'walk' : pose === 'run' ? 'sprint' : 'idle', time);
      if (pose === 'read') {
        left.rotation.x -= 1.15; right.rotation.x -= 1.15;
        head.rotation.x += 0.18;
      } else if (pose === 'cheer') {
        left.rotation.x -= 2.6; right.rotation.x -= 2.6;
        left.rotation.z -= Math.sin(time * 5) * 0.18;
        right.rotation.z += Math.sin(time * 5) * 0.18;
      }
      paper.visible = pose === 'read';
      model.updateMatrixWorld(true);
      for (const skeleton of skeletons) skeleton.update();
    }
    setPaper(options.paper); setPose('idle', 0);
    return {
      object, setPose, setPaper,
      dispose() {
        if (disposed) return;
        disposed = true;
        mixer.stopAllAction(); mixer.uncacheRoot(model); releaseSkeletons();
        for (const geometry of geometries) geometry.dispose();
        geometries.clear(); object.removeFromParent();
      },
    };
  } catch (error) {
    mixer.stopAllAction(); mixer.uncacheRoot(model); releaseSkeletons();
    for (const geometry of geometries) geometry.dispose();
    object.removeFromParent();
    throw error;
  }
}
