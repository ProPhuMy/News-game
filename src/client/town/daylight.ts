import * as THREE from 'three';
import type { PresentationPalette } from '../visuals/palette.ts';
import { timeOfDayLook, type TimeOfDay } from '../visuals/time-of-day.ts';
import type { TownBuildings } from './buildings.ts';
import type { TownScene } from './scene.ts';

/** Frame-time interpolation only; the caller derives the target from authoritative state. */
export function createDaylight(scene: TownScene, buildings: Pick<TownBuildings, 'setLampLevel'>, palette: PresentationPalette) {
  const colors = () => [
    scene.scene.background instanceof THREE.Color ? scene.scene.background : new THREE.Color(palette.town.sky),
    scene.scene.fog?.color ?? new THREE.Color(palette.town.fog),
    scene.ambientLight.color, scene.ambientLight.groundColor, scene.sunLight.color,
  ];
  let targetTime: TimeOfDay | null = null;
  let target = timeOfDayLook(palette, 'midday');
  let from = colors().map(color => color.clone());
  let to = from;
  let elapsed = 1;
  let scale = 1;
  let lamp = 0;
  let fromScale = scale;
  let fromLamp = lamp;

  function update(deltaSeconds: number): void {
    elapsed = Math.min(1, elapsed + Math.max(0, deltaSeconds));
    const current = colors();
    current.forEach((color, i) => elapsed === 1 ? color.copy(to[i]!) : color.copy(from[i]!).lerp(to[i]!, elapsed));
    scene.scene.background = current[0]!;
    scale = THREE.MathUtils.lerp(fromScale, target.lightScale, elapsed);
    lamp = THREE.MathUtils.lerp(fromLamp, target.lampLevel, elapsed);
    scene.ambientLight.intensity = 1.1 * scale;
    scene.sunLight.intensity = 2.4 * scale;
    buildings.setLampLevel?.(lamp);
  }
  return {
    setTime(time: TimeOfDay, immediate: boolean): void {
      if (time === targetTime && !immediate) return;
      targetTime = time;
      from = colors().map(color => color.clone());
      fromScale = scale; fromLamp = lamp;
      target = timeOfDayLook(palette, time);
      to = [target.sky, target.fog, target.hemiSky, target.hemiGround, target.sun].map(hex => new THREE.Color(hex));
      elapsed = immediate ? 1 : 0;
      update(0);
    },
    update,
  };
}
