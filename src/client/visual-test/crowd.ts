// Crowd scale comparison capture: drives Codex's src/client/town/crowd-sample.ts (import only).
import * as THREE from 'three';
import type { CrowdMetrics } from '../town/crowd-sample.ts';
import { TUNING } from '../../shared/tuning.ts';
import { getPalette, type PaletteId, type PresentationPalette } from '../visuals/palette.ts';
import type { SceneReadiness } from '../visuals/town-types.ts';
import { createVirtualClock } from './clock.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import { parsePalette, readInt } from './scenario.ts';
import type { VisualState } from './state.ts';

export type CrowdLayout = 'comparison' | 'production';
export interface CrowdScenario { citizenHeight: number; palette: PaletteId; reactionMs: number; seed: number; layout: CrowdLayout }

/** Structural copy of createCrowdComparison, so tests can inject a fake like architecture-sample does. */
export interface CrowdModule {
  createCrowdComparison(options: {
    container: HTMLElement; renderer: THREE.WebGLRenderer; palette: PresentationPalette; height: number; layout?: CrowdLayout;
  }): {
    whenReady(): Promise<SceneReadiness & { instances: number; metrics: CrowdMetrics }>;
    setTime(ms: number): void;
    dispose(): void;
  };
}

export function parseCrowdScenario(search: string): CrowdScenario {
  const params = new URLSearchParams(search);
  const raw = params.get('height');
  if (raw === null) throw new Error('height is required');
  const citizenHeight = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
  if (!(citizenHeight >= 0.5 && citizenHeight <= 6)) throw new Error(`height must be a number between 0.5 and 6, got "${raw}"`);
  const layout = params.get('layout') ?? 'comparison';
  if (layout !== 'comparison' && layout !== 'production') throw new Error(`layout must be comparison or production, got "${layout}"`);
  return {
    citizenHeight, palette: parsePalette(search),
    reactionMs: readInt(params, 'reactionMs', 0, 0, 600_000), seed: readInt(params, 'seed', 1, 0, 2 ** 31 - 1), layout,
  };
}

/** Order: create, await assets, fail on degraded or a wrong count, pose at the exact time, measure, dispose. */
export async function runCrowdScene(
  module: CrowdModule, scenario: CrowdScenario, container: HTMLElement, renderer: THREE.WebGLRenderer,
): Promise<VisualState> {
  const comparison = module.createCrowdComparison({
    container, renderer, palette: getPalette(scenario.palette), height: scenario.citizenHeight, layout: scenario.layout,
  });
  try {
    const readiness = await comparison.whenReady();
    if (readiness.degraded.length > 0) return { status: 'error', error: `degraded-assets: ${readiness.degraded.join('; ')}` };
    if (readiness.instances !== TUNING.citizens) {
      return { status: 'error', error: `count-mismatch: requested ${TUNING.citizens} citizens, scene reports ${readiness.instances}` };
    }
    comparison.setTime(scenario.reactionMs);
    const stats = measureCanvas(renderer.domElement);
    const verdict = readyVerdict({ webgl: true, distinctColors: stats.distinctColors });
    if (verdict.status === 'error') return verdict;
    // setTime refreshes the report's metrics in place, so read them after posing.
    return {
      status: 'ready', scene: 'crowd', citizenHeight: scenario.citizenHeight, palette: scenario.palette, crowdLayout: scenario.layout,
      instances: readiness.instances, metrics: readiness.metrics, ...stats,
    };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  } finally {
    comparison.dispose();
  }
}

export async function runCrowd(search: string, container: HTMLElement): Promise<VisualState> {
  const scenario = parseCrowdScenario(search);
  createVirtualClock(0, scenario.seed).install();
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
  } catch {
    return { status: 'error', error: 'webgl-unavailable' };
  }
  renderer.setPixelRatio(1);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  return runCrowdScene(await import('../town/crowd-sample.ts'), scenario, container, renderer);
}
