import { describe, expect, it } from 'vitest';
import { createTownLayout } from '../../src/client/town/layout.ts';
import { createRouteInterpolator } from '../../src/client/town/movement.ts';

describe('Route Interpolator', () => {
  it('interpolates along a multi-node route from start to end', () => {
    const layout = createTownLayout();
    const interpolator = createRouteInterpolator(layout);

    const route = ['r0c0', 'r0c1', 'r0c2'];
    const startNode = layout.getNodeWorldPos('r0c0');
    const midNode = layout.getNodeWorldPos('r0c1');
    const endNode = layout.getNodeWorldPos('r0c2');

    // Progress 0 = start
    const at0 = interpolator.interpolateRoute(route, 0);
    expect(at0.position.x).toBeCloseTo(startNode.x, 2);
    expect(at0.position.z).toBeCloseTo(startNode.z, 2);

    // Progress 0.5 = midpoint
    const atHalf = interpolator.interpolateRoute(route, 0.5);
    expect(atHalf.position.x).toBeCloseTo(midNode.x, 2);
    expect(atHalf.position.z).toBeCloseTo(midNode.z, 2);

    // Progress 1 = end
    const at1 = interpolator.interpolateRoute(route, 1.0);
    expect(at1.position.x).toBeCloseTo(endNode.x, 2);
    expect(at1.position.z).toBeCloseTo(endNode.z, 2);
  });

  it('computes forward heading angle along the movement segment', () => {
    const layout = createTownLayout();
    const interpolator = createRouteInterpolator(layout);

    // Moving along positive X (r0c0 -> r0c1)
    const routeX = ['r0c0', 'r0c1'];
    const stateX = interpolator.interpolateRoute(routeX, 0.3);
    // Heading should be oriented towards +X (approx Math.PI / 2)
    expect(stateX.headingAngle).toBeCloseTo(Math.PI / 2, 2);
  });

  it('handles single-node route smoothly without errors', () => {
    const layout = createTownLayout();
    const interpolator = createRouteInterpolator(layout);

    const route = ['r2c2'];
    const state = interpolator.interpolateRoute(route, 0.5);
    const center = layout.getNodeWorldPos('r2c2');

    expect(state.position.x).toBeCloseTo(center.x, 2);
    expect(state.position.z).toBeCloseTo(center.z, 2);
  });

  it('interpolates route towards destination slot offset along final segment', () => {
    const layout = createTownLayout();
    const interpolator = createRouteInterpolator(layout);

    const route = ['r0c0', 'r0c1'];
    const slotOffset = { x: 1.5, z: 2.0 };
    const endNode = layout.getNodeWorldPos('r0c1');

    const endState = interpolator.interpolateRoute(route, 1.0, undefined, slotOffset);
    expect(endState.position.x).toBeCloseTo(endNode.x + 1.5, 2);
    expect(endState.position.z).toBeCloseTo(endNode.z + 2.0, 2);
  });

  it('safely skips unknown route nodes without crashing interpolation', () => {
    const layout = createTownLayout();
    const interpolator = createRouteInterpolator(layout);

    const route = ['r0c0', 'invalid_middle_node', 'r0c1'];
    expect(() => interpolator.interpolateRoute(route, 0.5)).not.toThrow();
    const state = interpolator.interpolateRoute(route, 1.0);
    const endNode = layout.getNodeWorldPos('r0c1');
    expect(state.position.x).toBeCloseTo(endNode.x, 2);
    expect(state.position.z).toBeCloseTo(endNode.z, 2);
  });
});
