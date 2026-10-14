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
  ): RouteState;
}

export function createRouteInterpolator(layout: TownLayout): RouteInterpolator {
  return {
    interpolateRoute(
      routeNodeIds: readonly string[],
      progress: number,
      jitterOffset?: { x: number; z: number },
    ): RouteState {
      if (routeNodeIds.length === 0) {
        return {
          position: new THREE.Vector3(
            jitterOffset?.x ?? 0,
            0,
            jitterOffset?.z ?? 0,
          ),
          headingAngle: 0,
        };
      }

      if (routeNodeIds.length === 1) {
        const nodeId = routeNodeIds[0];
        if (!nodeId) {
          return { position: new THREE.Vector3(), headingAngle: 0 };
        }
        const p = layout.getNodeWorldPos(nodeId);
        return {
          position: new THREE.Vector3(
            p.x + (jitterOffset?.x ?? 0),
            0,
            p.z + (jitterOffset?.z ?? 0),
          ),
          headingAngle: 0,
        };
      }

      const points: Vector3Coord[] = routeNodeIds.map((id) =>
        layout.getNodeWorldPos(id),
      );

      const segmentLengths: number[] = [];
      let totalLength = 0;

      for (let i = 0; i < points.length - 1; i++) {
        const pA = points[i];
        const pB = points[i + 1];
        if (pA && pB) {
          const len = Math.hypot(pB.x - pA.x, pB.z - pA.z);
          segmentLengths.push(len);
          totalLength += len;
        }
      }

      if (totalLength === 0) {
        const p0 = points[0] ?? { x: 0, y: 0, z: 0 };
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
        const pA = points[i];
        const pB = points[i + 1];

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

      const last = points[points.length - 1] ?? { x: 0, y: 0, z: 0 };
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
