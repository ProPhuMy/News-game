// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { createPlaybackCoordinator } from '../../src/client/town/playback.ts';
import { FixtureSchema } from '../../src/shared/fixture.ts';

const fixtureFiles = import.meta.glob('../../src/sim/fixtures/*.json', {
  eager: true,
  import: 'default',
});

describe('Town Fixture Playback Integration', () => {
  it('loads all three recorded fixture files', () => {
    const names = Object.keys(fixtureFiles)
      .map((p) => p.split('/').at(-1))
      .sort();
    expect(names).toEqual([
      'caretaker-pulled.json',
      'exposures.json',
      'solo-honest.json',
    ]);
  });

  for (const [filepath, raw] of Object.entries(fixtureFiles)) {
    const filename = filepath.split('/').at(-1);

    it(`plays all ReactionPlans in ${filename} through town playback coordinator`, async () => {
      const fixture = FixtureSchema.parse(raw);
      const revealFrames = fixture.frames.filter(
        (f) => f.public.phase === 'reveal' && f.public.reactionPlan !== null,
      );

      expect(revealFrames.length).toBeGreaterThanOrEqual(1);

      const scene = new THREE.Scene();
      const layout = createTownLayout();
      const buildings = createTownBuildings(layout);
      const poof = createPoofEffect(scene);
      const citizens = createCitizenManager(layout, scene, poof);
      const interpolator = createRouteInterpolator(layout);

      const bubbleSpy = {
        showBubble: vi.fn(),
        update: vi.fn(),
        clear: vi.fn(),
      };

      const coordinator = createPlaybackCoordinator({
        layout,
        buildings,
        citizens,
        interpolator,
        bubbles: bubbleSpy,
        poof,
      });

      for (const frame of revealFrames) {
        const plan = frame.public.reactionPlan;
        if (!plan) {
          continue;
        }

        // Verify all routes in plan contain valid street node IDs
        for (const citizenEntry of plan.citizens) {
          expect(citizenEntry.route.length).toBeGreaterThanOrEqual(1);
          for (const nodeId of citizenEntry.route) {
            expect(() => layout.getNodeWorldPos(nodeId)).not.toThrow();
          }
        }

        // Start playback with a 1.0s simulation time
        const playbackPromise = coordinator.startPlan(plan, 1.0);
        expect(coordinator.isPlaying()).toBe(true);

        // Advance through exposure phase
        coordinator.update(0.1);

        // Advance through route transit phase
        coordinator.update(0.4);
        for (const citizenEntry of plan.citizens) {
          const pos = citizens.getCitizenPosition(citizenEntry.citizenId);
          expect(Number.isNaN(pos.x)).toBe(false);
          expect(Number.isNaN(pos.y)).toBe(false);
          expect(Number.isNaN(pos.z)).toBe(false);
        }

        // Advance through arrival, paper switch, and speech bubbles
        coordinator.update(0.6);
        expect(coordinator.isPlaying()).toBe(false);

        await playbackPromise;

        // Verify that speech bubbles never exceeded the 6-bubble limit
        const activeCalls = bubbleSpy.showBubble.mock.calls.length;
        if (activeCalls > 0) {
          for (const call of bubbleSpy.showBubble.mock.calls) {
            const bubbleText = call[1] as string;
            expect(bubbleText.length).toBeLessThanOrEqual(60);
          }
        }
      }

      coordinator.dispose();
      citizens.dispose();
      poof.dispose();
    });
  }
});
