import * as THREE from 'three';
import type { SeatId } from '../../shared/ids.ts';
import { HOME_NODES } from '../../shared/town-map.ts';
import type { PoofSystem } from './particles.ts';
import type { TownLayout } from './types.ts';

export interface CitizenInstance {
  id: number;
  mesh: THREE.Group;
  accessoryMaterial: THREE.MeshLambertMaterial;
  currentPaper: SeatId | null;
  homeNodeId: string;
}

export interface CitizenManager {
  getCitizen(citizenId: number): CitizenInstance;
  getAllCitizens(): readonly CitizenInstance[];
  setCitizenPaper(
    citizenId: number,
    seatId: SeatId | null,
    options?: { reducedMotion?: boolean },
  ): void;
  setCitizenPosition(citizenId: number, pos: THREE.Vector3): void;
  getCitizenPosition(citizenId: number): THREE.Vector3;
  setCitizenRotation(citizenId: number, angleY: number): void;
  dispose(): void;
}

const CITIZEN_COUNT = 30;
const UNSUBSCRIBED_COLOR_HEX = 0x9e9e9e;
const SEAT_HEX_COLORS: readonly number[] = [
  0xd94338, // red (quill)
  0x3478d1, // blue (megaphone)
  0x2ea854, // green (eye)
  0xe5a01a, // gold (lightning)
];

function buildCitizenMesh(id: number): {
  group: THREE.Group;
  accessoryMaterial: THREE.MeshLambertMaterial;
} {
  const group = new THREE.Group();
  group.name = `citizen-${id}`;

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.9, 8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x566573 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xf5cfb3 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.1;
  group.add(head);

  // Hat / Accessory
  const accessoryMat = new THREE.MeshLambertMaterial({
    color: UNSUBSCRIBED_COLOR_HEX,
  });
  const hatGeo = new THREE.ConeGeometry(0.3, 0.35, 8);
  const hat = new THREE.Mesh(hatGeo, accessoryMat);
  hat.position.y = 1.4;
  group.add(hat);

  return { group, accessoryMaterial: accessoryMat };
}

export function createCitizenManager(
  layout: TownLayout,
  scene: THREE.Scene,
  poofSystem: PoofSystem,
): CitizenManager {
  const citizens: CitizenInstance[] = [];

  for (let i = 0; i < CITIZEN_COUNT; i++) {
    const homeNodeId = HOME_NODES[i % HOME_NODES.length] ?? 'r0c0';
    const homePos = layout.getNodeWorldPos(homeNodeId);

    const { group, accessoryMaterial } = buildCitizenMesh(i);
    // Slight random offset at home node so citizens don't stack directly
    const angle = (i / CITIZEN_COUNT) * Math.PI * 2;
    const jitter = 0.8;
    group.position.set(
      homePos.x + Math.cos(angle) * jitter,
      0,
      homePos.z + Math.sin(angle) * jitter,
    );

    scene.add(group);

    citizens.push({
      id: i,
      mesh: group,
      accessoryMaterial,
      currentPaper: null,
      homeNodeId,
    });
  }

  return {
    getCitizen(citizenId: number): CitizenInstance {
      const c = citizens[citizenId];
      if (!c) {
        throw new Error(`Citizen not found: ${citizenId}`);
      }
      return c;
    },

    getAllCitizens(): readonly CitizenInstance[] {
      return citizens;
    },

    setCitizenPaper(
      citizenId: number,
      seatId: SeatId | null,
      options = {},
    ): void {
      const c = citizens[citizenId];
      if (!c) {
        return;
      }

      if (c.currentPaper !== seatId) {
        const newColorHex =
          seatId === null
            ? UNSUBSCRIBED_COLOR_HEX
            : (SEAT_HEX_COLORS[seatId] ?? UNSUBSCRIBED_COLOR_HEX);

        c.accessoryMaterial.color.setHex(newColorHex);
        poofSystem.triggerPoof(
          c.mesh.position,
          newColorHex,
          options.reducedMotion,
        );
        c.currentPaper = seatId;
      }
    },

    setCitizenPosition(citizenId: number, pos: THREE.Vector3): void {
      const c = citizens[citizenId];
      if (c) {
        c.mesh.position.copy(pos);
      }
    },

    getCitizenPosition(citizenId: number): THREE.Vector3 {
      const c = citizens[citizenId];
      return c ? c.mesh.position.clone() : new THREE.Vector3();
    },

    setCitizenRotation(citizenId: number, angleY: number): void {
      const c = citizens[citizenId];
      if (c) {
        c.mesh.rotation.y = angleY;
      }
    },

    dispose(): void {
      citizens.forEach((c) => {
        scene.remove(c.mesh);
        c.mesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            }
          }
        });
      });
      citizens.length = 0;
    },
  };
}
