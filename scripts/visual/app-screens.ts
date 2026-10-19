// Browser steps for --target app captures (owner: Claude): live screens on the real dev server,
// palette, focus, scroll and the layout check that every capture of the UI must pass.
import type { Page } from 'playwright-core';
import { stressText } from '../../src/client/visual-test/stress-text.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { getPalette, paletteCssVariables } from '../../src/client/visuals/palette.ts';
import type { CaptureOptions } from './args.ts';
import { layoutProblems, type LayoutNode, type LayoutProblems } from './layout.ts';

export type LayoutReport = LayoutProblems;

/** Drives the real app to home, join or lobby. Lobby really creates a room on the local dev server. */
export async function openLiveScreen(page: Page, options: CaptureOptions): Promise<void> {
  const timeout = options.timeoutMs;
  await page.waitForSelector('[data-testid="home-screen"]', { timeout });
  if (options.screen === 'home') return;
  await page.getByRole('button', { name: options.screen === 'join' ? 'Play Solo' : 'Create Room' }).click();
  await page.waitForSelector('[data-testid="join-screen"]', { timeout });
  if (options.screen === 'join') return;
  const { displayNameChars, paperNameChars } = TUNING.limits;
  await page.fill('#player-name', options.stressText ? stressText('Editor0', displayNameChars, true) : 'Ada');
  await page.fill('#paper-name', options.stressText ? stressText('Paper0', paperNameChars, false) : 'The Morning Bell');
  await page.getByRole('button', { name: 'Select Red' }).click();
  await page.getByRole('button', { name: 'Claim Printing Press' }).click();
  await page.waitForSelector('[data-testid="lobby-screen"]', { timeout });
}

export async function applyPalette(page: Page, options: CaptureOptions): Promise<void> {
  await page.evaluate((vars) => {
    for (const [name, value] of Object.entries(vars)) document.documentElement.style.setProperty(name, value);
  }, paletteCssVariables(getPalette(options.palette)));
}

export async function focusAndScroll(page: Page, options: CaptureOptions): Promise<void> {
  for (let i = 0; i < options.tab; i++) await page.keyboard.press('Tab');
  if (options.scroll !== null) {
    const found = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      element.scrollTop = element.scrollHeight;
      element.scrollLeft = 0;
      return true;
    }, options.scroll);
    if (!found) throw new Error(`--scroll selector matched nothing: ${options.scroll}`);
  }
}

/** Collects the box tree under #ui-root in the page and checks it with layoutProblems (scripts/visual/layout.ts). */
export async function measureLayout(page: Page): Promise<LayoutReport> {
  const { nodes, viewport } = await page.evaluate(() => {
    const root = document.getElementById('ui-root');
    const elements = root ? [root, ...root.querySelectorAll('*')] : [];
    const index = new Map(elements.map((el, i) => [el, i]));
    const controls = 'button, input, select, textarea, a[href], summary';
    const list = elements.map((el) => {
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const control = el.matches(controls);
      const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      return {
        label: control ? `${el.tagName.toLowerCase()} "${text}"` : `${el.tagName.toLowerCase()}${cls}`,
        box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        parent: el.parentElement ? (index.get(el.parentElement) ?? null) : null,
        control,
        clipX: style.overflowX !== 'visible', clipY: style.overflowY !== 'visible',
        scrollX: style.overflowX === 'auto' || style.overflowX === 'scroll',
        scrollY: style.overflowY === 'auto' || style.overflowY === 'scroll',
      };
    });
    return { nodes: list, viewport: { width: window.innerWidth, height: window.innerHeight } };
  });
  return layoutProblems(nodes satisfies LayoutNode[], viewport);
}
