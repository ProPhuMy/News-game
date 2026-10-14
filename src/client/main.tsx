import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './ui/screens/AppRouter.tsx';
import { store } from './net/index.ts';
import { mountTown } from './town/index.ts';

const townContainer = document.getElementById('town-canvas-container');
if (townContainer) {
  mountTown(townContainer, store);
}

store.connect();

const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppRouter store={store} />
    </React.StrictMode>
  );
}
