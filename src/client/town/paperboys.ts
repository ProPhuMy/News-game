import * as THREE from 'three';
import type { ArchitectureContext, SceneReadiness } from '../visuals/town-types.ts';
import { CITIZEN_REFERENCE_HEIGHT } from './architecture/piece.ts';
import { createSampleCharacter, type SampleCharacter } from './assets/character.ts';
import { PAPERBOY_SPOTS } from './props/dressing.ts';

/** Decoration only: no citizen IDs, routes or subscription state. */
export function createPaperboys(ctx: ArchitectureContext): {
  group: THREE.Group; ready: Promise<SceneReadiness>; dispose(): void;
} {
  const group = new THREE.Group(); group.name = 'paperboys';
  const actors: SampleCharacter[] = [];
  let disposed = false;
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const actor of actors) actor.dispose();
    group.removeFromParent();
  }
  const ready = Promise.all(PAPERBOY_SPOTS.map(async spot => {
    const actor = await createSampleCharacter(ctx, {
      modelUrl: '/models/characters/kenney-mini/character-male-a.glb',
      height: CITIZEN_REFERENCE_HEIGHT, paper: null,
    });
    if (disposed) { actor.dispose(); throw new Error('paperboys disposed before readiness'); }
    actors.push(actor); actor.setPose('idle', 0, true);
    const size = new THREE.Box3().setFromObject(actor.object, true).getSize(new THREE.Vector3());
    const fit = Math.min(1, 1 / Math.max(size.x, size.z));
    actor.object.scale.multiplyScalar(fit);
    const placement = new THREE.Group(); placement.position.set(spot.x, 0, spot.z);
    placement.rotation.y = spot.rotationY; placement.add(actor.object); group.add(placement);
  })).then(() => {
    if (disposed) throw new Error('paperboys disposed before readiness');
    return { degraded: [] };
  }).catch((error: unknown) => { dispose(); throw error; });
  void ready.catch(() => {});
  return { group, ready, dispose };
}
