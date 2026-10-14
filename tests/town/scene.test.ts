// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownScene } from '../../src/client/town/scene.ts';

describe('TownScene', () => {
  it('creates scene with ambient light and directional sun light', () => {
    const mockCanvas = document.createElement('canvas');
    const mockRenderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: mockCanvas,
      shadowMap: { enabled: false, type: 0 },
    } as unknown as THREE.WebGLRenderer;

    const townScene = createTownScene(mockCanvas, { renderer: mockRenderer });
    expect(townScene.scene).toBeInstanceOf(THREE.Scene);

    const lights = townScene.scene.children.filter((c) => c instanceof THREE.Light);
    expect(lights.length).toBeGreaterThanOrEqual(2);

    const hasAmbient = lights.some((l) => l instanceof THREE.AmbientLight);
    const hasDirectional = lights.some((l) => l instanceof THREE.DirectionalLight);
    expect(hasAmbient).toBe(true);
    expect(hasDirectional).toBe(true);

    townScene.resize(800, 600);
    townScene.dispose();
    expect(townScene.scene.children.length).toBe(0);
  });
});
