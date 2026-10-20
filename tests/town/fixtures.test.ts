import { fakeContext } from './architecture/fake-context.ts';
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createBubbleManager } from '../../src/client/town/bubbles.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { createPlaybackCoordinator } from '../../src/client/town/playback.ts';
import { allocateCrowdSlots } from '../../src/client/town/slots.ts';
import { FixtureSchema } from '../../src/shared/fixture.ts';

const createSpeechBubbleManager = (
  camera: THREE.PerspectiveCamera,
  container: HTMLElement,
) => createBubbleManager(container, camera);

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
      const buildings = createTownBuildings(layout, fakeContext());
      const poof = createPoofEffect(scene);
      const citizens = createCitizenManager(layout, scene, poof);
      const interpolator = createRouteInterpolator(layout);

      const container = document.createElement('div');
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 10, 20);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const bubbleManager = createSpeechBubbleManager(camera, container);
      const originalShowBubble = bubbleManager.showBubble.bind(bubbleManager);
      const showBubbleSpy = vi
        .spyOn(bubbleManager, 'showBubble')
        .mockImplementation((citizenId, text, getAnchorPos, durationMs) => {
          originalShowBubble(citizenId, text, getAnchorPos, durationMs);
          expect(bubbleManager.getVisibleBubbleCount()).toBeLessThanOrEqual(6);
        });

      const coordinator = createPlaybackCoordinator({
        layout,
        buildings,
        citizens,
        interpolator,
        bubbles: bubbleManager,
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
        expect(bubbleManager.getVisibleBubbleCount()).toBeLessThanOrEqual(6);

        // Advance through exposure phase
        coordinator.update(0.1);
        expect(bubbleManager.getVisibleBubbleCount()).toBeLessThanOrEqual(6);

        // Advance through route transit phase
        coordinator.update(0.4);
        expect(bubbleManager.getVisibleBubbleCount()).toBeLessThanOrEqual(6);
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

        // Verify that speech bubbles never exceeded the 6-bubble cap during or after updates
        expect(bubbleManager.getVisibleBubbleCount()).toBeLessThanOrEqual(6);
        const bubbleEls = container.querySelectorAll('.speech-bubble');
        expect(bubbleEls.length).toBe(bubbleManager.getVisibleBubbleCount());
        expect(bubbleEls.length).toBeLessThanOrEqual(6);
        for (const el of bubbleEls) {
          expect(el.textContent!.length).toBeLessThanOrEqual(60);
        }

        // Verify that every citizen finishes within their slot offset of their final route destination node
        const citizensByDest = new Map<
          string,
          Array<{ citizenId: number; pos: THREE.Vector3; slotIndex: number }>
        >();

        const offsets = allocateCrowdSlots(layout, plan.citizens.map(entry => entry.route.at(-1)!));
        for (const [index, citizenEntry] of plan.citizens.entries()) {
          const destNode = citizenEntry.route[citizenEntry.route.length - 1]!;
          const destBasePos = layout.getNodeWorldPos(destNode);
          const finalPos = citizens.getCitizenPosition(citizenEntry.citizenId);

          expect(Number.isNaN(finalPos.x)).toBe(false);
          expect(Math.abs(finalPos.y)).toBeLessThan(0.3);
          expect(Number.isNaN(finalPos.z)).toBe(false);

          const group = citizensByDest.get(destNode) ?? [];
          const slotIndex = group.length;
          const expectedOffset = offsets[index]!;

          // Position exactly matches the slot offset of the destination node
          expect(finalPos.x).toBeCloseTo(destBasePos.x + expectedOffset.x, 3);
          expect(finalPos.z).toBeCloseTo(destBasePos.z + expectedOffset.z, 3);

          group.push({ citizenId: citizenEntry.citizenId, pos: finalPos, slotIndex });
          citizensByDest.set(destNode, group);
        }

        // Check that citizens arriving at the same destination have distinct coordinates
        for (const [, group] of citizensByDest) {
          if (group.length > 1) {
            for (let i = 0; i < group.length; i++) {
              for (let j = i + 1; j < group.length; j++) {
                const p1 = group[i]!.pos;
                const p2 = group[j]!.pos;
                const separation = Math.hypot(p1.x - p2.x, p1.z - p2.z);
                // Gathering slots guarantee >= 0.4m separation between distinct slots
                expect(separation).toBeGreaterThan(0.35);
              }
            }
          }
        }
      }

      expect(showBubbleSpy).toHaveBeenCalled();

      coordinator.dispose();
      bubbleManager.dispose();
      citizens.dispose();
      poof.dispose();
    });
  }
});
