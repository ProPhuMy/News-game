import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freePort, startGameServer, waitForHttp, waitForServer } from '../../scripts/visual/server.ts';

describe('freePort', () => {
  it('returns a usable port number', async () => {
    const port = await freePort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
  });
});

describe('waitForHttp', () => {
  it('resolves once the server answers 200', async () => {
    const server = createServer((_req, res) => res.end('ok'));
    const port = await freePort();
    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
    try {
      await expect(waitForHttp(`http://127.0.0.1:${port}/`, 2000)).resolves.toBeUndefined();
    } finally {
      server.close();
    }
  });

  it('rejects after the timeout when nothing listens', async () => {
    const port = await freePort();
    await expect(waitForHttp(`http://127.0.0.1:${port}/`, 300)).rejects.toThrow(/did not answer within 300 ms/);
  });
});

describe('waitForServer', () => {
  it('fails at once with the exit code and log when the server dies at startup', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'news-town-visual-'));
    const entry = join(dir, 'crash.mjs');
    await writeFile(entry, "console.error('listen EADDRINUSE'); process.exit(3);\n");
    const port = await freePort();
    const server = startGameServer({ port, prod: false, entry });
    const started = Date.now();
    try {
      await expect(waitForServer(server, `http://127.0.0.1:${port}/`, 10_000)).rejects.toThrow(
        /server exited with code 3 before answering[\s\S]*listen EADDRINUSE/,
      );
      expect(Date.now() - started).toBeLessThan(5_000);
    } finally {
      server.stop();
    }
  });
});
