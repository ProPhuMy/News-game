import * as THREE from 'three';
import { APPROVED_PALETTE, getPalette } from '../visuals/palette.ts';
import { createMaterialKit } from './materials.ts';
import type { ArchitectureContext } from '../visuals/town-types.ts';
import { STREET_EDGES } from '../../shared/town-map.ts';
import type { TownLayout } from './types.ts';

export function createTownEnvironment(layout: TownLayout, ctx?: ArchitectureContext): THREE.Group & { dispose(): void } {
  const palette = ctx?.palette ?? getPalette(APPROVED_PALETTE);
  const ownedKit = ctx ? null : createMaterialKit(palette);
  const kit = ctx?.materials ?? ownedKit!;
  const group = new THREE.Group();
  group.name = 'town-environment';

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(96, 96);
  const groundMat = kit.surface(palette.town.ground);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.name = 'ground';
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // Roads along street edges
  const roadMat = kit.surface(palette.town.road);
  const roadWidth = 3.4;

  STREET_EDGES.forEach(([fromId, toId]) => {
    const p1 = layout.getNodeWorldPos(fromId);
    const p2 = layout.getNodeWorldPos(toId);

    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const roadGeo = new THREE.BoxGeometry(roadWidth, 0.04, length);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.name = `road-${fromId}-${toId}`;
    roadMesh.position.set((p1.x + p2.x) / 2, 0.01, (p1.z + p2.z) / 2);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;

    group.add(roadMesh);
  });

  let disposed = false;
  return Object.assign(group, { dispose() {
    if (disposed) return;
    disposed = true;
    group.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    group.removeFromParent();
    ownedKit?.dispose();
  } });
}
