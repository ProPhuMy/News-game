import * as THREE from 'three';
import type { TownLayout, Vector3Coord } from './types.ts';

export interface RouteState {
  position: THREE.Vector3;
  headingAngle: number;
}

export interface RouteInterpolator {
  interpolateRoute(
    routeNodeIds: readonly string[],
    progress: number,
    jitterOffset?: { x: number; z: number },
    destinationOffset?: { x: number; z: number },
  ): RouteState;
}

const warnedNodes = new Set<string>();

function nodeExists(layout: TownLayout, id: string): boolean {
  if (typeof layout.hasNode === 'function') {
    return layout.hasNode(id);
  }
  try {
    layout.getNodeWorldPos(id);
    return true;
  } catch {
    return false;
  }
}

function resolveValidPoints(
  layout: TownLayout,
  routeNodeIds: readonly string[],
): Vector3Coord[] {
  const points: Vector3Coord[] = [];
  for (const id of routeNodeIds) {
    if (!id) continue;
    if (!nodeExists(layout, id)) {
      if (!warnedNodes.has(id)) {
        warnedNodes.add(id);
        console.warn(`[TownMovement] Unknown route node: ${id}`);
      }
      continue;
    }

    try {
      points.push(layout.getNodeWorldPos(id));
    } catch {
      if (!warnedNodes.has(id)) {
        warnedNodes.add(id);
        console.warn(`[TownMovement] Unknown route node: ${id}`);
      }
    }
  }
  return points;
}

export function createRouteInterpolator(layout: TownLayout): RouteInterpolator {
  return {
    interpolateRoute(
      routeNodeIds: readonly string[],
      progress: number,
      jitterOffset?: { x: number; z: number },
      destinationOffset?: { x: number; z: number },
    ): RouteState {
      const points = resolveValidPoints(layout, routeNodeIds);

      if (points.length === 0) {
        return {
          position: new THREE.Vector3(
            (destinationOffset?.x ?? 0) + (jitterOffset?.x ?? 0),
            0,
            (destinationOffset?.z ?? 0) + (jitterOffset?.z ?? 0),
          ),
          headingAngle: 0,
        };
      }

      if (points.length === 1) {
        const p0 = points[0]!;
        return {
          position: new THREE.Vector3(
            p0.x + (destinationOffset?.x ?? 0) + (jitterOffset?.x ?? 0),
            0,
            p0.z + (destinationOffset?.z ?? 0) + (jitterOffset?.z ?? 0),
          ),
          headingAngle: 0,
        };
      }

      const pointsWithDest: Vector3Coord[] = points.map((p, idx) => {
        if (idx === points.length - 1 && destinationOffset) {
          return {
            x: p.x + destinationOffset.x,
            y: p.y,
            z: p.z + destinationOffset.z,
          };
        }
        return p;
      });

      const segmentLengths: number[] = [];
      let totalLength = 0;

      for (let i = 0; i < pointsWithDest.length - 1; i++) {
        const pA = pointsWithDest[i];
        const pB = pointsWithDest[i + 1];
        if (pA && pB) {
          const len = Math.hypot(pB.x - pA.x, pB.z - pA.z);
          segmentLengths.push(len);
          totalLength += len;
        }
      }

      if (totalLength === 0) {
        const p0 = pointsWithDest[0] ?? { x: 0, y: 0, z: 0 };
        return {
          position: new THREE.Vector3(
            p0.x + (jitterOffset?.x ?? 0),
            0,
            p0.z + (jitterOffset?.z ?? 0),
          ),
          headingAngle: 0,
        };
      }

      const clampedProgress = Math.max(0, Math.min(1, progress));
      const targetDist = clampedProgress * totalLength;

      let accumulated = 0;
      for (let i = 0; i < segmentLengths.length; i++) {
        const segLen = segmentLengths[i] ?? 0;
        const pA = pointsWithDest[i];
        const pB = pointsWithDest[i + 1];

        if (!pA || !pB) {
          continue;
        }

        if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
          const segDist = Math.max(0, targetDist - accumulated);
          const segT = segLen > 0 ? segDist / segLen : 0;

          const dx = pB.x - pA.x;
          const dz = pB.z - pA.z;

          const x = pA.x + segT * dx + (jitterOffset?.x ?? 0);
          const z = pA.z + segT * dz + (jitterOffset?.z ?? 0);
          const heading = Math.atan2(dx, dz);

          return {
            position: new THREE.Vector3(x, 0, z),
            headingAngle: heading,
          };
        }

        accumulated += segLen;
      }

      const last = pointsWithDest[pointsWithDest.length - 1] ?? { x: 0, y: 0, z: 0 };
      return {
        position: new THREE.Vector3(
          last.x + (jitterOffset?.x ?? 0),
          0,
          last.z + (jitterOffset?.z ?? 0),
        ),
        headingAngle: 0,
      };
    },
  };
}
