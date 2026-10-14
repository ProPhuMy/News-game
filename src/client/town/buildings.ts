import * as THREE from 'three';
import type { Location, SeatId } from '../../shared/ids.ts';
import { COLORS, LOCATIONS } from '../../shared/ids.ts';
import type { PaperPublic } from '../../shared/snapshots.ts';
import { PAPER_COLOR_HEX } from './citizens.ts';
import type { TownLayout } from './types.ts';

export interface TownBuildings {
  group: THREE.Group;
  getLocationAnchor(location: Location): THREE.Vector3;
  getOfficeAnchor(seatId: SeatId): THREE.Vector3;
  setOfficeHighlight(seatId: SeatId, active: boolean): void;
  syncOffices(papers: readonly PaperPublic[]): void;
  getOfficeBannerColor(seatId: SeatId): number;
}

const SEAT_HEX_COLORS: readonly number[] = [
  0xd94338, // red
  0x3478d1, // blue
  0x2ea854, // green
  0xe5a01a, // gold
];

function buildBakeryMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'building-bakery';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 3.6, 4.2),
    new THREE.MeshLambertMaterial({ color: 0xdeb887 }),
  );
  body.position.y = 1.8;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.6, 1.8, 4),
    new THREE.MeshLambertMaterial({ color: 0xba4a38 }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.2;
  g.add(roof);
  return g;
}

function buildBankMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'building-bank';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 4.4, 4.6),
    new THREE.MeshLambertMaterial({ color: 0xe8e2d2 }),
  );
  body.position.y = 2.2;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.8, 5.0),
    new THREE.MeshLambertMaterial({ color: 0x7c858d }),
  );
  roof.position.y = 4.8;
  g.add(roof);
  return g;
}

function buildFountainMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'building-fountain_square';
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.4, 0.8, 16),
    new THREE.MeshLambertMaterial({ color: 0x95a5a6 }),
  );
  basin.position.y = 0.4;
  g.add(basin);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x4fa3d1 }),
  );
  water.position.y = 0.6;
  g.add(water);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.8, 8),
    new THREE.MeshLambertMaterial({ color: 0xbdc3c7 }),
  );
  pillar.position.y = 1.3;
  g.add(pillar);
  return g;
}

function buildTownHallMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'building-town_hall';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 4.8, 5.0),
    new THREE.MeshLambertMaterial({ color: 0xd9825b }),
  );
  body.position.y = 2.4;
  g.add(body);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 3.6, 2.0),
    new THREE.MeshLambertMaterial({ color: 0xf5f0e6 }),
  );
  tower.position.y = 6.0;
  g.add(tower);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 2.2, 4),
    new THREE.MeshLambertMaterial({ color: 0x3d566e }),
  );
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 8.5;
  g.add(spire);
  return g;
}

function buildClinicMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'building-clinic';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 3.8, 4.4),
    new THREE.MeshLambertMaterial({ color: 0xf4f6f7 }),
  );
  body.position.y = 1.9;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.6, 4.8),
    new THREE.MeshLambertMaterial({ color: 0x3a9d5d }),
  );
  roof.position.y = 4.1;
  g.add(roof);
  return g;
}

function buildOfficeMesh(seatId: SeatId): { group: THREE.Group; bannerMat: THREE.MeshLambertMaterial } {
  const g = new THREE.Group();
  g.name = `office-${seatId}-${COLORS[seatId]}`;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 4.2, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x475569 }),
  );
  body.position.y = 2.1;
  g.add(body);

  const hexColor = SEAT_HEX_COLORS[seatId] ?? 0x888888;
  const bannerMat = new THREE.MeshLambertMaterial({ color: hexColor });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.9, 4.4), bannerMat);
  banner.position.y = 4.2;
  g.add(banner);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 1.8, 4),
    new THREE.MeshLambertMaterial({ color: 0x1e293b }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.2;
  g.add(roof);

  return { group: g, bannerMat };
}

export function createTownBuildings(layout: TownLayout): TownBuildings {
  const group = new THREE.Group();
  group.name = 'town-buildings';

  const locationAnchors = new Map<Location, THREE.Vector3>();
  const officeAnchors = new Map<SeatId, THREE.Vector3>();
  const officeBanners: THREE.MeshLambertMaterial[] = [];

  const builders: Record<Location, () => THREE.Group> = {
    bakery: buildBakeryMesh,
    bank: buildBankMesh,
    fountain_square: buildFountainMesh,
    town_hall: buildTownHallMesh,
    clinic: buildClinicMesh,
  };

  LOCATIONS.forEach((loc) => {
    const nodePos = layout.getNodeWorldPos(layout.getLocationNode(loc));
    const mesh = builders[loc]();
    mesh.position.set(nodePos.x, 0, nodePos.z);
    group.add(mesh);

    const anchorHeight = loc === 'town_hall' ? 10.0 : 5.8;
    locationAnchors.set(
      loc,
      new THREE.Vector3(nodePos.x, anchorHeight, nodePos.z),
    );
  });

  for (let seatId = 0; seatId < 4; seatId++) {
    const nodePos = layout.getNodeWorldPos(layout.getOfficeNode(seatId));
    const { group: officeGroup, bannerMat } = buildOfficeMesh(seatId);
    officeGroup.position.set(nodePos.x, 0, nodePos.z);
    group.add(officeGroup);
    officeBanners[seatId] = bannerMat;

    officeAnchors.set(
      seatId,
      new THREE.Vector3(nodePos.x, 6.8, nodePos.z),
    );
  }

  return {
    group,

    getLocationAnchor(location: Location): THREE.Vector3 {
      const a = locationAnchors.get(location);
      if (!a) {
        throw new Error(`No anchor for location: ${location}`);
      }
      return a.clone();
    },

    getOfficeAnchor(seatId: SeatId): THREE.Vector3 {
      const a = officeAnchors.get(seatId);
      if (!a) {
        throw new Error(`No anchor for office: ${seatId}`);
      }
      return a.clone();
    },

    setOfficeHighlight(seatId: SeatId, active: boolean): void {
      const mat = officeBanners[seatId];
      if (!mat) {
        return;
      }
      if (active) {
        mat.emissive.setHex(0xffffff);
        mat.emissiveIntensity = 0.6;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    },

    syncOffices(papers: readonly PaperPublic[]): void {
      for (const paper of papers) {
        const mat = officeBanners[paper.seatId];
        if (mat) {
          const hex = PAPER_COLOR_HEX[paper.color];
          if (hex !== undefined) {
            mat.color.setHex(hex);
          }
        }
      }
    },

    getOfficeBannerColor(seatId: SeatId): number {
      const mat = officeBanners[seatId];
      return mat ? mat.color.getHex() : 0;
    },
  };
}
