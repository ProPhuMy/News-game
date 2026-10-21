// Shared screenshot command (owner: Claude). Usage: npm run capture -- --out shots/town.png [flags]
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { chromiumArgs, harnessPath, LIVE_SCREENS, parseCaptureArgs, type CaptureOptions } from './args.ts';
import { focusAndScroll, openLiveScreen, type LayoutReport } from './app-screens.ts';
import { checkAppLayout, watchPage } from './evidence.ts';
import { waitForHarnessState } from './harness-state.ts';
import { withBrowserAndServer } from './lifecycle.ts';
import { freePort, startGameServer, waitForServer } from './server.ts';

// An inherited X or Wayland display that this user cannot open makes ANGLE fail, leaving no WebGL.
// Headless capture never needs one, so the browser always starts without them.
const BROWSER_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[0] !== 'DISPLAY' && entry[0] !== 'WAYLAND_DISPLAY',
  ),
);

async function capture(options: CaptureOptions): Promise<void> {
  if (options.prod) {
    // The production server serves dist/client; fail early with a clear message if it was not built.
    await access('dist/client/index.html').catch(() => {
      throw new Error('dist/client/index.html is missing; run npm run build first');
    });
  }
  const port = await freePort();
  await withBrowserAndServer({
    launch: () => chromium.launch({
      args: chromiumArgs(options.noWebgl),
      env: BROWSER_ENV,
      ...(process.env.NEWS_TOWN_CHROMIUM ? { executablePath: process.env.NEWS_TOWN_CHROMIUM } : {}),
    }),
    start: () => startGameServer({ port, prod: options.prod }),
  }, async (browser, server) => {
    process.once('SIGINT', () => { server.stop(); process.exit(130); });
    process.once('SIGTERM', () => { server.stop(); process.exit(143); });
    const base = `http://127.0.0.1:${port}`;
    await waitForServer(server, `${base}/`, options.timeoutMs);
    const page = await browser.newPage({
      viewport: { width: options.width, height: options.height },
      deviceScaleFactor: 1,
      reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
    });
    const watch = watchPage(page);

    if (options.blockFonts) await page.route('**/fonts/**', (route) => route.abort());
    const url = `${base}${harnessPath(options)}`;
    await page.goto(url, { waitUntil: 'load', timeout: options.timeoutMs });

    let state: unknown;
    let layout: LayoutReport | null = null;
    const live = options.target === 'app' && LIVE_SCREENS.includes(options.screen);
    if (!live) {
      state = await waitForHarnessState(page, options.timeoutMs);
      const status = state as { status: string; error?: string };
      if (status.status !== 'ready') throw new Error(`harness reported ${status.status}: ${status.error ?? 'unknown error'}`);
    } else {
      const join = await openLiveScreen(page, options);
      state = { status: 'ready', screen: options.screen, ...(join ? { join } : {}) };
    }
    if (options.target === 'app') {
      // Fonts settle before focus/scroll so the scroll offset matches the final layout; checkAppLayout waits again (no-op).
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await focusAndScroll(page, options);
      ({ layout } = await checkAppLayout(page));
    }

    await mkdir(dirname(options.out), { recursive: true });
    await page.screenshot({ path: options.out, timeout: options.timeoutMs, animations: 'disabled' }); // CSS marquees and transitions are not on the harness clock
    const { stylesheets, consoleErrors } = await watch.snapshot();
    await writeFile(`${options.out}.json`, `${JSON.stringify({
      target: options.target, url, options, browser: browser.version(), state, layout, stylesheets, consoleErrors,
    }, null, 2)}\n`);
    console.log(`captured ${options.out} (${options.width}x${options.height}); sidecar ${options.out}.json`);
  }).catch(async (error: unknown) => {
    await rm(options.out, { force: true });
    throw error;
  });
}

capture(parseCaptureArgs(process.argv.slice(2))).catch((error: unknown) => {
  console.error(`capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
