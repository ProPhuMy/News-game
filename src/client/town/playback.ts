import * as THREE from 'three';
import type { ReactionEntry, ReactionPlan } from '../../shared/snapshots.ts';
import { applyCitizenBehaviorPose } from './behaviors.ts';
import type { TownBuildings } from './buildings.ts';
import type { CitizenManager } from './citizens.ts';
import type { RouteInterpolator } from './movement.ts';
import type { PoofSystem } from './particles.ts';
import type { TownLayout } from './types.ts';

export interface PlaybackDependencies {
  layout: TownLayout;
  buildings: TownBuildings;
  citizens: CitizenManager;
  interpolator: RouteInterpolator;
  bubbles: {
    showBubble(
      citizenId: number,
      text: string,
      getAnchorPos: () => THREE.Vector3,
      durationMs?: number,
    ): void;
    update(): void;
    clear(): void;
  };
  poof: PoofSystem;
  reducedMotion?: boolean;
}

export interface PlaybackCoordinator {
  startPlan(plan: ReactionPlan, durationSeconds?: number): Promise<void>;
  update(deltaSeconds: number): void;
  isPlaying(): boolean;
  stop(): void;
  dispose(): void;
}

export function createPlaybackCoordinator(
  deps: PlaybackDependencies,
): PlaybackCoordinator {
  let activePlan: ReactionPlan | null = null;
  let totalDuration = 20.0;
  let elapsed = 0;
  let playing = false;
  let resolveCurrent: (() => void) | null = null;
  const shownBubbles = new Set<number>();
  const switchedPapers = new Set<number>();

  function resetPlanState(): void {
    if (activePlan) {
      activePlan.exposures.forEach((exp) => {
        deps.buildings.setOfficeHighlight(exp.seatId, false);
      });
    }
    activePlan = null;
    elapsed = 0;
    playing = false;
    shownBubbles.clear();
    switchedPapers.clear();
    if (resolveCurrent) {
      const resolve = resolveCurrent;
      resolveCurrent = null;
      resolve();
    }
  }

  return {
    startPlan(plan: ReactionPlan, durationSeconds = 20.0): Promise<void> {
      resetPlanState();

      activePlan = plan;
      totalDuration = Math.max(0.1, durationSeconds);
      elapsed = 0;
      playing = true;

      // Immediately activate highlights on exposed paper offices
      plan.exposures.forEach((exp) => {
        deps.buildings.setOfficeHighlight(exp.seatId, true);
      });

      return new Promise<void>((resolve) => {
        resolveCurrent = resolve;
      });
    },

    update(deltaSeconds: number): void {
      if (!playing || !activePlan) {
        return;
      }

      elapsed += deltaSeconds;
      const progress = Math.min(1.0, elapsed / totalDuration);

      // Phase 1 (0 to 0.15): Exposures announced
      // Phase 2 (0.15 to 0.70): Transit across routes
      // Phase 3 (0.70 to 1.00): Arrivals, paper changes, behaviors, and speech bubbles
      const transitStart = 0.15;
      const transitEnd = 0.7;

      activePlan.citizens.forEach((entry: ReactionEntry) => {
        if (progress < transitStart) {
          // Idle before dispatch
          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            'routine',
            elapsed,
          );
        } else if (progress < transitEnd) {
          // Walking along route
          const transitT = (progress - transitStart) / (transitEnd - transitStart);
          const state = deps.interpolator.interpolateRoute(
            entry.route,
            transitT,
          );
          deps.citizens.setCitizenPosition(entry.citizenId, state.position);
          deps.citizens.setCitizenRotation(entry.citizenId, state.headingAngle);

          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            entry.behavior === 'flee' ? 'flee' : 'routine',
            elapsed,
          );
        } else {
          // Destination reached: place at end of route
          if (!switchedPapers.has(entry.citizenId)) {
            switchedPapers.add(entry.citizenId);
            if (entry.fromPaper !== entry.toPaper) {
              deps.citizens.setCitizenPaper(entry.citizenId, entry.toPaper, {
                reducedMotion: deps.reducedMotion,
              });
            }
          }

          // Apply destination behavior pose
          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            entry.behavior,
            elapsed,
          );

          // Pop speech bubble if present
          if (entry.bubble && !shownBubbles.has(entry.citizenId)) {
            shownBubbles.add(entry.citizenId);
            deps.bubbles.showBubble(
              entry.citizenId,
              entry.bubble,
              () => deps.citizens.getCitizenPosition(entry.citizenId),
            );
          }
        }
      });

      deps.bubbles.update();

      if (progress >= 1.0) {
        resetPlanState();
      }
    },

    isPlaying(): boolean {
      return playing;
    },

    stop(): void {
      resetPlanState();
    },

    dispose(): void {
      resetPlanState();
    },
  };
}
