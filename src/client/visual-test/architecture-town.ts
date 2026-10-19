// Full-town and close-up architecture captures (C3): our assembled buildings on a ground slab and road strips.
import * as THREE from 'three';
import { LOCATIONS } from '../../shared/ids.ts';
import { GRID, STREET_EDGES } from '../../shared/town-map.ts';
import { FOUNTAIN_OFFSET } from '../town/architecture/fountain.ts';
import { createAssetSource } from '../town/assets/source.ts';
import { createTownBuildings } from '../town/buildings.ts';
import { createTownCamera } from '../town/camera.ts';
import { createTownLayout } from '../town/layout.ts';
import { createMaterialKit } from '../town/materials.ts';
import { getPalette } from '../visuals/palette.ts';
import type { ArchitectureContext } from '../visuals/town-types.ts';
import type { ArchitectureScenario } from './architecture-scenario.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import type { VisualState } from './state.ts';

const ROAD_WIDTH = 3.4;
const SLAB = 96;

type Close = Exclude<ArchitectureScenario['view'], 'street' | 'awning' | 'town'>;

/** World position a close-up frames: a building's root, the fountain plaza midpoint, or office seat 0. */
export function closeTarget(group: THREE.Group, view: Close, layout: ReturnType<typeof createTownLayout>): THREE.Vector3 {
  if (view === 'office') {
    const office = group.children.find((child) => child.name === 'office' && child.userData.seat === 0);
    if (!office) throw new Error('no office root with seat 0');
    return office.position.clone();
  }
  const name = view.replace('_', '-'); // factory roots: bakery, bank, town-hall, clinic, fountain-square
  const root = group.children.find((child) => child.name === name);
  if (!root) throw new Error(`no building root named "${name}" for view ${view}`);
  const at = root.position.clone();
  if (view === 'fountain_square') {
    const node = layout.getNodeWorldPos(layout.getLocationNode(view));
    at.set(node.x + FOUNTAIN_OFFSET.x / 2, 0, node.z + FOUNTAIN_OFFSET.z / 2);
  }
  return at;
}

/**
 * Camera framing bounds for the assembled town. Mirrors production (src/client/town/index.ts): every
 * target-building root named by LOCATIONS plus every office root, each street node at y 4, expanded by 1.
 */
export function townFrameBounds(group: THREE.Group, layout: ReturnType<typeof createTownLayout>): THREE.Box3 {
  const bounds = new THREE.Box3();
  const targets = new Set<string>(LOCATIONS.map((location) => location.replaceAll('_', '-')));
  for (const child of group.children) {
    if (targets.has(child.name) || child.name === 'office') bounds.expandByObject(child, true);
  }
  for (const node of layout.getStreetNodes()) bounds.expandByPoint(new THREE.Vector3(node.x, 4, node.z));
  return bounds.expandByScalar(1);
}

export async function runArchitectureTown(
  scenario: ArchitectureScenario,
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
): Promise<VisualState> {
  const palette = getPalette(scenario.palette);
  const materials = createMaterialKit(palette);
  const assets = createAssetSource();
  const ctx: ArchitectureContext = { palette, materials, assets };
  const layout = createTownLayout();
  const buildings = createTownBuildings(layout, ctx);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.town.sky);
  const geometries: THREE.BufferGeometry[] = [];
  const disposeAll = (): void => {
    buildings.dispose();
    for (const geometry of geometries) geometry.dispose();
    materials.dispose();
    assets.dispose();
  };

  const box = (w: number, h: number, d: number, hex: number, x: number, y: number, z: number, ry = 0): void => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials.surface(hex));
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  box(SLAB, 0.1, SLAB, palette.town.ground, 0, -0.07, 0); // top -0.02, under the plaza bottom
  for (const [a, b] of STREET_EDGES) {
    const from = layout.getNodeWorldPos(a);
    const to = layout.getNodeWorldPos(b);
    const length = Math.hypot(to.x - from.x, to.z - from.z) + ROAD_WIDTH;
    box(length, 0.02, ROAD_WIDTH, palette.town.road, (from.x + to.x) / 2, 0.02, (from.z + to.z) / 2, to.z === from.z ? 0 : Math.PI / 2);
  }
  scene.add(buildings.group);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight(palette.town.sky, palette.town.ground, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(10, 20, 14);
  sun.target.position.set(0, 0, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const half = (GRID.size - 1) * GRID.spacing / 2 + 2; // ±50 covers the whole town
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 120 });
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0001;
  scene.add(sun, sun.target);

  let camera: THREE.PerspectiveCamera;
  const aspect = (container.clientWidth || 1280) / (container.clientHeight || 720);
  try {
    const view = scenario.view;
    if (view === 'street' || view === 'awning') throw new Error(`${view} is a rendering-sample view`);
    if (view === 'town') {
      const townCamera = createTownCamera({});
      townCamera.frame(townFrameBounds(buildings.group, layout));
      townCamera.resize(container.clientWidth || 1280, container.clientHeight || 720);
      camera = townCamera.camera;
    } else {
      const at = closeTarget(buildings.group, view, layout);
      camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 400);
      camera.position.copy(at).add(new THREE.Vector3(0, 13, 13));
      camera.lookAt(at.x, at.y + 3, at.z);
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const readiness = await buildings.ready;
    if (readiness.degraded.length > 0) return { status: 'error', error: `degraded-assets: ${readiness.degraded.join('; ')}` };
    renderer.render(scene, camera);
    const stats = measureCanvas(renderer.domElement);
    const verdict = readyVerdict({ webgl: true, distinctColors: stats.distinctColors });
    if (verdict.status === 'error') return verdict;
    return { status: 'ready', scene: 'architecture', scenario, renderer: 'town-architecture', ...stats };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  } finally {
    sun.shadow.dispose();
    disposeAll();
  }
}
