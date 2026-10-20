// Page evidence for app screenshots (owner: Claude), shared by capture.ts and Codex's deployed smoke probe.
// Sidecars hold only origins and asset paths: never page paths, queries, tokens, snapshots or packets.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Page, Response } from 'playwright-core';
import { measureLayout, type LayoutReport } from './app-screens.ts';

export interface StylesheetRecord { url: string; status: number; contentType: string; bytes: number }

export interface PageWatch {
  /** Stylesheet/font responses (origin+pathname, status, content-type, bytes) and console/page errors since watchPage. */
  snapshot(): Promise<{ stylesheets: StylesheetRecord[]; consoleErrors: string[] }>;
}

export interface AppEvidence {
  label: string;
  origin: string;
  viewport: { width: number; height: number; deviceScaleFactor: number };
  browser: string;
  fontsReady: true;
  layout: LayoutReport;
  stylesheets: StylesheetRecord[];
  consoleErrors: string[];
}

const withoutQuery = (url: string): string => {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
};

async function recordStylesheet(response: Response): Promise<StylesheetRecord | null> {
  const contentType = response.headers()['content-type'] ?? '';
  const type = response.request().resourceType();
  // Stylesheets and fonts: the sidecar proves both loaded (or that --block-fonts blocked the font).
  if (type !== 'stylesheet' && type !== 'font' && !contentType.includes('text/css')) return null;
  const bytes = await response.body().then((body) => body.length, () => -1);
  return { url: withoutQuery(response.url()), status: response.status(), contentType, bytes };
}

/** Attach before page.goto(); records stylesheet/font responses, console errors and page errors. */
export function watchPage(page: Page): PageWatch {
  const pending: Promise<StylesheetRecord | null>[] = [];
  const consoleErrors: string[] = [];
  page.on('response', (response) => pending.push(recordStylesheet(response)));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  return {
    snapshot: async () => ({
      stylesheets: (await Promise.all(pending)).filter((entry): entry is StylesheetRecord => entry !== null),
      consoleErrors: [...consoleErrors],
    }),
  };
}

/** Waits for document fonts, then checks the UI layout; throws on overflowX or unreachable controls. */
export async function checkAppLayout(page: Page): Promise<{ viewport: AppEvidence['viewport']; layout: LayoutReport }> {
  const viewport = await page.evaluate(() => document.fonts.ready.then(() => (
    { width: window.innerWidth, height: window.innerHeight, deviceScaleFactor: window.devicePixelRatio })));
  const layout = await measureLayout(page);
  if (layout.overflowX.length > 0 || layout.unreachable.length > 0) {
    throw new Error(`layout: overflowX: ${layout.overflowX.join(', ') || 'none'}; unreachable: ${layout.unreachable.join(', ') || 'none'}`);
  }
  return { viewport, layout };
}

/** Waits for fonts, checks layout, writes out (PNG) and out.json. The caller asserts consoleErrors is empty. */
export async function captureAppEvidence(page: Page, watch: PageWatch, opts: { out: string; label: string; timeoutMs: number }): Promise<AppEvidence> {
  if (!opts.out.endsWith('.png')) throw new Error(`out must end with .png, got "${opts.out}"`);
  const { viewport, layout } = await checkAppLayout(page);
  await mkdir(dirname(opts.out), { recursive: true });
  try {
    await page.screenshot({ path: opts.out, timeout: opts.timeoutMs });
    const evidence: AppEvidence = {
      label: opts.label,
      origin: new URL(page.url()).origin,
      viewport,
      browser: page.context().browser()?.version() ?? 'unknown',
      fontsReady: true,
      layout,
      ...(await watch.snapshot()),
    };
    await writeFile(`${opts.out}.json`, `${JSON.stringify(evidence, null, 2)}\n`);
    return evidence;
  } catch (error) {
    await rm(opts.out, { force: true });
    throw error;
  }
}
