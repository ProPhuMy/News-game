import { APPROVED_PALETTE, getPalette } from '../visuals/palette.ts';

export function isWebGL2Supported(
  canvasOrDoc?: HTMLCanvasElement | Document,
): boolean {
  try {
    let canvas: HTMLCanvasElement | null = null;
    if (typeof HTMLCanvasElement !== 'undefined' && canvasOrDoc instanceof HTMLCanvasElement) {
      canvas = canvasOrDoc;
    } else {
      const doc = (canvasOrDoc as Document) ?? (typeof document !== 'undefined' ? document : null);
      if (!doc) {
        return false;
      }
      canvas = doc.createElement('canvas');
    }
    const gl = canvas.getContext('webgl2');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function checkWebGLSupport(
  customDocument?: Document,
): boolean {
  return isWebGL2Supported(customDocument);
}

export interface FallbackView {
  element: HTMLElement;
  dispose: () => void;
}

export function createFallbackView(
  container: HTMLElement,
  onRetry?: () => void,
): FallbackView {
  const palette = getPalette(APPROVED_PALETTE).ui;
  const root = document.createElement('div');
  root.setAttribute('role', 'status');
  root.className = 'town-fallback-container';
  root.style.cssText =
    'box-sizing: border-box; display: flex; flex-direction: column; align-items: center; ' +
    'height: auto; width: 100%; padding: 12px 16px; text-align: center; ' +
    `background-color: var(--nt-paper, ${palette.paper}); color: var(--nt-ink, ${palette.ink}); ` +
    'font-family: var(--font-body, sans-serif);';

  const heading = document.createElement('h3');
  heading.textContent = '3D town view unavailable in this browser';
  heading.style.cssText = 'margin: 0 0 8px; font-size: 1.25rem; font-weight: 600;';
  root.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent =
    'The 3D view could not be initialized, but the match is fully playable via the game panels. ' +
    'All headlines, investigations, and scores update normally.';
  desc.style.cssText = 'max-width: 48rem; margin: 0; line-height: 1.4;';
  root.appendChild(desc);

  if (onRetry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Retry 3D Town';
    button.style.cssText =
      `margin-top: 12px; min-height: 44px; padding: 8px 16px; border-radius: 4px; border: 1px solid ${palette.border}; ` +
      `background-color: var(--nt-panel, ${palette.panel}); color: inherit; cursor: pointer; font-weight: 500;`;
    button.addEventListener('click', onRetry);
    root.appendChild(button);
  }

  container.appendChild(root);

  const property = '--nt-town-fallback-height';
  const style = document.documentElement.style;
  const previous = style.getPropertyValue(property);
  const priority = style.getPropertyPriority(property);
  let disposed = false;
  const publishHeight = () => {
    if (!disposed) style.setProperty(property, `${Math.ceil(root.getBoundingClientRect().height)}px`);
  };
  publishHeight();
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publishHeight);
  if (observer) observer.observe(root);
  else window.addEventListener('resize', publishHeight);

  return {
    element: root,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      window.removeEventListener('resize', publishHeight);
      if (previous) style.setProperty(property, previous, priority);
      else style.removeProperty(property);
      if (root.parentElement === container) {
        container.removeChild(root);
      }
    },
  };
}

export interface ContextLossHandlers {
  onLost?: (event: Event) => void;
  onRestore?: () => void;
}

export function attachContextLossHandler(
  canvas: HTMLCanvasElement,
  onLostOrHandlersOrRestore?:
    | ((event: Event) => void)
    | ContextLossHandlers
    | (() => void),
  maybeRestore?: () => void,
): () => void {
  let lostCb: ((event: Event) => void) | undefined;
  let restoreCb: (() => void) | undefined;

  if (typeof onLostOrHandlersOrRestore === 'object' && onLostOrHandlersOrRestore !== null) {
    lostCb = onLostOrHandlersOrRestore.onLost;
    restoreCb = onLostOrHandlersOrRestore.onRestore;
  } else if (typeof onLostOrHandlersOrRestore === 'function') {
    if (typeof maybeRestore === 'function') {
      lostCb = onLostOrHandlersOrRestore;
      restoreCb = maybeRestore;
    } else {
      // Single function argument: treat as restore callback (backward compatibility)
      restoreCb = onLostOrHandlersOrRestore as () => void;
    }
  }

  const handleLost = (event: Event): void => {
    event.preventDefault();
    lostCb?.(event);
  };

  const handleRestored = (): void => {
    restoreCb?.();
  };

  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost, false);
    canvas.removeEventListener('webglcontextrestored', handleRestored, false);
  };
}
