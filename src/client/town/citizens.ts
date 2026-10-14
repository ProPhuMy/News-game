import * as THREE from 'three';
import type { Color, SeatId } from '../../shared/ids.ts';
import type { CitizenPublic, PaperPublic } from '../../shared/snapshots.ts';
import { HOME_NODES } from '../../shared/town-map.ts';
import { createTownLayout } from './layout.ts';
import { createPoofEffect, type PoofSystem } from './particles.ts';
import type { SeatColorMap, TownLayout } from './types.ts';

export interface CitizenInstance {
  id: number;
  mesh: THREE.Group;
  accessoryMaterial: THREE.MeshLambertMaterial;
  currentPaper: SeatId | null;
  homeNodeId: string;
  accessoryMeshes?: Record<Color, THREE.Mesh>;
}

export interface CitizenManagerOptions {
  reducedMotion?: boolean;
}

export interface SetCitizenPaperOptions {
  reducedMotion?: boolean;
  immediate?: boolean;
}

export interface CitizenManager {
  getCitizen(citizenId: number): CitizenInstance;
  getAllCitizens(): readonly CitizenInstance[];
  setCitizenPaper(citizenId: number, seatId: SeatId | null, options?: SetCitizenPaperOptions): void;
  setSeatColors(seatColors: SeatColorMap): void;
  syncCitizens(citizens: readonly CitizenPublic[], papers: readonly PaperPublic[]): void;
  getCitizenHatColor(citizenId: number): number;
  setCitizenPosition(citizenId: number, pos: THREE.Vector3): void;
  getCitizenPosition(citizenId: number): THREE.Vector3;
  setCitizenRotation(citizenId: number, angleY: number): void;
  getCitizenRotation(citizenId: number): number;
  setReducedMotion(enabled: boolean): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

const CITIZEN_COUNT = 30;

export const PAPER_COLOR_HEX: Readonly<Record<Color, number>> = {
  red: 0xc0392b,
  blue: 0x2980b9,
  green: 0x27ae60,
  gold: 0xd4ac0d,
};

export const PAPER_GREY_HEX = 0x7f8c8d;

const DEFAULT_SEAT_COLORS: Readonly<Record<number, Color>> = {
  0: 'red',
  1: 'blue',
  2: 'green',
  3: 'gold',
};

function buildCitizenMesh(id: number): {
  group: THREE.Group;
  accessoryMaterial: THREE.MeshLambertMaterial;
  accessoryMeshes: Record<Color, THREE.Mesh>;
} {
  const group = new THREE.Group();
  group.name = `citizen-${id}`;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x566573 }));
  body.position.y = 0.45;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshLambertMaterial({ color: 0xf5cfb3 }));
  head.position.y = 1.1;
  group.add(head);

  const accessoryMat = new THREE.MeshLambertMaterial({ color: PAPER_GREY_HEX });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 8), accessoryMat);
  hat.position.y = 1.4;
  group.add(hat);

  const createAccessory = (geo: THREE.BufferGeometry, name: string, pos: [number, number, number], rot?: [number, number, number]): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, accessoryMat);
    mesh.name = name;
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };

  const accessoryMeshes: Record<Color, THREE.Mesh> = {
    red: createAccessory(new THREE.ConeGeometry(0.06, 0.45, 4), 'accessory-feather', [0.18, 1.45, 0], [0, 0, -Math.PI / 6]),
    blue: createAccessory(new THREE.ConeGeometry(0.14, 0.32, 8), 'accessory-horn', [0, 1.4, 0.22], [Math.PI / 2, 0, 0]),
    green: createAccessory(new THREE.TorusGeometry(0.12, 0.04, 8, 16), 'accessory-ring', [0, 1.35, 0.22]),
    gold: createAccessory(new THREE.OctahedronGeometry(0.12), 'accessory-star', [0, 1.35, 0.22], [0, 0, Math.PI / 4]),
  };

  return { group, accessoryMaterial: accessoryMat, accessoryMeshes };
}

function updateCitizenAccessory(
  c: CitizenInstance,
  color: Color | null,
): void {
  if (!c.accessoryMeshes) {
    return;
  }
  (Object.keys(c.accessoryMeshes) as Color[]).forEach((col) => {
    const mesh = c.accessoryMeshes?.[col];
    if (mesh) {
      mesh.visible = col === color;
    }
  });
}

