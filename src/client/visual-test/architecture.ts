// Architecture capture entry: street/awning go to Codex's D1 rendering sample, every other view to our assembled town.
import * as THREE from 'three';
import * as sample from '../town/sample.ts';
import { runRenderingSample } from './architecture-sample.ts';
import { parseArchitectureScenario } from './architecture-scenario.ts';
import { runArchitectureTown } from './architecture-town.ts';
import { createVirtualClock } from './clock.ts';
import type { VisualState } from './state.ts';

export async function runArchitecture(search: string, container: HTMLElement): Promise<VisualState> {
  const scenario = parseArchitectureScenario(search);
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

  const view = scenario.view;
  if (view === 'street' || view === 'awning') {
    return runRenderingSample(sample, scenario, container, renderer);
  }
  return runArchitectureTown(scenario, container, renderer);
}
