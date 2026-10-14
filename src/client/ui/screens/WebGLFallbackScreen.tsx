import React from 'react';

export const WebGLFallbackScreen: React.FC = () => {
  return (
    <aside className="webgl-fallback-banner" role="status" data-testid="webgl-fallback">
      <span>3D town view unavailable on this browser. Playing in 2D newsroom mode.</span>
    </aside>
  );
};
