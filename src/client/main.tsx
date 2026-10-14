import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './ui/screens/AppRouter';

const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>
  );
}
