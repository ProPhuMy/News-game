import type { Location, SeatId } from '../../shared/ids.ts';
import { LOCATIONS } from '../../shared/ids.ts';
import type { SlotManager, TownLayout, Vector3Coord } from './types.ts';

/**
 * Concentric ring configuration for gathering slots.
 * Index 0: Center (0, 0)
 * Indices 1..6: Ring 1 (radius 0.9m, 6 slots at 60° increments)
 * Indices 7..16: Ring 2 (radius 1.7m, 10 slots at 36° increments)
 * Indices 17..30: Ring 3 (radius 2.5m, 14 slots at ~25.7° increments)
 * Total 31 distinct positions accommodating all 30 citizens (and overflow) with >= 0.4m separation.
 */
export function getGatheringSlotOffset(index: number): { x: number; z: number } {
  if (index <= 0) {
    return { x: 0, z: 0 };
  }

  if (index <= 6) {
    const ringIndex = index - 1;
    const angle = (ringIndex / 6) * Math.PI * 2;
    const x = Number((Math.cos(angle) * 0.9).toFixed(3)) || 0;
    const z = Number((Math.sin(angle) * 0.9).toFixed(3)) || 0;
    return { x, z };
  }

  if (index <= 16) {
    const ringIndex = index - 7;
    const angle = (ringIndex / 10) * Math.PI * 2;
    const x = Number((Math.cos(angle) * 1.7).toFixed(3)) || 0;
    const z = Number((Math.sin(angle) * 1.7).toFixed(3)) || 0;
    return { x, z };
  }

  if (index <= 30) {
    const ringIndex = index - 17;
    const angle = (ringIndex / 14) * Math.PI * 2;
    const x = Number((Math.cos(angle) * 2.5).toFixed(3)) || 0;
    const z = Number((Math.sin(angle) * 2.5).toFixed(3)) || 0;
    return { x, z };
  }

  // Graceful overflow beyond 30 slots: outer ring 4+
  const overflowIndex = index - 31;
  const ringCount = 18;
  const ringTier = Math.floor(overflowIndex / ringCount);
  const ringSlot = overflowIndex % ringCount;
  const radius = 3.3 + ringTier * 0.8;
  const angle = (ringSlot / ringCount) * Math.PI * 2;
  const x = Number((Math.cos(angle) * radius).toFixed(3)) || 0;
  const z = Number((Math.sin(angle) * radius).toFixed(3)) || 0;
  return { x, z };
}

function computeSlotCoord(center: Vector3Coord, index: number): Vector3Coord {
  const offset = getGatheringSlotOffset(index);
  return {
    x: Number((center.x + offset.x).toFixed(3)),
    y: 0,
    z: Number((center.z + offset.z).toFixed(3)),
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
