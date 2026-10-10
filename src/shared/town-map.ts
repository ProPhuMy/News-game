import type { Location } from './ids.ts';

export interface StreetNode { id: string; x: number; z: number }

/** Streets form a 5×5 grid, 12 world units apart, centred on Fountain Square. Node ids are `r{row}c{col}`. */
export const GRID = { size: 5, spacing: 12 } as const;

const mid = (GRID.size - 1) / 2;
const nodeId = (r: number, c: number): string => `r${r}c${c}`;
const cells = Array.from({ length: GRID.size * GRID.size }, (_, i) => ({ r: Math.floor(i / GRID.size), c: i % GRID.size }));

export const STREET_NODES: readonly StreetNode[] = cells.map(({ r, c }) => ({
  id: nodeId(r, c),
  x: (c - mid) * GRID.spacing,
  z: (r - mid) * GRID.spacing,
}));

export const STREET_EDGES: readonly (readonly [string, string])[] = cells.flatMap(({ r, c }) => [
  ...(c + 1 < GRID.size ? [[nodeId(r, c), nodeId(r, c + 1)] as const] : []),
  ...(r + 1 < GRID.size ? [[nodeId(r, c), nodeId(r + 1, c)] as const] : []),
]);

export const LOCATION_NODES: Readonly<Record<Location, string>> = {
  bakery: 'r1c1',
  bank: 'r1c3',
  fountain_square: 'r2c2',
  town_hall: 'r3c1',
  clinic: 'r3c3',
};

/** Newspaper office node, indexed by seat id. Not targetable by claims. */
export const OFFICE_NODES: readonly string[] = ['r0c0', 'r0c4', 'r4c0', 'r4c4'];

/** Edge midpoints that fleeing citizens run to. */
export const FLEE_NODES: readonly string[] = ['r0c2', 'r2c0', 'r2c4', 'r4c2'];

const reserved = new Set<string>([...Object.values(LOCATION_NODES), ...OFFICE_NODES]);

/** Nodes citizens can live at. */
export const HOME_NODES: readonly string[] = STREET_NODES.map((n) => n.id).filter((id) => !reserved.has(id));
