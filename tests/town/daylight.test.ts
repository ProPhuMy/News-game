import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createDaylight } from '../../src/client/town/daylight.ts';
import { createTownScene } from '../../src/client/town/scene.ts';
import { getPalette } from '../../src/client/visuals/palette.ts';
import { timeOfDayLook, type TimeOfDay } from '../../src/client/visuals/time-of-day.ts';

function setup() {
  const scene = createTownScene({} as HTMLCanvasElement, { renderer: {
    shadowMap: {}, render: vi.fn(),
  } as unknown as THREE.WebGLRenderer });
  const buildings = { setLampLevel: vi.fn() };
  // The helper consumes only lights/scene and the lamp setter, never building geometry.
  const daylight = createDaylight(scene, buildings, getPalette('b'));
  return { scene, buildings, daylight };
}

describe('daylight', () => {
  it.each<TimeOfDay>(['morning', 'midday', 'afternoon', 'late', 'dusk', 'night'])('applies every %s field and approved intensity scale immediately', time => {
    const { scene, buildings, daylight } = setup();
    daylight.setTime(time, true);
    const look = timeOfDayLook(getPalette('b'), time);
    expect(scene.scene.background).toEqual(new THREE.Color(look.sky));
    expect(scene.scene.fog?.color).toEqual(new THREE.Color(look.fog));
    expect(scene.ambientLight.color).toEqual(new THREE.Color(look.hemiSky));
    expect(scene.ambientLight.groundColor).toEqual(new THREE.Color(look.hemiGround));
    expect(scene.sunLight.color).toEqual(new THREE.Color(look.sun));
    expect(scene.ambientLight.intensity).toBeCloseTo(1.1 * look.lightScale);
    expect(scene.sunLight.intensity).toBeCloseTo(2.4 * look.lightScale);
    expect(buildings.setLampLevel).toHaveBeenLastCalledWith(look.lampLevel);
  });
  it('does not restart the one-second tween for duplicate targets and supports interruption', () => {
    const { daylight, scene } = setup();
    daylight.setTime('midday', true);
    const start = new THREE.Color(timeOfDayLook(getPalette('b'), 'midday').sky);
    const end = new THREE.Color(timeOfDayLook(getPalette('b'), 'night').sky);
    daylight.setTime('night', false);
    daylight.update(0.5);
    expect(scene.scene.background).toEqual(start.clone().lerp(end, 0.5));
    daylight.setTime('night', false);
    daylight.update(0.5);
    expect(scene.scene.background).toEqual(end);
    daylight.setTime('morning', false);
    daylight.update(0.2);
    const current = scene.scene.background?.clone();
    daylight.setTime('dusk', false);
    daylight.update(0);
    expect(scene.scene.background).toEqual(current);
    daylight.update(1);
    expect(scene.scene.background).toEqual(new THREE.Color(timeOfDayLook(getPalette('b'), 'dusk').sky));
  });
});
