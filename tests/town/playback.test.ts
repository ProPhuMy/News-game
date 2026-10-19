import { APPROVED_PALETTE, getPalette } from '../../src/client/visuals/palette.ts';
import { fakeContext } from './architecture/fake-context.ts';
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
    const buildings = createTownBuildings(layout, fakeContext());
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

  function createMockPlan(): ReactionPlan {
    const citizens = [];
    for (let i = 0; i < 30; i++) {
      citizens.push({
        citizenId: i,
        behavior: 'routine' as const,
        route: ['r0c0', 'r0c1', 'r1c1'],
        fromPaper: (i % 4) as 0 | 1 | 2 | 3,
        toPaper: (i === 0 ? 0 : ((i + 1) % 4)) as 0 | 1 | 2 | 3, // citizen 0 stays loyal (fromPaper=0, toPaper=0)
        bubble: null,
      });
    }
    return {
      round: 1,
      exposures: [],
      citizens,
      recap: {
        headlineId: 'h1',
        location: 'bakery',
        behavior: 'routine',
        reactors: 30,
        gainSeatId: 0,
        gained: 5,
      },
    };
  }

  it('guarantees all citizens reach destination with toPaper when started with short duration', async () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout, fakeContext());
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const interpolator = createRouteInterpolator(layout);

    const coordinator = createPlaybackCoordinator({
      layout,
      buildings,
      citizens: citizenMgr,
      interpolator,
      bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() },
      poof,
    });

    const plan = createMockPlan(); // 30 citizens, citizen 0 stays loyal (fromPaper=0, toPaper=0)
    await coordinator.startPlan(plan, 0.3);
    coordinator.update(0.3);

    for (const entry of plan.citizens) {
      const pos = citizenMgr.getCitizenPosition(entry.citizenId);
      const dest = layout.getNodeWorldPosition(entry.route[entry.route.length - 1]!);
      expect(Math.hypot(pos.x - dest.x, pos.z - dest.z)).toBeLessThan(3.0); // within slot radius
      expect(citizenMgr.getCitizenHatColor(entry.citizenId)).not.toBe(palette.unsubscribed.hex); // not grey
    }
  });

  it('gracefully handles unknown route node without crashing loop', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout, fakeContext());
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const interpolator = createRouteInterpolator(layout);

    const coordinator = createPlaybackCoordinator({
      layout,
      buildings,
      citizens: citizenMgr,
      interpolator,
      bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() },
      poof,
    });

    const plan = createMockPlan();
    plan.citizens[0]!.route.push('invalid_node_xyz');
    expect(() => coordinator.startPlan(plan, 1.0)).not.toThrow();
    expect(() => coordinator.update(0.5)).not.toThrow();
  });

  it('assigns distinct slot offsets so citizens at the same destination do not overlap', async () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout, fakeContext());
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const interpolator = createRouteInterpolator(layout);

    const coordinator = createPlaybackCoordinator({
      layout,
      buildings,
      citizens: citizenMgr,
      interpolator,
      bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() },
      poof,
    });

    const plan = createMockPlan(); // all 30 citizens heading to 'r1c1'
    await coordinator.startPlan(plan, 0.3);
    coordinator.update(0.3);

    const positions = plan.citizens.map((c) => citizenMgr.getCitizenPosition(c.citizenId));
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = positions[i]!.distanceTo(positions[j]!);
        expect(dist).toBeGreaterThanOrEqual(0.35); // distinct slot separation
      }
    }
  });

  it('sets loyal reader hat to fromPaper at plan start before paper switches', () => {
    const scene = new THREE.Scene();
    const layout = createTownLayout();
    const buildings = createTownBuildings(layout, fakeContext());
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);
    const interpolator = createRouteInterpolator(layout);

    const coordinator = createPlaybackCoordinator({
      layout,
      buildings,
      citizens: citizenMgr,
      interpolator,
      bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() },
      poof,
    });

    const plan = createMockPlan(); // citizen 0 has fromPaper: 0, toPaper: 0
    coordinator.startPlan(plan, 2.0);

    // Initial hat color should be seat 0's color (red: palette.paper.red.hex), not grey (palette.unsubscribed.hex)
    expect(citizenMgr.getCitizenHatColor(0)).toBe(palette.paper.red.hex);
  });
});


const palette = getPalette(APPROVED_PALETTE);

describe('playback boundaries', () => {
  function setup(reducedMotion = false) {
    const layout = createTownLayout(); const scene = new THREE.Scene();
    const buildings = createTownBuildings(layout, fakeContext());
    const poof = createPoofEffect(scene);
    const citizens = createCitizenManager(layout, scene, poof, { reducedMotion });
    const bubbles = { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() };
    const coordinator = createPlaybackCoordinator({ layout, buildings, citizens,
      interpolator: createRouteInterpolator(layout), bubbles, poof, reducedMotion });
    const plan: ReactionPlan = { round: 1, exposures: [], recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 }, citizens: [{
      citizenId: 0, behavior: 'angry_mob', route: ['r0c0', 'r0c1'], fromPaper: null, toPaper: 0, bubble: 'Confirmed!',
    }] };
    return { coordinator, citizens, layout, plan, buildings, poof, bubbles };
  }
  it('settles short reconnect playback without leaving isPlaying true', async () => {
    const { coordinator, citizens, layout, plan, buildings, poof } = setup();
    await coordinator.startPlan(plan, 0);
    expect(coordinator.isPlaying()).toBe(false);
    expect(citizens.getCitizenPosition(0).x).toBe(layout.getNodeWorldPos('r0c1').x);
    expect(citizens.getCitizenHatColor(0)).toBe(palette.paper.red.hex);
    citizens.dispose(); buildings.dispose(); poof.dispose();
  });
  it('keeps reduced-motion feedback stable at the prescribed destination', async () => {
    const { coordinator, citizens, layout, plan, buildings, poof, bubbles } = setup(true);
    const done = coordinator.startPlan(plan, 20);
    coordinator.update(0.1);
    const pos = citizens.getCitizenPosition(0);
    expect(pos.toArray()).toEqual(Object.values(layout.getNodeWorldPos('r0c1')));
    coordinator.update(5);
    expect(citizens.getCitizenPosition(0).toArray()).toEqual(pos.toArray());
    expect(citizens.getCitizen(0).mesh.rotation.x).toBe(0);
    expect(citizens.getCitizenHatColor(0)).toBe(palette.paper.red.hex);
    expect(bubbles.showBubble).toHaveBeenCalledWith(0, 'Confirmed!', expect.any(Function));
    coordinator.stop(); await done;
    citizens.dispose(); buildings.dispose(); poof.dispose();
  });
  it('uses real walk/run poses only during prescribed transit', async () => {
    const { coordinator, citizens, plan, buildings, poof } = setup();
    const setPose = vi.spyOn(citizens, 'setCitizenPose');
    const done = coordinator.startPlan(plan, 20);
    coordinator.update(6);
    expect(setPose).toHaveBeenLastCalledWith(0, 'walk', 6);
    coordinator.update(9);
    expect(setPose).toHaveBeenLastCalledWith(0, 'idle', 15);
    coordinator.stop(); await done;
    citizens.dispose(); buildings.dispose(); poof.dispose();
  });
});
