import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { describe, expect, it } from 'vitest';
import { captureAppEvidence, watchPage } from '../../scripts/visual/evidence.ts';

interface FakeOptions { url?: string; overflowX?: boolean }

// Just enough of a Playwright Page: events, url, evaluate (fonts.ready + viewport, and the layout box tree), screenshot.
function fakePage({ url = 'https://town.example/r/ABCDE?token=secret', overflowX = false }: FakeOptions = {}) {
  const events = new EventEmitter();
  const box = { left: 0, top: 0, right: overflowX ? 2000 : 100, bottom: 50 };
  const node = { label: 'div.panel', box, parent: null, control: false, clipX: false, clipY: false, scrollX: false, scrollY: false };
  const page = {
    on: (name: string, listener: (...args: unknown[]) => void) => { events.on(name, listener); return page; },
    url: () => url,
    evaluate: async (fn: unknown) => (String(fn).includes('fonts')
      ? { width: 1280, height: 720, deviceScaleFactor: 1 }
      : { nodes: [node], viewport: { width: 1280, height: 720 } }),
    screenshot: async ({ path }: { path: string }) => { await writeFile(path, 'png'); },
    context: () => ({ browser: () => ({ version: () => '153.0.8010.12' }) }),
  };
  return { page: page as unknown as Page, events };
}

function response(url: string, resourceType: string, contentType: string) {
  return {
    url: () => url,
    status: () => 200,
    headers: () => ({ 'content-type': contentType }),
    request: () => ({ resourceType: () => resourceType }),
    body: async () => Buffer.from('abcd'),
  };
}

const outDir = () => mkdtemp(join(tmpdir(), 'evidence-'));

describe('watchPage', () => {
  it('records stylesheets and fonts by origin and path only, plus console and page errors', async () => {
    const { page, events } = fakePage();
    const watch = watchPage(page);
    events.emit('response', response('https://town.example/assets/index.css?v=1#x', 'stylesheet', 'text/css'));
    events.emit('response', response('https://town.example/fonts/a.ttf?token=secret', 'font', 'font/ttf'));
    events.emit('response', response('https://town.example/socket.io/?EIO=4&sid=abc', 'xhr', 'text/plain'));
    events.emit('console', { type: () => 'error', text: () => 'boom' });
    events.emit('console', { type: () => 'log', text: () => 'fine' });
    events.emit('pageerror', new Error('crash'));
    expect(await watch.snapshot()).toEqual({
      stylesheets: [
        { url: 'https://town.example/assets/index.css', status: 200, contentType: 'text/css', bytes: 4 },
        { url: 'https://town.example/fonts/a.ttf', status: 200, contentType: 'font/ttf', bytes: 4 },
      ],
      consoleErrors: ['boom', 'pageerror: crash'],
    });
  });
});

describe('captureAppEvidence', () => {
  it('writes the PNG and a sidecar with only the agreed fields and the bare origin', async () => {
    const { page } = fakePage();
    const out = join(await outDir(), 'production-home.png');
    const evidence = await captureAppEvidence(page, watchPage(page), { out, label: 'production-home', timeoutMs: 1000 });
    expect(evidence).toEqual({
      label: 'production-home',
      origin: 'https://town.example',
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      browser: '153.0.8010.12',
      fontsReady: true,
      layout: { overflowX: [], unreachable: [] },
      stylesheets: [],
      consoleErrors: [],
    });
    expect(JSON.parse(await readFile(`${out}.json`, 'utf8'))).toEqual(evidence);
    expect((await stat(out)).size).toBeGreaterThan(0);
    expect(await readFile(`${out}.json`, 'utf8')).not.toMatch(/ABCDE|token|secret/);
  });

  it('throws on layout problems and writes no PNG', async () => {
    const { page } = fakePage({ overflowX: true });
    const out = join(await outDir(), 'bad.png');
    await expect(captureAppEvidence(page, watchPage(page), { out, label: 'bad', timeoutMs: 1000 })).rejects.toThrow(/layout: overflowX: div\.panel/);
    await expect(stat(out)).rejects.toThrow();
  });

  it('rejects an output path that is not a .png', async () => {
    const { page } = fakePage();
    await expect(captureAppEvidence(page, watchPage(page), { out: 'x.jpg', label: 'x', timeoutMs: 1000 })).rejects.toThrow(/\.png/);
  });
});
