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
import type { TownLayout } from './types.ts';
import { attachContextLossHandler, createFallbackView, isWebGL2Supported, type FallbackView } from './webgl.ts';

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
  setReducedMotion(enabled: boolean): void;
  resize(): void;
  dispose(): void;
  syncFromSnapshot(snapshot: PublicSnapshot): void;
  getCitizenPosition(id: number): THREE.Vector3;
  getCitizenRotation(id: number): number;
  setCitizenPosition(id: number, pos: THREE.Vector3): void;
  setCitizenRotation(id: number, angleY: number): void;
  getCitizenHatColor(id: number): number;
  getNodeWorldPosition(nodeId: string): THREE.Vector3;
  getOfficeBannerColor(seatId: SeatId): number;
}

function createFallbackTownView(container: HTMLElement, layout?: TownLayout): TownView {
  const fallback = createFallbackView(container);
  const actualLayout = layout ?? createTownLayout();
  return {
    isWebGLSupported: () => false,
    playReactionPlan: async () => {},
    setPhase: () => {},
    setTargetLocation: () => {},
    setReducedMotion: () => {},
    resize: () => {},
    dispose: () => fallback.dispose(),
    syncFromSnapshot: () => {},
    getCitizenPosition: () => new THREE.Vector3(),
    getCitizenRotation: () => 0,
    setCitizenPosition: () => {},
    setCitizenRotation: () => {},
    getCitizenHatColor: () => 0x7f8c8d,
    getNodeWorldPosition: (nodeId: string) => {
      const p = actualLayout.getNodeWorldPos(nodeId);
      return new THREE.Vector3(p.x, p.y, p.z);
    },
    getOfficeBannerColor: () => 0,
  };
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
      forceWebGL: containerOrOptions.forceWebGL ?? false,
      ...containerOrOptions,
    };
  }

  const supportsWebGL = options.forceWebGL || isWebGL2Supported();
  if (!supportsWebGL) {
    return createFallbackTownView(container);
  }

  let canvas: HTMLCanvasElement | null = null;
  try {
    const renderCanvas = options.customRenderer?.domElement ?? document.createElement('canvas');
    if (!options.customRenderer?.domElement) {
      renderCanvas.style.cssText = 'width: 100%; height: 100%; display: block;';
    }
    if (renderCanvas.parentElement !== container) {
      container.appendChild(renderCanvas);
    }
    canvas = renderCanvas;

    let currentReducedMotion =
      options.reducedMotion ??
      (typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

    const layout = createTownLayout();
    const camera = createTownCamera({ reducedMotion: currentReducedMotion });
    const scene = createTownScene(canvas, { renderer: options.customRenderer });
    const environment = createTownEnvironment(layout);
    const buildings = createTownBuildings(layout);
    const poof = createPoofEffect(scene.scene);
    const citizens = createCitizenManager(layout, scene.scene, poof, {
      reducedMotion: currentReducedMotion,
    });
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
      get reducedMotion() {
        return currentReducedMotion;
      },
    });

    let fallbackView: FallbackView | null = null;
    let animFrameId: number | null = null;
    let lastTime = performance.now();

    const cleanupContextLoss = attachContextLossHandler(scene.renderer.domElement || canvas, {
      onLost: () => {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        if (canvas) canvas.style.display = 'none';
        if (!fallbackView) {
          fallbackView = createFallbackView(container);
        }
      },
      onRestore: () => {
        if (fallbackView) {
          fallbackView.dispose();
          fallbackView = null;
        }
        if (canvas) canvas.style.display = 'block';
        handleResize();
        lastTime = performance.now();
        if (animFrameId === null) {
          animFrameId = requestAnimationFrame(animate);
        }
      },
    });

    function animate(now: number): void {
      if (animFrameId === null) return;
      const deltaSeconds = Math.max(0, Math.min(0.1, (now - lastTime) / 1000));
      lastTime = now;

      try {
        camera.update(deltaSeconds);
        poof.update(deltaSeconds);
        citizens.update(deltaSeconds);
        coordinator.update(deltaSeconds);
        scene.render(camera.camera);
      } catch {
        // Catch unexpected errors in an update so loop does not permanently stop
      }

      if (animFrameId !== null) {
        animFrameId = requestAnimationFrame(animate);
      }
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

    let resizeObserver: ResizeObserver | null = null;
    const ResizeObserverClass =
      typeof ResizeObserver !== 'undefined'
        ? ResizeObserver
        : typeof window !== 'undefined' &&
            (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
          ? (window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver
          : null;

    if (ResizeObserverClass) {
      resizeObserver = new ResizeObserverClass(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

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

      setReducedMotion(enabled: boolean): void {
        currentReducedMotion = enabled;
        citizens.setReducedMotion(enabled);
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

      getCitizenPosition: (id: number) => citizens.getCitizenPosition(id),
      getCitizenRotation: (id: number) => citizens.getCitizenRotation(id),
      setCitizenPosition: (id: number, pos: THREE.Vector3) => citizens.setCitizenPosition(id, pos),
      setCitizenRotation: (id: number, angleY: number) => citizens.setCitizenRotation(id, angleY),
      getCitizenHatColor: (id: number) => citizens.getCitizenHatColor(id),
      getNodeWorldPosition: (nodeId: string) => {
        const p = layout.getNodeWorldPos(nodeId);
        return new THREE.Vector3(p.x, p.y, p.z);
      },
      getOfficeBannerColor: (seatId: SeatId) => buildings.getOfficeBannerColor(seatId),

      resize: handleResize,

      dispose(): void {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (fallbackView) {
          fallbackView.dispose();
          fallbackView = null;
        }
        cleanupContextLoss();
        coordinator.dispose();
        bubbles.dispose();
        citizens.dispose();
        poof.dispose();
        scene.dispose();

        if (canvas && canvas.parentElement === container) {
          container.removeChild(canvas);
        }
      },
    };
  } catch {
    if (canvas && canvas.parentElement === container) {
      container.removeChild(canvas);
    }
    return createFallbackTownView(container);
  }
}

export { mountTown, type MountTownOptions } from './mount.ts';
