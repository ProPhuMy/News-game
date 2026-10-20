// Code-built clinic (owner: Claude). Identity cues from overhaul design §5: pale walls, lit cross, CLINIC sign.
// Origin at ground in the footprint center; the entrance faces +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from './piece.ts';
import { createSignboard } from './signs.ts';

export const CLINIC_FOOTPRINT = { width: 6, depth: 5 } as const;

const WALL_TOP = 5.2;
const WALL_FRONT = 2.4;

export function createClinic(ctx: ArchitectureContext): PlacedPiece {
  const { brick, trim, roof, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const { width, depth } = CLINIC_FOOTPRINT;
  const root = new THREE.Group();
  root.name = 'clinic';

  root.add(at(parts.mesh(new THREE.BoxGeometry(width, 0.4, depth), brick), 0, 0.2, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(width - 0.2, WALL_TOP - 0.4, WALL_FRONT * 2), trim), 0, (WALL_TOP + 0.4) / 2, 0));

  const shape = new THREE.Shape();
  shape.moveTo(-3.2, 0);
  shape.lineTo(3.2, 0);
  shape.lineTo(0, 1.8);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  const roofSlab = at(parts.mesh(geometry, roof), 0, WALL_TOP, 0);
  roofSlab.name = 'clinic-roof';
  root.add(roofSlab);

  // Two crossing bars, brick red and self-lit so the cross reads at night.
  const cross = new THREE.Group();
  cross.name = 'clinic-cross';
  cross.add(parts.mesh(new THREE.BoxGeometry(1.5, 0.45, 0.1), brick, { emissive: brick }));
  cross.add(parts.mesh(new THREE.BoxGeometry(0.45, 1.5, 0.1), brick, { emissive: brick }));
  root.add(at(cross, 2.0, 3.2, WALL_FRONT + 0.05));

  const door = at(parts.mesh(new THREE.BoxGeometry(1.6, 4.3, 0.12), wood), -0.8, 2.15, WALL_FRONT + 0.06);
  door.name = 'clinic-door';
  root.add(door);
  root.add(at(createSignboard(ctx, parts, 'CLINIC', 0.6), -0.8, 4.75, WALL_FRONT + 0.05));

  ctx.materials.outline(root);
  return placedPiece(root, parts, { width, depth });
}
