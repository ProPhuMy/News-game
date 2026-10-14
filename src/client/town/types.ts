import type { Location, SeatId } from '../../shared/ids.ts';
import type { StreetNode } from '../../shared/town-map.ts';

export interface Vector3Coord {
  x: number;
  y: number;
  z: number;
}

export interface TownLayout {
  getNodeWorldPos(nodeId: string): Vector3Coord;
  getStreetNodes(): readonly StreetNode[];
  getLocationNode(location: Location): string;
  getOfficeNode(seatId: SeatId): string;
}

export interface SlotManager {
  getSlotPosition(location: Location | string, slotIndex: number): Vector3Coord;
  getOfficeSlotPosition(seatId: SeatId, slotIndex: number): Vector3Coord;
}
