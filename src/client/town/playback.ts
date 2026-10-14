import * as THREE from 'three';
import type { ReactionEntry, ReactionPlan } from '../../shared/snapshots.ts';
import { applyCitizenBehaviorPose } from './behaviors.ts';
import type { TownBuildings } from './buildings.ts';
import type { CitizenManager } from './citizens.ts';
import type { PreparedRoute, RouteInterpolator } from './movement.ts';
import type { PoofSystem } from './particles.ts';
import { getGatheringSlotOffset } from './slots.ts';
import type { TownLayout, Vector3Coord } from './types.ts';

export interface PlaybackDependencies {
  layout: TownLayout;
  buildings: TownBuildings;
  citizens: CitizenManager;
  interpolator: RouteInterpolator;
  bubbles: {
    showBubble(
      citizenId: number,
      text: string,
      getAnchorPos: (out?: THREE.Vector3) => THREE.Vector3,
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

interface CitizenPlanContext {
  destPos: THREE.Vector3;
  slotOffset: { x: number; z: number };
  preparedRoute?: PreparedRoute;
}

const warnedPlaybackNodes = new Set<string>();

function nodeExists(layout: TownLayout, id: string): boolean {
  if (typeof layout.hasNode === 'function') {
    return layout.hasNode(id);
  }
  try {
    layout.getNodeWorldPos(id);
    return true;
  } catch {
    return false;
  }
}

function resolveDestNode(
  layout: TownLayout,
  route: readonly string[],
  citizenId: number,
  citizens: CitizenManager,
): string {
  if (route.length > 0) {
    const rawDest = route[route.length - 1];
    if (rawDest) {
      if (nodeExists(layout, rawDest)) {
        return rawDest;
      }
      if (!warnedPlaybackNodes.has(rawDest)) {
        warnedPlaybackNodes.add(rawDest);
        console.warn(`[TownPlayback] Unknown destination node: ${rawDest}`);
      }
    }

    for (let i = route.length - 1; i >= 0; i--) {
      const nid = route[i];
      if (nid && nodeExists(layout, nid)) {
        return nid;
      }
    }
  }

  try {
    const c = citizens.getCitizen(citizenId);
    if (c?.homeNodeId && (layout.hasNode?.(c.homeNodeId) ?? true)) {
      return c.homeNodeId;
    }
  } catch {
    // ignore
  }
  return 'r0c0';
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
  const citizenContexts = new Map<number, CitizenPlanContext>();

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
    citizenContexts.clear();
    deps.interpolator.clearCache?.();
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

      // Group citizens by destination node to allocate distinct slot offsets
      const destSlotCounts = new Map<string, number>();
      plan.citizens.forEach((entry) => {
        const destNodeId = resolveDestNode(
          deps.layout,
          entry.route,
          entry.citizenId,
          deps.citizens,
        );
        const slotIndex = destSlotCounts.get(destNodeId) ?? 0;
        destSlotCounts.set(destNodeId, slotIndex + 1);

        const slotOffset = getGatheringSlotOffset(slotIndex);
        let basePos: Vector3Coord;
        try {
          basePos = deps.layout.getNodeWorldPos(destNodeId);
        } catch {
          basePos = { x: 0, y: 0, z: 0 };
        }

        const destPos = new THREE.Vector3(
          basePos.x + slotOffset.x,
          0,
          basePos.z + slotOffset.z,
        );
        const preparedRoute = deps.interpolator.setRoute(entry.route, slotOffset);
        citizenContexts.set(entry.citizenId, { destPos, slotOffset, preparedRoute });
      });

      // Highlight exposed offices
      plan.exposures.forEach((exp) => {
        deps.buildings.setOfficeHighlight(exp.seatId, true);
      });

      // At plan start: initialize each citizen's hat to fromPaper
      plan.citizens.forEach((entry) => {
        deps.citizens.setCitizenPaper(entry.citizenId, entry.fromPaper, {
          immediate: true,
          reducedMotion: true,
        });
      });

      // Short duration / reconnect resilience: immediately snap to destination with toPaper
      if (totalDuration <= 0.3) {
        plan.citizens.forEach((entry) => {
          const ctx = citizenContexts.get(entry.citizenId);
          if (ctx) {
            deps.citizens.setCitizenPosition(entry.citizenId, ctx.destPos);
          }
          deps.citizens.setCitizenPaper(entry.citizenId, entry.toPaper, {
            reducedMotion: deps.reducedMotion,
          });
          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            entry.behavior,
            0,
          );
        });
        return Promise.resolve();
      }

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

      const transitStart = 0.15;
      const transitEnd = 0.7;

      activePlan.citizens.forEach((entry: ReactionEntry) => {
        const ctx = citizenContexts.get(entry.citizenId);

        if (totalDuration <= 0.3 || progress >= transitEnd) {
          // Destination reached / snapped: place at end of route with slot offset
          if (ctx) {
            deps.citizens.setCitizenPosition(entry.citizenId, ctx.destPos);
          }

          if (!switchedPapers.has(entry.citizenId)) {
            switchedPapers.add(entry.citizenId);
            deps.citizens.setCitizenPaper(entry.citizenId, entry.toPaper, {
              reducedMotion: deps.reducedMotion,
            });
          }

          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            entry.behavior,
            elapsed,
          );

          if (entry.bubble && !shownBubbles.has(entry.citizenId)) {
            shownBubbles.add(entry.citizenId);
            deps.bubbles.showBubble(
              entry.citizenId,
              entry.bubble,
              (out) => deps.citizens.getCitizenPosition(entry.citizenId, out),
            );
          }
        } else if (progress < transitStart) {
          // Idle before dispatch
          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            'routine',
            elapsed,
          );
        } else {
          // Walking along route with trajectory blending toward destination slot
          const transitT = (progress - transitStart) / (transitEnd - transitStart);
          const state = ctx?.preparedRoute
            ? deps.interpolator.interpolatePreparedRoute(ctx.preparedRoute, transitT)
            : deps.interpolator.interpolateRoute(
                entry.route,
                transitT,
                undefined,
                ctx?.slotOffset,
              );
          deps.citizens.setCitizenPosition(entry.citizenId, state.position);
          deps.citizens.setCitizenRotation(entry.citizenId, state.headingAngle);

          applyCitizenBehaviorPose(
            deps.citizens.getCitizen(entry.citizenId),
            entry.behavior === 'flee' ? 'flee' : 'routine',
            elapsed,
          );
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
