import { describe, expect, it } from 'vitest';
import { layoutProblems, type LayoutNode } from '../../scripts/visual/layout.ts';

const viewport = { width: 400, height: 800 };
type Partial = Omit<LayoutNode, 'clipX' | 'clipY' | 'scrollX' | 'scrollY' | 'control'> & Partial2;
type Partial2 = { clipX?: boolean; clipY?: boolean; scrollX?: boolean; scrollY?: boolean; control?: boolean };
const node = (n: Partial): LayoutNode => ({ clipX: false, clipY: false, scrollX: false, scrollY: false, control: false, ...n });
const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
const root = node({ label: 'root', box: box(0, 0, 400, 800), parent: null });

describe('layoutProblems', () => {
  it('accepts a control below the fold of a scroll panel that sits inside the viewport', () => {
    const nodes = [root,
      node({ label: 'panel', box: box(0, 400, 400, 800), parent: 0, clipY: true, scrollY: true, clipX: true, scrollX: true }),
      node({ label: 'button "Play Again"', box: box(10, 900, 200, 940), parent: 1, control: true })];
    expect(layoutProblems(nodes, viewport)).toEqual({ overflowX: [], unreachable: [] });
  });

  it('rejects a control whose scroll panel itself runs past the viewport', () => {
    const nodes = [root,
      node({ label: 'panel', box: box(0, 400, 400, 1200), parent: 0, clipY: true, scrollY: true }),
      node({ label: 'button "Play Again"', box: box(10, 1100, 200, 1140), parent: 1, control: true })];
    expect(layoutProblems(nodes, viewport).unreachable).toEqual(['button "Play Again"']);
  });

  it('rejects a control cut off by a clipping ancestor that cannot scroll', () => {
    const nodes = [root,
      node({ label: 'card', box: box(0, 0, 300, 300), parent: 0, clipY: true, clipX: true }),
      node({ label: 'button "Join"', box: box(10, 320, 100, 350), parent: 1, control: true })];
    expect(layoutProblems(nodes, viewport).unreachable).toEqual(['button "Join"']);
  });

  it('reports any element wider than the viewport with no scroll container, even text', () => {
    const nodes = [root, node({ label: 'section.results-card', box: box(0, 0, 600, 300), parent: 0 })];
    expect(layoutProblems(nodes, viewport).overflowX).toEqual(['section.results-card']);
  });

  it('accepts a wide table inside a sideways scroll container that fits the viewport', () => {
    const nodes = [root,
      node({ label: 'div.scoreboard-scroll', box: box(0, 0, 400, 300), parent: 0, clipX: true, scrollX: true }),
      node({ label: 'table', box: box(0, 0, 544, 300), parent: 1 })];
    expect(layoutProblems(nodes, viewport)).toEqual({ overflowX: [], unreachable: [] });
  });

  it('skips elements without a box (display: none or inside a closed details)', () => {
    const nodes = [root,
      node({ label: 'aside', box: box(8, 60, 392, 200), parent: 0, clipX: true, clipY: true }),
      node({ label: 'h2.panel-title', box: box(0, 0, 0, 0), parent: 1 }),
      node({ label: 'button "Hidden"', box: box(0, 0, 0, 0), parent: 1, control: true })];
    expect(layoutProblems(nodes, viewport)).toEqual({ overflowX: [], unreachable: [] });
  });
});
