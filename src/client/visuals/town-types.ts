// Presentation-only interface types (owner: Claude). Shapes come from docs/visual-overhaul/presentation-interface.md
// §2-§3; change them only by reopening that note with Codex. These are not gameplay contracts.
import type * as THREE from 'three';
import type { Location } from '../../shared/ids.ts';
import type { PresentationPalette } from './palette.ts';

export interface MaterialKit {
  /** Toon-shaded surface for a palette color; Codex caches one material per color and options. */
  surface(hex: number, options?: { emissive?: number }): THREE.Material;
  /** Adds the outline treatment to every mesh under object (Codex decides the technique). */
  outline(object: THREE.Object3D): void;
}

/** Same shape as the harness's SceneReadiness (src/client/visual-test/settle.ts). */
export interface SceneReadiness {
  /** One entry per asset that fell back to a stand-in, e.g. "bakery: models/buildings/bakery.glb failed to load". */
  degraded: readonly string[];
}

export interface AssetSource {
  /**
   * Loads a glTF from public/models/** (Codex supplies the GLTFLoader-backed implementation and its cache).
   * Every call returns a new, independent scene instance (a clone; skinned meshes cloned with SkeletonUtils),
   * so callers may move, re-parent, and re-material it freely. Geometries and textures are shared through the
   * cache and owned by the AssetSource.
   */
  loadGltf(url: string): Promise<THREE.Group>;
}

export interface ArchitectureContext {
  palette: PresentationPalette;
  materials: MaterialKit;
  assets: AssetSource;
}

export interface PlacedPiece {
  /** Root object. Origin at ground level (y = 0) in the footprint center. +Z faces the street. */
  object: THREE.Object3D;
  /**
   * Resolves when all of this piece's assets are in place. A recoverable load failure inserts a code-built
   * stand-in and is listed in `degraded`; it is never silent. An unrecoverable failure rejects.
   */
  ready: Promise<SceneReadiness>;
  /** Footprint in world units. */
  footprint: { width: number; depth: number };
  /**
   * Removes `object` from its parent and disposes only resources this piece created itself (procedural
   * geometries, its own non-kit materials and textures). Never disposes AssetSource-cached geometries or
   * textures, and never disposes MaterialKit materials.
   */
  dispose(): void;
}

export type LocationBuildingFactory = (location: Location, ctx: ArchitectureContext) => PlacedPiece;
export type PropFactory = (kind: string, ctx: ArchitectureContext) => PlacedPiece;
