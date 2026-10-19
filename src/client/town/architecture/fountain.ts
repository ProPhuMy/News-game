// Code-built fountain square (owner: Claude). Flat plaza paving on the node plus a fountain basin off-center,
// kept low so roads (y ~0.01-0.03) draw over its edge.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from './piece.ts';

export const PLAZA_SIZE = 20;
export const FOUNTAIN_OFFSET = { x: 6, z: -6 } as const;
export const FOUNTAIN_RADIUS = 3.3;

export function createFountainSquare(ctx: ArchitectureContext): PlacedPiece {
  const { plaza, trim, sky } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'fountain-square';

  const slab = at(parts.mesh(new THREE.BoxGeometry(PLAZA_SIZE, 0.04, PLAZA_SIZE), plaza), 0, 0, 0);
  slab.name = 'plaza';
  root.add(slab);

  const fountain = at(new THREE.Group(), FOUNTAIN_OFFSET.x, 0, FOUNTAIN_OFFSET.z);
  fountain.name = 'fountain';
  fountain.add(at(parts.mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.8, 32), trim), 0, 0.4, 0));
  fountain.add(at(parts.mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.1, 32), sky), 0, 0.7, 0));
  fountain.add(at(parts.mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 16), trim), 0, 1.1, 0));
  fountain.add(at(parts.mesh(new THREE.CylinderGeometry(1.1, 0.7, 0.35, 24), trim), 0, 2.3, 0));
  fountain.add(at(parts.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24), sky), 0, 2.5, 0));
  root.add(fountain);

  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: PLAZA_SIZE, depth: PLAZA_SIZE });
}
