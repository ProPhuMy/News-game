import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './ui/screens/AppRouter.tsx';
import { store } from './net/index.ts';
import { mountTown } from './town/index.ts';
import { APPROVED_PALETTE, applyPaletteCssVariables, getPalette } from './visuals/palette.ts';

applyPaletteCssVariables(document.documentElement, getPalette(APPROVED_PALETTE));

const townContainer = document.getElementById('town-canvas-container');
let townCleanup: (() => void) | undefined;
if (townContainer) {
  townCleanup = mountTown(townContainer, store);
  const canvas = townContainer.querySelector('canvas');
  if (canvas) {
    canvas.setAttribute('aria-hidden', 'true');
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    townCleanup?.();
  });
}

const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppRouter store={store} />
    </React.StrictMode>
  );
}
