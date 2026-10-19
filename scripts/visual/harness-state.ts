// Waits for the visual harness to publish window.__NEWS_TOWN_VISUAL__ (anything but 'loading') and returns it.
// Polls on a timer: the harness's virtual clock freezes requestAnimationFrame, which stops Playwright's default
// animation-frame polling, so a state published after the clock is installed would never be seen.
import type { Page } from 'playwright-core';

export async function waitForHarnessState(page: Page, timeoutMs: number): Promise<unknown> {
  await page.waitForFunction(() => {
    const visual = (globalThis as { __NEWS_TOWN_VISUAL__?: { status: string } }).__NEWS_TOWN_VISUAL__;
    return visual !== undefined && visual.status !== 'loading';
  }, undefined, { timeout: timeoutMs, polling: 100 });
  return page.evaluate(() => (globalThis as { __NEWS_TOWN_VISUAL__?: unknown }).__NEWS_TOWN_VISUAL__);
}
