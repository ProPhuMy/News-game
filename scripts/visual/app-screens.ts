// Browser steps for --target app captures (owner: Claude): live screens on the real dev server,
// palette, focus, scroll and the layout check that every capture of the UI must pass.
import type { Page } from 'playwright-core';
import { stressText } from '../../src/client/visual-test/stress-text.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { getPalette, paletteCssVariables } from '../../src/client/visuals/palette.ts';
import type { CaptureOptions } from './args.ts';

export interface LayoutReport { pageOverflowX: boolean; unreachable: string[] }

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

/**
 * A control is unreachable when its box is outside the viewport and no ancestor scrolls in that direction.
 * Controls inside closed <details> or hidden elements have no box and are skipped.
 */
export function measureLayout(page: Page): Promise<LayoutReport> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrolls = (el: Element, axis: 'x' | 'y') => {
      const style = getComputedStyle(el);
      const overflow = axis === 'x' ? style.overflowX : style.overflowY;
      const room = axis === 'x' ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight;
      return room && (overflow === 'auto' || overflow === 'scroll');
    };
    const hasScroller = (el: Element, axis: 'x' | 'y') => {
      for (let p = el.parentElement; p; p = p.parentElement) if (scrolls(p, axis)) return true;
      return false;
    };
    const unreachable: string[] = [];
    for (const el of document.querySelectorAll('#ui-root :is(button, input, select, textarea, a[href], summary)')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const outX = box.right > vw + 1 || box.left < -1;
      const outY = box.bottom > vh + 1 || box.top < -1;
      if ((outX && !hasScroller(el, 'x')) || (outY && !hasScroller(el, 'y'))) {
        const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        unreachable.push(`${el.tagName.toLowerCase()} "${label}"`);
      }
    }
    return { pageOverflowX: document.documentElement.scrollWidth > vw + 1, unreachable };
  });
}
