import * as THREE from 'three';
import type { Location, Phase, SeatId } from '../../shared/ids.ts';
import type { PublicSnapshot, ReactionPlan } from '../../shared/snapshots.ts';
import { createBubbleManager } from './bubbles.ts';
import { createTownBuildings } from './buildings.ts';
import { createTownCamera } from './camera.ts';
import { createCitizenManager } from './citizens.ts';
import { createTownEnvironment } from './environment.ts';
import { createTownLayout } from './layout.ts';
import { createRouteInterpolator } from './movement.ts';
import { createPoofEffect } from './particles.ts';
import { createPlaybackCoordinator } from './playback.ts';
import { createTownScene } from './scene.ts';
import {
  attachContextLossHandler,
  checkWebGLSupport,
  createFallbackView,
} from './webgl.ts';

export interface TownViewOptions {
  container?: HTMLElement;
  reducedMotion?: boolean;
  forceWebGL?: boolean;
  customRenderer?: THREE.WebGLRenderer;
}

export interface TownView {
  isWebGLSupported(): boolean;
  playReactionPlan(plan: ReactionPlan, durationSeconds?: number): Promise<void>;
  setPhase(phase: Phase): void;
  setTargetLocation(location: Location | null): void;
  resize(): void;
  dispose(): void;
  syncFromSnapshot(snapshot: PublicSnapshot): void;
  getCitizenPosition(id: number): THREE.Vector3;
  getCitizenHatColor(id: number): number;
  getNodeWorldPosition(nodeId: string): THREE.Vector3;
  getOfficeBannerColor(seatId: SeatId): number;
}

export function createTownView(
  containerOrOptions: HTMLElement | (TownViewOptions & { container: HTMLElement }),
  maybeOptions: TownViewOptions = {},
): TownView {
  let container: HTMLElement;
  let options: TownViewOptions;

  if (containerOrOptions instanceof HTMLElement) {
    container = containerOrOptions;
    options = maybeOptions;
  } else {
    container = containerOrOptions.container;
    options = {
      forceWebGL: containerOrOptions.forceWebGL ?? true,
      ...containerOrOptions,
    };
  }

  const supportsWebGL = options.forceWebGL || checkWebGLSupport();

  if (!supportsWebGL) {
    const fallback = createFallbackView(container);
    const layout = createTownLayout();
    return {
      isWebGLSupported: () => false,
      playReactionPlan: async () => {},
      setPhase: () => {},
      setTargetLocation: () => {},
      resize: () => {},
      dispose: () => {
        fallback.dispose();
      },
      syncFromSnapshot: () => {},
      getCitizenPosition: () => new THREE.Vector3(),
      getCitizenHatColor: () => 0x7f8c8d,
      getNodeWorldPosition: (nodeId: string) => {
        const p = layout.getNodeWorldPos(nodeId);
        return new THREE.Vector3(p.x, p.y, p.z);
      },
      getOfficeBannerColor: () => 0,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width: 100%; height: 100%; display: block;';
  container.appendChild(canvas);

  const reducedMotion =
    options.reducedMotion ??
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const layout = createTownLayout();
  const camera = createTownCamera({ reducedMotion });
  const scene = createTownScene(canvas, { renderer: options.customRenderer });
  const environment = createTownEnvironment(layout);
  const buildings = createTownBuildings(layout);
  const poof = createPoofEffect(scene.scene);
  const citizens = createCitizenManager(layout, scene.scene, poof);
  const interpolator = createRouteInterpolator(layout);
  const bubbles = createBubbleManager(container, camera.camera);

  scene.scene.add(environment);
  scene.scene.add(buildings.group);

  const coordinator = createPlaybackCoordinator({
    layout,
    buildings,
    citizens,
    interpolator,
    bubbles,
    poof,
    reducedMotion,
  });

  const cleanupContextLoss = attachContextLossHandler(canvas);

  let animFrameId: number | null = null;
  let lastTime = performance.now();

  function animate(now: number): void {
    const deltaSeconds = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    camera.update(deltaSeconds);
    poof.update(deltaSeconds);
    coordinator.update(deltaSeconds);
    scene.render(camera.camera);

    animFrameId = requestAnimationFrame(animate);
  }

  animFrameId = requestAnimationFrame(animate);

  const handleResize = (): void => {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    camera.camera.aspect = w / h;
    camera.camera.updateProjectionMatrix();
    scene.resize(w, h);
    bubbles.update();
  };

  handleResize();

  return {
    isWebGLSupported: () => true,

    playReactionPlan(plan: ReactionPlan, durationSeconds?: number): Promise<void> {
      return coordinator.startPlan(plan, durationSeconds);
    },

    setPhase(phase: Phase): void {
      if (phase === 'intro') {
        camera.startIntroSweep(20);
      } else {
        camera.setTarget(0, 0);
      }
    },

    setTargetLocation(location: Location | null): void {
      if (location) {
        const anchor = buildings.getLocationAnchor(location);
        camera.setTarget(anchor.x, anchor.z);
      } else {
        camera.setTarget(0, 0);
      }
    },

    syncFromSnapshot(snapshot: PublicSnapshot): void {
      coordinator.stop();
      bubbles.clear();
      if (snapshot.citizens && snapshot.papers) {
        citizens.syncCitizens(snapshot.citizens, snapshot.papers);
      }
      if (snapshot.papers) {
        buildings.syncOffices(snapshot.papers);
      }
    },

    getCitizenPosition(id: number): THREE.Vector3 {
      return citizens.getCitizenPosition(id);
    },

    getCitizenHatColor(id: number): number {
      return citizens.getCitizenHatColor(id);
    },

    getNodeWorldPosition(nodeId: string): THREE.Vector3 {
      const p = layout.getNodeWorldPos(nodeId);
      return new THREE.Vector3(p.x, p.y, p.z);
    },

    getOfficeBannerColor(seatId: SeatId): number {
      return buildings.getOfficeBannerColor(seatId);
    },

    resize: handleResize,

    dispose(): void {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      cleanupContextLoss();
      coordinator.dispose();
      bubbles.dispose();
      citizens.dispose();
      poof.dispose();
      scene.dispose();

      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
