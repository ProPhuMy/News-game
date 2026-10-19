// Lot rules shared by every building (owner: Claude). Offsets are from a street node: x east, z south (+Z toward
// the camera). A building sits in the block lot just north of its node, front facing +Z.
import type { Location } from '../../../shared/ids.ts';

/** Radius kept clear around the nine gathering nodes (five targets, four offices). */
export const GATHER_CLEARANCE = 5;
/** Radius kept clear around every other node (flee spots, homes). */
export const NODE_CLEARANCE = 3.5;
/** Half-width of the clear strip along each street edge (road half-width 1.7 plus margin). */
export const ROAD_CLEAR = 2.0;
/** A citizen plus cap is shorter than this; parts entirely above it may overhang clearance zones. */
export const HEADROOM = 3.8;
export const LOT_INNER_X = 4;
export const LOT_FRONT_Z = 3;
/** Height above ground where a floating location label anchors over a building. */
export const LABEL_ANCHOR_HEIGHT = 5.8;

export type LotSide = 'east' | 'west';

export function lotCenter(
  node: { x: number; z: number },
  side: LotSide,
  footprint: { width: number; depth: number },
): { x: number; z: number } {
  const dx = LOT_INNER_X + footprint.width / 2;
  return { x: node.x + (side === 'east' ? dx : -dx), z: node.z - LOT_FRONT_Z - footprint.depth / 2 };
}

export const LOCATION_LOT_SIDES: Readonly<Record<Exclude<Location, 'fountain_square'>, LotSide>> = {
  bakery: 'east',
  bank: 'west',
  town_hall: 'west',
  clinic: 'east',
};

/** Indexed by seat id. */
export const OFFICE_LOT_SIDES: readonly LotSide[] = ['east', 'west', 'east', 'west'];
