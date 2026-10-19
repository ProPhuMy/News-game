// Code-built sample bakery (owner: Claude). Identity cues from overhaul design §5: striped awning, pretzel sign,
// welcoming storefront. Origin at ground in the footprint center; the storefront faces +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece, type PieceParts } from './piece.ts';

export const BAKERY_FOOTPRINT = { width: 6, depth: 5 } as const;

const WALL_TOP = 5.2;
const FRONT_Z = 2.4; // front wall face
const AWNING = { y: 4.6, depth: 1.4, tilt: 0.35, stripes: 7, width: 5.6 } as const;

/** The striped code awning. Exported so the hybrid can fall back to it when the kit awning fails to load. */
export function buildCodeAwning(ctx: ArchitectureContext, parts: PieceParts): THREE.Group {
  const { brick, trim } = ctx.palette.town;
  const awning = new THREE.Group();
  awning.name = 'bakery-awning';
  const stripe = AWNING.width / AWNING.stripes;
  for (let i = 0; i < AWNING.stripes; i++) {
    const x = -AWNING.width / 2 + stripe * (i + 0.5);
    awning.add(at(parts.mesh(new THREE.BoxGeometry(stripe, 0.08, AWNING.depth), i % 2 === 0 ? brick : trim), x, 0, 0));
  }
  awning.rotation.x = AWNING.tilt; // front edge lower than the wall edge
  return at(awning, 0, AWNING.y, FRONT_Z + AWNING.depth / 2);
}

function buildPretzel(ctx: ArchitectureContext, parts: PieceParts): THREE.Group {
  const pretzel = new THREE.Group();
  pretzel.name = 'bakery-pretzel';
  const dough = ctx.palette.town.lampGlow; // golden; no emissive, so it does not glow
  pretzel.add(at(parts.mesh(new THREE.TorusGeometry(0.75, 0.14, 8, 20), dough), 0, -0.15, 0));
  pretzel.add(at(parts.mesh(new THREE.TorusGeometry(0.36, 0.12, 8, 16), dough), -0.36, 0.2, 0.05));
  pretzel.add(at(parts.mesh(new THREE.TorusGeometry(0.36, 0.12, 8, 16), dough), 0.36, 0.2, 0.05));
  // Hangs on the front gable, facing the street.
  return at(pretzel, 0, 6.0, BAKERY_FOOTPRINT.depth / 2 + 0.1);
}

function gableRoof(): THREE.BufferGeometry {
  const halfWidth = 3.2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(0, 2.0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: BAKERY_FOOTPRINT.depth, bevelEnabled: false });
  geometry.translate(0, 0, -BAKERY_FOOTPRINT.depth / 2);
  return geometry;
}

export function createBakery(ctx: ArchitectureContext, options: { awning?: boolean } = {}): PlacedPiece {
  const { brick, trim, roof, lampGlow } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const { width, depth } = BAKERY_FOOTPRINT;
  const root = new THREE.Group();
  root.name = 'bakery';

  root.add(at(parts.mesh(new THREE.BoxGeometry(width, 0.6, depth), brick), 0, 0.3, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(width - 0.2, WALL_TOP - 0.6, FRONT_Z * 2), trim), 0, (WALL_TOP + 0.6) / 2, 0));
  root.add(at(parts.mesh(gableRoof(), roof), 0, WALL_TOP, 0));

  const door = at(parts.mesh(new THREE.BoxGeometry(1.8, 4.2, 0.12), roof), -1.4, 2.1, FRONT_Z + 0.06);
  door.name = 'bakery-door';
  root.add(door);
  const display = at(parts.mesh(new THREE.BoxGeometry(2.4, 2.0, 0.1), lampGlow, { emissive: lampGlow }), 1.3, 2.4, FRONT_Z + 0.05);
  display.name = 'bakery-window';
  root.add(display);

  if (options.awning !== false) root.add(buildCodeAwning(ctx, parts));
  root.add(buildPretzel(ctx, parts));

  ctx.materials.outline(root);
  return placedPiece(root, parts, { width, depth });
}
