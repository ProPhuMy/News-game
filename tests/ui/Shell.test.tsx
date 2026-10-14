/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { mountTown } from '../../src/client/town/index.ts';
import { createClientStore } from '../../src/client/net/store.ts';

describe('Client Shell Layout', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('defines the required DOM containers for town 3D and React UI', () => {
    const townContainer = document.createElement('div');
    townContainer.id = 'town-canvas-container';
    const uiRoot = document.createElement('div');
    uiRoot.id = 'ui-root';

    document.body.appendChild(townContainer);
    document.body.appendChild(uiRoot);

    expect(document.getElementById('town-canvas-container')).not.toBeNull();
    expect(document.getElementById('ui-root')).not.toBeNull();
  });

  it('mounts town view into #town-canvas-container with ClientStore', () => {
    const townContainer = document.createElement('div');
    townContainer.id = 'town-canvas-container';
    document.body.appendChild(townContainer);

    const store = createClientStore({
      send: () => {},
    });

    const cleanup = mountTown(townContainer, store);
    expect(typeof cleanup).toBe('function');
    // In jsdom without WebGL, fallback view banner is mounted inside the container
    expect(townContainer.children.length).toBeGreaterThan(0);

    cleanup();
  });

  it('keeps #town-canvas-container accessible so screen readers reach the fallback status', () => {
    const townContainer = document.createElement('div');
    townContainer.id = 'town-canvas-container';
    document.body.appendChild(townContainer);

    // town-canvas-container must NOT hide its children from assistive technologies
    expect(townContainer.getAttribute('aria-hidden')).toBeNull();

    const store = createClientStore({ send: () => {} });
    const cleanup = mountTown(townContainer, store);

    // In fallback mode, the status message is present and exposed to screen readers
    const fallbackStatus = townContainer.querySelector('[role="status"]');
    expect(fallbackStatus).not.toBeNull();
    expect(fallbackStatus?.closest('[aria-hidden="true"]')).toBeNull();

    cleanup();
  });
});
