// Picket signs for protesting citizens (owner: Claude; Codex attaches them). Interface §5c, as amended by Codex:
// one kit per town, one original per slogan, clones share its resources, and the kit frees them once.
import * as THREE from 'three';
import type { ArchitectureContext } from '../../visuals/town-types.ts';
import { at, createPieceParts, type PieceParts } from '../architecture/piece.ts';
import { createSignboard } from '../architecture/signs.ts';

/** Family-friendly slogans in the pixel font, at most 6 glyphs each. */
export const PICKET_SIGN_TEXTS: readonly string[] = ['BOO!', 'NO!', 'FAKE!', 'SHAME!'];

export interface PicketSignKit {
  /** A sign for one actor: a clone of this kit's original for `text` (created on first use), sharing its resources. */
  create(text: string): THREE.Object3D;
  /** Detaches every clone this kit made from its parent, then frees each original's resources once. Idempotent. */
  dispose(): void;
}

const BOARD_HEIGHT = 0.36;
const STICK_BOTTOM = -0.15; // the grip (origin) sits a little above the stick's lower end
const STICK_TOP = 0.7;

function buildOriginal(ctx: ArchitectureContext, parts: PieceParts, text: string): THREE.Object3D {
  const root = new THREE.Group();
  root.name = `picket-${text}`;
  const stickLength = STICK_TOP - STICK_BOTTOM;
  root.add(at(parts.mesh(new THREE.CylinderGeometry(0.04, 0.04, stickLength, 6), ctx.palette.town.wood), 0, STICK_BOTTOM + stickLength / 2, 0));
  root.add(at(createSignboard(ctx, parts, text, BOARD_HEIGHT), 0, STICK_TOP + BOARD_HEIGHT / 2 + 0.05, 0.06));
  ctx.materials.outline(root);
  return root;
}

export function createPicketSignKit(ctx: ArchitectureContext): PicketSignKit {
  const originals = new Map<string, { object: THREE.Object3D; parts: PieceParts }>();
  const clones = new Set<THREE.Object3D>();
  let disposed = false;
  return {
    create(text) {
      if (disposed) throw new Error('picket sign kit disposed');
      if (!PICKET_SIGN_TEXTS.includes(text)) throw new Error(`"${text}" is not a picket slogan`);
      let original = originals.get(text);
      if (!original) {
        const parts = createPieceParts(ctx);
        original = { object: buildOriginal(ctx, parts, text), parts };
        originals.set(text, original);
      }
      const clone = original.object.clone();
      clones.add(clone);
      return clone;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const clone of clones) clone.removeFromParent();
      clones.clear();
      for (const { parts } of originals.values()) parts.dispose();
      originals.clear();
    },
  };
}
