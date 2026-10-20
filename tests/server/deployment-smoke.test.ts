import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { parseSmokeOptions, fetchSmokeResource } from '../../deployment/D4-smoke-options.ts';

describe('deployment smoke options', () => {
  it('preserves the local default and explicit local target', () => {
    expect(parseSmokeOptions([])).toEqual({ origin: 'http://127.0.0.1:3000', remote: false, out: null });
    expect(parseSmokeOptions(['http://127.0.0.1:45335']).origin).toBe('http://127.0.0.1:45335');
    expect(parseSmokeOptions(['http://[::1]:3000']).remote).toBe(false);
  });

  it('requires explicit HTTPS remote opt-in', () => {
    expect(() => parseSmokeOptions(['https://example.com'])).toThrow('Local HTTP target required');
    expect(() => parseSmokeOptions(['http://example.com', '--remote'])).toThrow('HTTPS target required');
    expect(parseSmokeOptions(['https://example.com/', '--remote', '--out', 'deployment/D4-smoke-result.json']))
      .toEqual({ origin: 'https://example.com', remote: true, out: 'deployment/D4-smoke-result.json' });
  });

  it.each(['https://user:secret@example.com', 'https://example.com/path', 'https://example.com/?token=secret',
    'https://example.com/#secret', 'invalid'])('rejects unsafe target without echoing it: %s', target => {
    expect(() => parseSmokeOptions([target, '--remote'])).toThrow();
    try { parseSmokeOptions([target, '--remote']); } catch (error) {
      expect(String(error)).not.toContain('secret');
    }
  });

  it.each([['--out'], ['--out', 'file.png'], ['--out', 'bad\0.json'], ['--unknown'],
    ['https://example.com', 'https://other.example', '--remote'], ['--remote']])('rejects malformed arguments: %j', (...args) => {
    expect(() => parseSmokeOptions(args)).toThrow();
  });

  it('does not follow a redirect to another endpoint', async () => {
    let destinationHits = 0;
    const server = createServer((request, response) => {
      if (request.url === '/redirect') response.writeHead(302, { location: '/destination' }).end();
      else { destinationHits++; response.end('unexpected'); }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing address');
      await expect(fetchSmokeResource(`http://127.0.0.1:${address.port}/redirect`)).rejects.toThrow();
      expect(destinationHits).toBe(0);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