export function createCitizenManager(
  layout?: TownLayout,
  scene?: THREE.Scene,
  poofSystem?: PoofSystem,
  options?: CitizenManagerOptions,
): CitizenManager {
  const actualLayout = layout ?? createTownLayout();
  const actualScene = scene ?? new THREE.Scene();
  const actualPoof = poofSystem ?? createPoofEffect(actualScene);

  let isReducedMotion = options?.reducedMotion ?? false;
  interface ColorTransition {
    startColor: THREE.Color;
    targetColor: THREE.Color;
    elapsed: number;
    duration: number;
  }
  const activeTransitions = new Map<number, ColorTransition>();

  const citizens: CitizenInstance[] = [];
  let seatColors: Record<number, Color> = { ...DEFAULT_SEAT_COLORS };

  for (let i = 0; i < CITIZEN_COUNT; i++) {
    const homeNodeId = HOME_NODES[i % HOME_NODES.length] ?? 'r0c0';
    const homePos = actualLayout.getNodeWorldPos(homeNodeId);
    const { group, accessoryMaterial, accessoryMeshes } = buildCitizenMesh(i);
    const angle = (i / CITIZEN_COUNT) * Math.PI * 2;
    group.position.set(homePos.x + Math.cos(angle) * 0.8, 0, homePos.z + Math.sin(angle) * 0.8);
    actualScene.add(group);
    citizens.push({ id: i, mesh: group, accessoryMaterial, currentPaper: null, homeNodeId, accessoryMeshes });
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

    setSeatColors(newSeatColors: Record<number, Color>): void {
      seatColors = { ...seatColors, ...newSeatColors };
      for (const c of citizens) {
        if (c.currentPaper !== null) {
          const colorName = seatColors[c.currentPaper] ?? DEFAULT_SEAT_COLORS[c.currentPaper];
          const hex = colorName ? (PAPER_COLOR_HEX[colorName] ?? PAPER_GREY_HEX) : PAPER_GREY_HEX;
          c.accessoryMaterial.color.setHex(hex);
          updateCitizenAccessory(c, colorName ?? null);
        }
      }
    },

    syncCitizens(
      snapshotCitizens: readonly CitizenPublic[],
      papers: readonly PaperPublic[],
    ): void {
      activeTransitions.clear();
      const newSeatColors: Record<number, Color> = {};
      for (const p of papers) {
        newSeatColors[p.seatId] = p.color;
      }
      seatColors = { ...seatColors, ...newSeatColors };

      for (const cSnap of snapshotCitizens) {
        const c = citizens[cSnap.id];
        if (!c) {
          continue;
        }
        c.homeNodeId = cSnap.home;
        const homePos = actualLayout.getNodeWorldPos(cSnap.home);
        c.mesh.position.set(homePos.x, 0, homePos.z);
        c.mesh.rotation.set(0, 0, 0);
        c.mesh.scale.set(1, 1, 1);
        c.currentPaper = cSnap.paper;

        const colorName =
          cSnap.paper === null
            ? null
            : (seatColors[cSnap.paper] ?? DEFAULT_SEAT_COLORS[cSnap.paper] ?? null);
        const newColorHex =
          colorName === null
            ? PAPER_GREY_HEX
            : (PAPER_COLOR_HEX[colorName] ?? PAPER_GREY_HEX);

        c.accessoryMaterial.color.setHex(newColorHex);
        updateCitizenAccessory(c, colorName);
      }
    },

    getCitizenHatColor(citizenId: number): number {
      const c = citizens[citizenId];
      if (!c) {
        throw new Error(`Citizen not found: ${citizenId}`);
      }
      return c.accessoryMaterial.color.getHex();
    },

    setCitizenPaper(
      citizenId: number,
      seatId: SeatId | null,
      options = {},
    ): void {
      const c = citizens[citizenId];
      if (!c) return;

      if (c.currentPaper !== seatId) {
        const colorName =
          seatId === null ? null : (seatColors[seatId] ?? DEFAULT_SEAT_COLORS[seatId] ?? null);
        const newColorHex =
          colorName === null ? PAPER_GREY_HEX : (PAPER_COLOR_HEX[colorName] ?? PAPER_GREY_HEX);

        const shouldLerp = isReducedMotion && !options.immediate && options.reducedMotion !== false;
        if (shouldLerp) {
          activeTransitions.set(citizenId, {
            startColor: c.accessoryMaterial.color.clone(),
            targetColor: new THREE.Color(newColorHex),
            elapsed: 0,
            duration: 0.3,
          });
        } else {
          activeTransitions.delete(citizenId);
          c.accessoryMaterial.color.setHex(newColorHex);
        }

        updateCitizenAccessory(c, colorName);
        actualPoof.triggerPoof(c.mesh.position, newColorHex, options.reducedMotion ?? isReducedMotion);
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
      if (c) c.mesh.rotation.y = angleY;
    },

    getCitizenRotation(citizenId: number): number {
      return citizens[citizenId]?.mesh.rotation.y ?? 0;
    },

    setReducedMotion(enabled: boolean): void {
      isReducedMotion = enabled;
    },

    update(deltaSeconds: number): void {
      if (activeTransitions.size === 0) return;
      for (const [id, t] of activeTransitions) {
        t.elapsed += deltaSeconds;
        const progress = Math.min(1, t.elapsed / t.duration);
        const c = citizens[id];
        if (c) {
          c.accessoryMaterial.color.copy(t.startColor).lerp(t.targetColor, progress);
        }
        if (progress >= 1) {
          activeTransitions.delete(id);
        }
      }
    },

    dispose(): void {
      activeTransitions.clear();
      citizens.forEach((c) => {
        actualScene.remove(c.mesh);
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

