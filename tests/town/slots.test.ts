import { describe, expect, it } from 'vitest';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createLocationSlots } from '../../src/client/town/slots.ts';

describe('LocationSlots', () => {
  it('computes primary gathering slots in an arc around the location', () => {
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
    expect(dist0).toBeGreaterThan(1);
    expect(dist0).toBeLessThan(6);
  });

  it('computes overflow slots in a concentric outer ring for index >= 8', () => {
    const layout = createTownLayout();
    const slots = createLocationSlots(layout);
    const locPos = layout.getNodeWorldPos(layout.getLocationNode('bank'));

    const primarySlot = slots.getSlotPosition('bank', 2);
    const overflowSlot = slots.getSlotPosition('bank', 10);

    const distPrimary = Math.hypot(primarySlot.x - locPos.x, primarySlot.z - locPos.z);
    const distOverflow = Math.hypot(overflowSlot.x - locPos.x, overflowSlot.z - locPos.z);

    expect(distOverflow).toBeGreaterThan(distPrimary);
  });

  it('computes office slots for newspaper offices', () => {
    const layout = createTownLayout();
    const slots = createLocationSlots(layout);

    const officePos = layout.getNodeWorldPos(layout.getOfficeNode(1));
    const officeSlot0 = slots.getOfficeSlotPosition(1, 0);
    const officeSlot5 = slots.getOfficeSlotPosition(1, 5);

    expect(officeSlot0).not.toEqual(officeSlot5);
    const dist = Math.hypot(officeSlot0.x - officePos.x, officeSlot0.z - officePos.z);
    expect(dist).toBeGreaterThan(1);
  });
});
