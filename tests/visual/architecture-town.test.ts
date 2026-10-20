import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getPalette } from '../../src/client/visuals/palette.ts';
import { timeOfDayLook } from '../../src/client/visuals/time-of-day.ts';
import { applyTimeOfDay, closeTarget } from '../../src/client/visual-test/architecture-town.ts';
import { ARCHITECTURE_VIEWS } from '../../src/client/visual-test/architecture-scenario.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { fakeContext } from '../town/architecture/fake-context.ts';

describe('closeTarget', () => {
  it('resolves every close-up view to a distinct position in the assembled town', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    const views = ARCHITECTURE_VIEWS.filter((v) => !['street', 'awning', 'town'].includes(v));
    const keys = views.map((v) => closeTarget(town.group, v as Parameters<typeof closeTarget>[1], layout).toArray().join(','));
    expect(views).toHaveLength(6);
    expect(new Set(keys).size).toBe(views.length);
    town.dispose();
  });

  it('throws a clear error when the root is missing', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    town.group.clear();
    expect(() => closeTarget(town.group, 'bank', layout)).toThrow(/no building root named "bank"/);
    town.dispose();
  });
});

describe('applyTimeOfDay (harness preview, interface §5c)', () => {
  const lights = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x123456);
    return { scene, hemi: new THREE.HemisphereLight(0, 0, 1.1), sun: new THREE.DirectionalLight(0xffffff, 2.4) };
  };

  it('applies the night look to the preview lights and lamps', () => {
    const { scene, hemi, sun } = lights();
    const setLampLevel = vi.fn();
    const palette = getPalette('b');
    const look = timeOfDayLook(palette, 'night');
    applyTimeOfDay({ scene, hemi, sun, setLampLevel }, palette, 'night');
    expect((scene.background as THREE.Color).getHex()).toBe(look.sky);
    expect(hemi.color.getHex()).toBe(look.hemiSky);
    expect(hemi.groundColor.getHex()).toBe(look.hemiGround);
    expect(hemi.intensity).toBeCloseTo(1.1 * look.lightScale);
    expect(sun.color.getHex()).toBe(look.sun);
    expect(sun.intensity).toBeCloseTo(2.4 * look.lightScale);
    expect(setLampLevel).toHaveBeenCalledWith(1);
  });

  it('leaves the approved daytime lighting untouched without a time', () => {
    const { scene, hemi, sun } = lights();
    const setLampLevel = vi.fn();
    applyTimeOfDay({ scene, hemi, sun, setLampLevel }, getPalette('b'), null);
    expect((scene.background as THREE.Color).getHex()).toBe(0x123456);
    expect([hemi.intensity, sun.intensity]).toEqual([1.1, 2.4]);
    expect(setLampLevel).not.toHaveBeenCalled();
  });
});
