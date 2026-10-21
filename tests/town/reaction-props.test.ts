import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createReactionProps } from '../../src/client/town/reaction-props.ts';
import { createCitizenManager } from '../../src/client/town/citizens.ts';
import { fakeContext } from './architecture/fake-context.ts';

describe('reaction signs', () => {
  it('reuses one clone per citizen, detaches between rounds and disposes owned resources once', () => {
    const citizens = createCitizenManager();
    const ctx = fakeContext();
    const props = createReactionProps(ctx, citizens);
    props.showSign(0); props.showSign(0); props.showSign(1);
    const root = citizens.getCitizen(0).mesh;
    expect(root.children.filter(c => c.name.startsWith('picket-'))).toHaveLength(1);
    const sign = root.children.find(c => c.name.startsWith('picket-'))!;
    const dispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    props.clear(); expect(sign.parent).toBeNull();
    props.showSign(0);
    expect(root.children).toContain(sign);
    props.dispose();
    expect(sign.parent).toBeNull();
    const count = dispose.mock.calls.length;
    expect(count).toBeGreaterThan(0);
    props.dispose();
    expect(dispose).toHaveBeenCalledTimes(count);
    dispose.mockRestore(); citizens.dispose();
  });
});
