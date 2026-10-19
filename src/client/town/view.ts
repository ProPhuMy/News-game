import * as THREE from 'three';
import type { Location, Phase, SeatId } from '../../shared/ids.ts';
import type { PublicSnapshot, ReactionPlan } from '../../shared/snapshots.ts';
import { APPROVED_PALETTE, getPalette, type PresentationPalette } from '../visuals/palette.ts';
import type { SceneReadiness } from '../visuals/town-types.ts';
import { createTownLayout } from './layout.ts';
import type { TownLayout } from './types.ts';
import { createFallbackView } from './webgl.ts';

export interface TownViewOptions {
  container?: HTMLElement;
  palette?: PresentationPalette;
  reducedMotion?: boolean;
  forceWebGL?: boolean;
  customRenderer?: THREE.WebGLRenderer;
}

export interface TownView {
  whenReady(): Promise<SceneReadiness>;
  isWebGLSupported(): boolean;
  playReactionPlan(plan: ReactionPlan, durationSeconds?: number): Promise<void>;
  setPhase(phase: Phase): void;
  setTargetLocation(location: Location | null): void;
  setReducedMotion(enabled: boolean): void;
  resize(): void;
  dispose(): void;
  syncFromSnapshot(snapshot: PublicSnapshot): void;
  getCitizenPosition(id: number, out?: THREE.Vector3): THREE.Vector3;
  getCitizenRotation(id: number): number;
  setCitizenPosition(id: number, pos: THREE.Vector3): void;
  setCitizenRotation(id: number, angleY: number): void;
  getCitizenHatColor(id: number): number;
  getNodeWorldPosition(nodeId: string): THREE.Vector3;
  getOfficeBannerColor(seatId: SeatId): number;
}

export function createFallbackTownView(container: HTMLElement, layout?: TownLayout): TownView {
  const fallback = createFallbackView(container);
  const actualLayout = layout ?? createTownLayout();
  return {
    whenReady: async () => ({ degraded: [] }),
    isWebGLSupported: () => false,
    playReactionPlan: async () => {},
    setPhase: () => {},
    setTargetLocation: () => {},
    setReducedMotion: () => {},
    resize: () => {},
    dispose: () => fallback.dispose(),
    syncFromSnapshot: () => {},
    getCitizenPosition: (_id: number, out?: THREE.Vector3) => (out ? out.set(0, 0, 0) : new THREE.Vector3()),
    getCitizenRotation: () => 0,
    setCitizenPosition: () => {},
    setCitizenRotation: () => {},
    getCitizenHatColor: () => getPalette(APPROVED_PALETTE).unsubscribed.hex,
    getNodeWorldPosition: (nodeId: string) => {
      const p = actualLayout.getNodeWorldPos(nodeId);
      return new THREE.Vector3(p.x, p.y, p.z);
    },
    getOfficeBannerColor: () => 0,
  };
}
