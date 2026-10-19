// Fixed town dressing table (owner: Claude). Data only: world units, x east, z south (+Z toward the camera).
// rotationY is 0 (front faces +Z) or PI/2 (front faces +X). The test in tests/town/props/dressing.test.ts is the gate:
// every entry clears crowd disks and road strips and misses building lots and the fountain.
import type { PropKind } from './index.ts';

export interface DressingPlacement { kind: PropKind; x: number; z: number; rotationY?: number }

const E = Math.PI / 2;
const p = (kind: PropKind, x: number, z: number, rotationY?: number): DressingPlacement =>
  rotationY === undefined ? { kind, x, z } : { kind, x, z, rotationY };

const GRID_LINES = [-24, -12, 0, 12, 24] as const;
const MIDPOINTS = [-18, -6, 6, 18] as const;

// Building fronts face the street to their south, so the lamps line the north curb of each east-west street
// (the plaza street swaps one lamp to the south curb to clear the fountain).
const frontLamps = GRID_LINES.flatMap((line) =>
  MIDPOINTS.map((x) => (line === 0 && x === 6 ? p('gas-lamp', x, 2.4) : p('gas-lamp', x, line - 2.4))));

const sideLamps = [
  p('gas-lamp', -14.4, -18), p('gas-lamp', -9.6, -6), p('gas-lamp', -14.4, 6), p('gas-lamp', -9.6, 18),
  p('gas-lamp', 14.4, -18), p('gas-lamp', 14.4, -6), p('gas-lamp', 9.6, 6), p('gas-lamp', 9.6, 18),
];

const plaza = [
  p('bench', -3, -5.8, E), p('bench', -3, -8.2, E), p('bench', 3, 5.5, E), p('bench', 3, 8.2, E),
  p('newsstand', -3.5, 6, E),
  p('cart', 7, 6),
];

const officeStands = [
  p('newsstand', -17, -20), p('newsstand', 17, -20), p('newsstand', -19, 15.3), p('newsstand', 19, 15.3),
];

// One planter on each building front, at the lot's outer end, clear of the crowd disk and the lamp at the midpoint.
const planters = [
  p('flower-box', -4.1, -14.5), p('flower-box', 4.1, -14.5), p('flower-box', -19.9, 9.5), p('flower-box', 19.9, 9.5),
  p('flower-box', -16.1, -26.5), p('flower-box', 16.1, -26.5), p('flower-box', -16.1, 21.5), p('flower-box', 16.1, 21.5),
];

// Trees sit at empty block centers; small bushes tuck beside them, away from the gathering-node corners.
const blockInteriors = [
  p('tree-oak', -18, -18), p('tree-round', 18, -18, E), p('tree-round', -18, -6, E), p('tree-oak', 18, -6),
  p('tree-oak', -7, -6), p('tree-round', -7.5, 6, E), p('tree-round', -6, 18), p('tree-oak', 6, 18, E),
  p('bush', -15.1, -20), p('bush', 15.1, -20), p('bush', -20.5, -6), p('bush', 20.5, -6), p('bush', -8, 20), p('bush', 8, 20),
];

// Frame the map edge. Dense on the far (-Z) and side edges, sparse on the near (+Z) edge so the crowds stay in view.
const farRing = Array.from({ length: 13 }, (_, i) => {
  const x = -42 + i * 7;
  return p(i % 3 === 0 ? 'tree-oak' : i % 3 === 1 ? 'tree-round' : 'bush', x, -36 - (i % 2) * 1.5, i % 2 ? E : 0);
});
const sideRing = [-24, -12, 0, 12, 24].flatMap((z, i) => [
  p(i % 2 ? 'tree-round' : 'tree-oak', -35, z, i % 2 ? 0 : E),
  p(i % 2 ? 'tree-oak' : 'tree-round', 35, z + 3, i % 2 ? E : 0),
]);
const outerRing = [-30, -6, 18].flatMap((z, i) => [p('tree-oak', -41, z, i % 2 ? E : 0), p('tree-round', 41, z + 4, i % 2 ? 0 : E)]);
const nearRing = [p('tree-oak', -40, 36), p('tree-round', -30, 38, E), p('tree-round', 30, 38), p('tree-oak', 40, 36, E)];

export const TOWN_DRESSING: readonly DressingPlacement[] = [
  ...frontLamps, ...sideLamps, ...plaza, ...officeStands, ...planters, ...blockInteriors,
  ...farRing, ...sideRing, ...outerRing, ...nearRing,
];

/** Four 1x1 spots for Codex's static paperboys, one block corner off a street each, facing it. */
export const PAPERBOY_SPOTS: readonly { x: number; z: number; rotationY: number }[] = [
  { x: -9, z: 3, rotationY: Math.PI },
  { x: 15, z: 3, rotationY: Math.PI },
  { x: -15, z: -3, rotationY: 0 },
  { x: 15, z: -3, rotationY: 0 },
];
