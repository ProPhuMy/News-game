import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/shared/tuning.ts';
import { parseSmokeOptions, fetchSmokeResource, requireCleanWatch, decodeSmokePackets, SMOKE_PHASE_TIMEOUT_MS } from '../../deployment/D4-smoke-options.ts';

describe('deployment smoke options', () => {
  it('allows the longest full phase to expire with ten seconds of browser slack', () => {
    for (const phaseMs of [...Object.values(TUNING.phaseMs), TUNING.firstRoundInvestigateMs]) {
      expect(SMOKE_PHASE_TIMEOUT_MS).toBeGreaterThanOrEqual(phaseMs + 10_000);
    }
  });

  it('rejects browser diagnostics before returning sidecar data, without disclosing their text', async () => {
    const watch = requireCleanWatch({ snapshot: async () => ({ stylesheets: [], consoleErrors: ['SYNTHETIC-PRIVATE-TOKEN'] }) });
    await expect(watch.snapshot()).rejects.toThrow(/^Browser errors occurred$/);
  });

  it('preserves clean capture evidence', async () => {
    const evidence = { stylesheets: [], consoleErrors: [] };
    expect(await requireCleanWatch({ snapshot: async () => evidence }).snapshot()).toEqual(evidence);
  });

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


describe('smoke transport event decoding', () => {
  it('reads recovery acknowledgments and private events batched in HTTP polling', () => {
    const ack = ['ack', { actionId: 'recovery', serverNowMs: 1000, ok: true, session: { code: 'ABCDE', seatId: 1, token: 'a'.repeat(32) } }];
    const privateView = ['private', { version: 1, seatId: 1, tip: null, evidence: [], proofs: [], investigations: [], acted: false, lockedHeadline: null, extra: 'retain-for-privacy-checks' }];
    expect(decodeSmokePackets(`40{}\x1e42${JSON.stringify(ack)}\x1e2\x1e42${JSON.stringify(privateView)}`))
      .toEqual([ack, privateView]);
  });

  it('reads the same event format on WebSocket and ignores transport controls', () => {
    const ack = ['ack', { actionId: 'skip', ok: true, serverNowMs: 1000 }];
    expect(decodeSmokePackets(`42${JSON.stringify(ack)}`)).toEqual([ack]);
    for (const control of ['0{}', '2', '3probe', '5', '6', '']) expect(decodeSmokePackets(control)).toEqual([]);
  });

  it('rejects malformed event payloads without echoing private contents', () => {
    for (const payload of ['42SYNTHETIC-PRIVATE-TOKEN', '42{}', '42[]', '42[1,{}]'])
      expect(() => decodeSmokePackets(payload)).toThrow(/^Invalid Socket.IO event payload$/);
  });
});
