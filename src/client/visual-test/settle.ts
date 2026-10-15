/** Structural match for the readiness hook Codex adds to TownView (presentation-interface note §5). */
export interface SceneReadiness {
  /** One entry per asset that fell back to a stand-in, e.g. "bakery: models/buildings/bakery.glb failed to load". */
  degraded: readonly string[];
}

/**
 * Waits for every scene asset first, then advances the virtual clock by exactly the requested time,
 * so animation playback starts from loaded assets at the same point on every capture.
 */
export async function settleScene(
  view: { whenReady?: () => Promise<SceneReadiness> },
  advance: (ms: number) => void,
  reactionMs: number,
): Promise<SceneReadiness> {
  const readiness = view.whenReady ? await view.whenReady() : { degraded: [] };
  advance(reactionMs);
  return { degraded: [...readiness.degraded] };
}
