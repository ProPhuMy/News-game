// Shared helpers for building and prop pieces (owner: Claude). Pieces get every material from the MaterialKit
// and free only the geometry they create (presentation-interface note §2-§3).
import * as THREE from 'three';
import type { ArchitectureContext, PlacedPiece, SceneReadiness } from '../../visuals/town-types.ts';

/** Visible idle body height of a citizen in world units, before the cap (user decision in D2; interface note §5b). */
export const CITIZEN_REFERENCE_HEIGHT = 1.8;

export interface PieceParts {
  /** A shadow-casting mesh on a kit surface. The geometry is tracked and freed by dispose(). */
  mesh(geometry: THREE.BufferGeometry, hex: number, options?: { emissive?: number }): THREE.Mesh;
  /** Tracks a resource the piece created itself (geometry, texture, non-kit material) and frees it in dispose(). */
  own<T extends { dispose(): void }>(resource: T): T;
  /** Frees every tracked geometry once. Safe to call again. */
  dispose(): void;
}

export function createPieceParts(ctx: ArchitectureContext): PieceParts {
  const geometries = new Set<{ dispose(): void }>();
  return {
    mesh(geometry, hex, options) {
      geometries.add(geometry);
      const mesh = new THREE.Mesh(geometry, ctx.materials.surface(hex, options));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },
    own(resource) {
      geometries.add(resource);
      return resource;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      geometries.clear();
    },
  };
}

/** Sets a position and returns the object, so pieces read as a list of parts. */
export function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

export function placedPiece(
  object: THREE.Object3D,
  parts: PieceParts,
  footprint: { width: number; depth: number },
  ready: Promise<SceneReadiness> = Promise.resolve({ degraded: [] }),
): PlacedPiece {
  return {
    object,
    ready,
    footprint,
    dispose() {
      object.removeFromParent();
      parts.dispose();
    },
  };
}
