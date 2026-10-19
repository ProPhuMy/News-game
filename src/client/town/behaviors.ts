import type { Behavior } from '../../shared/ids.ts';
import type { CitizenInstance } from './citizens.ts';

export function applyCitizenBehaviorPose(
  citizen: CitizenInstance,
  behavior: Behavior,
  elapsedSeconds: number,
  reducedMotion = false,
): void {
  const mesh = citizen.mesh;
  if (reducedMotion) {
    mesh.position.y = 0;
    mesh.rotation.x = 0; mesh.rotation.z = 0;
    return;
  }
  const t = elapsedSeconds;
  const idOffset = (citizen.id * 0.3) % (Math.PI * 2);

  switch (behavior) {
    case 'flee': {
      // Rapid scurrying and forward tilt
      const hop = Math.abs(Math.sin(t * 9 + idOffset)) * 0.14;
      mesh.position.y = hop;
      mesh.rotation.x = 0.15;
      mesh.rotation.z = Math.sin(t * 9 + idOffset) * 0.08;
      break;
    }

    case 'boycott': {
      // Firm stance, arms crossed, subtle breathing
      mesh.position.y = Math.sin(t * 1.2 + idOffset) * 0.02;
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;
      break;
    }

    case 'protest': {
      // Excited bouncing and sign-waving bob
      const bounce = Math.abs(Math.sin(t * 5.5 + idOffset)) * 0.16;
      mesh.position.y = bounce;
      mesh.rotation.x = 0;
      mesh.rotation.z = Math.sin(t * 5.5 + idOffset) * 0.12;
      break;
    }

    case 'queue': {
      // Calm queuing line pose, occasional subtle shuffle
      mesh.position.y = Math.sin(t * 1.5 + idOffset) * 0.02;
      mesh.rotation.x = 0;
      mesh.rotation.z = Math.sin(t * 1.0) * 0.02;
      break;
    }

    case 'curious': {
      // Inquisitive leaning and tilting
      mesh.position.y = Math.sin(t * 2.0 + idOffset) * 0.03;
      mesh.rotation.x = 0.05;
      mesh.rotation.z = Math.sin(t * 2.2 + idOffset) * 0.14;
      break;
    }

    case 'relax': {
      // Relaxed sway
      mesh.position.y = Math.sin(t * 1.8 + idOffset) * 0.03;
      mesh.rotation.x = 0;
      mesh.rotation.z = Math.sin(t * 1.4 + idOffset) * 0.06;
      break;
    }

    case 'angry_mob': {
      // Highly agitated rapid jumping and shouting tilt
      const mobBounce = Math.abs(Math.sin(t * 8.0 + idOffset)) * 0.22;
      mesh.position.y = mobBounce;
      mesh.rotation.x = 0.1;
      mesh.rotation.z = Math.sin(t * 8.0 + idOffset) * 0.15;
      break;
    }

    case 'routine':
    default: {
      // Casual neighborhood stroll/idle
      mesh.position.y = Math.sin(t * 2.5 + idOffset) * 0.03;
      mesh.rotation.x = 0;
      mesh.rotation.z = 0;
      break;
    }
  }
}
