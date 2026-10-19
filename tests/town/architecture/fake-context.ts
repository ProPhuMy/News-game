// Test helper: a spy MaterialKit and a stub AssetSource for building/prop factories.
import * as THREE from 'three';
import { getPalette, type PaletteId } from '../../../src/client/visuals/palette.ts';
import type { ArchitectureContext, AssetSource } from '../../../src/client/visuals/town-types.ts';

export interface FakeContext extends ArchitectureContext {
  /** Every surface() call, in order. */
  surfaces: { hex: number; emissive?: number }[];
  /** Every material surface() returned. */
  kitMaterials: Set<THREE.Material>;
  outlined: THREE.Object3D[];
  /** Every material passed to preserve(). */
  preserved: THREE.Material[];
  /** Every material preserve() returned. */
  preservedResults: Set<THREE.Material>;
}

export function fakeContext(
  paletteId: PaletteId = 'a',
  loadGltf: AssetSource['loadGltf'] = () => Promise.reject(new Error('no assets in this test')),
): FakeContext {
  const surfaces: FakeContext['surfaces'] = [];
  const kitMaterials = new Set<THREE.Material>();
  const outlined: THREE.Object3D[] = [];
  const preserved: THREE.Material[] = [];
  const preservedResults = new Set<THREE.Material>();
  const cache = new Map<string, THREE.Material>();
  return {
    palette: getPalette(paletteId),
    surfaces,
    kitMaterials,
    outlined,
    preserved,
    preservedResults,
    materials: {
      surface(hex, options) {
        surfaces.push({ hex, ...options });
        // Like the real kit, one material per (hex, emissive).
        const key = `${hex}:${options?.emissive ?? ''}`;
        const cached = cache.get(key);
        if (cached) return cached;
        const material = new THREE.MeshBasicMaterial({ color: hex });
        cache.set(key, material);
        kitMaterials.add(material);
        return material;
      },
      outline(object) {
        outlined.push(object);
      },
      preserve(source) {
        preserved.push(source);
        const material = new THREE.MeshBasicMaterial();
        preservedResults.add(material);
        return material;
      },
    },
    assets: { loadGltf },
  };
}

/** A loaded-glTF stand-in: one mesh with a textured standard material named `materialName`. */
export function fakeGltf(materialName = 'colormap'): { group: THREE.Group; mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
  material.name = materialName;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.15), material);
  mesh.position.y = 0.2;
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, material };
}

export function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((child) => { if (child instanceof THREE.Mesh) found.push(child); });
  return found;
}

export function townHexes(ctx: ArchitectureContext): number[] {
  return Object.values(ctx.palette.town);
}
