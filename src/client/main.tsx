import React from 'react';
import { createRoot } from 'react-dom/client';

export const AppRoot: React.FC = () => {
  return (
    <div className="news-town-app" data-testid="news-town-app">
      {/* Screens and overlays mounted here */}
    </div>
  );
};

const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppRoot />
    </React.StrictMode>
  );
}
