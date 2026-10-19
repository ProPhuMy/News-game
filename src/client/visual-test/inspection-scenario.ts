import { readInt } from './scenario.ts';

export type SceneKind = 'town' | 'inspect-character' | 'architecture';

export interface InspectionScenario {
  /** Path under public/models/, e.g. "characters/kenney-mini/character-male-a.glb". */
  model: string;
  /** Animation clip name; null shows the bind pose. */
  clip: string | null;
  /** Exact clip time to pose, in ms. */
  timeMs: number;
  /** How many characters the inspection scene must show (presentation-interface note §5). */
  count: number;
  seed: number;
}

export const DEFAULT_INSPECTION: InspectionScenario = {
  model: 'characters/kenney-mini/character-male-a.glb',
  clip: null,
  timeMs: 0,
  count: 1,
  seed: 1,
};

// Same shape Codex's createInspectionScene accepts (after the /models/ prefix): no "..", no scheme.
const MODEL_PATH = /^characters\/(?:[\w-]+\/)*[\w-]+\.(?:glb|gltf)$/;
const CLIP_NAME = /^[\w .-]{1,64}$/;

export function sceneKind(search: string): SceneKind {
  const scene = new URLSearchParams(search).get('scene') ?? 'town';
  if (scene !== 'town' && scene !== 'inspect-character' && scene !== 'architecture') {
    throw new Error(`scene must be town, inspect-character or architecture, got "${scene}"`);
  }
  return scene;
}

export function parseInspectionScenario(search: string): InspectionScenario {
  const params = new URLSearchParams(search);
  const model = params.get('model') ?? DEFAULT_INSPECTION.model;
  if (!MODEL_PATH.test(model)) throw new Error(`model must be a .glb or .gltf path under characters/, got "${model}"`);
  const clip = params.get('clip');
  if (clip !== null && !CLIP_NAME.test(clip)) {
    throw new Error(`clip must be 1-64 letters, digits, spaces, dots, dashes or underscores, got "${clip}"`);
  }
  return {
    model,
    clip,
    timeMs: readInt(params, 'timeMs', DEFAULT_INSPECTION.timeMs, 0, 600_000),
    count: readInt(params, 'count', DEFAULT_INSPECTION.count, 1, 30),
    seed: readInt(params, 'seed', DEFAULT_INSPECTION.seed, 0, 2 ** 31 - 1),
  };
}

/** What the inspection scene's whenReady() resolves with (note §5). `instances` defaults to 1 when absent. */
export interface InspectionReadiness {
  degraded: readonly string[];
  clips: readonly string[];
  instances?: number;
}

/** Returns why the capture must fail, or null. A count the scene did not draw never passes. */
export function inspectionReadyError(readiness: InspectionReadiness, requestedCount: number): string | null {
  if (readiness.degraded.length > 0) return `degraded-assets: ${readiness.degraded.join('; ')}`;
  const drawn = readiness.instances ?? 1;
  if (drawn !== requestedCount) return `count-mismatch: requested ${requestedCount} characters, scene reports ${drawn}`;
  return null;
}
