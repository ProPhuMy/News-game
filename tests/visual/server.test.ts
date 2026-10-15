import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { freePort, waitForHttp } from '../../scripts/visual/server.ts';

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
