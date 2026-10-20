import type { TownLayout } from './types.ts';
import { LOCATION_NODES, OFFICE_NODES, STREET_EDGES } from '../../shared/town-map.ts';
import { CITIZEN_REFERENCE_HEIGHT } from './architecture/piece.ts';
import { GATHER_CLEARANCE, NODE_CLEARANCE, ROAD_CLEAR } from './architecture/lots.ts';

type Offset = { x: number; z: number };

/** Actual idle/cap envelope ratios, with margin for skinned outlines and restrained whole-rig gestures. */
export function crowdFootprint(height: number): { width: number; depth: number } {
  return { width: height * 1.14, depth: height * 0.85 };
}

/** Presentation offsets only; every destination remains the engine's prescribed node. */
export function allocateCrowdSlots(layout: TownLayout, destinations: readonly string[], height = CITIZEN_REFERENCE_HEIGHT): Offset[] {
  if (!Number.isFinite(height) || height <= 0) throw new Error('invalid crowd clearance height');
  const { width, depth } = crowdFootprint(height);
  const gathering = new Set<string>([...Object.values(LOCATION_NODES), ...OFFICE_NODES]);
  const groups = new Map<string, number[]>();
  destinations.forEach((node, i) => { const group = groups.get(node) ?? []; group.push(i); groups.set(node, group); });
  const occupied: Offset[] = []; const result: Offset[] = [];
  const intersects = (a: Offset, b: Offset) => Math.abs(a.x - b.x) < width - 1e-6 && Math.abs(a.z - b.z) < depth - 1e-6;
  for (const [nodeId, indices] of [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    const node = layout.getNodeWorldPos(nodeId);
    const radius = gathering.has(nodeId) ? GATHER_CLEARANCE : NODE_CLEARANCE;
    const roads = STREET_EDGES.filter(([a, b]) => a === nodeId || b === nodeId).map(([a, b]) => {
      const other = layout.getNodeWorldPos(a === nodeId ? b : a);
      return { minX: Math.min(0, other.x - node.x) - ROAD_CLEAR, maxX: Math.max(0, other.x - node.x) + ROAD_CLEAR,
        minZ: Math.min(0, other.z - node.z) - ROAD_CLEAR, maxZ: Math.max(0, other.z - node.z) + ROAD_CLEAR };
    });
    const reach = Math.max(radius, ...roads.flatMap(r => [Math.abs(r.minX), Math.abs(r.maxX), Math.abs(r.minZ), Math.abs(r.maxZ)]));
    const fits = (p: Offset) => Math.hypot(Math.abs(p.x) + width / 2, Math.abs(p.z) + depth / 2) <= radius + 1e-6 ||
      roads.some(r => p.x - width / 2 >= r.minX && p.x + width / 2 <= r.maxX && p.z - depth / 2 >= r.minZ && p.z + depth / 2 <= r.maxZ);
    let selected: Offset[] | null = null; let best = Infinity;
    for (const shiftX of [0, width / 2]) for (const shiftZ of [0, depth / 2]) {
      const candidates: Offset[] = [];
      for (let ix = -Math.ceil(reach / width); ix <= Math.ceil(reach / width); ix++) {
        for (let iz = -Math.ceil(reach / depth); iz <= Math.ceil(reach / depth); iz++) {
          const p = { x: ix * width + shiftX, z: iz * depth + shiftZ };
          if (fits(p) && !occupied.some(other => intersects({ x: node.x + p.x, z: node.z + p.z }, other))) candidates.push(p);
        }
      }
      candidates.sort((a, b) => a.x ** 2 + a.z ** 2 - b.x ** 2 - b.z ** 2 || a.z - b.z || a.x - b.x);
      if (candidates.length < indices.length) continue;
      const chosen = candidates.slice(0, indices.length);
      const score = chosen.reduce((sum, p) => sum + p.x ** 2 + p.z ** 2, 0);
      if (score < best) { selected = chosen; best = score; }
    }
    if (!selected) throw new Error(`crowd clearance cannot fit ${indices.length} citizens at ${nodeId}`);
    indices.forEach((index, i) => {
      const p = selected![i]!; result[index] = p;
      occupied.push({ x: node.x + p.x, z: node.z + p.z });
    });
  }
  return result;
}
