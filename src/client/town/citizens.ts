import * as THREE from 'three';
import { COLORS, type Color, type SeatId } from '../../shared/ids.ts';
import type { CitizenPublic, PaperPublic } from '../../shared/snapshots.ts';
import { HOME_NODES } from '../../shared/town-map.ts';
import { TUNING } from '../../shared/tuning.ts';
import { APPROVED_PALETTE, getPalette } from '../visuals/palette.ts';
import type { ArchitectureContext, SceneReadiness } from '../visuals/town-types.ts';
import { CITIZEN_REFERENCE_HEIGHT } from './architecture/piece.ts';
import { createSampleCharacter, type SampleCharacter, type SamplePose } from './assets/character.ts';
import { createTownLayout } from './layout.ts';
import { createPoofEffect, type PoofSystem } from './particles.ts';
import type { SeatColorMap } from './types.ts';

export interface CitizenInstance {
  id: number;
  mesh: THREE.Group;
  currentPaper: SeatId | null;
  homeNodeId: string;
  actor?: SampleCharacter;
}
export interface CitizenManagerOptions { reducedMotion?: boolean; context?: ArchitectureContext }
export interface SetCitizenPaperOptions { reducedMotion?: boolean; immediate?: boolean }
export interface CitizenManager {
  whenReady(): Promise<SceneReadiness>;
  getCitizen(id: number): CitizenInstance;
  getAllCitizens(): readonly CitizenInstance[];
  setCitizenPaper(id: number, seatId: SeatId | null, options?: SetCitizenPaperOptions): void;
  setSeatColors(colors: SeatColorMap): void;
  syncCitizens(citizens: readonly CitizenPublic[], papers: readonly PaperPublic[]): void;
  getCitizenHatColor(id: number): number;
  setCitizenPosition(id: number, pos: THREE.Vector3): void;
  getCitizenPosition(id: number, out?: THREE.Vector3): THREE.Vector3;
  setCitizenRotation(id: number, angleY: number): void;
  getCitizenRotation(id: number): number;
  setCitizenPose(id: number, pose: SamplePose, seconds: number): void;
  setReducedMotion(enabled: boolean): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

const defaultPalette = getPalette(APPROVED_PALETTE);

export function createCitizenManager(
  layout = createTownLayout(), scene = new THREE.Scene(), poofSystem?: PoofSystem,
  options: CitizenManagerOptions = {},
): CitizenManager {
  const palette = options.context?.palette ?? defaultPalette;
  const poof = poofSystem ?? createPoofEffect(scene);
  let reducedMotion = options.reducedMotion ?? false;
  let disposed = false;
  let time = 0;
  let seatColors: SeatColorMap = Object.fromEntries(COLORS.map((color, seat) => [seat, color]));
  const poses = new Map<number, { pose: SamplePose; seconds: number }>();
  const citizens: CitizenInstance[] = Array.from({ length: TUNING.citizens }, (_, id) => {
    const homeNodeId = HOME_NODES[id % HOME_NODES.length]!;
    const home = layout.getNodeWorldPos(homeNodeId);
    const mesh = new THREE.Group(); mesh.name = `citizen-${id}`;
    mesh.position.set(home.x, 0, home.z); scene.add(mesh);
    return { id, mesh, currentPaper: null, homeNodeId };
  });
  const colorOf = (citizen: CitizenInstance): Color | null => citizen.currentPaper === null
    ? null : seatColors[citizen.currentPaper] ?? null;
  const hatColor = (citizen: CitizenInstance): number => {
    const color = colorOf(citizen);
    return color === null ? palette.unsubscribed.hex : palette.paper[color].hex;
  };
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const citizen of citizens) { citizen.actor?.dispose(); citizen.mesh.removeFromParent(); }
    if (!poofSystem) poof.dispose();
    poses.clear();
  }
  const ready = Promise.all(citizens.map(async citizen => {
    if (!options.context) return;
    const actor = await createSampleCharacter(options.context, {
      modelUrl: '/models/characters/kenney-mini/character-male-a.glb',
      height: CITIZEN_REFERENCE_HEIGHT, paper: null,
    });
    if (disposed) { actor.dispose(); throw new Error('citizens disposed before readiness'); }
    citizen.actor = actor;
    actor.setPaper(colorOf(citizen));
    const pose = poses.get(citizen.id);
    actor.setPose(pose?.pose ?? 'idle', pose?.seconds ?? time, reducedMotion);
    citizen.mesh.add(actor.object);
  })).then(() => {
    if (disposed) throw new Error('citizens disposed before readiness');
    return { degraded: [] };
  }).catch((error: unknown) => { dispose(); throw error; });
  void ready.catch(() => {});

  return {
    whenReady: () => ready,
    getCitizen(id) {
      const citizen = citizens[id];
      if (!citizen) throw new Error(`Citizen not found: ${id}`);
      return citizen;
    },
    getAllCitizens: () => citizens,
    setSeatColors(colors) {
      seatColors = { ...seatColors, ...colors };
      for (const citizen of citizens) citizen.actor?.setPaper(colorOf(citizen));
    },
    syncCitizens(snapshot, papers) {
      for (const paper of papers) seatColors[paper.seatId] = paper.color;
      poses.clear(); time = 0;
      for (const state of snapshot) {
        const citizen = citizens[state.id]; if (!citizen) continue;
        const pos = layout.getNodeWorldPos(state.home);
        citizen.homeNodeId = state.home; citizen.currentPaper = state.paper;
        citizen.mesh.position.set(pos.x, 0, pos.z);
        citizen.mesh.rotation.set(0, 0, 0);
        citizen.actor?.setPaper(colorOf(citizen));
        citizen.actor?.setPose('idle', 0, reducedMotion);
      }
    },
    getCitizenHatColor(id) {
      const citizen = citizens[id];
      if (!citizen) throw new Error(`Citizen not found: ${id}`);
      return hatColor(citizen);
    },
    setCitizenPaper(id, paper, settings = {}) {
      const citizen = citizens[id]; if (!citizen || disposed || citizen.currentPaper === paper) return;
      citizen.currentPaper = paper;
      citizen.actor?.setPaper(colorOf(citizen));
      if (!settings.immediate) poof.triggerPoof(citizen.mesh.position, hatColor(citizen), settings.reducedMotion ?? reducedMotion);
    },
    setCitizenPosition(id, pos) { citizens[id]?.mesh.position.copy(pos); },
    getCitizenPosition(id, out = new THREE.Vector3()) { return out.copy(citizens[id]?.mesh.position ?? new THREE.Vector3()); },
    setCitizenRotation(id, angle) { const citizen = citizens[id]; if (citizen) citizen.mesh.rotation.y = angle; },
    getCitizenRotation: id => citizens[id]?.mesh.rotation.y ?? 0,
    setCitizenPose(id, pose, seconds) {
      poses.set(id, { pose, seconds });
      citizens[id]?.actor?.setPose(pose, seconds, reducedMotion);
    },
    setReducedMotion(enabled) {
      reducedMotion = enabled;
      for (const citizen of citizens) {
        citizen.mesh.position.y = 0; citizen.mesh.rotation.x = 0; citizen.mesh.rotation.z = 0;
        const pose = poses.get(citizen.id);
        citizen.actor?.setPose(pose?.pose ?? 'idle', pose?.seconds ?? time, reducedMotion);
      }
    },
    update(deltaSeconds) {
      time += deltaSeconds;
      for (const citizen of citizens) if (!poses.has(citizen.id)) citizen.actor?.setPose('idle', time, reducedMotion);
    },
    dispose,
  };
}
