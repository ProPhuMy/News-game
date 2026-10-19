import * as THREE from 'three';
import type { PresentationPalette } from '../visuals/palette.ts';
import type { MaterialKit } from '../visuals/town-types.ts';

export function createMaterialKit(palette: PresentationPalette): MaterialKit & { dispose(): void } {
  const surfaces = new Map<string, THREE.MeshToonMaterial>();
  const preserved = new Map<THREE.Material, THREE.MeshToonMaterial>();
  const gradient = new THREE.DataTexture(new Uint8Array([80, 170, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  const lineMaterial = new THREE.LineBasicMaterial({ color: palette.town.outline });
  const hullMaterial = new THREE.MeshBasicMaterial({ color: palette.town.outline, side: THREE.BackSide });
  hullMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed += normal * 0.006;');
  };
  hullMaterial.customProgramCacheKey = () => 'news-town-skinned-hull-v1';
  const outlined = new WeakSet<THREE.Object3D>();
  const outlines = new Set<THREE.Object3D>();
  const edgeGeometries = new Set<THREE.EdgesGeometry>();
  let disposed = false;

  function assertActive(): void {
    if (disposed) throw new Error('material kit disposed');
  }

  return {
    surface(hex, options) {
      assertActive();
      const key = `${hex}:${options?.emissive ?? 'none'}`;
      let material = surfaces.get(key);
      if (!material) {
        material = new THREE.MeshToonMaterial({ color: hex, gradientMap: gradient,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
          emissive: options?.emissive ?? 0, emissiveIntensity: options?.emissive === undefined ? 0 : 0.7 });
        surfaces.set(key, material);
      }
      return material;
    },
    preserve(source) {
      assertActive();
      if (!(source instanceof THREE.MeshStandardMaterial)) {
        throw new Error(`unsupported toon material: ${source.type}`);
      }
      let material = preserved.get(source);
      if (!material) {
        material = new THREE.MeshToonMaterial({
          color: source.color, map: source.map, gradientMap: gradient,
          alphaMap: source.alphaMap, alphaTest: source.alphaTest, alphaHash: source.alphaHash,
          transparent: source.transparent, opacity: source.opacity, side: source.side,
          vertexColors: source.vertexColors, emissive: source.emissive,
          emissiveMap: source.emissiveMap, emissiveIntensity: source.emissiveIntensity,
          normalMap: source.normalMap, normalScale: source.normalScale,
          bumpMap: source.bumpMap, bumpScale: source.bumpScale,
          aoMap: source.aoMap, aoMapIntensity: source.aoMapIntensity,
          displacementMap: source.displacementMap, displacementScale: source.displacementScale,
          displacementBias: source.displacementBias, depthWrite: source.depthWrite,
          depthTest: source.depthTest, colorWrite: source.colorWrite,
          polygonOffset: true, polygonOffsetFactor: source.polygonOffset ? source.polygonOffsetFactor : 1,
          polygonOffsetUnits: source.polygonOffset ? source.polygonOffsetUnits : 1,
        });
        material.name = `toon:${source.name}`;
        preserved.set(source, material);
      }
      return material;
    },
    outline(object) {
      assertActive();
      const targets: THREE.Mesh[] = [];
      object.traverse(child => {
        if (child instanceof THREE.Mesh && !outlined.has(child)) targets.push(child);
      });
      for (const mesh of targets) {
        let outline: THREE.Object3D;
        if (mesh instanceof THREE.SkinnedMesh) {
          const hull = new THREE.SkinnedMesh(mesh.geometry, hullMaterial);
          hull.bindMode = mesh.bindMode;
          hull.bind(mesh.skeleton, mesh.bindMatrix);
          hull.frustumCulled = false;
          outline = hull;
        } else {
          // Open foliage needs boundary edges; an inverted hull fills its back faces with black.
          const geometry = new THREE.EdgesGeometry(mesh.geometry, 45);
          edgeGeometries.add(geometry);
          outline = new THREE.LineSegments(geometry, lineMaterial);
        }
        outline.name = 'toon-outline';
        outlined.add(mesh); outlined.add(outline);
        mesh.add(outline); outlines.add(outline);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const outline of outlines) outline.removeFromParent();
      outlines.clear();
      for (const geometry of edgeGeometries) geometry.dispose();
      edgeGeometries.clear();
      for (const material of [...surfaces.values(), ...preserved.values(), lineMaterial, hullMaterial]) material.dispose();
      surfaces.clear(); preserved.clear(); gradient.dispose();
    },
  };
}
