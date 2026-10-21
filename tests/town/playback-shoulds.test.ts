import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { fakeContext } from './architecture/fake-context.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { createPlaybackCoordinator } from '../../src/client/town/playback.ts';
import type { ReactionPlan } from '../../src/shared/snapshots.ts';

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
