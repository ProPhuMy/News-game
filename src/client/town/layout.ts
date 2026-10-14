import type { Location, SeatId } from '../../shared/ids.ts';
import {
  LOCATION_NODES,
  OFFICE_NODES,
  STREET_NODES,
  type StreetNode,
} from '../../shared/town-map.ts';
import type { TownLayout, Vector3Coord } from './types.ts';

export function createTownLayout(
  customNodes: readonly StreetNode[] = STREET_NODES,
): TownLayout {
  const nodeMap = new Map<string, StreetNode>(
    customNodes.map((n) => [n.id, n]),
  );

  return {
    getNodeWorldPos(nodeId: string): Vector3Coord {
      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Unknown node id in town layout: ${nodeId}`);
      }
      return { x: node.x, y: 0, z: node.z };
    },

    getNodeWorldPosition(nodeId: string): Vector3Coord {
      return this.getNodeWorldPos(nodeId);
    },

    hasNode(nodeId: string): boolean {
      return nodeMap.has(nodeId);
    },

    getStreetNodes(): readonly StreetNode[] {
      return customNodes;
    },

    getLocationNode(location: Location): string {
      const id = LOCATION_NODES[location];
      if (!id) {
        throw new Error(`Unknown location: ${location}`);
      }
      return id;
    },

    getOfficeNode(seatId: SeatId): string {
      const id = OFFICE_NODES[seatId];
      if (id === undefined) {
        throw new Error(`Unknown seat id: ${seatId}`);
      }
      return id;
    },
  };
}
