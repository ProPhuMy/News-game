// Code-built street props (owner: Claude). No CC0 kit has era-fitting versions (asset shortlist §4).
// Origin at ground in the footprint center; the front faces +Z.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from '../architecture/piece.ts';

export function createGasLamp(ctx: ArchitectureContext): PlacedPiece {
  const { roof, lampGlow } = ctx.palette.town; // painted iron takes the roof accent, not wood
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
  const { brick, trim, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-newsstand';
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.0, 1.6, 1.4), brick), 0, 0.8, 0));
  // Slanted rack of papers on the street side.
  const rack = at(parts.mesh(new THREE.BoxGeometry(1.7, 0.7, 0.08), trim), 0, 1.15, 0.78);
  rack.rotation.x = -0.4;
  root.add(rack);
  for (const x of [-0.95, 0.95]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood), x, 2.05, 0.6));
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.3, 0.16, 1.7), trim), 0, 2.55, 0.1));
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 2.0, depth: 1.4 });
}

export function createBench(ctx: ArchitectureContext): PlacedPiece {
  const { wood, trim } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-bench';
  for (const x of [-1.0, 1.0]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.12, 0.84, 0.55), wood), x, 0.42, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), trim), 0, 0.9, 0));
  const back = at(parts.mesh(new THREE.BoxGeometry(2.4, 0.55, 0.1), trim), 0, 1.3, -0.28);
  back.rotation.x = -0.15;
  root.add(back);
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 2.4, depth: 0.6 });
}

export function createCart(ctx: ArchitectureContext): PlacedPiece {
  const { brick, trim, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-cart';
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.0, 0.2, 1.1), wood), 0, 0.95, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.0, 0.45, 0.1), wood), 0, 1.25, 0.5));
  // Two wheels on an axle along x.
  for (const x of [-1.1, 1.1]) {
    const wheel = at(parts.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), wood), x, 0.55, 0);
    wheel.rotation.z = Math.PI / 2;
    root.add(wheel);
  }
  root.add(at(parts.mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), trim), 0, 0.55, 0));
  for (const x of [-0.9, 0.9]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), wood), x, 1.8, -0.45));
  for (const x of [-0.9, 0.9]) root.add(at(parts.mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), wood), x, 1.65, 0.5));
  // Striped canopy: alternating brick and trim bands.
  for (let i = 0; i < 4; i++) {
    const band = at(parts.mesh(new THREE.BoxGeometry(0.65, 0.1, 1.4), i % 2 ? trim : brick), -0.975 + i * 0.65, 2.65, 0);
    band.rotation.x = 0.12;
    root.add(band);
  }
  // Goods on the bed.
  root.add(at(parts.mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), trim), -0.4, 1.2, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), brick), 0.5, 1.18, 0));
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 2.6, depth: 1.4 });
}

export function createFlowerBox(ctx: ArchitectureContext): PlacedPiece {
  const { brick, foliage, trim, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const root = new THREE.Group();
  root.name = 'prop-flower-box';
  root.add(at(parts.mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), wood), 0, 0.25, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(1.7, 0.08, 0.56), trim), 0, 0.52, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(1.45, 0.3, 0.38), foliage), 0, 0.7, 0));
  [-0.6, -0.2, 0.2, 0.6].forEach((x, i) => root.add(at(parts.mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), brick), x, 0.95 + (i % 2) * 0.06, i % 2 ? 0.06 : -0.06)));
  ctx.materials.outline(root);
  return placedPiece(root, parts, { width: 1.6, depth: 0.5 });
}
