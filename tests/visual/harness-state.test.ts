// Real-browser regression: the harness's virtual clock freezes requestAnimationFrame, so Playwright's default
// animation-frame polling never re-checks and a late ready state times out. Skipped where Chromium is not installed
// (CI installs no browsers); `npm run capture` needs it anyway.
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright-core';
import { waitForHarnessState } from '../../scripts/visual/harness-state.ts';

const hasChromium = existsSync(chromium.executablePath());

describe.skipIf(!hasChromium)('waitForHarnessState (real Chromium)', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await chromium.launch(); });
  afterAll(async () => { await browser?.close(); });

  it('sees readiness that arrives after the clock freezes requestAnimationFrame', async () => {
    const page = await browser.newPage();
    await page.setContent(`<script>
      window.requestAnimationFrame = () => 0;
      setTimeout(() => { window.__NEWS_TOWN_VISUAL__ = { status: 'ready', scene: 'architecture' }; }, 300);
    </script>`);
    await expect(waitForHarnessState(page, 3000)).resolves.toEqual({ status: 'ready', scene: 'architecture' });
  }, 15000);
});
