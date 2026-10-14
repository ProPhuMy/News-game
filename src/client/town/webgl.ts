export function checkWebGLSupport(
  customDocument?: Document,
): boolean {
  try {
    const doc = customDocument ?? (typeof document !== 'undefined' ? document : null);
    if (!doc) {
      return false;
    }
    const canvas = doc.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export interface FallbackView {
  element: HTMLElement;
  dispose: () => void;
}

export function createFallbackView(
  container: HTMLElement,
  onRetry?: () => void,
): FallbackView {
  const root = document.createElement('div');
  root.setAttribute('role', 'status');
  root.className = 'town-fallback-container';
  root.style.cssText =
    'display: flex; flex-direction: column; align-items: center; justify-content: center; ' +
    'height: 100%; width: 100%; padding: 24px; text-align: center; ' +
    'background-color: #f7f3ea; color: #2b2b2b; font-family: sans-serif;';

  const heading = document.createElement('h3');
  heading.textContent = '3D town view unavailable in this browser';
  heading.style.cssText = 'margin-bottom: 8px; font-size: 1.25rem; font-weight: 600;';
  root.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent =
    'The 3D view could not be initialized, but the match is fully playable via the game panels. ' +
    'All headlines, investigations, and scores update normally.';
  desc.style.cssText = 'max-width: 480px; margin-bottom: 16px; line-height: 1.4; color: #4a4a4a;';
  root.appendChild(desc);

  if (onRetry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Retry 3D Town';
    button.style.cssText =
      'padding: 8px 16px; border-radius: 4px; border: 1px solid #c2b8a3; ' +
      'background-color: #ffffff; cursor: pointer; font-weight: 500;';
    button.addEventListener('click', onRetry);
    root.appendChild(button);
  }

  container.appendChild(root);

  return {
    element: root,
    dispose: () => {
      if (root.parentElement === container) {
        container.removeChild(root);
      }
    },
  };
}

export function attachContextLossHandler(
  canvas: HTMLCanvasElement,
  onRestore?: () => void,
): () => void {
  const handleLost = (event: Event): void => {
    event.preventDefault();
  };

  const handleRestored = (): void => {
    onRestore?.();
  };

  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost, false);
    canvas.removeEventListener('webglcontextrestored', handleRestored, false);
  };
}
