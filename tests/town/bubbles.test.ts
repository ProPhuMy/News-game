// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createBubbleManager } from '../../src/client/town/bubbles.ts';

describe('Speech Bubble Manager', () => {
  it('displays speech bubbles anchored to 3D positions with 60-character clamp', () => {
    const container = document.createElement('div');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const bubbleMgr = createBubbleManager(container, camera);

    const longText = 'This is an extremely long citizen reaction speech bubble that definitely exceeds sixty characters!';
    bubbleMgr.showBubble(0, longText, () => new THREE.Vector3(0, 1.5, 0));

    expect(bubbleMgr.getVisibleBubbleCount()).toBe(1);
    const bubbleEl = container.querySelector('.speech-bubble');
    expect(bubbleEl).not.toBeNull();
    expect(bubbleEl?.textContent?.length).toBeLessThanOrEqual(60);

    bubbleMgr.dispose();
  });

  it('enforces invariant of at most 6 bubbles on screen simultaneously', () => {
    const container = document.createElement('div');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const bubbleMgr = createBubbleManager(container, camera);

    // Show 8 bubbles
    for (let i = 0; i < 8; i++) {
      bubbleMgr.showBubble(i, `Bubble text ${i}`, () => new THREE.Vector3(i, 1.5, 0));
    }

    // Must be capped at 6
    expect(bubbleMgr.getVisibleBubbleCount()).toBe(6);
    expect(container.querySelectorAll('.speech-bubble').length).toBe(6);

    // Oldest bubble (0 and 1) should have been evicted
    const texts = Array.from(container.querySelectorAll('.speech-bubble')).map((el) => el.textContent);
    expect(texts).not.toContain('Bubble text 0');
    expect(texts).not.toContain('Bubble text 1');
    expect(texts).toContain('Bubble text 7');

    bubbleMgr.dispose();
  });

  it('clears all bubbles immediately on clear()', () => {
    const container = document.createElement('div');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const bubbleMgr = createBubbleManager(container, camera);

    bubbleMgr.showBubble(1, 'Hello town', () => new THREE.Vector3(0, 1.5, 0));
    bubbleMgr.showBubble(2, 'What a scandal', () => new THREE.Vector3(2, 1.5, 0));
    expect(bubbleMgr.getVisibleBubbleCount()).toBe(2);

    bubbleMgr.clear();
    expect(bubbleMgr.getVisibleBubbleCount()).toBe(0);
    expect(container.querySelectorAll('.speech-bubble').length).toBe(0);

    bubbleMgr.dispose();
  });

  it('positions bubble correctly when anchor callback returns a new Vector3 without mutating out', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 100);
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 4, 0);
    camera.updateMatrixWorld();

    const bubbleMgr = createBubbleManager(container, camera);

    // Callback returns its own vector and does not mutate out
    bubbleMgr.showBubble(1, 'Callback returning vector', () => new THREE.Vector3(5, 0, 0));
    bubbleMgr.update();

    const bubbleEl = container.querySelector('.speech-bubble') as HTMLElement;
    expect(bubbleEl).not.toBeNull();
    // At x=5 with camera at (0, 4, 10), projected screenX will be significantly greater than 400 (center of 800px width)
    expect(bubbleEl.style.transform).toContain('px');
    const match = bubbleEl.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    expect(match).not.toBeNull();
    const screenX = parseFloat(match?.[1] ?? '0');
    expect(screenX).toBeGreaterThan(450);

    bubbleMgr.dispose();
  });
});

it('expires on the frame clock and places text above the approved body and cap', () => {
  const container = document.createElement('div');
  const camera = new THREE.PerspectiveCamera();
  const manager = createBubbleManager(container, camera);
  const heights: number[] = [];
  const project = vi.spyOn(THREE.Vector3.prototype, 'project').mockImplementation(function (this: THREE.Vector3) { heights.push(this.y); return this; });
  manager.showBubble(0, '<img src=x>', () => new THREE.Vector3(), 4000);
  manager.update(3.999);
  expect(manager.getVisibleBubbleCount()).toBe(1);
  expect(heights[0]).toBe(4);
  project.mockRestore();
  expect(container.querySelector('img')).toBeNull();
  manager.update(0.001);
  expect(manager.getVisibleBubbleCount()).toBe(0);
  manager.dispose();
});

it('keeps six clustered bubbles separate and inside desktop and narrow viewports', () => {
  for (const width of [1280, 390]) {
    const container = document.createElement('div');
    Object.defineProperties(container, { clientWidth: { value: width }, clientHeight: { value: 720 } });
    const camera = new THREE.PerspectiveCamera();
    const project = vi.spyOn(THREE.Vector3.prototype, 'project').mockImplementation(function (this: THREE.Vector3) { return this.set(0.9, 0, 0); });
    const manager = createBubbleManager(container, camera);
    for (let i = 0; i < 6; i++) manager.showBubble(i, `Untrusted reaction ${i}`, () => new THREE.Vector3());
    const elements = Array.from(container.querySelectorAll<HTMLElement>('.speech-bubble'));
    for (const element of elements) Object.defineProperties(element, { offsetWidth: { value: 230 }, offsetHeight: { value: 30 } });
    manager.update();
    const rects = elements.map(element => {
      expect(element.style.display).not.toBe('none');
      const match = element.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/)!;
      const x = Number(match[1]); const y = Number(match[2]);
      return { left: x - 115, right: x + 115, top: y - 30, bottom: y };
    });
    for (const [i, r] of rects.entries()) {
      expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(width);
      expect(r.top).toBeGreaterThanOrEqual(0); expect(r.bottom).toBeLessThanOrEqual(360);
      for (const other of rects.slice(i + 1)) expect(r.left < other.right && r.right > other.left && r.top < other.bottom && r.bottom > other.top).toBe(false);
    }
    manager.clear(); expect(container.querySelectorAll('.speech-bubble')).toHaveLength(0);
    manager.dispose(); project.mockRestore();
  }
});
