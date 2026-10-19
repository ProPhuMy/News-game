// Full code-built town (owner: Claude): every location building, office and dressing prop, placed by the lot rules.
import * as THREE from 'three';
import { COLORS, LOCATIONS, type Location, type SeatId } from '../../../shared/ids.ts';
import type { PaperPublic } from '../../../shared/snapshots.ts';
import type { ArchitectureContext, PlacedPiece, SceneReadiness } from '../../visuals/town-types.ts';
import { TOWN_DRESSING } from '../props/dressing.ts';
import { createProp } from '../props/index.ts';
import type { TownBuildings } from '../buildings.ts';
import type { TownLayout } from '../types.ts';
import { createLocationBuilding } from './index.ts';
import { LABEL_ANCHOR_HEIGHT, LOCATION_LOT_SIDES, OFFICE_LOT_SIDES, lotCenter } from './lots.ts';
import { OFFICE_FOOTPRINT, createOffice, type OfficePiece } from './office.ts';

export function createArchitectureTown(layout: TownLayout, ctx: ArchitectureContext): TownBuildings {
  const group = new THREE.Group();
  group.name = 'town-buildings';
  const pieces: PlacedPiece[] = [];
  const locationAnchors = new Map<Location, THREE.Vector3>();
  const officeAnchors = new Map<SeatId, THREE.Vector3>();
  const offices = new Map<SeatId, OfficePiece>();

  const place = (piece: PlacedPiece, x: number, z: number, rotationY = 0): PlacedPiece => {
    piece.object.position.set(x, 0, z);
    piece.object.rotation.y = rotationY;
    group.add(piece.object);
    pieces.push(piece);
    return piece;
  };
  const anchor = (node: { x: number; z: number }) => new THREE.Vector3(node.x, LABEL_ANCHOR_HEIGHT, node.z);

  for (const loc of LOCATIONS) {
    const node = layout.getNodeWorldPos(layout.getLocationNode(loc));
    const piece = createLocationBuilding(loc, ctx);
    const center = loc === 'fountain_square' ? node : lotCenter(node, LOCATION_LOT_SIDES[loc], piece.footprint);
    place(piece, center.x, center.z);
    locationAnchors.set(loc, anchor(node));
  }

  COLORS.forEach((color, i) => {
    const seat = i as SeatId;
    const node = layout.getNodeWorldPos(layout.getOfficeNode(seat));
    const office = createOffice(ctx, ctx.palette.paper[color].hex);
    const center = lotCenter(node, OFFICE_LOT_SIDES[seat]!, OFFICE_FOOTPRINT);
    place(office, center.x, center.z);
    office.object.userData.seat = seat;
    offices.set(seat, office);
    officeAnchors.set(seat, anchor(node));
  });

  for (const p of TOWN_DRESSING) place(createProp(p.kind, ctx), p.x, p.z, p.rotationY);

  const ready: Promise<SceneReadiness> = Promise.all(pieces.map((piece) => piece.ready)).then((all) => ({
    degraded: all.flatMap((readiness) => readiness.degraded),
  }));

  const lookup = <T>(map: Map<SeatId | Location, T>, key: SeatId | Location, what: string): T => {
    const found = map.get(key);
    if (!found) throw new Error(`No anchor for ${what}: ${key}`);
    return found;
  };

  return {
    group,
    ready,
    dispose() {
      for (const piece of pieces) piece.dispose();
      pieces.length = 0;
      offices.clear();
      group.clear();
    },
    getLocationAnchor: (location) => lookup(locationAnchors, location, 'location').clone(),
    getOfficeAnchor: (seatId) => lookup(officeAnchors, seatId, 'office').clone(),
    setOfficeHighlight(seatId, active) {
      offices.get(seatId)?.setHighlight(active);
    },
    syncOffices(papers: readonly PaperPublic[]) {
      for (const paper of papers) offices.get(paper.seatId)?.setBannerColor(ctx.palette.paper[paper.color].hex);
    },
    getOfficeBannerColor: (seatId) => offices.get(seatId)?.bannerColor() ?? 0,
  };
}
