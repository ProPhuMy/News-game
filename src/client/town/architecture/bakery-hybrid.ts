// Hybrid comparison bakery (owner: Claude): the code-built bakery with Kenney City Kit Commercial's awning in place
// of the code awning. 'original' keeps the kit's atlas material untouched for faithful inspection; 'palette'
// flattens it to one palette surface to show what flattening loses. MaterialKit has no textured variant yet
// (presentation-interface note §2); D1 decides whether to add one.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece, SceneReadiness } from '../../visuals/town-types.ts';
import { buildCodeAwning, createBakery } from './bakery.ts';
import { createPieceParts } from './piece.ts';

export const KENNEY_AWNING_URL = '/models/buildings/kenney-commercial/detail-awning-wide.glb';

export type AwningMaterialMode = 'original' | 'palette';

// The kit awning is tall and steep (raw 0.80 wide, 0.40 high, 0.15 deep, back face at z = 0.1). Spanning the
// whole storefront would cover the door and the gable sign, so it shades the display window at a uniform scale.
const KIT_SCALE = 4.25;
const KIT_POSITION = { x: 1.2, y: 3.5, z: 2.4 - 0.1 * KIT_SCALE } as const;

export function createBakeryHybrid(ctx: ArchitectureContext, mode: AwningMaterialMode): PlacedPiece {
  const base = createBakery(ctx, { awning: false });
  const parts = createPieceParts(ctx);
  let disposed = false;

  const ready: Promise<SceneReadiness> = ctx.assets.loadGltf(KENNEY_AWNING_URL).then(
    (awning) => {
      if (disposed) return { degraded: [] };
      awning.name = 'bakery-kit-awning';
      awning.scale.setScalar(KIT_SCALE);
      awning.position.set(KIT_POSITION.x, KIT_POSITION.y, KIT_POSITION.z);
      awning.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true;
        child.receiveShadow = true;
        if (mode === 'palette') child.material = ctx.materials.surface(ctx.palette.town.brick);
      });
      ctx.materials.outline(awning);
      base.object.add(awning);
      return { degraded: [] };
    },
    (error: unknown) => {
      if (!disposed) {
        const standIn = buildCodeAwning(ctx, parts);
        ctx.materials.outline(standIn);
        base.object.add(standIn);
      }
      const reason = error instanceof Error ? error.message : String(error);
      return { degraded: [`bakery-hybrid: ${KENNEY_AWNING_URL} failed to load: ${reason}`] };
    },
  );

  return {
    object: base.object,
    ready,
    footprint: base.footprint,
    dispose() {
      disposed = true;
      base.dispose();
      parts.dispose();
    },
  };
}
