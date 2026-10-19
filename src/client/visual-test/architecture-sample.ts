// Drives Codex's D1 rendering sample (src/client/town/sample.ts) for the architecture capture.
import type * as THREE from 'three';
import { getPalette, type PresentationPalette } from '../visuals/palette.ts';
import type { SceneReadiness } from '../visuals/town-types.ts';
import type { ArchitectureScenario } from './architecture-scenario.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import type { VisualState } from './state.ts';

/**
 * Structural copy of Codex's entry point (plans/D1.md), so the harness builds before it exists. The renderer is
 * borrowed: already sized and attached; the sample may configure it but never disposes it. setTime(ms) must render
 * one frame synchronously (presentation-interface note §5).
 */
export interface RenderingSampleModule {
  createRenderingSample(options: {
    container: HTMLElement;
    renderer: THREE.WebGLRenderer;
    palette: PresentationPalette;
    variant: ArchitectureScenario['variant'];
    view: ArchitectureScenario['view'];
    reducedMotion?: boolean;
  }): { whenReady(): Promise<SceneReadiness>; setTime(ms: number): void; dispose(): void };
}

/** Order: create, await every asset, fail on degraded, pose at the exact time, then measure. */
export async function runRenderingSample(
  module: RenderingSampleModule,
  scenario: ArchitectureScenario,
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
): Promise<VisualState> {
  const sample = module.createRenderingSample({
    container,
    renderer,
    palette: getPalette(scenario.palette),
    variant: scenario.variant,
    view: scenario.view,
    reducedMotion: scenario.reducedMotion,
  });
  let readiness: SceneReadiness;
  try {
    readiness = await sample.whenReady();
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
  if (readiness.degraded.length > 0) return { status: 'error', error: `degraded-assets: ${readiness.degraded.join('; ')}` };

  sample.setTime(scenario.reactionMs);
  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: true, distinctColors: stats.distinctColors });
  if (verdict.status === 'error') return verdict;
  return { status: 'ready', scene: 'architecture', scenario, renderer: 'sample', ...stats };
}
