import { describe, expect, it } from 'vitest';
import { closeTarget } from '../../src/client/visual-test/architecture-town.ts';
import { ARCHITECTURE_VIEWS } from '../../src/client/visual-test/architecture-scenario.ts';
import { createTownBuildings } from '../../src/client/town/buildings.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { fakeContext } from '../town/architecture/fake-context.ts';

describe('closeTarget', () => {
  it('resolves every close-up view to a distinct position in the assembled town', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    const views = ARCHITECTURE_VIEWS.filter((v) => !['street', 'awning', 'town'].includes(v));
    const keys = views.map((v) => closeTarget(town.group, v as Parameters<typeof closeTarget>[1], layout).toArray().join(','));
    expect(views).toHaveLength(6);
    expect(new Set(keys).size).toBe(views.length);
    town.dispose();
  });

  it('throws a clear error when the root is missing', () => {
    const layout = createTownLayout();
    const town = createTownBuildings(layout, fakeContext());
    town.group.clear();
    expect(() => closeTarget(town.group, 'bank', layout)).toThrow(/no building root named "bank"/);
    town.dispose();
  });
});
