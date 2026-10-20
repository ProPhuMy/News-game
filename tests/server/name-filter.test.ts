import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { content, NAME_FILTER_EXAMPLES } from '../../src/content/index.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS } from '../../src/shared/protocol.ts';
import { COLORS } from '../../src/shared/ids.ts';

const profile = { displayName: 'Ada', paperName: 'Town Daily', color: COLORS[1] };
const examples = [
  ...NAME_FILTER_EXAMPLES.accepted.map(name => ({ name, accepted: true })),
  ...NAME_FILTER_EXAMPLES.rejected.map(name => ({ name, accepted: false })),
];

describe('content-backed name policy at the real socket boundary', () => {
  let game: Awaited<ReturnType<typeof createGameServer>>;
  let url: string;
  const clients: Socket[] = [];
  beforeEach(async () => {
    game = await createGameServer({ content, ai: { provider: 'none' } });
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => { for (const client of clients.splice(0)) client.disconnect(); await game.close(); });
  const connect = async () => {
    const client = io(url, { transports: ['websocket'], forceNew: true }); clients.push(client);
    await new Promise<void>(resolve => client.once('connect', resolve));
    return client;
  };
  const command = (client: Socket, message: unknown) => new Promise<ReturnType<typeof AckSchema.parse>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('missing acknowledgment')), 2000);
    client.once(SERVER_EVENTS.ack, (raw: unknown) => { clearTimeout(timer); resolve(AckSchema.parse(raw)); });
    client.emit(CLIENT_EVENT, message);
  });
  const setup = async (type: string) => {
    if (type !== 'joinRoom') return undefined;
    const host = await connect();
    const ack = await command(host, { ...profile, color: COLORS[0], type: 'createRoom', actionId: 'host' });
    expect(ack.ok).toBe(true);
    return ack.session!.code;
  };

  for (const type of ['createRoom', 'playSolo', 'joinRoom'] as const) {
    for (const field of ['displayName', 'paperName'] as const) {
      describe(`${type} / ${field}`, () => {
        it.each(examples)('$name accepted=$accepted', async ({ name, accepted }) => {
          const code = await setup(type); const client = await connect();
          const before = [...game.rooms.rooms.values()].map(room => JSON.stringify(room.seats));
          const ack = await command(client, { ...profile, [field]: name, type, actionId: 'name', ...(code ? { code } : {}) });
          if (accepted) {
            expect(ack.ok).toBe(true);
            const seat = game.rooms.require(ack.session!.code).seats[ack.session!.seatId]!;
            expect(seat[field]).toBe(name);
          } else {
            expect(ack).toMatchObject({ ok: false, error: 'FILTERED' });
            expect(ack.session).toBeUndefined();
            expect([...game.rooms.rooms.values()].map(room => JSON.stringify(room.seats))).toEqual(before);
            expect(game.rooms.authorized(client.id!)).toBeUndefined();
            const corrected = await command(client, { ...profile, type, actionId: 'corrected', ...(code ? { code } : {}) });
            expect(corrected.ok).toBe(true);
            expect(corrected.session!.seatId).toBe(type === 'joinRoom' ? 1 : 0);
          }
        });
        it('applies schema cleaning before the filter and rejects invalid lengths first', async () => {
          const code = await setup(type); const client = await connect();
          for (const [i, name] of ['', `shit ${'x'.repeat(25)}`].entries()) {
            expect(await command(client, { ...profile, [field]: name, type, actionId: `bad-${i}`, ...(code ? { code } : {}) }))
              .toMatchObject({ ok: false, error: 'MALFORMED' });
          }
          const cleaned = await command(client, { ...profile, [field]: '  Ada\u200BPress  ', type, actionId: 'cleaned', ...(code ? { code } : {}) });
          expect(cleaned.ok).toBe(true);
          expect(game.rooms.require(cleaned.session!.code).seats[cleaned.session!.seatId]![field]).toBe('Ada Press');
        });
      });
    }
  }
});
