import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPaperboys } from '../../src/client/town/paperboys.ts';
import { createSampleCharacter } from '../../src/client/town/assets/character.ts';
import { PAPERBOY_SPOTS } from '../../src/client/town/props/dressing.ts';
import { fakeContext } from './architecture/fake-context.ts';
vi.mock('../../src/client/town/assets/character.ts', () => ({ createSampleCharacter: vi.fn() }));
describe('decorative paperboys', () => {
  it('fits four static actors in reserved one-unit footprints without logical citizen IDs', async () => {
    const actors = Array.from({ length: 4 }, () => {
      const object = new THREE.Group(); object.add(new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 1.5)));
      return { object, setPaper: vi.fn(), setPose: vi.fn(), dispose: vi.fn() };
    });
    let i = 0; vi.mocked(createSampleCharacter).mockImplementation(async () => actors[i++]!);
    const paperboys = createPaperboys(fakeContext('b'));
    await paperboys.ready;
    expect(paperboys.group.children).toHaveLength(4);
    paperboys.group.children.forEach((child, index) => {
      const spot = PAPERBOY_SPOTS[index]!;
      expect(child.position.toArray()).toEqual([spot.x, 0, spot.z]);
      expect(child.rotation.y).toBe(spot.rotationY);
      const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
      expect(size.x).toBeLessThanOrEqual(1.00001); expect(size.z).toBeLessThanOrEqual(1.00001);
      expect(actors[index]!.setPose).toHaveBeenCalledWith('idle', 0, true);
    });
    paperboys.dispose(); paperboys.dispose();
    for (const actor of actors) expect(actor.dispose).toHaveBeenCalledTimes(1);
  });
});
