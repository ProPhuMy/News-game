// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { createTownView } from '../../src/client/town/index.ts';
import type { ReactionPlan } from '../../src/shared/snapshots.ts';

describe('Town bubbles on WebGL context loss', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears town speech bubbles while the fallback view is shown', () => {
    let animCallback: ((now: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animCallback = cb;
      return 1;
    });

    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: canvas,
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, { forceWebGL: true, customRenderer: mockRenderer });

    const plan: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [0, 1, 2].map((citizenId) => ({
        citizenId,
        behavior: 'flee' as const,
        route: ['r0c0', 'r0c1'],
        fromPaper: null,
        toPaper: 0,
        bubble: `Bubble ${citizenId}`,
      })),
      recap: {
        headlineId: 'h1',
        location: 'town_hall',
        behavior: 'flee',
        reactors: 3,
        gainSeatId: 0,
        gained: 3,
      },
    };
    void view.playReactionPlan(plan, 2.0);

    let now = performance.now();
    for (let i = 0; i < 32; i++) {
      now += 50;
      animCallback!(now);
    }
    expect(container.querySelectorAll('.speech-bubble').length).toBeGreaterThan(0);

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    expect(container.querySelector('.town-fallback-container')).not.toBeNull();
    expect(container.querySelectorAll('.speech-bubble').length).toBe(0);

    view.dispose();
  });
});
