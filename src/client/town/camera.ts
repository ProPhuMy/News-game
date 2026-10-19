import * as THREE from 'three';
import type { Vector3Coord } from './types.ts';

export interface TownCameraOptions {
  fov?: number;
  pitchDegrees?: number;
  reducedMotion?: boolean;
  minDistance?: number;
  maxDistance?: number;
  initialDistance?: number;
}

const PAN_LIMIT_X = 35;
const PAN_LIMIT_Z = 35;
const DEFAULT_PITCH_DEG = 55;
const DEFAULT_FOV = 45;
const DEFAULT_DISTANCE = 40;
const MIN_DISTANCE = 20;
const MAX_DISTANCE = 70;

const SWEEP_KEYPOINTS: readonly Vector3Coord[] = [
  { x: -24, y: 0, z: -24 },
  { x: 24, y: 0, z: -24 },
  { x: 24, y: 0, z: 24 },
  { x: -24, y: 0, z: 24 },
  { x: 0, y: 0, z: 0 },
];

export interface TownCamera {
  camera: THREE.PerspectiveCamera;
  frame(bounds: THREE.Box3): void;
  resize(width: number, height: number): void;
  getTarget(): Vector3Coord;
  getDistance(): number;
  setTarget(x: number, z: number): void;
  panBy(dx: number, dz: number): void;
  zoomBy(delta: number): void;
  startIntroSweep(durationSeconds?: number): void;
  isSweeping(): boolean;
  update(deltaSeconds: number): void;
  setReducedMotion(on: boolean): void;
}

export function createTownCamera(options: TownCameraOptions = {}): TownCamera {
  const fov = options.fov ?? DEFAULT_FOV;
  const pitchRad = ((options.pitchDegrees ?? DEFAULT_PITCH_DEG) * Math.PI) / 180;
  let isReducedMotion = options.reducedMotion ?? false;
  const minDistance = options.minDistance ?? MIN_DISTANCE;
  let maxDistance = options.maxDistance ?? MAX_DISTANCE;

  let distance = options.initialDistance ?? DEFAULT_DISTANCE;
  const target = new THREE.Vector3(0, 0, 0);

  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 1000);

  const frameBounds = new THREE.Box3();
  let sweepActive = false;
  let sweepElapsed = 0;
  let sweepTotalDuration = 20;

  function updateCameraTransform(): void {
    const yOffset = distance * Math.sin(pitchRad);
    const zOffset = distance * Math.cos(pitchRad);

    camera.position.set(target.x, target.y + yOffset, target.z + zOffset);
    camera.lookAt(target.x, target.y, target.z);
  }

  function fit(): void {
    if (frameBounds.isEmpty()) return;
    const vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 0.92;
    const horizontal = vertical * camera.aspect;
    let required = minDistance;
    for (const x of [frameBounds.min.x, frameBounds.max.x]) {
      for (const y of [frameBounds.min.y, frameBounds.max.y]) {
        for (const z of [frameBounds.min.z, frameBounds.max.z]) {
          const dx = x - target.x; const dy = y - target.y; const dz = z - target.z;
          const towardCamera = dy * Math.sin(pitchRad) + dz * Math.cos(pitchRad);
          const up = dy * Math.cos(pitchRad) - dz * Math.sin(pitchRad);
          required = Math.max(required, towardCamera + Math.abs(dx) / horizontal,
            towardCamera + Math.abs(up) / vertical);
        }
      }
    }
    distance = required;
    maxDistance = Math.max(options.maxDistance ?? MAX_DISTANCE, required * 1.2);
    updateCameraTransform();
  }

  function clampTarget(): void {
    target.x = Math.max(-PAN_LIMIT_X, Math.min(PAN_LIMIT_X, target.x));
    target.z = Math.max(-PAN_LIMIT_Z, Math.min(PAN_LIMIT_Z, target.z));
  }

  updateCameraTransform();

  return {
    camera,
    frame(bounds) {
      frameBounds.copy(bounds);
      fit();
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fit();
    },

    getTarget(): Vector3Coord {
      return { x: target.x, y: target.y, z: target.z };
    },

    getDistance(): number {
      return distance;
    },

    setTarget(x: number, z: number): void {
      if (sweepActive) {
        sweepActive = false;
      }
      target.x = x;
      target.z = z;
      clampTarget();
      updateCameraTransform();
    },

    panBy(dx: number, dz: number): void {
      if (sweepActive) {
        sweepActive = false;
      }
      target.x += dx;
      target.z += dz;
      clampTarget();
      updateCameraTransform();
    },

    zoomBy(delta: number): void {
      distance = Math.max(minDistance, Math.min(maxDistance, distance + delta));
      updateCameraTransform();
    },

    startIntroSweep(durationSeconds = 20): void {
      if (isReducedMotion) {
        sweepActive = false;
        target.set(0, 0, 0);
        updateCameraTransform();
        return;
      }
      sweepTotalDuration = durationSeconds;
      sweepElapsed = 0;
      sweepActive = true;
    },

    isSweeping(): boolean {
      return sweepActive;
    },

    setReducedMotion(on: boolean): void {
      isReducedMotion = on;
      if (on && sweepActive) {
        sweepActive = false;
        target.set(0, 0, 0);
        updateCameraTransform();
      }
    },

    update(deltaSeconds: number): void {
      if (!sweepActive) {
        return;
      }

      sweepElapsed += deltaSeconds;
      const progress = Math.min(1, sweepElapsed / sweepTotalDuration);

      const segmentCount = SWEEP_KEYPOINTS.length - 1;
      const scaled = progress * segmentCount;
      const idx = Math.min(segmentCount - 1, Math.floor(scaled));
      const segmentProgress = scaled - idx;

      const p0 = SWEEP_KEYPOINTS[idx];
      const p1 = SWEEP_KEYPOINTS[idx + 1];
      if (!p0 || !p1) {
        return;
      }

      target.x = p0.x + (p1.x - p0.x) * segmentProgress;
      target.z = p0.z + (p1.z - p0.z) * segmentProgress;
      clampTarget();
      updateCameraTransform();

      if (progress >= 1) {
        sweepActive = false;
      }
    },
  };
}
