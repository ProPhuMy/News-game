// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createEmoteManager, selectEmoteActors } from '../../src/client/town/emotes.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';
import type { ReactionPlan } from '../../src/shared/snapshots.ts';

const plan = (routes: string[]): ReactionPlan => ({
  round: 1, exposures: [], recap: { headlineId: null, location: null, behavior: 'routine', reactors: 0, gainSeatId: null, gained: 0 },
  citizens: routes.map((node, citizenId) => ({ citizenId, behavior: 'protest', route: node ? ['r0c0', node] : [], fromPaper: null, toPaper: null, bubble: null })),
});

describe('emotes', () => {
  it('selects first per destination then round-robin, capped at eight', () => {
    const input = plan(['a', 'a', 'a', 'b', 'b', 'c', 'd', 'd', 'e', 'e', 'f']);
    expect(selectEmoteActors(input)).toEqual([0, 3, 5, 6, 8, 10, 1, 4]);
    input.citizens[3]!.behavior = 'routine';
    expect(selectEmoteActors(input)).toEqual([0, 4, 5, 6, 8, 10, 1, 7]);
    expect(selectEmoteActors(plan([]))).toEqual([]);
    expect(selectEmoteActors(plan(['', '', 'a']))).toEqual([0, 2, 1]);
  });
  it('separates coincident emotes and avoids a visible speech bubble', () => {
    const container = document.createElement('div');
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 3, 10); camera.lookAt(0, 3, 0); camera.updateMatrixWorld();
    const emotes = createEmoteManager(container, camera, getPalette('b'));
    for (let id = 0; id < 8; id++) emotes.show(id, 'anger', () => new THREE.Vector3());
    emotes.update();
    const shown = [...container.querySelectorAll<HTMLElement>('.town-emote')].filter(e => e.style.display !== 'none');
    expect(shown).toHaveLength(8);
    expect(new Set(shown.map(e => e.style.transform)).size).toBe(8);
    // A real bubble at the preferred anchor must make placement choose a different position.
    const before = shown[0]!.style.transform;
    const bubble = document.createElement('span'); bubble.className = 'speech-bubble';
    bubble.getBoundingClientRect = () => ({ x: 360, y: 280, left: 360, right: 440, top: 280, bottom: 350, width: 80, height: 70, toJSON: () => ({}) });
    container.appendChild(bubble);
    emotes.update();
    expect(shown[0]!.style.transform).not.toBe(before);
    emotes.dispose();
  });
  it('draws text glyphs, follows anchors, hides behind camera, caps and clears idempotently', () => {
    const container = document.createElement('div');
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 3, 10); camera.lookAt(0, 3, 0); camera.updateMatrixWorld();
    const emotes = createEmoteManager(container, camera, getPalette('b'));
    const pos = new THREE.Vector3();
    emotes.show(0, 'anger', () => pos);
    emotes.update();
    const element = container.querySelector<HTMLElement>('.town-emote')!;
    expect(element.textContent).toBe('💢');
    expect(element.style.display).not.toBe('none');
    const before = element.style.transform;
    pos.x = 1; emotes.update();
    expect(element.style.transform).not.toBe(before);
    pos.z = 20; emotes.update();
    expect(element.style.display).toBe('none');
    for (let id = 1; id < 20; id++) emotes.show(id, '!', () => pos);
    expect(container.querySelectorAll('.town-emote')).toHaveLength(8);
    emotes.clear(); emotes.clear();
    expect(container.querySelectorAll('.town-emote')).toHaveLength(0);
    emotes.dispose(); emotes.dispose();
    expect(container.children).toHaveLength(0);
  });
});
