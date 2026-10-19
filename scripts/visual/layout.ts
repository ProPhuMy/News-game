// Pure layout check for UI captures (owner: Claude). The browser collects a box tree; this decides what is trapped.

export interface Box { left: number; top: number; right: number; bottom: number }

export interface LayoutNode {
  label: string;
  box: Box;
  /** Index of the parent node, or null for the root (#ui-root). */
  parent: number | null;
  control: boolean;
  /** overflow-x / overflow-y is not visible: content outside the box is cut. */
  clipX: boolean;
  clipY: boolean;
  /** overflow-x / overflow-y is auto or scroll: content outside the box can be scrolled into it. */
  scrollX: boolean;
  scrollY: boolean;
}

export interface LayoutProblems {
  /** Elements that stick out of the viewport sideways with no scroll path. */
  overflowX: string[];
  /** Controls that no scrolling can bring into the viewport. */
  unreachable: string[];
}

const SLACK = 1;

/**
 * Walks up from the node: a clipping ancestor that contains the node is fine; one that scrolls brings the node
 * into its own box; one that clips without scrolling hides it. Whatever is left must fit in the viewport.
 * ponytail: position: fixed descendants are treated as clipped by DOM ancestors; fine while no clipping
 * ancestor holds a fixed child (true for this UI).
 */
function reachable(nodes: readonly LayoutNode[], index: number, axis: 'x' | 'y', viewportEnd: number): boolean {
  const span = (b: Box): [number, number] => (axis === 'x' ? [b.left, b.right] : [b.top, b.bottom]);
  const inside = ([lo, hi]: [number, number], [min, max]: [number, number]) => lo >= min - SLACK && hi <= max + SLACK;
  let range = span(nodes[index]!.box);
  for (let a = nodes[index]!.parent; a !== null; a = nodes[a]!.parent) {
    const ancestor = nodes[a]!;
    if (!(axis === 'x' ? ancestor.clipX : ancestor.clipY) || inside(range, span(ancestor.box))) continue;
    if (!(axis === 'x' ? ancestor.scrollX : ancestor.scrollY)) return false;
    range = span(ancestor.box);
  }
  return inside(range, [0, viewportEnd]);
}

export function layoutProblems(nodes: readonly LayoutNode[], viewport: { width: number; height: number }): LayoutProblems {
  const overflowX: string[] = [];
  const unreachable: string[] = [];
  nodes.forEach((node, i) => {
    if (node.box.right - node.box.left === 0 && node.box.bottom - node.box.top === 0) return; // not rendered
    const okX = reachable(nodes, i, 'x', viewport.width);
    if (!okX && !node.control) overflowX.push(node.label);
    if (node.control && (!okX || !reachable(nodes, i, 'y', viewport.height))) unreachable.push(node.label);
  });
  return { overflowX: overflowX.slice(0, 20), unreachable: unreachable.slice(0, 20) };
}
