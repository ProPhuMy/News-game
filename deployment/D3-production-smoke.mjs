/* global document, localStorage */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { chromiumArgs } from '../scripts/visual/args.ts';

import { parseSmokeOptions, fetchSmokeResource, requireCleanWatch, decodeSmokePackets } from './D4-smoke-options.ts';
import { watchPage, captureAppEvidence } from '../scripts/visual/evidence.ts';
import { LOCATIONS, LOCATION_NAMES } from '../src/shared/ids.ts';

const options = parseSmokeOptions(process.argv.slice(2));
const base = options.origin;
const evidenceDirectory = options.out ? dirname(options.out) : '.superpowers/shots/D4';
const built = resolve('dist/client');
const checks = { assets: 0, fonts: 0, models: 0, sounds: 0, browserSessions: 2, restoredSeat: false, results: false };
const assetHashes = {};
const types = new Map([
  ['.css', 'text/css'], ['.js', 'javascript'], ['.glb', 'model/gltf-binary'],
  ['.png', 'image/png'], ['.ttf', 'font/ttf'], ['.mp3', 'audio/mpeg'],
]);
const html = await readFile(resolve(built, 'index.html'), 'utf8');
const files = await readdir(built, { recursive: true, withFileTypes: true });
const marker = 'D3-SYNTHETIC-SERVER-SECRET';
for (const entry of files) {
  if (!entry.isFile()) continue;
  const path = resolve(entry.parentPath, entry.name);
  const suffix = [...types.keys()].find(type => entry.name.endsWith(type));
  if (!suffix) continue;
  const route = '/' + relative(built, path).split('/').map(encodeURIComponent).join('/');
  const response = await fetchSmokeResource(base + route);
  assert.equal(response.status, 200, `Asset failed: ${route}`);
  assert(response.headers.get('content-type')?.includes(types.get(suffix)), `Asset MIME failed: ${route}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, await readFile(path), `Asset bytes differ: ${route}`);
  assetHashes[route] = createHash('sha256').update(bytes).digest('hex');
  checks.assets++;
  if (suffix === '.glb') checks.models++;
  if (suffix === '.ttf') checks.fonts++;
  if (suffix === '.mp3') checks.sounds++;
  if (suffix === '.js') {
    const text = bytes.toString();
    assert(!text.includes(marker), 'Synthetic server secret reached client bundle');
    assert(!text.includes('__NEWS_TOWN_VISUAL__'), 'Development harness reached client bundle');
  }
}
assert(checks.models >= 2 && checks.fonts >= 1 && checks.sounds >= 4, 'Missing asset categories');
assert(!html.includes(marker), 'Synthetic server secret reached HTML');
for (const route of ['/', '/r/ABCDE']) {
  const response = await fetchSmokeResource(base + route);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), html);
}
for (const route of ['/.env', '/src/server/index.ts', '/visual-test/index.html', '/visual-test/app.html', '/assets/%ff.js']) {
  assert.equal((await fetchSmokeResource(base + route)).status, 404);
}

const browser = await chromium.launch({
  args: chromiumArgs(false),
  env: Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !['DISPLAY', 'WAYLAND_DISPLAY'].includes(key))),
  ...(process.env.NEWS_TOWN_CHROMIUM ? { executablePath: process.env.NEWS_TOWN_CHROMIUM } : {}),
});
try {
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }),
    browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const watches = pages.map(page => requireCleanWatch(watchPage(page)));
  const problems = [];
  for (const context of contexts) {
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === base ? route.continue() : route.abort();
    });
  }
  const capture = async (page, index, label) => {
    const evidence = await captureAppEvidence(page, watches[index], {
      out: resolve(evidenceDirectory, `${label}.png`), label, timeoutMs: 240_000,
    });
    assert.equal(evidence.origin, base);
    assert.deepEqual(evidence.consoleErrors, [], 'Capture console errors occurred');
  };
  const packets = pages.map(() => []);
  const webSocketPackets = pages.map(() => []);
  const pendingPolling = new Set();
  const drainPolling = () => Promise.all(pendingPolling);
  const sockets = pages.map(() => 0);
  for (const [index, page] of pages.entries()) {
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin !== base || url.pathname !== '/socket.io/' || url.searchParams.get('transport') !== 'polling' ||
        response.request().method() !== 'GET') return;
      const read = response.text().then(payload => packets[index].push(...decodeSmokePackets(payload))).catch(() => {
        if (response.request().failure()?.errorText !== 'net::ERR_ABORTED') problems.push('polling-response-read-failed');
      });
      pendingPolling.add(read);
      void read.finally(() => pendingPolling.delete(read));
    });
    page.on('pageerror', () => problems.push('pageerror'));
    page.on('console', message => { if (message.type() === 'error') problems.push('console-error'); });
    page.on('requestfailed', request => {
      // A reload can abort in-flight requests. Resource success is checked independently above.
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') problems.push('request-failed');
    });
    page.on('websocket', socket => {
      const expected = base.replace(/^http/, 'ws');
      if (new URL(socket.url()).origin !== expected) problems.push('unexpected-websocket-origin');
      sockets[index]++;
      socket.on('framereceived', ({ payload }) => {
        if (typeof payload !== 'string') return;
        try {
          const decoded = decodeSmokePackets(payload);
          webSocketPackets[index].push(...decoded);
          packets[index].push(...decoded);
        } catch { problems.push('invalid-websocket-event'); }
      });
    });
  }
  const [host, guest] = pages;
  const name = '<b>Ink</b>';
  await host.goto(base, { waitUntil: 'load' });
  await host.getByTestId('home-screen').waitFor();
  await host.waitForFunction(() => [...document.querySelectorAll('canvas')].some(canvas => canvas.width > 0 && canvas.height > 0));
  await capture(host, 0, 'production-home');
  await host.getByRole('button', { name: 'Create Room', exact: true }).click();
  await host.getByLabel('Your Name', { exact: true }).fill(name);
  await host.getByLabel('Newspaper Name', { exact: true }).fill('D4 Daily');
  await host.getByRole('button', { name: 'Claim Printing Press', exact: true }).click();
  await host.getByTestId('lobby-screen').waitFor();
  const code = await host.locator('.room-code-badge').innerText();
  const match = code.match(/Room Code: ([A-HJ-NP-Z2-9]{5})/);
  assert(match, 'Room code missing');
  assert.equal(await host.getByTestId('lobby-screen').locator('b').count(), 0, 'Name interpreted as HTML');
  assert((await host.getByTestId('lobby-screen').innerText()).includes(name), 'Literal name missing');
  await guest.goto(`${base}/r/${match[1]}`, { waitUntil: 'load' });
  await guest.getByLabel('Your Name', { exact: true }).fill('Guest');
  await guest.getByLabel('Newspaper Name', { exact: true }).fill('D4 Weekly');
  await guest.getByRole('button', { name: 'Select Blue', exact: true }).click();
  await guest.getByRole('button', { name: 'Claim Printing Press', exact: true }).click();
  await guest.getByTestId('lobby-screen').waitFor();
  const saved = await guest.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]);
  assert(saved, 'Guest token missing');
  assert(saved !== await host.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]), 'Seats share token');
  await host.getByRole('button', { name: 'Start Match', exact: true }).click();
  const matchReady = page => page.getByTestId('hud-overlay').waitFor();
  await Promise.all(pages.map(matchReady));
  await Promise.all(pages.map(page => page.getByRole('button', { name: /^(?:I'm ready|Skip Intro)$/ }).click()));
  await guest.getByRole('button', { name: LOCATION_NAMES[LOCATIONS[0]], exact: true }).click();
  await guest.getByTestId('investigate-locked').waitFor();
  await drainPolling();
  const submitted = packets[1].filter(([event]) => event === 'private').at(-1)?.[1].investigations.at(-1);
  assert(submitted, 'Submitted investigation missing');
  const hostSocketsBefore = sockets[0];
  const beforeRecovery = packets[1].length;
  await guest.reload({ waitUntil: 'load' });
  await matchReady(guest);
  await drainPolling();
  assert(await guest.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]) === saved, 'Recovered token changed');
  assert(packets[1].slice(beforeRecovery).some(([event, data]) => event === 'ack' && data.ok && data.session?.token === saved),
    'No successful token recovery acknowledgment after reload');
  // A real deadline may pass during reload; the submitted investigation survives later phases.
  assert(packets[1].slice(beforeRecovery).some(([event, data]) => event === 'private' &&
    data.investigations.some(entry => JSON.stringify(entry) === JSON.stringify(submitted))),
  'Submitted investigation not restored');
  assert.equal(sockets[0], hostSocketsBefore, 'Host reconnected during guest recovery');
  checks.restoredSeat = true;
  console.log('Production assets, separate seats, literal markup and reconnect checked. Playing five rounds.');
  const drive = async page => {
    const actions = ["I'm ready", 'Skip Intro', 'Skip Investigation', 'Skip Writing'];
    while (true) {
      await page.waitForFunction(labels => Boolean(document.querySelector('.results-card')) ||
        [...document.querySelectorAll('button')].some(button => !button.disabled && button.offsetParent !== null &&
          labels.includes(button.textContent.trim())), actions, { timeout: 55_000 });
      const clicked = await page.evaluate(labels => {
        if (document.querySelector('.results-card')) return 'finished';
        // Deadline transitions can remove a button between separate locator checks and clicks.
        const button = [...document.querySelectorAll('button')].find(button => !button.disabled &&
          button.offsetParent !== null && labels.includes(button.textContent.trim()));
        button?.click();
        return button?.textContent.trim() ?? null;
      }, actions);
      if (clicked === 'finished') return;
      if (clicked) await page.waitForFunction(label =>
        ![...document.querySelectorAll('button')].some(button => button.textContent.trim() === label),
      clicked, { timeout: 55_000 });
    }
  };
  await Promise.all(pages.map(drive));
  for (const page of pages) {
    assert((await page.locator('.results-card').innerText()).includes('Total readers'), 'Results missing reader label');
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.fonts.check('16px "Playfair Display"')), 'Heading font unavailable');
    assert.equal(await page.locator('.town-fallback-container').count(), 0, 'Unexpected renderer fallback');
  }
  await capture(host, 0, 'production-final');
  checks.results = true;
  await drainPolling();
  for (const [index, messages] of packets.entries()) {
    const sessions = messages.filter(([event, data]) => event === 'ack' && data.session).map(([, data]) => data.session);
    assert(sessions.length > 0, 'No application acknowledgment observed');
    assert(webSocketPackets[index].length > 0, 'No application messages observed on WebSocket');
    assert(sockets[index] >= (index === 1 ? 2 : 1), 'Expected WebSocket/reconnect missing');
    const seat = sessions[0].seatId;
    const privatePackets = messages.filter(([event]) => event === 'private');
    assert(privatePackets.length > 0 && privatePackets.every(([, data]) => data.seatId === seat), 'Wrong private recipient');
    const publics = messages.filter(([event]) => event === 'public').map(([, data]) => data);
    assert(publics.some(data => data.phase === 'final' || data.phase === 'ended'), 'Final snapshot absent');
    assert(!JSON.stringify(publics).match(/"(?:token|gullibility|events|isTrue|templateId)":/), 'Forbidden public field');
    const rivalToken = index === 0 ? saved : await host.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]);
    assert(!JSON.stringify(messages).includes(rivalToken), 'Rival credential leaked');
  }
  assert.deepEqual(problems, [], 'Browser errors occurred');
  const summary = { passed: true, origin: base, remote: options.remote, node: process.version,
    browser: browser.version(), ...checks, assetHashes };
  if (options.out) {
    await mkdir(dirname(options.out), { recursive: true });
    await writeFile(options.out, JSON.stringify(summary, null, 2) + '\n');
  }
  console.log(JSON.stringify({ ...summary, assetHashes: undefined }));
} finally { await browser.close(); }
