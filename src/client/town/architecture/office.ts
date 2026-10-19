// Code-built newspaper office (owner: Claude). Wood body (brick walls swallowed the red banner), tall +Z door, printing-press chimneys and two banners
// in the paper color. No sign text: paper names are player data. Banners swap kit materials, never mutate them.
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece } from '../../visuals/town-types.ts';
import { at, createPieceParts, placedPiece } from './piece.ts';

export const OFFICE_FOOTPRINT = { width: 5, depth: 4.4 } as const;

export interface OfficePiece extends PlacedPiece {
  setBannerColor(hex: number): void;
  setHighlight(active: boolean): void;
  bannerColor(): number;
}

const WALL_TOP = 5;
const FRONT = 2.0; // wall face; door and banners sit just in front

export function createOffice(ctx: ArchitectureContext, bannerHex: number): OfficePiece {
  const { trim, roof, wood } = ctx.palette.town;
  const parts = createPieceParts(ctx);
  const { width, depth } = OFFICE_FOOTPRINT;
  const root = new THREE.Group();
  root.name = 'office';

  root.add(at(parts.mesh(new THREE.BoxGeometry(width - 0.2, WALL_TOP, FRONT * 2), wood), 0, WALL_TOP / 2, 0));
  root.add(at(parts.mesh(new THREE.BoxGeometry(width, 0.3, depth - 0.2), roof), 0, WALL_TOP + 0.15, 0));

  const door = at(parts.mesh(new THREE.BoxGeometry(1.3, 4.2, 0.12), wood), 0, 2.1, FRONT + 0.06);
  door.name = 'office-door';
  root.add(door);
  root.add(at(parts.mesh(new THREE.BoxGeometry(1.7, 0.2, 0.2), trim), 0, 4.3, FRONT + 0.1));

  for (const x of [-1.4, 1.4]) {
    const chimney = at(parts.mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), x < 0 ? wood : roof), x, WALL_TOP + 0.3 + 1.2, -0.8);
    chimney.name = 'office-chimney';
    root.add(chimney);
  }

  const banners = [
    at(parts.mesh(new THREE.BoxGeometry(0.9, 2.6, 0.08), bannerHex), 1.7, 2.9, FRONT + 0.04), // hanging
    at(parts.mesh(new THREE.BoxGeometry(width - 0.4, 0.5, 0.1), bannerHex), 0, WALL_TOP - 0.45, FRONT + 0.05), // eaves band
  ];
  for (const b of banners) {
    b.name = 'office-banner';
    root.add(b);
  }

  let hex = bannerHex;
  let lit = false;
  const apply = () => {
    const material = ctx.materials.surface(hex, lit ? { emissive: hex } : undefined);
    for (const b of banners) b.material = material;
  };

  ctx.materials.outline(root);
  return {
    ...placedPiece(root, parts, OFFICE_FOOTPRINT),
    setBannerColor(next) { hex = next; apply(); },
    setHighlight(active) { lit = active; apply(); },
    bannerColor: () => hex,
  };
}
