// Code-built bank (owner: Claude). Identity cues from overhaul design §5: four trim columns, pediment, wide steps,
// BANK sign. Origin at ground in the footprint center; the entrance faces +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from './piece.ts';
import { createSignboard } from './signs.ts';

export const BANK_FOOTPRINT = { width: 6, depth: 5 } as const;

const WALL_TOP = 6;
const WALL_FRONT = 1.9; // wall face; the columns stand in front of it
const COLUMN_Z = 2.1;
const STEP_TOP = 0.5;

export function createBank(ctx: ArchitectureContext): PlacedPiece {
  const { brick, trim, roof, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const { width, depth } = BANK_FOOTPRINT;
  const root = new THREE.Group();
  root.name = 'bank';

  root.add(at(parts.mesh(new THREE.BoxGeometry(width - 0.4, WALL_TOP, WALL_FRONT * 2), brick), 0, WALL_TOP / 2, 0));
  const roofSlab = at(parts.mesh(new THREE.BoxGeometry(width, 0.3, depth), roof), 0, WALL_TOP + 0.15, 0);
  roofSlab.name = 'bank-roof';
  root.add(roofSlab);

  const steps = new THREE.Group();
  steps.name = 'bank-steps';
  steps.add(at(parts.mesh(new THREE.BoxGeometry(5, 0.25, 0.55), trim), 0, 0.125, 2.25));
  steps.add(at(parts.mesh(new THREE.BoxGeometry(4.8, STEP_TOP, 0.4), trim), 0, STEP_TOP / 2, 2.1));
  root.add(steps);

  for (const x of [-2.4, -1.5, 1.5, 2.4]) {
    const column = at(parts.mesh(new THREE.CylinderGeometry(0.25, 0.25, WALL_TOP - STEP_TOP, 12), trim), x, (WALL_TOP + STEP_TOP) / 2, COLUMN_Z);
    column.name = 'bank-column';
    root.add(column);
  }

  const shape = new THREE.Shape();
  shape.moveTo(-2.9, 0);
  shape.lineTo(2.9, 0);
  shape.lineTo(0, 1.1);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
  const pediment = at(parts.mesh(geometry, trim), 0, WALL_TOP + 0.3, 1.9);
  pediment.name = 'bank-pediment';
  root.add(pediment);

  const door = at(parts.mesh(new THREE.BoxGeometry(1.4, 3.8, 0.12), wood), 0, STEP_TOP + 1.9, WALL_FRONT + 0.06);
  door.name = 'bank-door';
  root.add(door);
  root.add(at(createSignboard(ctx, parts, 'BANK', 0.7), 0, 4.8, WALL_FRONT + 0.05));

  ctx.materials.outline(root);
  return placedPiece(root, parts, { width, depth });
}
