import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface PoofSystem {
  triggerPoof(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    colorHex?: number,
    reducedMotion?: boolean,
  ): void;
  createBurst?(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    colorHex?: number,
    reducedMotion?: boolean,
  ): void;
  update(deltaSeconds: number): void;
  getActiveCount(): number;
  getSharedGeometry?(): THREE.BufferGeometry;
  dispose(): void;
}

export interface ParticleSystem extends PoofSystem {
  createBurst(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    colorHex?: number,
    reducedMotion?: boolean,
  ): void;
  getSharedGeometry(): THREE.BufferGeometry;
}

export function createPoofEffect(scene: THREE.Scene = new THREE.Scene()): ParticleSystem {
  const particles: Particle[] = [];
  const particleGeo = new THREE.SphereGeometry(0.25, 6, 6);

  function triggerPoof(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    colorHex = 0xffffff,
    reducedMotion = false,
  ): void {
    if (reducedMotion) {
      return;
    }

    const count = 14;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(particleGeo, mat);
      if (pos instanceof THREE.Vector3) {
        mesh.position.copy(pos);
      } else {
        mesh.position.set(pos.x, pos.y, pos.z);
      }
      mesh.position.y += 0.8 + (Math.random() - 0.5) * 0.4;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.0;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.8 + Math.random() * 1.5,
        Math.sin(angle) * speed,
      );

      scene.add(mesh);
      particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.2,
      });
    }
  }

  return {
    triggerPoof,
    createBurst: triggerPoof,

    update(deltaSeconds: number): void {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) {
          continue;
        }

        p.life += deltaSeconds;
        const progress = p.life / p.maxLife;

        if (progress >= 1) {
          scene.remove(p.mesh);
          // Retain shared geometry; dispose only unique particle material
          if (p.mesh.material instanceof THREE.Material) {
            p.mesh.material.dispose();
          }
          particles.splice(i, 1);
        } else {
          p.mesh.position.addScaledVector(p.velocity, deltaSeconds);
          p.velocity.y -= 3.0 * deltaSeconds; // gravity

          const scale = 1.0 + progress * 0.8;
          p.mesh.scale.set(scale, scale, scale);

          if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
            p.mesh.material.opacity = Math.max(0, 0.85 * (1 - progress));
          }
        }
      }
    },

    getActiveCount(): number {
      return particles.length;
    },

    getSharedGeometry(): THREE.BufferGeometry {
      return particleGeo;
    },

    dispose(): void {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;
        scene.remove(p.mesh);
        if (p.mesh.material instanceof THREE.Material) {
          p.mesh.material.dispose();
        }
      }
      particles.length = 0;
      particleGeo.dispose();
    },
  };
}

export function createParticleSystem(scene: THREE.Scene = new THREE.Scene()): ParticleSystem {
  return createPoofEffect(scene);
}
