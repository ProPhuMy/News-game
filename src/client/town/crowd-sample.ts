import * as THREE from 'three';
import { COLORS } from '../../shared/ids.ts';
import { OFFICE_NODES } from '../../shared/town-map.ts';
import { TUNING } from '../../shared/tuning.ts';
import type { PresentationPalette } from '../visuals/palette.ts';
import type { SceneReadiness } from '../visuals/town-types.ts';
import { GATHER_CLEARANCE } from './architecture/lots.ts';
import { createSampleCharacter, type SampleCharacter } from './assets/character.ts';
import { createAssetSource } from './assets/source.ts';
import { createTownBuildings } from './buildings.ts';
import { createTownCamera } from './camera.ts';
import { createTownEnvironment } from './environment.ts';
import { createTownLayout } from './layout.ts';
import { createMaterialKit } from './materials.ts';
import { createTownScene } from './scene.ts';

/** Measure drawn vertices only; body measurements exclude the attached hat and paper. */
export function characterBounds(root: THREE.Object3D, bodyOnly: boolean): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3(); const vertex = new THREE.Vector3();
  root.traverseVisible(child => {
    if (!(child instanceof THREE.Mesh) || child.name === 'toon-outline') return;
    if (bodyOnly) {
      for (let parent: THREE.Object3D | null = child; parent; parent = parent.parent) {
        if (parent.name === 'paper-hat' || parent.name === 'reading-paper') return;
      }
    }
    const positions = child.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      child.getVertexPosition(i, vertex).applyMatrix4(child.matrixWorld);
      bounds.expandByPoint(vertex);
    }
  });
  return bounds;
}

export interface CrowdMetrics {
  height: number;
  poseMs: number;
  nodeId: string;
  layout: string;
  bodySize: { width: number; height: number; depth: number };
  visibleSize: { width: number; height: number; depth: number };
  idleBodyEnvelope: { width: number; height: number; depth: number };
  idleVisibleEnvelope: { width: number; height: number; depth: number };
  bodyOverlapPairs: number;
  visibleOverlapPairs: number;
  maximumBodyIntersectionArea: number;
  bodyOutsideClearance: number;
  visibleOutsideClearance: number;
  minimumCenterDistance: number;
  idleEnvelopeBodyOverlapPairs: number;
  idleEnvelopeVisibleOverlapPairs: number;
  idleEnvelopeBodyOutsideClearance: number;
  idleEnvelopeVisibleOutsideClearance: number;
}

function size(box: THREE.Box3): { width: number; height: number; depth: number } {
  const v = box.getSize(new THREE.Vector3()); return { width: v.x, height: v.y, depth: v.z };
}

// Proposed comparison spacing only. Production keeps its existing scale and slots pending user review.
const slots = Array.from({ length: 10 }, (_, row) => {
  const z = (row - 4.5) * 1.15;
  const alternatives = [0, 0.85].map(shift => Array.from({ length: 11 }, (_, column) => ({ x: (column - 5) * 1.7 + shift, z }))
    .filter(p => Math.hypot(Math.abs(p.x) + 0.85, Math.abs(p.z) + 0.575) <= GATHER_CLEARANCE));
  return alternatives.sort((a, b) => b.length - a.length)[0]!;
}).flat().sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || a.z - b.z || a.x - b.x)
  .slice(0, TUNING.citizens);

