// Code-built street props (owner: Claude). No CC0 kit has era-fitting versions (asset shortlist §4).
// Origin at ground in the footprint center; the front faces +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from '../architecture/piece.ts';

export function createGasLamp(ctx: ArchitectureContext): PlacedPiece {
  const { roof, lampGlow } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-gas-lamp';
  root.add(at(parts.mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 10), roof), 0, 0.2, 0));
  root.add(at(parts.mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.0, 8), roof), 0, 2.4, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), lampGlow, { emissive: lampGlow }), 0, 4.75, 0));
  root.add(at(parts.mesh(new THREE.ConeGeometry(0.5, 0.45, 4), roof), 0, 5.32, 0));
  root.children.at(-1)!.rotation.y = Math.PI / 4;
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 0.7, depth: 0.7 });
}

export function createNewsstand(ctx: ArchitectureContext): PlacedPiece {
  const { brick, trim, roof } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-newsstand';
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.0, 1.6, 1.4), brick), 0, 0.8, 0));
  // Slanted rack of papers on the street side.
  const rack = at(parts.mesh(new THREE.BoxGeometry(1.7, 0.7, 0.08), trim), 0, 1.15, 0.78);
  rack.rotation.x = -0.4;
  root.add(rack);
  for (const x of [-0.95, 0.95]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), roof), x, 2.05, 0.6));
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.3, 0.16, 1.7), trim), 0, 2.55, 0.1));
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 2.0, depth: 1.4 });
}

export function createBench(ctx: ArchitectureContext): PlacedPiece {
  const { roof, trim } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-bench';
  for (const x of [-1.0, 1.0]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.12, 0.84, 0.55), roof), x, 0.42, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), trim), 0, 0.9, 0));
  const back = at(parts.mesh(new THREE.BoxGeometry(2.4, 0.55, 0.1), trim), 0, 1.3, -0.28);
  back.rotation.x = -0.15;
  root.add(back);
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 2.4, depth: 0.6 });
}
