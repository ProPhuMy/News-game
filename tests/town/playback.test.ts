import { allocateCrowdSlots } from '../../src/client/town/slots.ts';
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

    const offsets = allocateCrowdSlots(layout, plan.citizens.map(entry => entry.route.at(-1)!));
    for (const [index, entry] of plan.citizens.entries()) {
      const pos = citizenMgr.getCitizenPosition(entry.citizenId);
      const dest = layout.getNodeWorldPosition(entry.route[entry.route.length - 1]!);
      expect(pos.x).toBeCloseTo(dest.x + offsets[index]!.x);
      expect(pos.z).toBeCloseTo(dest.z + offsets[index]!.z);
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

it('preserves every route node before moving into its allocated gathering slot', () => {
  const layout = createTownLayout(); const buildings = createTownBuildings(layout, fakeContext());
  const citizens = createCitizenManager(); const interpolator = createRouteInterpolator(layout);
  const setRoute = vi.spyOn(interpolator, 'setRoute');
  const coordinator = createPlaybackCoordinator({ layout, buildings, citizens, interpolator,
    bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() }, poof: createPoofEffect() });
  const route = ['r0c0', 'r0c1', 'r0c2'];
  const plan: ReactionPlan = { round: 1, exposures: [],
    recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 },
    citizens: Array.from({ length: 30 }, (_, citizenId) => ({ citizenId, route, behavior: 'routine', fromPaper: null, toPaper: null, bubble: null })) };
  void coordinator.startPlan(plan, 20);
  expect(setRoute).toHaveBeenCalledWith(route);
  expect(setRoute.mock.calls.every(call => call[1] === undefined)).toBe(true);
  coordinator.stop(); citizens.dispose(); buildings.dispose();
});

describe('Should arrival lifecycle', () => {
  function setup() {
    const layout = createTownLayout();
    const citizens = createCitizenManager(layout);
    const props = { showSign: vi.fn(), clear: vi.fn() };
    const emotes = { show: vi.fn(), clear: vi.fn() };
    let reducedMotion = false;
    const coordinator = createPlaybackCoordinator({
      layout, citizens, buildings: createTownBuildings(layout, fakeContext()),
      interpolator: createRouteInterpolator(layout), poof: createPoofEffect(new THREE.Scene()),
      bubbles: { showBubble: vi.fn(), update: vi.fn(), clear: vi.fn() },
      emotes, props, get reducedMotion() { return reducedMotion; },
    });
    const plan: ReactionPlan = {
      round: 1, exposures: [], recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 },
      citizens: ['protest', 'angry_mob', 'flee', 'routine'].map((behavior, citizenId) => ({
        citizenId, behavior: behavior as ReactionPlan['citizens'][number]['behavior'], route: ['r0c0', 'r0c1'],
        fromPaper: null, toPaper: 0, bubble: null,
      })),
    };
    return { coordinator, props, emotes, plan, citizens, reduce: () => { reducedMotion = true; } };
  }
  it('shows signs only for prescribed protesters at arrival and retains them until explicit stop', async () => {
    const { coordinator, props, emotes, plan } = setup();
    const completed = coordinator.startPlan(plan, 20);
    coordinator.update(13.99);
    expect(props.showSign).not.toHaveBeenCalled();
    expect(emotes.show).not.toHaveBeenCalled();
    coordinator.update(0.01);
    expect(props.showSign.mock.calls.map(c => c[0])).toEqual([0, 1]);
    expect(emotes.show.mock.calls.map(c => c[0])).toEqual([0, 1, 2]);
    const clears = props.clear.mock.calls.length;
    coordinator.update(6);
    await completed;
    expect(props.clear).toHaveBeenCalledTimes(clears);
    coordinator.stop();
    expect(props.clear).toHaveBeenCalledTimes(clears + 1);
  });
  it.each([0, 0.3])('snaps short %s-second reconnect plans to visible stable feedback', async seconds => {
    const { coordinator, props, emotes, plan } = setup();
    await coordinator.startPlan(plan, seconds);
    expect(props.showSign.mock.calls.map(c => c[0])).toEqual([0, 1]);
    expect(emotes.show).toHaveBeenCalledTimes(3);
    expect(coordinator.isPlaying()).toBe(false);
  });
  it('reads only during bounded prelude and preserves movement window', () => {
    const { coordinator, citizens, plan } = setup();
    const pose = vi.spyOn(citizens, 'setCitizenPose');
    void coordinator.startPlan(plan, 20);
    coordinator.update(0);
    expect(pose).toHaveBeenCalledWith(0, 'read', 0);
    coordinator.update(1.2);
    expect(pose).toHaveBeenLastCalledWith(3, 'idle', 1.2);
    coordinator.update(1.8);
    expect(pose).toHaveBeenCalledWith(0, 'walk', 3);
    coordinator.update(11);
    expect(pose).toHaveBeenLastCalledWith(3, 'idle', 14);
    expect(citizens.getCitizen(0).currentPaper).toBe(0);
  });
  it('bounds reading by the 15 percent lead-in for a four-second interval', () => {
    const { coordinator, citizens, plan } = setup();
    const pose = vi.spyOn(citizens, 'setCitizenPose');
    void coordinator.startPlan(plan, 4);
    coordinator.update(0.59);
    expect(pose).toHaveBeenCalledWith(0, 'read', 0.59);
    coordinator.update(0.01);
    expect(pose).toHaveBeenCalledWith(0, 'walk', 0.6);
    coordinator.stop();
  });
  it('clears feedback before a replacement plan and shows reduced-motion feedback immediately', async () => {
    const { coordinator, props, emotes, plan, reduce } = setup();
    await coordinator.startPlan(plan, 0);
    const clears = props.clear.mock.calls.length;
    reduce();
    await coordinator.startPlan(plan, 20);
    expect(props.clear).toHaveBeenCalledTimes(clears + 1);
    expect(emotes.show).toHaveBeenCalledTimes(6);
    coordinator.dispose();
    expect(props.clear).toHaveBeenCalledTimes(clears + 2);
  });
  it('settles immediately when reduced motion is enabled during travel', () => {
    const { coordinator, citizens, props, plan, reduce } = setup();
    void coordinator.startPlan(plan, 20); coordinator.update(5);
    reduce(); coordinator.update(0);
    expect(coordinator.isPlaying()).toBe(false);
    expect(citizens.getCitizen(0).currentPaper).toBe(0);
    expect(props.showSign).toHaveBeenCalledWith(0);
  });
});
