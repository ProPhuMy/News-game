import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createTownEnvironment } from '../../src/client/town/environment.ts';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { fakeContext } from './architecture/fake-context.ts';

it('uses palette kit materials and disposes only owned geometry', () => {
  const ctx = fakeContext('b');
  const environment = createTownEnvironment(createTownLayout(), ctx);
  const ground = environment.getObjectByName('ground') as THREE.Mesh;
  expect(ground.material).toBe(ctx.materials.surface(ctx.palette.town.ground));
  const geometryDispose = vi.spyOn(ground.geometry, 'dispose');
  const materialDispose = vi.spyOn(ground.material as THREE.Material, 'dispose');
  environment.dispose(); environment.dispose();
  expect(geometryDispose).toHaveBeenCalledTimes(1);
  expect(materialDispose).not.toHaveBeenCalled();
});
