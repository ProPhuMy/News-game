import { createServer } from 'node:http';
import { once } from 'node:events';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoomManager } from '../../src/server/rooms.ts';
import { registerSocketHandlers } from '../../src/server/socket.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS } from '../../src/shared/protocol.ts';

const received = (socket: Socket, event: string) => new Promise<unknown>((resolve) => socket.once(event, resolve));

describe('socket boundary', () => {
  const clients: Socket[] = [];
  let server: Server;
  let url: string;
  let rooms: ReturnType<typeof createRoomManager>;
  beforeEach(async () => {
    const http = createServer();
    server = new Server(http);
    rooms = createRoomManager();
    registerSocketHandlers(server, rooms);
    http.listen(0, '127.0.0.1');
    await once(http, 'listening');
    const address = http.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const connect = async () => {
    const client = io(url, { transports: ['websocket'], forceNew: true });
    clients.push(client);
    await received(client, 'connect');
    return client;
  };
  const command = async (client: Socket, message: unknown) => {
    const ack = received(client, SERVER_EVENTS.ack);
    client.emit(CLIENT_EVENT, message);
    return AckSchema.parse(await ack);
  };
  const create = { type: 'createRoom', actionId: 'create', displayName: 'Editor', paperName: 'Daily', color: 'red' };

  it('rejects malformed and unauthorized commands', async () => {
    const client = await connect();
    expect(await command(client, { type: 'createRoom', actionId: 'bad' })).toMatchObject({ ok: false, error: 'MALFORMED' });
    expect(await command(client, { type: 'startMatch', actionId: 'start' })).toMatchObject({ ok: false, error: 'NOT_ALLOWED' });
    expect(rooms.rooms.size).toBe(0);
  });
  it('returns original acknowledgment without repeating creation', async () => {
    const client = await connect();
    const first = await command(client, create);
    expect(first.ok).toBe(true);
    expect(await command(client, { ...create, paperName: 'Changed' })).toEqual(first);
    expect(rooms.rooms.size).toBe(1);
    expect(rooms.require(first.session!.code).seats[0]?.paperName).toBe('Daily');
    const second = await connect();
    expect((await command(second, create)).ok).toBe(true);
    expect(rooms.rooms.size).toBe(2);
  });
  it('sends private credentials only in the joining socket acknowledgment', async () => {
    const host = await connect();
    const ack = await command(host, create);
    const outsider = await connect();
    const viewPromise = received(host, SERVER_EVENTS.room);
    const joined = await command(outsider, { ...create, type: 'joinRoom', actionId: 'join', code: ack.session!.code, color: 'blue' });
    expect(joined.ok).toBe(true);
    const view = JSON.stringify(await viewPromise);
    expect(view).not.toContain(ack.session!.token);
    expect(view).not.toContain(joined.session!.token);
    expect(await command(outsider, { type: 'reconnect', actionId: 'bad-token', code: ack.session!.code, token: '0'.repeat(32) }))
      .toMatchObject({ ok: false, error: 'BAD_TOKEN' });
  });
});
