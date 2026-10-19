// Architecture sample scene (C2): the sample bakery and props on one lot, a fixed camera and representative shadows.
import * as THREE from 'three';
import { createBakery } from '../town/architecture/bakery.ts';
import { createBakeryHybrid } from '../town/architecture/bakery-hybrid.ts';
import { CITIZEN_REFERENCE_HEIGHT } from '../town/architecture/piece.ts';
import { createProp, type PropKind } from '../town/props/index.ts';
import { getPalette } from '../visuals/palette.ts';
import type { ArchitectureContext, PlacedPiece } from '../visuals/town-types.ts';
import { parseArchitectureScenario, type ArchitectureScenario } from './architecture-scenario.ts';
import { createVirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { createPreviewAssets, createPreviewKit } from './preview-kit.ts';
import type { VisualState } from './state.ts';

/** Street props along the bakery's lot: [kind, x, z]. The bakery spans x -3..3, z -2.5..2.5; the street is +Z. */
const PROPS: readonly (readonly [PropKind, number, number])[] = [
  ['gas-lamp', -4.2, 3.8], ['gas-lamp', 4.2, 3.8], ['bench', -5.6, 1.4], ['newsstand', 6.6, 1.2],
  ['bush', 4.3, 0.6], ['tree-oak', -9.2, -0.6], ['tree-round', 9.6, -1.0],
  ['flowers', 0.6, 2.9], ['flowers', 1.3, 2.9], ['flowers', 2.0, 2.9],
];

const VIEWS: Record<ArchitectureScenario['view'], { position: [number, number, number]; target: [number, number, number] }> = {
  street: { position: [0, 17, 27], target: [0, 2.6, 1] },
  awning: { position: [1.5, 6.5, 11], target: [0.4, 4.0, 2.4] },
};

function bakeryFor(variant: ArchitectureScenario['variant'], ctx: ArchitectureContext): PlacedPiece {
  if (variant === 'code') return createBakery(ctx);
  return createBakeryHybrid(ctx, variant === 'hybrid-original' ? 'original' : 'palette');
}

function addGround(scene: THREE.Scene, ctx: ArchitectureContext): void {
  const { ground, plaza, road } = ctx.palette.town;
  const slab = (width: number, depth: number, hex: number, y: number, z: number): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), ctx.materials.surface(hex));
    mesh.position.set(0, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  slab(48, 40, ground, -0.03, 0);
  slab(48, 2.4, plaza, -0.01, 3.7); // sidewalk in front of the shop
  slab(48, 3.4, road, -0.01, 6.6); // same width as the town's roads
}

export async function runArchitecture(search: string, container: HTMLElement): Promise<VisualState> {
  const scenario = parseArchitectureScenario(search);
  createVirtualClock(0, scenario.seed).install();
  const palette = getPalette(scenario.palette);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
  } catch {
    return { status: 'error', error: 'webgl-unavailable' };
  }
  renderer.setPixelRatio(1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ctx: ArchitectureContext = { palette, materials: createPreviewKit(palette.town.outline), assets: createPreviewAssets() };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.town.sky);
  addGround(scene, ctx);

  const pieces = [bakeryFor(scenario.variant, ctx)];
  for (const [kind, x, z] of PROPS) {
    const prop = createProp(kind, ctx);
    prop.object.position.set(x, 0, z);
    pieces.push(prop);
  }
  for (const piece of pieces) scene.add(piece.object);

  // Scale reference: a plain capsule at the D1 evaluation citizen height, beside the door.
  const radius = 0.55;
  const citizen = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, CITIZEN_REFERENCE_HEIGHT - radius * 2, 4, 12),
    ctx.materials.surface(palette.unsubscribed.hex),
  );
  citizen.position.set(-2.6, CITIZEN_REFERENCE_HEIGHT / 2, 3.6);
  citizen.castShadow = true;
  ctx.materials.outline(citizen);
  scene.add(citizen);

  scene.add(new THREE.HemisphereLight(palette.town.sky, palette.town.ground, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(10, 20, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
  scene.add(sun);

  const readiness = await Promise.all(pieces.map((piece) => piece.ready));
  const degraded = readiness.flatMap((r) => r.degraded);
  if (degraded.length > 0) return { status: 'error', error: `degraded-assets: ${degraded.join('; ')}` };

  const view = VIEWS[scenario.view];
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(...view.position);
  camera.lookAt(...view.target);
  renderer.render(scene, camera);

  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: true, distinctColors: stats.distinctColors });
  if (verdict.status === 'error') return verdict;
  return { status: 'ready', scene: 'architecture', scenario, ...stats };
}
