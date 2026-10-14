import { describe, expect, it } from 'vitest';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createLocationSlots, getGatheringSlotOffset } from '../../src/client/town/slots.ts';

describe('LocationSlots', () => {
  it('computes gathering slots starting at center and expanding into concentric rings', () => {
    const layout = createTownLayout();
    const slots = createLocationSlots(layout);

    const slot0 = slots.getSlotPosition('bakery', 0);
    const slot1 = slots.getSlotPosition('bakery', 1);

    expect(slot0).toBeDefined();
    expect(slot1).toBeDefined();
    expect(slot0).not.toEqual(slot1);
    expect(slot0.y).toBe(0);
    expect(slot1.y).toBe(0);

    const locPos = layout.getNodeWorldPos(layout.getLocationNode('bakery'));
    const dist0 = Math.hypot(slot0.x - locPos.x, slot0.z - locPos.z);
    expect(dist0).toBeCloseTo(0, 2);

    const dist1 = Math.hypot(slot1.x - locPos.x, slot1.z - locPos.z);
    expect(dist1).toBeCloseTo(0.9, 2);
  });

  it('computes slots across concentric rings with increasing radii', () => {
    const layout = createTownLayout();
    const slots = createLocationSlots(layout);
    const locPos = layout.getNodeWorldPos(layout.getLocationNode('bank'));

    const ring1Slot = slots.getSlotPosition('bank', 2);
    const ring2Slot = slots.getSlotPosition('bank', 10);
    const ring3Slot = slots.getSlotPosition('bank', 20);

    const distRing1 = Math.hypot(ring1Slot.x - locPos.x, ring1Slot.z - locPos.z);
    const distRing2 = Math.hypot(ring2Slot.x - locPos.x, ring2Slot.z - locPos.z);
    const distRing3 = Math.hypot(ring3Slot.x - locPos.x, ring3Slot.z - locPos.z);

    expect(distRing1).toBeCloseTo(0.9, 2);
    expect(distRing2).toBeCloseTo(1.7, 2);
    expect(distRing3).toBeCloseTo(2.5, 2);
    expect(distRing2).toBeGreaterThan(distRing1);
    expect(distRing3).toBeGreaterThan(distRing2);
  });

  it('computes office slots for newspaper offices', () => {
    const layout = createTownLayout();
    const slots = createLocationSlots(layout);

    const officePos = layout.getNodeWorldPos(layout.getOfficeNode(1));
    const officeSlot0 = slots.getOfficeSlotPosition(1, 0);
    const officeSlot5 = slots.getOfficeSlotPosition(1, 5);

    expect(officeSlot0).not.toEqual(officeSlot5);
    const dist0 = Math.hypot(officeSlot0.x - officePos.x, officeSlot0.z - officePos.z);
    expect(dist0).toBeCloseTo(0, 2);

    const dist5 = Math.hypot(officeSlot5.x - officePos.x, officeSlot5.z - officePos.z);
    expect(dist5).toBeCloseTo(0.9, 2);
  });

  it('provides distinct and non-overlapping slot offsets for all 30 citizens', () => {
    const offsets: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 30; i++) {
      offsets.push(getGatheringSlotOffset(i));
    }
    expect(offsets.length).toBe(30);
    for (let i = 0; i < 30; i++) {
      for (let j = i + 1; j < 30; j++) {
        const a = offsets[i];
        const b = offsets[j];
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        if (!a || !b) continue;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist = Math.hypot(dx, dz);
        expect(dist).toBeGreaterThanOrEqual(0.35); // minimum separation
      }
    }
  });

  it('places slots across defined rings: center, ring 1 (0.9m), ring 2 (1.7m), ring 3 (2.5m)', () => {
    // Index 0: center
    const center = getGatheringSlotOffset(0);
    expect(center.x).toBe(0);
    expect(center.z).toBe(0);

    // Indices 1..6: Ring 1 (radius 0.9m, 6 slots)
    for (let i = 1; i <= 6; i++) {
      const offset = getGatheringSlotOffset(i);
      const r = Math.hypot(offset.x, offset.z);
      expect(r).toBeCloseTo(0.9, 2);
    }

    // Indices 7..16: Ring 2 (radius 1.7m, 10 slots)
    for (let i = 7; i <= 16; i++) {
      const offset = getGatheringSlotOffset(i);
      const r = Math.hypot(offset.x, offset.z);
      expect(r).toBeCloseTo(1.7, 2);
    }

    // Indices 17..30: Ring 3 (radius 2.5m, 14 slots)
    for (let i = 17; i <= 30; i++) {
      const offset = getGatheringSlotOffset(i);
      const r = Math.hypot(offset.x, offset.z);
      expect(r).toBeCloseTo(2.5, 2);
    }
  });

  it('maintains >= 0.35m separation across all 31 distinct slots (indices 0..30)', () => {
    const offsets: Array<{ x: number; z: number }> = [];
    for (let i = 0; i <= 30; i++) {
      offsets.push(getGatheringSlotOffset(i));
    }
    expect(offsets.length).toBe(31);
    for (let i = 0; i < offsets.length; i++) {
      for (let j = i + 1; j < offsets.length; j++) {
        const a = offsets[i];
        const b = offsets[j];
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        if (!a || !b) continue;
        const dist = Math.hypot(a.x - b.x, a.z - b.z);
        expect(dist).toBeGreaterThanOrEqual(0.35);
      }
    }
  });

  it('handles overflow indices beyond 30 without colliding or returning NaN', () => {
    const slot31 = getGatheringSlotOffset(31);
    const r31 = Math.hypot(slot31.x, slot31.z);
    expect(Number.isFinite(slot31.x)).toBe(true);
    expect(Number.isFinite(slot31.z)).toBe(true);
    expect(r31).toBeGreaterThan(2.5); // Outer ring beyond Ring 3
  });
});
