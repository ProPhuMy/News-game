/* global fetch, document, localStorage */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { chromium } from 'playwright-core';
import { chromiumArgs } from '../scripts/visual/args.ts';

// D3 checks only a local production process. D4 owns remote deployment verification.
const target = new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
assert(target.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(target.hostname), 'Local HTTP target required');
assert(target.pathname === '/' && !target.search && !target.username && !target.password, 'Root URL required');
const base = target.origin;
const built = resolve('dist/client');
const checks = { assets: 0, fonts: 0, models: 0, sounds: 0, browserSessions: 2, restoredSeat: false, results: false };
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
  const response = await fetch(base + route);
  assert.equal(response.status, 200, `Asset failed: ${route}`);
  assert(response.headers.get('content-type')?.includes(types.get(suffix)), `Asset MIME failed: ${route}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(bytes, await readFile(path), `Asset bytes differ: ${route}`);
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
  const response = await fetch(base + route);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), html);
}
for (const route of ['/.env', '/src/server/index.ts', '/visual-test/index.html', '/visual-test/app.html', '/assets/%ff.js']) {
  assert.equal((await fetch(base + route)).status, 404);
}

const browser = await chromium.launch({
  args: chromiumArgs(false),
  env: Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !['DISPLAY', 'WAYLAND_DISPLAY'].includes(key))),
  ...(process.env.NEWS_TOWN_CHROMIUM ? { executablePath: process.env.NEWS_TOWN_CHROMIUM } : {}),
});
try {
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' }),
    browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const problems = [];
  const packets = pages.map(() => []);
  const sockets = pages.map(() => 0);
  for (const [index, page] of pages.entries()) {
    page.on('pageerror', () => problems.push('pageerror'));
    page.on('console', message => { if (message.type() === 'error') problems.push('console-error'); });
    page.on('requestfailed', request => {
      // A reload can abort in-flight requests. Resource success is checked independently above.
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') problems.push('request-failed');
    });
    page.on('websocket', socket => {
      sockets[index]++;
      socket.on('framereceived', ({ payload }) => {
        if (typeof payload !== 'string' || !payload.startsWith('42')) return;
        const decoded = JSON.parse(payload.slice(2));
        if (Array.isArray(decoded)) packets[index].push(decoded);
      });
    });
  }
  const [host, guest] = pages;
  const name = '<b>Ink</b>';
  await host.goto(base, { waitUntil: 'load' });
  await host.getByRole('button', { name: 'Create Room', exact: true }).click();
  await host.getByLabel('Your Name', { exact: true }).fill(name);
  await host.getByLabel('Newspaper Name', { exact: true }).fill('D3 Daily');
  await host.getByRole('button', { name: 'Claim Printing Press', exact: true }).click();
  await host.getByTestId('lobby-screen').waitFor();
  const code = await host.locator('.room-code-badge').innerText();
  const match = code.match(/Room Code: ([A-HJ-NP-Z2-9]{5})/);
  assert(match, 'Room code missing');
  assert.equal(await host.getByTestId('lobby-screen').locator('b').count(), 0, 'Name interpreted as HTML');
  assert((await host.getByTestId('lobby-screen').innerText()).includes(name), 'Literal name missing');
  await guest.goto(`${base}/r/${match[1]}`, { waitUntil: 'load' });
  await guest.getByLabel('Your Name', { exact: true }).fill('Guest');
  await guest.getByLabel('Newspaper Name', { exact: true }).fill('D3 Weekly');
  await guest.getByRole('button', { name: 'Select Blue', exact: true }).click();
  await guest.getByRole('button', { name: 'Claim Printing Press', exact: true }).click();
  await guest.getByTestId('lobby-screen').waitFor();
  const saved = await guest.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]);
  assert(saved, 'Guest token missing');
  assert.notEqual(saved, await host.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]), 'Seats share token');
  await host.getByRole('button', { name: 'Start Match', exact: true }).click();
  const matchReady = page => page.getByTestId('hud-overlay').waitFor();
  await Promise.all(pages.map(matchReady));
  const beforeRecovery = packets[1].length;
  await guest.reload({ waitUntil: 'load' });
  await matchReady(guest);
  assert.equal(await guest.evaluate(code => localStorage.getItem(`news-town:${code}`), match[1]), saved);
  assert(packets[1].slice(beforeRecovery).some(([event, data]) => event === 'ack' && data.ok && data.session?.token === saved),
    'No successful token recovery acknowledgment after reload');
  checks.restoredSeat = true;
  console.log('Local production assets, separate seats, literal markup and reconnect checked. Playing five rounds.');
  const drive = async page => {
    const actions = ['Skip Intro', 'Skip Investigation', 'Skip Writing'];
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
  checks.results = true;
  for (const [index, messages] of packets.entries()) {
    const sessions = messages.filter(([event, data]) => event === 'ack' && data.session).map(([, data]) => data.session);
    assert(sessions.length > 0, 'No application acknowledgment observed on WebSocket');
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
  console.log(JSON.stringify({ passed: true, node: process.version, browser: browser.version(), ...checks }));
} finally { await browser.close(); }
