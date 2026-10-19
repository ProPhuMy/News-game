// Location building factory (owner: Claude): one entry point mapping each location to its code-built piece.
import type { LocationBuildingFactory } from '../../visuals/town-types.ts';
import { createBakery } from './bakery.ts';
import { createBank } from './bank.ts';
import { createClinic } from './clinic.ts';
import { createFountainSquare } from './fountain.ts';
import { createTownHall } from './town-hall.ts';

export const createLocationBuilding: LocationBuildingFactory = (location, ctx) => {
  switch (location) {
    case 'bakery': return createBakery(ctx);
    case 'bank': return createBank(ctx);
    case 'town_hall': return createTownHall(ctx);
    case 'clinic': return createClinic(ctx);
    case 'fountain_square': return createFountainSquare(ctx);
    default:
      throw new Error(`unknown location "${location satisfies never}"`);
  }
};
