import * as THREE from 'three';
import type { Location, SeatId } from '../../shared/ids.ts';
import type { PaperPublic } from '../../shared/snapshots.ts';
import type { ArchitectureContext, SceneReadiness } from '../visuals/town-types.ts';
import { createArchitectureTown } from './architecture/town.ts';
import type { TownLayout } from './types.ts';

export interface TownBuildings {
  group: THREE.Group;
  getLocationAnchor(location: Location): THREE.Vector3;
  getOfficeAnchor(seatId: SeatId): THREE.Vector3;
  setOfficeHighlight(seatId: SeatId, active: boolean): void;
  syncOffices(papers: readonly PaperPublic[]): void;
  getOfficeBannerColor(seatId: SeatId): number;
  /**
   * Gas-lamp glow, 0..1 (clamped), from timeOfDayLook(...).lampLevel; material values only (interface §5c).
   * Optional so existing hand-built test doubles stay valid; the real town always provides it.
   */
  setLampLevel?(level: number): void;
  /** Resolves when every building's assets are in place; `degraded` merges every piece's list. */
  ready: Promise<SceneReadiness>;
  /** Disposes every piece. */
  dispose(): void;
}

/** The whole code-built architecture town (architecture/town.ts); presentation-interface note §3. */
export function createTownBuildings(layout: TownLayout, ctx: ArchitectureContext): TownBuildings {
  return createArchitectureTown(layout, ctx);
}
