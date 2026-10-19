import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';

describe('static serving', () => {
  let directory: string;
  let game: Awaited<ReturnType<typeof createGameServer>>;
  let url: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'news-town-static-'));
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'index.html'), '<main>News Town</main>');
    await writeFile(join(directory, 'assets', 'app.js'), 'console.log("client");');
    await writeFile(join(directory, '.env'), 'SHOULD_NOT_LEAK');
    await symlink('/etc/passwd', join(directory, 'assets', 'escape.txt'));
    game = await createGameServer({ content: SAMPLE_CONTENT, distDirectory: directory });
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing test address');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => { await game.close(); await rm(directory, { recursive: true, force: true }); });

  it('serves home, room links, and assets with correct content types', async () => {
    expect(await (await fetch(url)).text()).toBe('<main>News Town</main>');
    expect(await (await fetch(`${url}/r/ABCDE`)).text()).toBe('<main>News Town</main>');
    expect((await fetch(`${url}/assets/app.js`)).headers.get('content-type')).toContain('javascript');
    expect((await fetch(`${url}/assets/missing.js`)).status).toBe(404);
    const head = await fetch(url, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('never serves private files, source, or symlinks outside build directory', async () => {
    for (const path of ['/.env', '/src/server/index.ts', '/assets/escape.txt', '/%2eenv', '/assets/%2e%2e/%2eenv']) {
      const response = await fetch(`${url}${path}`);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('SHOULD_NOT_LEAK');
    }
  });

  it('serves percent-encoded TTF paths with the font MIME type for GET and HEAD', async () => {
    const fonts = join(directory, 'fonts', 'playfair-display');
    const font = Buffer.from('test font bytes');
    await mkdir(fonts, { recursive: true });
    await writeFile(join(fonts, 'PlayfairDisplay[wght].ttf'), font);
    const path = `${url}/fonts/playfair-display/PlayfairDisplay%5Bwght%5D.ttf`;

    const response = await fetch(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('font/ttf');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(font);

    const head = await fetch(path, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toBe('font/ttf');
    expect(head.headers.get('content-length')).toBe(String(font.length));
    expect(await head.text()).toBe('');

    await symlink('/etc/passwd', join(fonts, 'escape.ttf'));
    expect((await fetch(`${url}/fonts/playfair-display/escape.ttf`)).status).toBe(404);
  });
});
