import { io, type Socket } from 'socket.io-client';
import { describe, expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { content } from '../../src/content/index.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS, type Ack } from '../../src/shared/protocol.ts';
import { COLORS } from '../../src/shared/ids.ts';

describe('configured proxy integration', () => {
  it.each(['websocket', 'polling'])('preserves client creation budgets on %s', async transport => {
    const game = await createGameServer({ content, trustedProxyAddress: '127.0.0.1' });
    const clients: Socket[] = [];
    await game.listen(0);
    try {
      const address = game.http.address();
      if (!address || typeof address === 'string') throw new Error('Missing test port');
      const create = async (ip: string, index: number): Promise<Ack> => {
        const client = io(`http://127.0.0.1:${address.port}`, {
          transports: [transport], forceNew: true, reconnection: false,
          extraHeaders: { 'x-real-ip': ip, 'x-forwarded-for': 'spoofed', 'cf-connecting-ip': `198.51.100.${index + 1}` },
        });
        clients.push(client);
        await new Promise<void>((resolve, reject) => {
          client.once('connect', resolve); client.once('connect_error', reject);
        });
        return new Promise<Ack>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Missing acknowledgment')), 2000);
          client.once(SERVER_EVENTS.ack, (raw: unknown) => { clearTimeout(timer); resolve(AckSchema.parse(raw)); });
          client.emit(CLIENT_EVENT, { type: 'createRoom', actionId: `create-${index}`,
            displayName: 'Editor', paperName: 'Daily', color: COLORS[0] });
        });
      };
      for (let index = 0; index < 11; index++) expect((await create(`192.0.2.${index + 1}`, index)).ok).toBe(true);
      for (let index = 11; index < 20; index++) expect((await create('192.0.2.1', index)).ok).toBe(true);
      expect(await create('192.0.2.1', 20)).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
    } finally {
      for (const client of clients) client.disconnect();
      await game.close();
    }
  });

  it.each(['SECRET-invalid-address', '127.0.0.1, 192.0.2.1', '127.0.0.1/8'])('rejects invalid proxy configuration: %s', async address => {
    await expect(createGameServer({ content, trustedProxyAddress: address })).rejects.toThrow('Invalid TRUSTED_PROXY_ADDRESS');
  });

  it('rejects combined Render and local-proxy trust before server initialization', async () => {
    await expect(createGameServer({ content, trustRenderProxy: true, trustedProxyAddress: '127.0.0.1' }))
      .rejects.toThrow('Proxy trust modes must not be combined');
  });
});
