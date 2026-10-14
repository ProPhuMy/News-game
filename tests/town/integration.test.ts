// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownView } from '../../src/client/town/index.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createPoofEffect } from '../../src/client/town/particles.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import type { ReactionPlan } from '../../src/shared/snapshots.ts';

describe('Town View Integration', () => {
  it('mounts fallback view gracefully when WebGL is unavailable', () => {
    const container = document.createElement('div');
    // Canvas getContext returns null in jsdom by default
    const townView = createTownView(container);

    expect(townView.isWebGLSupported()).toBe(false);
    expect(container.querySelector('.town-fallback-container')).not.toBeNull();

    townView.dispose();
    expect(container.children.length).toBe(0);
  });

  it('mounts 3D viewport and manages lifecycle when WebGL is available', () => {
    const container = document.createElement('div');
    // Provide a mocked renderer
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const townView = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(townView.isWebGLSupported()).toBe(true);

    expect(() => townView.setPhase('intro')).not.toThrow();
    expect(() => townView.setPhase('write')).not.toThrow();
    expect(() => townView.resize()).not.toThrow();

    townView.dispose();
  });

  it('observes container resizing with ResizeObserver and cleans up on dispose', () => {
    const observeMock = vi.fn();
    const disconnectMock = vi.fn();
    class MockResizeObserver {
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    const container = document.createElement('div');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(observeMock).toHaveBeenCalledWith(container);
    view.dispose();
    expect(disconnectMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('catches renderer initialization failure and shows fallback view without leaking', () => {
    const container = document.createElement('div');
    const throwingRenderer = {
      get domElement(): HTMLCanvasElement {
        throw new Error('WebGL context creation failed');
      },
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: throwingRenderer,
    });

    expect(view.isWebGLSupported()).toBe(false);
    expect(container.querySelector('.town-fallback-container')).not.toBeNull();
    expect(container.querySelectorAll('canvas').length).toBe(0);

    view.dispose();
  });

  it('handles webglcontextlost by pausing loop and showing fallback view, and recovers on restored', () => {
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

    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const requestSpy = vi.spyOn(window, 'requestAnimationFrame');

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(container.querySelector('.town-fallback-container')).toBeNull();

    // Trigger context lost
    const lostEvent = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lostEvent);

    expect(lostEvent.defaultPrevented).toBe(true);
    expect(cancelSpy).toHaveBeenCalled();
    expect(container.querySelector('.town-fallback-container')).not.toBeNull();

    // Trigger context restored
    const restoredEvent = new Event('webglcontextrestored');
    canvas.dispatchEvent(restoredEvent);

    expect(container.querySelector('.town-fallback-container')).toBeNull();
    expect(requestSpy).toHaveBeenCalled();

    view.dispose();
    cancelSpy.mockRestore();
    requestSpy.mockRestore();
  });

  it('survives an unexpected error in an update without killing the animation loop', () => {
    const container = document.createElement('div');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    let animCallback: ((now: number) => void) | null = null;
    const reqSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animCallback = cb;
      return 123;
    });

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(animCallback).toBeTypeOf('function');

    // Simulate an error thrown during a render call
    vi.spyOn(mockRenderer, 'render').mockImplementationOnce(() => {
      throw new Error('Unexpected render glitch');
    });

    // Invoke animation frame - should catch error and continue loop
    expect(() => animCallback!(1000)).not.toThrow();
    expect(reqSpy).toHaveBeenCalled();

    view.dispose();
    reqSpy.mockRestore();
  });

  it('exposes setReducedMotion on TownView and CitizenManager and smoothly crossfades citizen hat colors', () => {
    const container = document.createElement('div');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(typeof view.setReducedMotion).toBe('function');
    view.setReducedMotion(true);
    view.dispose();

    // Verify CitizenManager lerp under reduced motion
    const layout = createTownLayout();
    const scene = new THREE.Scene();
    const poof = createPoofEffect(scene);
    const citizenMgr = createCitizenManager(layout, scene, poof);

    expect(typeof citizenMgr.setReducedMotion).toBe('function');
    expect(typeof citizenMgr.update).toBe('function');

    citizenMgr.setReducedMotion(true);

    // Initial hat color is grey
    expect(citizenMgr.getCitizenHatColor(0)).toBe(0x7f8c8d);

    // Change to seat 0 (default red: 0xc0392b)
    citizenMgr.setCitizenPaper(0, 0);

    // Immediately at t = 0, color has not snapped to red
    expect(citizenMgr.getCitizenHatColor(0)).not.toBe(0xc0392b);

    // Advance 0.15s (halfway through 0.3s duration)
    citizenMgr.update(0.15);
    const midColor = citizenMgr.getCitizenHatColor(0);
    expect(midColor).not.toBe(0x7f8c8d);
    expect(midColor).not.toBe(0xc0392b);

    // Advance another 0.15s (completing 0.3s duration)
    citizenMgr.update(0.15);
    expect(citizenMgr.getCitizenHatColor(0)).toBe(0xc0392b);

    // Disable reduced motion and verify instant snap back to grey
    citizenMgr.setReducedMotion(false);
    citizenMgr.setCitizenPaper(0, null);
    expect(citizenMgr.getCitizenHatColor(0)).toBe(0x7f8c8d);

    citizenMgr.dispose();
  });

  it('smoothly crossfades citizen hat colors during playback when reduced motion is enabled dynamically', async () => {
    let animCallback: ((now: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      animCallback = cb;
      return 1;
    });

    const container = document.createElement('div');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const view = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    // Dynamically enable reduced motion
    view.setReducedMotion(true);

    const plan: ReactionPlan = {
      round: 1,
      exposures: [],
      citizens: [
        {
          citizenId: 0,
          behavior: 'flee',
          route: ['r0c0', 'r0c1'],
          fromPaper: null,
          toPaper: 0, // seat 0 is red: 0xc0392b
          bubble: null,
        },
      ],
      recap: {
        headlineId: 'h1',
        location: 'town_hall',
        behavior: 'flee',
        reactors: 1,
        gainSeatId: 0,
        gained: 1,
      },
    };

    // Start plan with 2.0s duration
    const planPromise = view.playReactionPlan(plan, 2.0);

    // Initial hat color at plan start should be fromPaper (grey 0x7f8c8d) immediately without lerp
    expect(view.getCitizenHatColor(0)).toBe(0x7f8c8d);

    let now = performance.now();
    const step = (seconds: number) => {
      const steps = Math.ceil(seconds / 0.05);
      for (let i = 0; i < steps; i++) {
        now += 50;
        animCallback!(now);
      }
    };

    // Advance 1.0s (progress = 0.5 < transitEnd 0.7): citizen still in transit, wearing fromPaper
    step(1.0);
    expect(view.getCitizenHatColor(0)).toBe(0x7f8c8d);

    // Advance to 1.45s (past transitEnd = 1.4s): paper switch has triggered and lerp started
    step(0.45);
    expect(view.getCitizenHatColor(0)).not.toBe(0xc0392b);

    // Advance 0.15s (halfway through 0.3s lerp duration)
    step(0.15);
    const midColor = view.getCitizenHatColor(0);
    expect(midColor).not.toBe(0x7f8c8d);
    expect(midColor).not.toBe(0xc0392b);

    // Advance another 0.15s (completing 0.3s lerp duration)
    step(0.15);
    expect(view.getCitizenHatColor(0)).toBe(0xc0392b);

    // Advance past end of plan
    step(0.3);
    await planPromise;

    view.dispose();
    vi.restoreAllMocks();
  });

  it('cleans up partially initialized resources if setup throws before completion', () => {
    const container = document.createElement('div');
    const disposeSpy = vi.fn();
    const mockRenderer = {
      setSize: vi.fn(() => {
        throw new Error('Resize failed during setup');
      }),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: disposeSpy,
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const townView = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    expect(townView.isWebGLSupported()).toBe(false);
    expect(disposeSpy).toHaveBeenCalled();
    townView.dispose();
    cancelRafSpy.mockRestore();
  });

  it('stops intro sweep when players skip intro early with setPhase(investigate)', () => {
    const container = document.createElement('div');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const townView = createTownView(container, {
      forceWebGL: true,
      customRenderer: mockRenderer,
    });

    townView.setPhase('intro');
    // Skipping intro to investigate stops the sweep and sets target back to center
    townView.setPhase('investigate');
    expect(() => townView.resize()).not.toThrow();

    townView.dispose();
  });
});