/** Isolated static art comparison: no ReactionPlan, route, fixture or production-scale mutations. */
export function createCrowdComparison(options: {
  container: HTMLElement; renderer: THREE.WebGLRenderer; palette: PresentationPalette; height: number;
}): { whenReady(): Promise<SceneReadiness & { instances: number; metrics: CrowdMetrics }>; setTime(ms: number): void; dispose(): void } {
  if (!Number.isFinite(options.height) || options.height <= 0) throw new Error('comparison height must be positive');
  if (slots.length !== TUNING.citizens) throw new Error('comparison requires thirty slots');
  const { renderer, palette, height } = options;
  const materials = createMaterialKit(palette); const assets = createAssetSource();
  const ctx = { palette, materials, assets }; const layout = createTownLayout();
  const nodeId = OFFICE_NODES[1]!; const node = layout.getNodeWorldPos(nodeId);
  const town = createTownScene(renderer.domElement, { renderer, palette });
  const buildings = createTownBuildings(layout, ctx); const environment = createTownEnvironment(layout, ctx);
  town.scene.add(buildings.group, environment);
  const ringGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => {
    const angle = i / 96 * Math.PI * 2;
    return new THREE.Vector3(node.x + Math.cos(angle) * GATHER_CLEARANCE, 0.08, node.z + Math.sin(angle) * GATHER_CLEARANCE);
  }));
  const ringMaterial = new THREE.LineBasicMaterial({ color: palette.town.outline });
  town.scene.add(new THREE.LineLoop(ringGeometry, ringMaterial));
  const camera = createTownCamera({ initialDistance: 30, reducedMotion: true });
  camera.setTarget(node.x - 2, node.z - 2);
  camera.resize(options.container.clientWidth || 1280, options.container.clientHeight || 720);
  const actors: SampleCharacter[] = [];
  let disposed = false;
  let report: (SceneReadiness & { instances: number; metrics: CrowdMetrics }) | null = null;
  let idleBody = new THREE.Box3(); let idleVisible = new THREE.Box3();

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const actor of actors) actor?.dispose();
    buildings.dispose(); environment.dispose(); ringGeometry.dispose(); ringMaterial.dispose();
    materials.dispose(); assets.dispose(); town.dispose();
  }
  function metrics(ms: number): CrowdMetrics {
    const body = actors.map(actor => characterBounds(actor.object, true));
    const visible = actors.map(actor => characterBounds(actor.object, false));
    const outside = (box: THREE.Box3): boolean => [box.min.x, box.max.x].some(x =>
      [box.min.z, box.max.z].some(z => Math.hypot(x - node.x, z - node.z) > GATHER_CLEARANCE + 1e-6));
    const area = (a: THREE.Box3, b: THREE.Box3): number =>
      Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x)) *
      Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z));
    let bodyOverlapPairs = 0; let visibleOverlapPairs = 0; let maximumBodyIntersectionArea = 0;
    let minimumCenterDistance = Infinity;
    for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) {
      const intersection = area(body[i]!, body[j]!);
      if (intersection > 1e-6) bodyOverlapPairs++;
      if (area(visible[i]!, visible[j]!) > 1e-6) visibleOverlapPairs++;
      maximumBodyIntersectionArea = Math.max(maximumBodyIntersectionArea, intersection);
      minimumCenterDistance = Math.min(minimumCenterDistance, actors[i]!.object.position.distanceTo(actors[j]!.object.position));
    }
    const envelope = (box: THREE.Box3): THREE.Box3[] => actors.map(actor => box.clone().translate(
      actor.object.position.clone().sub(actors[0]!.object.position)));
    const idleBodies = envelope(idleBody); const idleVisibleBodies = envelope(idleVisible);
    const pairs = (boxes: THREE.Box3[]): number => boxes.reduce((sum, box, i) =>
      sum + boxes.slice(i + 1).filter(other => area(box, other) > 1e-6).length, 0);
    return { height, poseMs: ms, nodeId, layout: 'proposed fixed 1.7 x 1.15 rows; production unchanged',
      bodySize: size(body[0]!), visibleSize: size(visible[0]!),
      idleBodyEnvelope: size(idleBody), idleVisibleEnvelope: size(idleVisible),
      bodyOverlapPairs, visibleOverlapPairs, maximumBodyIntersectionArea,
      bodyOutsideClearance: body.filter(outside).length, visibleOutsideClearance: visible.filter(outside).length,
      minimumCenterDistance,
      idleEnvelopeBodyOverlapPairs: pairs(idleBodies), idleEnvelopeVisibleOverlapPairs: pairs(idleVisibleBodies),
      idleEnvelopeBodyOutsideClearance: idleBodies.filter(outside).length,
      idleEnvelopeVisibleOutsideClearance: idleVisibleBodies.filter(outside).length };
  }
  const loads = slots.map(async (slot, index) => {
    const actor = await createSampleCharacter(ctx, {
      modelUrl: '/models/characters/kenney-mini/character-male-a.glb', height, paper: COLORS[index % COLORS.length]!,
    });
    if (disposed) { actor.dispose(); throw new Error('crowd comparison disposed before readiness'); }
    actor.object.position.set(node.x + slot.x, 0, node.z + slot.z);
    actors[index] = actor; town.scene.add(actor.object);
  });
  const ready = Promise.all([buildings.ready, Promise.all(loads)]).then(([readiness]) => {
    if (disposed) throw new Error('crowd comparison disposed before readiness');
    let duration = 0;
    actors[0]!.object.traverse(child => { duration = Math.max(duration, child.animations.find(clip => clip.name === 'idle')?.duration ?? 0); });
    idleBody = new THREE.Box3(); idleVisible = new THREE.Box3();
    for (let i = 0; i <= 24; i++) {
      actors[0]!.setPose('idle', duration * i / 24);
      idleBody.union(characterBounds(actors[0]!.object, true));
      for (const color of COLORS) {
        actors[0]!.setPaper(color);
        idleVisible.union(characterBounds(actors[0]!.object, false));
      }
    }
    actors[0]!.setPaper(COLORS[0]!);
    for (const actor of actors) actor.setPose('idle', 0);
    report = { degraded: readiness.degraded, instances: actors.length, metrics: metrics(0) };
    return report;
  }).catch((error: unknown) => { dispose(); throw error; });
  void ready.catch(() => {});
  return {
    whenReady: () => ready,
    setTime(ms) {
      if (disposed) throw new Error('crowd comparison disposed');
      if (!report) throw new Error('crowd comparison not ready');
      if (!Number.isFinite(ms) || ms < 0) throw new Error('comparison time must be nonnegative');
      for (const actor of actors) actor.setPose('idle', ms / 1000);
      report.metrics = metrics(ms);
      town.render(camera.camera);
    },
    dispose,
  };
}
