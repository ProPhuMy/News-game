// Character inspection scenario for Codex's D0 work (presentation-interface note §5).
import * as THREE from 'three';
import { createVirtualClock } from './clock.ts';
import { inspectionReadyError, parseInspectionScenario, type InspectionReadiness } from './inspection-scenario.ts';
import { measureCanvas, readyVerdict } from './pixels.ts';
import type { VisualState } from './state.ts';

/** Structural copy of Codex's src/client/town/assets/inspection-scene.ts, so the harness builds without it. */
interface InspectionModule {
  createInspectionScene(options: {
    container: HTMLElement;
    renderer: THREE.WebGLRenderer;
    modelUrl: string;
    clip: string | null;
    count: number;
  }): { whenReady(): Promise<InspectionReadiness>; setTime(ms: number): void; dispose(): void };
}

const ENTRY_POINT = '../town/assets/inspection-scene.ts';
const entryLoaders = import.meta.glob<InspectionModule>('../town/assets/inspection-scene.ts');

export async function runInspection(search: string, container: HTMLElement): Promise<VisualState> {
  const scenario = parseInspectionScenario(search);
  const loader = entryLoaders[ENTRY_POINT];
  if (!loader) return { status: 'error', error: 'inspection entry point not available yet (src/client/town/assets/inspection-scene.ts)' };
  const entry = await loader();

  // No frame loop here: setTime poses the clip directly. The clock only makes Math.random repeatable.
  createVirtualClock(0, scenario.seed).install();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
  } catch {
    return { status: 'error', error: 'webgl-unavailable' };
  }
  renderer.domElement.style.cssText = 'width: 100%; height: 100%; display: block;';
  container.appendChild(renderer.domElement);

  const scene = entry.createInspectionScene({
    container,
    renderer,
    modelUrl: `/models/${scenario.model}`,
    clip: scenario.clip,
    count: scenario.count,
  });
  const readiness = await scene.whenReady();
  const failure = inspectionReadyError(readiness, scenario.count);
  if (failure) return { status: 'error', error: failure };

  scene.setTime(scenario.timeMs);
  const stats = measureCanvas(renderer.domElement);
  const verdict = readyVerdict({ webgl: true, distinctColors: stats.distinctColors });
  if (verdict.status === 'error') return verdict;
  return {
    status: 'ready',
    scene: 'inspect-character',
    scenario,
    clips: readiness.clips,
    instances: readiness.instances ?? 1,
    ...stats,
  };
}
