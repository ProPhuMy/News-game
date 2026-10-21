// Full-town and close-up architecture captures (C3): our assembled buildings on a ground slab and road strips.
import * as THREE from 'three';
import { GRID, STREET_EDGES } from '../../shared/town-map.ts';
import { FOUNTAIN_OFFSET } from '../town/architecture/fountain.ts';
import { createAssetSource } from '../town/assets/source.ts';
import { createTownBuildings } from '../town/buildings.ts';
import { createTownCamera } from '../town/camera.ts';
import { townFrameBounds } from '../town/index.ts';
import { createTownLayout } from '../town/layout.ts';
import { createMaterialKit } from '../town/materials.ts';
import { getPalette, type PresentationPalette } from '../visuals/palette.ts';
import { timeOfDayLook, type TimeOfDay } from '../visuals/time-of-day.ts';
import { PICKET_SIGN_TEXTS, createPicketSignKit, type PicketSignKit } from '../town/props/picket.ts';
import type { ArchitectureContext } from '../visuals/town-types.ts';
import type { ArchitectureScenario } from './architecture-scenario.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import type { VisualState } from './state.ts';

const ROAD_WIDTH = 3.4;
const SLAB = 96;

type Close = Exclude<ArchitectureScenario['view'], 'street' | 'awning' | 'town' | 'picket'>;

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

/** Harness-only preview: one sign per slogan, held at hand height (1.0) in a row along x at `center`. */
export function addPicketRow(scene: THREE.Object3D, kit: PicketSignKit, center: THREE.Vector3): THREE.Object3D[] {
  return PICKET_SIGN_TEXTS.map((text, i) => {
    const sign = kit.create(text);
    sign.position.set(center.x + (i - (PICKET_SIGN_TEXTS.length - 1) / 2) * 1.6, 1, center.z);
    scene.add(sign);
    return sign;
  });
}

/** Harness-only preview of a time-of-day look; production lighting is Codex's (interface §5c). */
export function applyTimeOfDay(
  target: { scene: THREE.Scene; hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; setLampLevel?: (level: number) => void },
  palette: PresentationPalette,
  time: TimeOfDay | null,
): void {
  if (time === null) return;
  const look = timeOfDayLook(palette, time);
  target.scene.background = new THREE.Color(look.sky);
  target.hemi.color.setHex(look.hemiSky);
  target.hemi.groundColor.setHex(look.hemiGround);
  target.hemi.intensity = 1.1 * look.lightScale;
  target.sun.color.setHex(look.sun);
  target.sun.intensity = 2.4 * look.lightScale;
  target.setLampLevel?.(look.lampLevel);
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
  const pickets = createPicketSignKit(ctx);
  const disposeAll = (): void => {
    pickets.dispose();
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
  const hemi = new THREE.HemisphereLight(palette.town.sky, palette.town.ground, 1.1);
  scene.add(hemi);
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
  applyTimeOfDay({ scene, hemi, sun, setLampLevel: buildings.setLampLevel }, palette, scenario.time);

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
    } else if (view === 'picket') {
      const node = layout.getNodeWorldPos(layout.getLocationNode('bakery'));
      const at = new THREE.Vector3(node.x, 0, node.z);
      addPicketRow(scene, pickets, at);
      camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 400);
      camera.position.copy(at).add(new THREE.Vector3(0, 5, 8));
      camera.lookAt(at.x, 1.4, at.z);
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
