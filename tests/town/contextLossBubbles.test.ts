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

describe('Should feedback and deadlines in the town loop', () => {
  it.each([false, true])('does not charge pre-plan suspension to a new plan (context loss %s)', lost => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frame = cb; return 1; });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    const renderer = { domElement: canvas, shadowMap: {}, setSize: vi.fn(), setPixelRatio: vi.fn(), render: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
    const view = createTownView(container, { forceWebGL: true, customRenderer: renderer });
    const plan: ReactionPlan = {
      round: 1, exposures: [], recap: { headlineId: null, location: null, behavior: 'protest', reactors: 1, gainSeatId: null, gained: 0 },
      citizens: [{ citizenId: 0, behavior: 'protest', route: ['r0c0', 'r0c1'], fromPaper: null, toPaper: 0, bubble: null }],
    };
    if (lost) canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    now = 60000;
    void view.playReactionPlan(plan, 20);
    if (lost) canvas.dispatchEvent(new Event('webglcontextrestored'));
    frame(now);
    expect(container.querySelectorAll('.town-emote')).toHaveLength(0);
    now += 14000; frame(now);
    expect(container.querySelectorAll('.town-emote')).toHaveLength(1);
    view.dispose(); vi.restoreAllMocks();
  });
  it('catches up a suspended frame to the remaining deadline and keeps emotes hidden during context loss', () => {
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frame = cb; return 1; });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    const renderer = { domElement: canvas, shadowMap: {}, setSize: vi.fn(), setPixelRatio: vi.fn(), render: vi.fn(), dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
    const view = createTownView(container, { forceWebGL: true, customRenderer: renderer });
    const plan: ReactionPlan = {
      round: 1, exposures: [], recap: { headlineId: null, location: null, behavior: 'protest', reactors: 1, gainSeatId: null, gained: 0 },
      citizens: [{ citizenId: 0, behavior: 'protest', route: ['r0c0', 'r0c1'], fromPaper: null, toPaper: 0, bubble: null }],
    };
    void view.playReactionPlan(plan, 2);
    frame(performance.now() + 2100);
    expect(container.querySelectorAll('.town-emote')).toHaveLength(1);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    const overlay = container.querySelector<HTMLElement>('.town-emotes')!;
    expect(overlay.style.display).toBe('none');
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(overlay.style.display).not.toBe('none');
    expect(container.querySelectorAll('.town-emote')).toHaveLength(1);
    view.dispose();
    expect(container.querySelector('.town-emotes')).toBeNull();
    vi.restoreAllMocks();
  });
});
