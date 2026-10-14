import * as THREE from 'three';

export interface ActiveBubble {
  id: number;
  citizenId: number;
  element: HTMLElement;
  getAnchorPos: (out?: THREE.Vector3) => THREE.Vector3;
  timerId: ReturnType<typeof setTimeout> | null;
}

export interface BubbleManager {
  showBubble(
    citizenId: number,
    text: string,
    getAnchorPos: (out?: THREE.Vector3) => THREE.Vector3,
    durationMs?: number,
  ): void;
  update(): void;
  getVisibleBubbleCount(): number;
  clear(): void;
  dispose(): void;
}

const MAX_VISIBLE_BUBBLES = 6;
const MAX_TEXT_LENGTH = 60;
const DEFAULT_DURATION_MS = 4000;

export function createBubbleManager(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
): BubbleManager {
  const overlay = document.createElement('div');
  overlay.className = 'town-speech-bubbles-overlay';
  overlay.style.cssText =
    'position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
    'pointer-events: none; overflow: hidden; z-index: 10;';
  container.appendChild(overlay);

  const activeBubbles: ActiveBubble[] = [];
  const scratchPos = new THREE.Vector3();
  let nextBubbleId = 1;

  function removeBubble(bubble: ActiveBubble): void {
    if (bubble.timerId !== null) {
      clearTimeout(bubble.timerId);
      bubble.timerId = null;
    }
    if (bubble.element.parentElement === overlay) {
      overlay.removeChild(bubble.element);
    }
    const idx = activeBubbles.indexOf(bubble);
    if (idx !== -1) {
      activeBubbles.splice(idx, 1);
    }
  }

  function enforceMaxBubbles(): void {
    while (activeBubbles.length > MAX_VISIBLE_BUBBLES) {
      const oldest = activeBubbles[0];
      if (oldest) {
        removeBubble(oldest);
      } else {
        break;
      }
    }
  }

  return {
    showBubble(
      citizenId: number,
      text: string,
      getAnchorPos: () => THREE.Vector3,
      durationMs = DEFAULT_DURATION_MS,
    ): void {
      const clampedText = text.trim().slice(0, MAX_TEXT_LENGTH);
      if (!clampedText) {
        return;
      }

      // Evict any existing bubble for the same citizen
      for (let i = activeBubbles.length - 1; i >= 0; i--) {
        const b = activeBubbles[i];
        if (b && b.citizenId === citizenId) {
          removeBubble(b);
        }
      }

      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'speech-bubble';
      bubbleEl.textContent = clampedText;
      bubbleEl.style.cssText =
        'position: absolute; padding: 6px 10px; background: rgba(255, 255, 255, 0.95); ' +
        'color: #1a1a1a; font-family: sans-serif; font-size: 12px; font-weight: 500; ' +
        'border-radius: 8px; border: 1px solid #c8c8c8; box-shadow: 0 2px 6px rgba(0,0,0,0.18); ' +
        'white-space: nowrap; max-width: 220px; text-overflow: ellipsis; overflow: hidden; ' +
        'pointer-events: none; transition: opacity 0.2s ease;';

      overlay.appendChild(bubbleEl);

      const bubble: ActiveBubble = {
        id: nextBubbleId++,
        citizenId,
        element: bubbleEl,
        getAnchorPos,
        timerId: null,
      };

      bubble.timerId = setTimeout(() => {
        removeBubble(bubble);
      }, durationMs);

      activeBubbles.push(bubble);
      enforceMaxBubbles();
    },

    update(): void {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      for (let i = 0; i < activeBubbles.length; i++) {
        const bubble = activeBubbles[i];
        if (!bubble) {
          continue;
        }

        const returned = bubble.getAnchorPos(scratchPos);
        if (returned && returned !== scratchPos) {
          scratchPos.copy(returned);
        }
        scratchPos.y += 1.6; // Position above head

        scratchPos.project(camera);

        if (scratchPos.z > 1.0) {
          bubble.element.style.display = 'none';
        } else {
          bubble.element.style.display = 'block';
          const screenX = (scratchPos.x * 0.5 + 0.5) * width;
          const screenY = (-(scratchPos.y * 0.5) + 0.5) * height;
          bubble.element.style.transform = `translate(-50%, -100%) translate(${screenX}px, ${screenY}px)`;
        }
      }
    },

    getVisibleBubbleCount(): number {
      return activeBubbles.length;
    },

    clear(): void {
      while (activeBubbles.length > 0) {
        const b = activeBubbles[0];
        if (b) {
          removeBubble(b);
        } else {
          break;
        }
      }
    },

    dispose(): void {
      this.clear();
      if (overlay.parentElement === container) {
        container.removeChild(overlay);
      }
    },
  };
}
