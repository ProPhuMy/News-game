// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTownView } from '../../src/client/town/index.ts';
import type { PublicSnapshot } from '../../src/shared/snapshots.ts';

describe('TownView syncFromSnapshot', () => {
  it('places each citizen at its snapshot home with its snapshot paper color and updates office banners', () => {
    const container = document.createElement('div');
    const view = createTownView({ container });
    const mockSnapshot: Partial<PublicSnapshot> = {
      round: 1,
      phase: 'investigate',
      papers: [
        { seatId: 0, displayName: 'P1', paperName: 'Daily Gold', color: 'gold', personality: null, controller: 'human', trust: 50, readers: 10, totalReaders: 10, score: 500, lockedVisibleAtMs: null },
        { seatId: 1, displayName: 'P2', paperName: 'Daily Blue', color: 'blue', personality: null, controller: 'bot', trust: 50, readers: 10, totalReaders: 10, score: 500, lockedVisibleAtMs: null },
        { seatId: 2, displayName: 'P3', paperName: 'Daily Green', color: 'green', personality: null, controller: 'bot', trust: 50, readers: 10, totalReaders: 10, score: 500, lockedVisibleAtMs: null },
        { seatId: 3, displayName: 'P4', paperName: 'Daily Red', color: 'red', personality: null, controller: 'bot', trust: 50, readers: 0, totalReaders: 0, score: 0, lockedVisibleAtMs: null },
      ],
      citizens: [
        { id: 0, home: 'r2c3', paper: 0 },
        { id: 1, home: 'r0c1', paper: null },
      ],
    };

    view.syncFromSnapshot(mockSnapshot as PublicSnapshot);
    const citizen0Pos = view.getCitizenPosition(0);
    const expectedPos = view.getNodeWorldPosition('r2c3');
    expect(citizen0Pos.x).toBeCloseTo(expectedPos.x, 2);
    expect(citizen0Pos.z).toBeCloseTo(expectedPos.z, 2);
    expect(view.getCitizenHatColor(0)).toBe(0xd4ac0d); // gold
    expect(view.getCitizenHatColor(1)).toBe(0x7f8c8d); // grey
    expect(view.getOfficeBannerColor(0)).toBe(0xd4ac0d); // gold
    expect(view.getOfficeBannerColor(1)).toBe(0x2980b9); // blue
    expect(view.getOfficeBannerColor(2)).toBe(0x27ae60); // green
    expect(view.getOfficeBannerColor(3)).toBe(0xc0392b); // red
    view.dispose();
  });

  it('resets residual behavior hops and rotations to stand home', () => {
    const container = document.createElement('div');
    const view = createTownView({ container });

    // Manually offset position y and rotations as if mid-hop/walk
    const pos = view.getCitizenPosition(0);
    pos.y = 0.5;

    const mockSnapshot: Partial<PublicSnapshot> = {
      round: 2,
      phase: 'investigate',
      papers: [
        { seatId: 0, displayName: 'P1', paperName: 'Daily Red', color: 'red', personality: null, controller: 'human', trust: 50, readers: 10, totalReaders: 10, score: 500, lockedVisibleAtMs: null },
      ],
      citizens: [
        { id: 0, home: 'r1c1', paper: 0 },
      ],
    };

    view.syncFromSnapshot(mockSnapshot as PublicSnapshot);
    const citizen0Pos = view.getCitizenPosition(0);
    expect(citizen0Pos.y).toBe(0);
    view.dispose();
  });
});
