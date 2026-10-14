import type { Location, SeatId } from '../../shared/ids.ts';
import { LOCATIONS } from '../../shared/ids.ts';
import type { SlotManager, TownLayout, Vector3Coord } from './types.ts';

const PRIMARY_SLOT_COUNT = 8;
const PRIMARY_RADIUS = 3.0;
const OVERFLOW_RADIUS = 5.2;

function computeSlotCoord(center: Vector3Coord, index: number): Vector3Coord {
  let radius: number;
  let angle: number;

  if (index < PRIMARY_SLOT_COUNT) {
    radius = PRIMARY_RADIUS;
    // An arc spanning 240 degrees around the front/sides
    const startAngle = Math.PI * 0.15;
    const arcSpan = Math.PI * 1.7;
    angle = startAngle + (index / (PRIMARY_SLOT_COUNT - 1)) * arcSpan;
  } else {
    radius = OVERFLOW_RADIUS;
    const overflowIndex = index - PRIMARY_SLOT_COUNT;
    // Full 360 ring for overflow
    const overflowCount = 14;
    angle = (overflowIndex / overflowCount) * Math.PI * 2;
  }

  return {
    x: Number((center.x + Math.cos(angle) * radius).toFixed(3)),
    y: 0,
    z: Number((center.z + Math.sin(angle) * radius).toFixed(3)),
  };
}

export function createLocationSlots(layout: TownLayout): SlotManager {
  const isKnownLocation = (key: string): key is Location =>
    (LOCATIONS as readonly string[]).includes(key);

  return {
    getSlotPosition(location: Location | string, slotIndex: number): Vector3Coord {
      let nodeId: string;
      if (isKnownLocation(location)) {
        nodeId = layout.getLocationNode(location);
      } else {
        nodeId = location;
      }
      const center = layout.getNodeWorldPos(nodeId);
      return computeSlotCoord(center, slotIndex);
    },

    getOfficeSlotPosition(seatId: SeatId, slotIndex: number): Vector3Coord {
      const nodeId = layout.getOfficeNode(seatId);
      const center = layout.getNodeWorldPos(nodeId);
      return computeSlotCoord(center, slotIndex);
    },
  };
}
