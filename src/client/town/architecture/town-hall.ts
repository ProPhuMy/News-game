// Code-built town hall (owner: Claude). Identity cues from overhaul design §5: clock tower on the back half, wide
// civic steps, TOWN HALL sign. Origin at ground in the footprint center; the entrance and clock face +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece, type PieceParts } from './piece.ts';
import { createSignboard } from './signs.ts';

export const TOWN_HALL_FOOTPRINT = { width: 6, depth: 5 } as const;

const WALL_TOP = 5.4;
const WALL_FRONT = 2.1;
const TOWER = { z: -1.2, size: 2.2, bottom: 5.4, top: 11.6 } as const;

function buildClock(ctx: ArchitectureContext, parts: PieceParts): THREE.Group {
  const { trim, outline } = ctx.palette.town;
  const clock = new THREE.Group();
  clock.name = 'town-hall-clock';
  const face = parts.mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 20), trim);
  face.rotation.x = Math.PI / 2; // cylinder axis along +Z
  clock.add(face);
  clock.add(at(parts.mesh(new THREE.BoxGeometry(0.1, 0.6, 0.06), outline), 0, 0.25, 0.08));
  const minute = at(parts.mesh(new THREE.BoxGeometry(0.1, 0.45, 0.06), outline), 0.18, -0.05, 0.08);
  minute.rotation.z = -Math.PI / 2.5;
  clock.add(minute);
  return at(clock, 0, 9.4, TOWER.z + TOWER.size / 2 + 0.05);
}

export function createTownHall(ctx: ArchitectureContext): PlacedPiece {
  const { brick, trim, roof, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const { width, depth } = TOWN_HALL_FOOTPRINT;
  const root = new THREE.Group();
  root.name = 'town-hall';

  root.add(at(parts.mesh(new THREE.BoxGeometry(width - 0.4, WALL_TOP, WALL_FRONT * 2), brick), 0, WALL_TOP / 2, 0));
  const roofSlab = at(parts.mesh(new THREE.BoxGeometry(width, 0.3, depth - 0.1), roof), 0, WALL_TOP + 0.15, 0);
  roofSlab.name = 'town-hall-roof';
  root.add(roofSlab);

  const tower = at(parts.mesh(new THREE.BoxGeometry(TOWER.size, TOWER.top - TOWER.bottom, TOWER.size), brick), 0, (TOWER.top + TOWER.bottom) / 2, TOWER.z);
  tower.name = 'town-hall-tower';
  root.add(tower);
  const cap = at(parts.mesh(new THREE.ConeGeometry(1.8, 1.6, 4), roof), 0, TOWER.top + 0.8, TOWER.z);
  cap.rotation.y = Math.PI / 4;
  root.add(cap, buildClock(ctx, parts));

  root.add(at(parts.mesh(new THREE.BoxGeometry(5, 0.25, 0.5), trim), 0, 0.125, 2.25));
  root.add(at(parts.mesh(new THREE.BoxGeometry(4.2, 0.5, 0.3), trim), 0, 0.25, 2.15));
  const door = at(parts.mesh(new THREE.BoxGeometry(1.6, 3.8, 0.12), wood), 0, 0.5 + 1.9, WALL_FRONT + 0.06);
  door.name = 'town-hall-door';
  root.add(door);
  root.add(at(createSignboard(ctx, parts, 'TOWN HALL', 0.45), 0, 4.6, WALL_FRONT + 0.05));

  ctx.materials.outline(root);
  return placedPiece(root, parts, { width, depth });
}
