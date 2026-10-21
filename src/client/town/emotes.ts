import * as THREE from 'three';
import type { ReactionPlan } from '../../shared/snapshots.ts';
import { EMOTE_FOR_BEHAVIOR, MAX_VISIBLE_EMOTES, type Emote } from '../visuals/emotes.ts';
import type { PresentationPalette } from '../visuals/palette.ts';
import { CITIZEN_REFERENCE_HEIGHT } from './architecture/piece.ts';

export function selectEmoteActors(plan: ReactionPlan, destinations?: readonly string[]): readonly number[] {
  const groups = new Map<string, number[]>();
  plan.citizens.forEach((actor, i) => {
    if (!EMOTE_FOR_BEHAVIOR[actor.behavior]) return;
    const node = destinations?.[i] ?? actor.route.at(-1) ?? '';
    const group = groups.get(node) ?? [];
    group.push(actor.citizenId); groups.set(node, group);
  });
  const selected: number[] = [];
  for (let layer = 0; selected.length < MAX_VISIBLE_EMOTES; layer++) {
    let found = false;
    for (const group of groups.values()) {
      const id = group[layer];
      if (id === undefined) continue;
      found = true; selected.push(id);
      if (selected.length === MAX_VISIBLE_EMOTES) break;
    }
    if (!found) break;
  }
  return selected;
}

export function createEmoteManager(container: HTMLElement, camera: THREE.PerspectiveCamera, palette: PresentationPalette) {
  const overlay = document.createElement('div');
  overlay.className = 'town-emotes';
  overlay.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;';
  container.appendChild(overlay);
  const active = new Map<number, { element: HTMLElement; anchor: () => THREE.Vector3 }>();
  const scratch = new THREE.Vector3();
  let disposed = false;
  function clear(): void { active.clear(); overlay.replaceChildren(); }
  return {
    show(id: number, emote: Emote, anchor: () => THREE.Vector3): void {
      if (disposed || active.has(id) || active.size >= MAX_VISIBLE_EMOTES) return;
      const element = document.createElement('span');
      element.className = 'town-emote';
      element.textContent = emote === 'anger' ? '💢' : emote;
      element.setAttribute('aria-label', emote === 'anger' ? 'Angry' : emote);
      element.style.cssText = `position:absolute;font:700 18px sans-serif;line-height:24px;width:26px;height:26px;box-sizing:border-box;text-align:center;border-radius:50%;background:${palette.ui.paper};color:${palette.ui.ink};border:1px solid ${palette.ui.border};`;
      overlay.appendChild(element); active.set(id, { element, anchor });
    },
    update(): void {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;
      const containerBox = container.getBoundingClientRect();
      const occupied = [...container.querySelectorAll<HTMLElement>('.speech-bubble')]
        .filter(element => element.style.display !== 'none')
        .map(element => element.getBoundingClientRect())
        .filter(box => box.width > 0 && box.height > 0)
        .map(box => ({ left: box.left - containerBox.left, right: box.right - containerBox.left,
          top: box.top - containerBox.top, bottom: box.bottom - containerBox.top }));
      for (const { element, anchor } of active.values()) {
        scratch.copy(anchor()); scratch.y += CITIZEN_REFERENCE_HEIGHT + 0.65;
        scratch.project(camera);
        element.style.display = 'none';
        if (Math.abs(scratch.x) > 1 || Math.abs(scratch.y) > 1 || Math.abs(scratch.z) > 1) continue;
        const x = (scratch.x + 1) * width / 2 - 13;
        const y = (1 - scratch.y) * height / 2 - 26;
        // Bounded rings keep icons near their actors; crowded/outside icons may remain hidden.
        let placed = false;
        for (let ring = 0; ring <= 3 && !placed; ring++) {
          for (let dy = -ring; dy <= ring && !placed; dy++) for (let dx = -ring; dx <= ring && !placed; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            const left = x + dx * 28; const top = y + dy * 28;
            const right = left + 26; const bottom = top + 26;
            if (left < 4 || top < 4 || right > width - 4 || bottom > height - 4) continue;
            if (occupied.some(box => left < box.right + 2 && right > box.left - 2 && top < box.bottom + 2 && bottom > box.top - 2)) continue;
            occupied.push({ left, right, top, bottom });
            element.style.display = 'block';
            element.style.transform = `translate(${left}px,${top}px)`;
            placed = true;
          }
        }
      }
    },
    setVisible(visible: boolean): void { overlay.style.display = visible ? '' : 'none'; },
    clear,
    dispose(): void { disposed = true; clear(); overlay.remove(); },
  };
}
