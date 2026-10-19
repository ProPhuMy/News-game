// Prop factory (owner: Claude): one entry point for every sample prop kind (presentation-interface note §3).
import type { PropFactory } from '../../visuals/town-types.ts';
import { createNatureProp, type NatureKind } from './nature.ts';
import { createBench, createCart, createFlowerBox, createGasLamp, createNewsstand } from './street.ts';

export const PROP_KINDS = ['gas-lamp', 'newsstand', 'bench', 'cart', 'flower-box', 'tree-oak', 'tree-round', 'bush', 'flowers'] as const;
export type PropKind = (typeof PROP_KINDS)[number];

export const createProp: PropFactory = (kind, ctx) => {
  switch (kind) {
    case 'gas-lamp': return createGasLamp(ctx);
    case 'newsstand': return createNewsstand(ctx);
    case 'bench': return createBench(ctx);
    case 'cart': return createCart(ctx);
    case 'flower-box': return createFlowerBox(ctx);
    case 'tree-oak':
    case 'tree-round':
    case 'bush':
    case 'flowers':
      return createNatureProp(kind satisfies NatureKind, ctx);
    default:
      throw new Error(`unknown prop kind "${kind}"`);
  }
};
