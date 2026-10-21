import * as THREE from 'three';
import type { ArchitectureContext } from '../visuals/town-types.ts';
import { createPicketSignKit, PICKET_SIGN_TEXTS } from './props/picket.ts';
import type { CitizenManager } from './citizens.ts';

export function createReactionProps(ctx: ArchitectureContext, citizens: CitizenManager) {
  const kit = createPicketSignKit(ctx);
  const signs = new Map<number, THREE.Object3D>();
  let disposed = false;
  function clear(): void { for (const sign of signs.values()) sign.removeFromParent(); }
  return {
    showSign(id: number): void {
      if (disposed) return;
      let sign = signs.get(id);
      if (!sign) {
        sign = kit.create(PICKET_SIGN_TEXTS[id % PICKET_SIGN_TEXTS.length]!);
        sign.position.set(0.38, 0.85, 0.16);
        signs.set(id, sign);
      }
      citizens.getCitizen(id).mesh.add(sign);
    },
    clear,
    dispose(): void {
      if (disposed) return;
      disposed = true; clear(); kit.dispose(); signs.clear();
    },
  };
}
