import type { AppScenario, HarnessScreen } from './app-scenario.ts';
import type { InspectionScenario } from './inspection-scenario.ts';
import type { VisualScenario } from './scenario.ts';

/** What the harness publishes on window.__NEWS_TOWN_VISUAL__ for the capture command. */
export type VisualState =
  | { status: 'loading' }
  | { status: 'ready'; scene: 'town'; scenario: VisualScenario; width: number; height: number; distinctColors: number }
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
  | {
      status: 'ready';
      scene: 'app';
      scenario: AppScenario;
      screen: HarnessScreen;
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
