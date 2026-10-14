import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { createPlaybackCoordinator } from '../../src/client/town/playback.ts';
import type { ReactionPlan } from '../../src/shared/snapshots.ts';

describe('Playback Coordinator', () => {
  it('orchestrates exposure highlighting, route transit, and paper switching', async () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout);
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const interpolator = createRouteInterpolator(layout);

    const bubbleSpy = {
      showBubble: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
    };

    const coordinator = createPlaybackCoordinator({
      layout,
      buildings,
      citizens: citizenMgr,
      interpolator,
      bubbles: bubbleSpy,
      poof,
    });

    const samplePlan: ReactionPlan = {
      round: 1,
      exposures: [
        {
          headlineId: 'h1',
          seatId: 0,
          round: 1,
          source: 'town',
          exposers: [],
          trustDelta: -12,
          explanation: 'Bakery flour was totally fine!',
        },
      ],
      citizens: [
        {
          citizenId: 0,
          behavior: 'protest',
          route: ['r0c0', 'r0c1', 'r1c1'],
          fromPaper: null,
          toPaper: 1,
          bubble: 'Outrageous scandal!',
        },
        {
          citizenId: 1,
          behavior: 'flee',
          route: ['r1c1', 'r0c2'],
          fromPaper: 0,
          toPaper: null,
          bubble: null,
        },
      ],
      recap: {
        headlineId: 'h1',
        location: 'bakery',
        behavior: 'protest',
        reactors: 5,
        gainSeatId: 1,
        gained: 2,
      },
    };

    coordinator.startPlan(samplePlan, 2.0); // 2 seconds total duration
    expect(coordinator.isPlaying()).toBe(true);

    // Initial phase: exposures highlighted
    coordinator.update(0.1);

    // Transit phase: progress to halfway
    coordinator.update(1.0);
    const citizen0Pos = citizenMgr.getCitizenPosition(0);
    expect(citizen0Pos.x).not.toBe(0);

    // Completion
    coordinator.update(1.5);
    expect(coordinator.isPlaying()).toBe(false);

    // Citizen 0 should have switched to paper 1 (blue)
    expect(citizenMgr.getCitizen(0).currentPaper).toBe(1);
    // Bubble should have been displayed for citizen 0
    expect(bubbleSpy.showBubble).toHaveBeenCalledWith(
      0,
      'Outrageous scandal!',
      expect.any(Function),
    );
  });
});
