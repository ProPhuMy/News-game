// Waiting logic for the live join form (owner: Claude). Takes a minimal page view so it can be unit tested.
import type { Page } from 'playwright-core';

export interface JoinRecord { outcome: 'rejected' | 'accepted' | 'corrected'; error: string | null; entry: 'createRoom' }
export const JOIN_ERROR = '[data-testid="join-error"]';
export const LOBBY = '[data-testid="lobby-screen"]';

/** The only page methods the join flow uses. */
export interface JoinPage {
  waitFor(selector: string, state: 'attached' | 'detached', timeoutMs: number): Promise<void>;
  count(selector: string): Promise<number>;
  text(selector: string): Promise<string>;
}

export function joinPage(page: Page): JoinPage {
  return {
    waitFor: (selector, state, timeout) => page.locator(selector).first().waitFor({ state: state === 'attached' ? 'visible' : 'detached', timeout }),
    count: (selector) => page.locator(selector).count(),
    text: async (selector) => ((await page.locator(selector).first().textContent()) ?? '').trim(),
  };
}

async function firstOf(promises: Promise<void>[], message: string): Promise<void> {
  await Promise.any(promises).catch(() => { throw new Error(message); });
}

/** After the first submit: the error banner or the lobby, whichever comes first. */
export async function firstJoinResult(page: JoinPage, timeoutMs: number): Promise<{ lobby: boolean; error: string | null }> {
  await firstOf([page.waitFor(LOBBY, 'attached', timeoutMs), page.waitFor(JOIN_ERROR, 'attached', timeoutMs)],
    `join: neither the join error banner nor the lobby appeared within ${timeoutMs}ms`);
  return (await page.count(LOBBY)) > 0 ? { lobby: true, error: null } : { lobby: false, error: await page.text(JOIN_ERROR) };
}

/**
 * After the resubmit click the old banner may still be in the DOM. Wait for it to detach or the lobby to appear
 * before judging, then take the lobby or a fresh banner. Returns the lobby flag and any fresh banner text.
 */
export async function correctedJoinResult(page: JoinPage, timeoutMs: number): Promise<{ lobby: boolean; error: string | null }> {
  const none = `corrected join: the old banner stayed and the lobby never appeared within ${timeoutMs}ms (or the same rejection repeated)`;
  await firstOf([page.waitFor(LOBBY, 'attached', timeoutMs), page.waitFor(JOIN_ERROR, 'detached', timeoutMs)], none);
  if ((await page.count(LOBBY)) > 0) return { lobby: true, error: null };
  await firstOf([page.waitFor(LOBBY, 'attached', timeoutMs), page.waitFor(JOIN_ERROR, 'attached', timeoutMs)],
    `corrected join: neither the lobby nor a new banner appeared within ${timeoutMs}ms`);
  return (await page.count(LOBBY)) > 0 ? { lobby: true, error: null } : { lobby: false, error: await page.text(JOIN_ERROR) };
}
