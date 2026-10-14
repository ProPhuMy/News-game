import * as THREE from 'three';
import type { TownLayout, Vector3Coord } from './types.ts';

export interface RouteState {
  position: THREE.Vector3;
  headingAngle: number;
}

export interface PreparedRoute {
  points: Vector3Coord[];
  segmentLengths: number[];
  cumulativeLengths: number[];
  totalLength: number;
}

export interface RouteInterpolator {
  setRoute(
    routeNodeIds: readonly string[],
    destinationOffset?: { x: number; z: number },
  ): PreparedRoute;
  interpolatePreparedRoute(
    prepared: PreparedRoute,
    progress: number,
    jitterOffset?: { x: number; z: number },
    target?: THREE.Vector3,
  ): RouteState;
  interpolateRoute(
    routeNodeIds: readonly string[],
    progress: number,
    jitterOffset?: { x: number; z: number },
    destinationOffset?: { x: number; z: number },
    target?: THREE.Vector3,
  ): RouteState;
  clearCache(): void;
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

function buildPreparedRoute(
  layout: TownLayout,
  routeNodeIds: readonly string[],
  destinationOffset?: { x: number; z: number },
): PreparedRoute {
  const rawPoints = resolveValidPoints(layout, routeNodeIds);
  const points: Vector3Coord[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i]!;
    if (i === rawPoints.length - 1 && destinationOffset) {
      points.push({
        x: p.x + destinationOffset.x,
        y: p.y,
        z: p.z + destinationOffset.z,
      });
    } else {
      points.push({ x: p.x, y: p.y, z: p.z });
    }
  }

  const segmentLengths: number[] = [];
  const cumulativeLengths: number[] = [];
  let totalLength = 0;

  if (points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const pA = points[i]!;
      const pB = points[i + 1]!;
      const len = Math.hypot(pB.x - pA.x, pB.z - pA.z);
      segmentLengths.push(len);
      totalLength += len;
      cumulativeLengths.push(totalLength);
    }
  }

  return {
    points,
    segmentLengths,
    cumulativeLengths,
    totalLength,
  };
}

export function createRouteInterpolator(layout: TownLayout): RouteInterpolator {
  const routeCache = new Map<string, PreparedRoute>();
  const scratchStart = new THREE.Vector3();
  const scratchEnd = new THREE.Vector3();
  const scratchPos = new THREE.Vector3();
  const scratchState: RouteState = {
    position: scratchPos,
    headingAngle: 0,
  };

  function getRouteKey(
    routeNodeIds: readonly string[],
    destinationOffset?: { x: number; z: number },
  ): string {
    const destKey = destinationOffset ? `${destinationOffset.x},${destinationOffset.z}` : '';
    return `${routeNodeIds.join('>')}|${destKey}`;
  }

  function setRoute(
    routeNodeIds: readonly string[],
    destinationOffset?: { x: number; z: number },
  ): PreparedRoute {
    const key = getRouteKey(routeNodeIds, destinationOffset);
    let prepared = routeCache.get(key);
    if (!prepared) {
      prepared = buildPreparedRoute(layout, routeNodeIds, destinationOffset);
      routeCache.set(key, prepared);
    }
    return prepared;
  }

  function interpolatePreparedRoute(
    prepared: PreparedRoute,
    progress: number,
    jitterOffset?: { x: number; z: number },
    target?: THREE.Vector3,
  ): RouteState {
    const { points, segmentLengths, totalLength } = prepared;
    const outPos = target ?? scratchPos;

    if (points.length === 0) {
      outPos.set(
        jitterOffset?.x ?? 0,
        0,
        jitterOffset?.z ?? 0,
      );
      scratchState.position = outPos;
      scratchState.headingAngle = 0;
      return scratchState;
    }

    if (points.length === 1) {
      const p0 = points[0]!;
      outPos.set(
        p0.x + (jitterOffset?.x ?? 0),
        0,
        p0.z + (jitterOffset?.z ?? 0),
      );
      scratchState.position = outPos;
      scratchState.headingAngle = 0;
      return scratchState;
    }

    if (totalLength === 0) {
      const p0 = points[0]!;
      outPos.set(
        p0.x + (jitterOffset?.x ?? 0),
        0,
        p0.z + (jitterOffset?.z ?? 0),
      );
      scratchState.position = outPos;
      scratchState.headingAngle = 0;
      return scratchState;
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

        scratchStart.set(pA.x, 0, pA.z);
        scratchEnd.set(pB.x, 0, pB.z);
        outPos.lerpVectors(scratchStart, scratchEnd, segT);

        if (jitterOffset) {
          outPos.x += jitterOffset.x;
          outPos.z += jitterOffset.z;
        }

        const dx = pB.x - pA.x;
        const dz = pB.z - pA.z;
        const heading = Math.atan2(dx, dz);

        scratchState.position = outPos;
        scratchState.headingAngle = heading;
        return scratchState;
      }

      accumulated += segLen;
    }

    const last = points[points.length - 1]!;
    outPos.set(
      last.x + (jitterOffset?.x ?? 0),
      0,
      last.z + (jitterOffset?.z ?? 0),
    );
    scratchState.position = outPos;
    scratchState.headingAngle = 0;
    return scratchState;
  }

  return {
    setRoute,
    interpolatePreparedRoute,

    interpolateRoute(
      routeNodeIds: readonly string[],
      progress: number,
      jitterOffset?: { x: number; z: number },
      destinationOffset?: { x: number; z: number },
      target?: THREE.Vector3,
    ): RouteState {
      const prepared = setRoute(routeNodeIds, destinationOffset);
      return interpolatePreparedRoute(prepared, progress, jitterOffset, target);
    },

    clearCache(): void {
      routeCache.clear();
    },
  };
}
