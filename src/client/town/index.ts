import * as THREE from 'three';
import { APPROVED_PALETTE, getPalette } from '../visuals/palette.ts';
import { createAssetSource } from './assets/source.ts';
import { createMaterialKit } from './materials.ts';
import { createPaperboys } from './paperboys.ts';
import { LOCATIONS, type Location, type Phase, type SeatId } from '../../shared/ids.ts';
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
import { attachContextLossHandler, createFallbackView, isWebGL2Supported, type FallbackView } from './webgl.ts';
import { attachTownControls } from './controls.ts';
import { createFallbackTownView, type TownView, type TownViewOptions } from './view.ts';
export type { TownView, TownViewOptions } from './view.ts';
import type { TownLayout } from './types.ts';

/** Production framing shared with screenshot consumers; decorative tree rings may be cropped. */
export function townFrameBounds(group: THREE.Group, layout: TownLayout): THREE.Box3 {
  const frameBounds = new THREE.Box3();
  const targetNames = new Set<string>(LOCATIONS.map(location => location.replaceAll('_', '-')));
  for (const child of group.children) {
    if (targetNames.has(child.name) || child.name === 'office') frameBounds.expandByObject(child, true);
  }
  for (const node of layout.getStreetNodes()) frameBounds.expandByPoint(new THREE.Vector3(node.x, 4, node.z));
  return frameBounds.expandByScalar(1);
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

  const palette = options.palette ?? getPalette(APPROVED_PALETTE);
  const materials = createMaterialKit(palette);
  const assets = createAssetSource();
  const ctx = { palette, materials, assets };
  let buildings: ReturnType<typeof createTownBuildings> | null = null;
  let environment: ReturnType<typeof createTownEnvironment> | null = null;
  let paperboys: ReturnType<typeof createPaperboys> | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let scene: ReturnType<typeof createTownScene> | null = null;
  let poof: ReturnType<typeof createPoofEffect> | null = null;
  let citizens: ReturnType<typeof createCitizenManager> | null = null;
  let bubbles: ReturnType<typeof createBubbleManager> | null = null;
  let coordinator: ReturnType<typeof createPlaybackCoordinator> | null = null;
  let fallbackView: FallbackView | null = null;
  let animFrameId: number | null = null;
  let lastTime = performance.now();
  let resizeObserver: ResizeObserver | null = null;
  let cleanupContextLoss: (() => void) | null = null;
  let cleanupControls: (() => void) | null = null;
  let isDisposed = false;

  const cleanupResources = (): void => {
    if (fallbackView) { fallbackView.dispose(); fallbackView = null; }
    if (isDisposed) return;
    isDisposed = true;

    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (cleanupControls) {
      cleanupControls();
      cleanupControls = null;
    }
    if (cleanupContextLoss) {
      cleanupContextLoss();
      cleanupContextLoss = null;
    }
    coordinator?.dispose();
    bubbles?.dispose();
    citizens?.dispose();
    poof?.dispose();
    buildings?.dispose();
    environment?.dispose();
    paperboys?.dispose();
    materials.dispose();
    assets.dispose();
    scene?.dispose();

    if (canvas && canvas.parentElement === container) {
      container.removeChild(canvas);
      canvas = null;
    }
  };

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
    const activeScene = createTownScene(canvas, { renderer: options.customRenderer, palette });
    scene = activeScene;
    const townEnvironment = createTownEnvironment(layout, ctx); environment = townEnvironment;
    const townBuildings = createTownBuildings(layout, ctx); buildings = townBuildings;
    const townPaperboys = createPaperboys(ctx); paperboys = townPaperboys;
    const activePoof = createPoofEffect(activeScene.scene);
    poof = activePoof;
    const activeCitizens = createCitizenManager(layout, activeScene.scene, activePoof, {
      reducedMotion: currentReducedMotion, context: ctx,
    });
    citizens = activeCitizens;
    const interpolator = createRouteInterpolator(layout);
    const activeBubbles = createBubbleManager(container, camera.camera);
    bubbles = activeBubbles;

    activeScene.scene.add(townEnvironment);
    activeScene.scene.add(townPaperboys.group);
    activeScene.scene.add(townBuildings.group);
    camera.frame(townFrameBounds(townBuildings.group, layout));

    const activeCoordinator = createPlaybackCoordinator({
      layout,
      buildings: townBuildings,
      citizens: activeCitizens,
      interpolator,
      bubbles: activeBubbles,
      poof: activePoof,
      get reducedMotion() {
        return currentReducedMotion;
      },
    });
    coordinator = activeCoordinator;

    const ready = Promise.all([townBuildings.ready, activeCitizens.whenReady(), townPaperboys.ready])
      .then(results => {
        if (isDisposed) throw new Error('town disposed before readiness');
        return { degraded: results.flatMap(result => result.degraded) };
      }).catch((error: unknown) => {
        const showFallback = !isDisposed;
        cleanupResources();
        if (showFallback) fallbackView = createFallbackView(container);
        throw error;
      });
    void ready.catch(() => {});

    cleanupContextLoss = attachContextLossHandler(activeScene.renderer.domElement || canvas, {
      onLost: () => {
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        // The bubble overlay is plain DOM, so it stays visible over the fallback view unless cleared.
        activeBubbles.clear();
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

    cleanupControls = attachTownControls(canvas, camera);

    function animate(now: number): void {
      if (animFrameId === null) return;
      const deltaSeconds = Math.max(0, Math.min(0.1, (now - lastTime) / 1000));
      lastTime = now;

      try {
        camera.update(deltaSeconds);
        activePoof.update(deltaSeconds);
        activeCitizens.update(deltaSeconds);
        activeCoordinator.update(deltaSeconds);
        activeBubbles.update(deltaSeconds);
        const fog = activeScene.scene.fog;
        if (fog instanceof THREE.Fog) {
          fog.near = camera.getDistance() + 30;
          fog.far = camera.getDistance() + 100;
        }
        activeScene.render(camera.camera);
      } catch {
        // Catch unexpected errors in an update so loop does not permanently stop
      }

      if (animFrameId !== null) {
        animFrameId = requestAnimationFrame(animate);
      }
    }

    const handleResize = (): void => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      camera.resize(w, h);
      activeScene.resize(w, h);
      activeBubbles.update();
    };

    handleResize();

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

    // Only start animation loop after resize and observer setup succeed
    animFrameId = requestAnimationFrame(animate);

    return {
      whenReady: () => ready,
      isWebGLSupported: () => !fallbackView,

      playReactionPlan(plan: ReactionPlan, durationSeconds?: number): Promise<void> {
        return activeCoordinator.startPlan(plan, durationSeconds);
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
          const anchor = townBuildings.getLocationAnchor(location);
          camera.setTarget(anchor.x, anchor.z);
        } else {
          camera.setTarget(0, 0);
        }
      },

      setReducedMotion(enabled: boolean): void {
        currentReducedMotion = enabled;
        camera.setReducedMotion(enabled);
        activeCitizens.setReducedMotion(enabled);
        if (enabled) activeCoordinator.update(0);
      },

      syncFromSnapshot(snapshot: PublicSnapshot): void {
        activeCoordinator.stop();
        activeBubbles.clear();
        if (snapshot.citizens && snapshot.papers) {
          activeCitizens.syncCitizens(snapshot.citizens, snapshot.papers);
        }
        if (snapshot.papers) {
          townBuildings.syncOffices(snapshot.papers);
        }
      },

      getCitizenPosition: (id: number, out?: THREE.Vector3) => activeCitizens.getCitizenPosition(id, out),
      getCitizenRotation: (id: number) => activeCitizens.getCitizenRotation(id),
      setCitizenPosition: (id: number, pos: THREE.Vector3) => activeCitizens.setCitizenPosition(id, pos),
      setCitizenRotation: (id: number, angleY: number) => activeCitizens.setCitizenRotation(id, angleY),
      getCitizenHatColor: (id: number) => activeCitizens.getCitizenHatColor(id),
      getNodeWorldPosition: (nodeId: string) => {
        const p = layout.getNodeWorldPos(nodeId);
        return new THREE.Vector3(p.x, p.y, p.z);
      },
      getOfficeBannerColor: (seatId: SeatId) => townBuildings.getOfficeBannerColor(seatId),

      resize: handleResize,

      dispose(): void {
        cleanupResources();
      },
    };
  } catch {
    cleanupResources();
    return createFallbackTownView(container);
  }
}


export { mountTown, type MountTownOptions } from './mount.ts';
