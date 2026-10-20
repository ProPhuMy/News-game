// Kenney Nature Kit 2.1 foliage (owner: Claude). The kit uses flat named materials and no textures, so mapping each
// material name to a palette role loses nothing. Origin at ground in the footprint center.
import * as THREE from 'three';
import type { PresentationPalette } from '../../visuals/palette.ts';
import type { ArchitectureContext, PlacedPiece, SceneReadiness } from '../../visuals/town-types.ts';
import { at, createPieceParts, type PieceParts } from '../architecture/piece.ts';

export type NatureKind = 'tree-oak' | 'tree-round' | 'bush' | 'flowers';

/** Kit material name to palette role. A name missing here falls back to `trim` and is reported in `degraded`. */
export const NATURE_MATERIAL_ROLES: Readonly<Record<string, keyof PresentationPalette['town']>> = {
  leafsGreen: 'foliage',
  woodBark: 'wood',
  grass: 'foliage',
  colorRed: 'brick',
};

// Heights are world units (sized in C3 against a 3.29 citizen; the approved citizen is now 1.8). Footprints are each file's measured bounds at that height, rounded up to 0.05.
export const NATURE_MODELS: Readonly<Record<NatureKind, { file: string; height: number; footprint: { width: number; depth: number } }>> = {
  'tree-oak': { file: 'tree_oak.glb', height: 6.5, footprint: { width: 3.4, depth: 3.95 } },
  'tree-round': { file: 'tree_default.glb', height: 6.5, footprint: { width: 2.9, depth: 2.5 } },
  bush: { file: 'plant_bush.glb', height: 1.2, footprint: { width: 1.95, depth: 1.95 } },
  flowers: { file: 'flower_redA.glb', height: 0.9, footprint: { width: 0.5, depth: 0.6 } },
};

export function natureUrl(kind: NatureKind): string {
  return `/models/props/kenney-nature/${NATURE_MODELS[kind].file}`;
}

function standIn(ctx: ArchitectureContext, parts: PieceParts, height: number): THREE.Group {
  const { foliage, wood } = ctx.palette.town;
  const group = new THREE.Group();
  group.name = 'nature-stand-in';
  group.add(at(parts.mesh(new THREE.CylinderGeometry(height * 0.05, height * 0.06, height * 0.4, 6), wood), 0, height * 0.2, 0));
  group.add(at(parts.mesh(new THREE.ConeGeometry(height * 0.25, height * 0.7, 8), foliage), 0, height * 0.65, 0));
  return group;
}

/** Scales the model to `height` and puts its base on the ground, centered. */
function fit(model: THREE.Object3D, height: number): void {
  const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.multiplyScalar(height / raw.y);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(model.position.x - center.x, model.position.y - box.min.y, model.position.z - center.z);
}

export function createNatureProp(kind: NatureKind, ctx: ArchitectureContext): PlacedPiece {
  const { height, footprint } = NATURE_MODELS[kind];
  const url = natureUrl(kind);
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = `prop-${kind}`;
  let disposed = false;

  const ready: Promise<SceneReadiness> = ctx.assets.loadGltf(url).then(
    (model) => {
      const degraded: string[] = [];
      if (disposed) return { degraded };
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const name = (child.material as THREE.Material).name;
        const role = NATURE_MATERIAL_ROLES[name];
        if (!role) degraded.push(`${kind}: unmapped material "${name}"`);
        child.material = ctx.materials.surface(ctx.palette.town[role ?? 'trim']);
        child.castShadow = true;
        child.receiveShadow = true;
      });
      fit(model, height);
      ctx.materials.outline(model);
      root.add(model);
      return { degraded };
    },
    (error: unknown) => {
      if (!disposed) {
        const fallback = standIn(ctx, parts, height);
        ctx.materials.outline(fallback);
        root.add(fallback);
      }
      const reason = error instanceof Error ? error.message : String(error);
      return { degraded: [`${kind}: ${url} failed to load: ${reason}`] };
    },
  );

  return {
    object: root,
    ready,
    footprint,
    dispose() {
      disposed = true;
      root.removeFromParent();
      parts.dispose();
    },
  };
}
