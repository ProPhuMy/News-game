// Test helper: ground-level clearance checks against map nodes and road strips (not product code).
import * as THREE from 'three';
import { LOCATION_NODES, OFFICE_NODES, STREET_EDGES, STREET_NODES } from '../../../src/shared/town-map.ts';
import { GATHER_CLEARANCE, HEADROOM, NODE_CLEARANCE, ROAD_CLEAR } from '../../../src/client/town/architecture/lots.ts';

export interface GroundRect { name: string; minX: number; maxX: number; minZ: number; maxZ: number }

const gathering = new Set<string>([...Object.values(LOCATION_NODES), ...OFFICE_NODES]);
const byId = new Map(STREET_NODES.map((n) => [n.id, n]));
const node = (id: string) => {
  const n = byId.get(id);
  if (!n) throw new Error(`unknown node ${id}`);
  return n;
};

/** World XZ box of every mesh that reaches below HEADROOM and above the ground plane. */
export function groundRects(root: THREE.Object3D): GroundRect[] {
  root.updateMatrixWorld(true);
  const rects: GroundRect[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const box = new THREE.Box3().setFromObject(child);
    if (box.min.y < HEADROOM && box.max.y > 0.1) {
      rects.push({ name: child.name || child.parent?.name || 'mesh', minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    }
  });
  return rects;
}

export function clearanceViolations(rects: readonly GroundRect[]): string[] {
  const out: string[] = [];
  for (const r of rects) {
    for (const n of STREET_NODES) {
      const radius = gathering.has(n.id) ? GATHER_CLEARANCE : NODE_CLEARANCE;
      const dx = Math.max(r.minX - n.x, 0, n.x - r.maxX);
      const dz = Math.max(r.minZ - n.z, 0, n.z - r.maxZ);
      if (Math.hypot(dx, dz) < radius) out.push(`${r.name} within ${radius} of node ${n.id}`);
    }
    for (const [a, b] of STREET_EDGES) {
      const p = node(a);
      const q = node(b);
      const sMinX = Math.min(p.x, q.x) - ROAD_CLEAR;
      const sMaxX = Math.max(p.x, q.x) + ROAD_CLEAR;
      const sMinZ = Math.min(p.z, q.z) - ROAD_CLEAR;
      const sMaxZ = Math.max(p.z, q.z) + ROAD_CLEAR;
      if (r.minX < sMaxX && r.maxX > sMinX && r.minZ < sMaxZ && r.maxZ > sMinZ) out.push(`${r.name} overlaps road ${a}-${b}`);
    }
  }
  return out;
}
