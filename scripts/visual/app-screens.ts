// Browser steps for --target app captures (owner: Claude): live screens on the real dev server,
// palette, focus, scroll and the layout check that every capture of the UI must pass.
import type { Page } from 'playwright-core';
import { stressText } from '../../src/client/visual-test/stress-text.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import type { CaptureOptions } from './args.ts';
import { layoutProblems, type LayoutNode, type LayoutProblems } from './layout.ts';

export type LayoutReport = LayoutProblems;

export interface JoinRecord { outcome: 'rejected' | 'accepted' | 'corrected'; error: string | null; entry: 'createRoom' }

const JOIN_ERROR = '[data-testid="join-error"]';
const LOBBY = '[data-testid="lobby-screen"]';

/** Waits for the join error banner or the lobby, whichever comes first; fails clearly if neither shows. */
async function joinResult(page: Page, timeout: number, what: string): Promise<'error' | 'lobby'> {
  const either = page.locator(`${JOIN_ERROR}, ${LOBBY}`).first();
  await either.waitFor({ timeout }).catch(() => {
    throw new Error(`${what}: neither the join error banner nor the lobby appeared within ${timeout}ms`);
  });
  return (await page.locator(LOBBY).count()) > 0 ? 'lobby' : 'error';
}

/**
 * Drives the real app to home, join or lobby. Lobby really creates a room on the local dev server.
 * Returns the join record when a name flag was given.
 */
export async function openLiveScreen(page: Page, options: CaptureOptions): Promise<JoinRecord | null> {
  const timeout = options.timeoutMs;
  await page.waitForSelector('[data-testid="home-screen"]', { timeout });
  if (options.screen === 'home') return null;
  await page.getByRole('button', { name: options.screen === 'join' ? 'Play Solo' : 'Create Room' }).click();
  await page.waitForSelector('[data-testid="join-screen"]', { timeout });
  if (options.screen === 'join') return null;
  const { displayNameChars, paperNameChars } = TUNING.limits;
  await page.fill('#player-name', options.stressText ? stressText('Editor0', displayNameChars, true) : (options.playerName ?? 'Ada'));
  await page.fill('#paper-name', options.stressText ? stressText('Paper0', paperNameChars, false) : (options.paperName ?? 'The Morning Bell'));
  await page.getByRole('button', { name: 'Select Red' }).click();
  await page.getByRole('button', { name: 'Claim Printing Press' }).click();
  const named = options.playerName !== null || options.paperName !== null;
  if (!named) {
    await page.waitForSelector(LOBBY, { timeout });
    return null;
  }
  if (await joinResult(page, timeout, 'join') === 'lobby') return { outcome: 'accepted', error: null, entry: 'createRoom' };
  const error = ((await page.locator(JOIN_ERROR).textContent()) ?? '').trim();
  if (options.correctPlayerName === null) return { outcome: 'rejected', error, entry: 'createRoom' };
  await page.fill('#player-name', options.correctPlayerName);
  await page.getByRole('button', { name: 'Claim Printing Press' }).click();
  if (await joinResult(page, timeout, 'corrected join') !== 'lobby') throw new Error(`corrected name was also rejected: ${(await page.locator(JOIN_ERROR).textContent())?.trim() ?? ''}`);
  return { outcome: 'corrected', error, entry: 'createRoom' };
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
