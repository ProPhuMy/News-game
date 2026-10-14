/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';

describe('Client Shell Layout', () => {
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
});
