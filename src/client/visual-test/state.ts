import type { AppScenario, HarnessScreen } from './app-scenario.ts';
import type { ArchitectureScenario } from './architecture-scenario.ts';
import type { PaletteId } from '../visuals/palette.ts';
import type { InspectionScenario } from './inspection-scenario.ts';
import type { CrowdMetrics } from '../town/crowd-sample.ts';
import type { VisualScenario } from './scenario.ts';

/** What a mounted town reports: pixel-measured WebGL, or the no-WebGL fallback (no canvas, so no pixel count). */
export type TownFrame = { palette: PaletteId; width: number; height: number } & (
  | { renderer: 'webgl'; webgl: true; distinctColors: number }
  | { renderer: 'fallback'; webgl: false }
);

/** What the harness publishes on window.__NEWS_TOWN_VISUAL__ for the capture command. */
export type VisualState =
  | { status: 'loading' }
  | ({ status: 'ready'; scene: 'town'; scenario: VisualScenario } & TownFrame)
  | {
      status: 'ready';
      scene: 'inspect-character';
      scenario: InspectionScenario;
      clips: readonly string[];
      instances: number;
      width: number;
      height: number;
      distinctColors: number;
    }
  | ({
      status: 'ready';
      scene: 'app';
      scenario: AppScenario;
      screen: HarnessScreen;
    } & TownFrame)
  | {
      status: 'ready';
      scene: 'architecture';
      scenario: ArchitectureScenario;
      /** 'sample' is Codex's D1 rendering sample; 'town-architecture' is our assembled town. */
      renderer: 'sample' | 'town-architecture';
      width: number;
      height: number;
      distinctColors: number;
    }
  | {
      status: 'ready';
      scene: 'crowd';
      /** Requested citizen height; width and height are the image size. */
      citizenHeight: number;
      palette: PaletteId;
      instances: number;
      metrics: CrowdMetrics;
      width: number;
      height: number;
      distinctColors: number;
    }
  | { status: 'error'; error: string };

declare global {
  interface Window {
    __NEWS_TOWN_VISUAL__?: VisualState;
  }
}

export function publish(state: VisualState): void {
  window.__NEWS_TOWN_VISUAL__ = state;
}
