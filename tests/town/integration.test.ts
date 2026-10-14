// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownView } from '../../src/client/town/index.ts';

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
});
