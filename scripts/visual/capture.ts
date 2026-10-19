// Shared screenshot command (owner: Claude). Usage: npm run capture -- --out shots/town.png [flags]
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium, type Response } from 'playwright-core';
import { harnessPath, LIVE_SCREENS, parseCaptureArgs, type CaptureOptions } from './args.ts';
import { applyPalette, focusAndScroll, measureLayout, openLiveScreen, type LayoutReport } from './app-screens.ts';
import { withBrowserAndServer } from './lifecycle.ts';
import { freePort, startGameServer, waitForServer } from './server.ts';

const CHROMIUM_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// An inherited X or Wayland display that this user cannot open makes ANGLE fail, leaving no WebGL.
// Headless capture never needs one, so the browser always starts without them.
const BROWSER_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[0] !== 'DISPLAY' && entry[0] !== 'WAYLAND_DISPLAY',
  ),
);

interface StylesheetRecord { url: string; status: number; contentType: string; bytes: number }

async function recordStylesheet(response: Response): Promise<StylesheetRecord | null> {
  const contentType = response.headers()['content-type'] ?? '';
  const type = response.request().resourceType();
  // Stylesheets and fonts: the sidecar proves both loaded (or that --block-fonts blocked the font).
  if (type !== 'stylesheet' && type !== 'font' && !contentType.includes('text/css')) return null;
  const bytes = await response.body().then((body) => body.length, () => -1);
  return { url: response.url(), status: response.status(), contentType, bytes };
}

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
      args: CHROMIUM_ARGS,
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
    const pendingStyles: Promise<StylesheetRecord | null>[] = [];
    const consoleErrors: string[] = [];
    page.on('response', (response) => pendingStyles.push(recordStylesheet(response)));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

    if (options.blockFonts) await page.route('**/fonts/**', (route) => route.abort());
    const url = `${base}${harnessPath(options)}`;
    await page.goto(url, { waitUntil: 'load', timeout: options.timeoutMs });

    let state: unknown;
    let layout: LayoutReport | null = null;
    const live = options.target === 'app' && LIVE_SCREENS.includes(options.screen);
    if (!live) {
      await page.waitForFunction(() => {
        const visual = (globalThis as { __NEWS_TOWN_VISUAL__?: { status: string } }).__NEWS_TOWN_VISUAL__;
        return visual !== undefined && visual.status !== 'loading';
      }, undefined, { timeout: options.timeoutMs });
      state = await page.evaluate(() => (globalThis as { __NEWS_TOWN_VISUAL__?: unknown }).__NEWS_TOWN_VISUAL__);
      const status = state as { status: string; error?: string };
      if (status.status !== 'ready') throw new Error(`harness reported ${status.status}: ${status.error ?? 'unknown error'}`);
    } else {
      await openLiveScreen(page, options);
      await applyPalette(page, options);
      state = { status: 'ready', screen: options.screen };
    }
    if (options.target === 'app') {
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await focusAndScroll(page, options);
      layout = await measureLayout(page);
      if (layout.overflowX.length > 0 || layout.unreachable.length > 0) {
        throw new Error(`layout: overflowX: ${layout.overflowX.join(', ') || 'none'}; unreachable: ${layout.unreachable.join(', ') || 'none'}`);
      }
    }

    await mkdir(dirname(options.out), { recursive: true });
    await page.screenshot({ path: options.out });
    const stylesheets = (await Promise.all(pendingStyles)).filter((entry): entry is StylesheetRecord => entry !== null);
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
