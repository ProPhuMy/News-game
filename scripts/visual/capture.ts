// Shared screenshot command (owner: Claude). Usage: npm run capture -- --out shots/town.png [flags]
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium, type Response } from 'playwright-core';
import { harnessPath, parseCaptureArgs, type CaptureOptions } from './args.ts';
import { freePort, startGameServer, waitForHttp } from './server.ts';

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
  const isCss = response.request().resourceType() === 'stylesheet' || contentType.includes('text/css');
  if (!isCss) return null;
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
  const server = startGameServer({ port, prod: options.prod });
  const stopAll = () => server.stop();
  process.once('SIGINT', () => { stopAll(); process.exit(130); });
  process.once('SIGTERM', () => { stopAll(); process.exit(143); });

  const browser = await chromium.launch({
    args: CHROMIUM_ARGS,
    env: BROWSER_ENV,
    ...(process.env.NEWS_TOWN_CHROMIUM ? { executablePath: process.env.NEWS_TOWN_CHROMIUM } : {}),
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    try {
      await waitForHttp(`${base}/`, options.timeoutMs);
    } catch (error) {
      throw new Error(`${(error as Error).message}\n--- server log ---\n${server.logTail()}`, { cause: error });
    }
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

    const url = `${base}${options.target === 'town' ? harnessPath(options) : '/'}`;
    await page.goto(url, { waitUntil: 'load', timeout: options.timeoutMs });

    let state: unknown = null;
    if (options.target === 'town') {
      await page.waitForFunction(() => {
        const visual = (globalThis as { __NEWS_TOWN_VISUAL__?: { status: string } }).__NEWS_TOWN_VISUAL__;
        return visual !== undefined && visual.status !== 'loading';
      }, undefined, { timeout: options.timeoutMs });
      state = await page.evaluate(() => (globalThis as { __NEWS_TOWN_VISUAL__?: unknown }).__NEWS_TOWN_VISUAL__);
      const status = state as { status: string; error?: string };
      if (status.status !== 'ready') throw new Error(`harness reported ${status.status}: ${status.error ?? 'unknown error'}`);
    } else {
      await page.waitForSelector('[data-testid="home-screen"]', { timeout: options.timeoutMs });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      state = { status: 'ready', screen: 'home-screen' };
    }

    await mkdir(dirname(options.out), { recursive: true });
    await page.screenshot({ path: options.out });
    const stylesheets = (await Promise.all(pendingStyles)).filter((entry): entry is StylesheetRecord => entry !== null);
    await writeFile(`${options.out}.json`, `${JSON.stringify({
      target: options.target, url, options, browser: browser.version(), state, stylesheets, consoleErrors,
    }, null, 2)}\n`);
    console.log(`captured ${options.out} (${options.width}x${options.height}); sidecar ${options.out}.json`);
  } catch (error) {
    await rm(options.out, { force: true });
    throw error;
  } finally {
    await browser.close();
    stopAll();
  }
}

capture(parseCaptureArgs(process.argv.slice(2))).catch((error: unknown) => {
  console.error(`capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
