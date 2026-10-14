import { createServer } from 'node:http';
import { once } from 'node:events';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomManager } from '../../src/server/rooms.ts';
import { registerSocketHandlers, type MatchHandlers } from '../../src/server/socket.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS } from '../../src/shared/protocol.ts';

const received = (socket: Socket, event: string) => new Promise<unknown>((resolve) => socket.once(event, resolve));

describe('socket boundary', () => {
  const clients: Socket[] = [];
  let server: Server;
  let url: string;
  let handlers: MatchHandlers;
  let rooms: ReturnType<typeof createRoomManager>;
  beforeEach(async () => {
    const http = createServer();
    server = new Server(http);
    rooms = createRoomManager();
    handlers = { handle: () => 'NOT_ALLOWED', connection: () => {} };
    registerSocketHandlers(server, rooms, { handle: (...args) => handlers.handle(...args), connection: (...args) => handlers.connection(...args) });
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

  it('acknowledges unexpected handler errors once without logging secrets', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const client = await connect();
      await command(client, create);
      const handle = vi.fn(() => { throw new Error('SECRET-payload-and-key'); });
      handlers.handle = handle;
      const request = { type: 'startMatch', actionId: 'bug' };
      const ack = await command(client, request);
      expect(ack).toMatchObject({ actionId: 'bug', ok: false, error: 'NOT_ALLOWED' });
      expect(await command(client, request)).toEqual(ack);
      expect(handle).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
      const healthy = await connect();
      expect((await command(healthy, create)).ok).toBe(true);
    } finally { log.mockRestore(); }
  });

  it('rejects reconnect when its connection handler closes the failed room', async () => {
    const client = await connect();
    const first = await command(client, create);
    handlers.connection = (room) => rooms.remove(room.code);
    const ack = await command(client, { type: 'reconnect', actionId: 'broken-reconnect',
      code: first.session!.code, token: first.session!.token });
    expect(ack).toMatchObject({ ok: false, error: 'NOT_ALLOWED' });
    expect(ack.session).toBeUndefined();
  });

  it('contains errors before command dispatch and still acknowledges the action', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const client = await connect();
      vi.spyOn(rooms, 'authorized').mockImplementationOnce(() => { throw new Error('SECRET-before-dispatch'); });
      expect(await command(client, { type: 'startMatch', actionId: 'early-bug' }))
        .toMatchObject({ actionId: 'early-bug', ok: false, error: 'NOT_ALLOWED' });
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
    } finally { log.mockRestore(); }
  });

  it('contains unexpected disconnect-handler errors without logging their payload', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const client = await connect();
      await command(client, create);
      handlers.connection = () => { throw new Error('SECRET-disconnect'); };
      client.disconnect();
      await vi.waitFor(() => expect(log).toHaveBeenCalled());
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
      expect((await command(await connect(), create)).ok).toBe(true);
    } finally { log.mockRestore(); }
  });

  it('disconnects packet floods before allocating unbounded receipt entries', async () => {
    const client = await connect();
    const disconnected = received(client, 'disconnect');
    for (let i = 0; i < 120; i++) await command(client, { type: 'startMatch', actionId: `flood-${i}` });
    client.emit(CLIENT_EVENT, { type: 'startMatch', actionId: 'overflow' });
    expect(await disconnected).toBe('io server disconnect');
  });

  it('retains accepted acknowledgments and stops new IDs when seat receipts reach capacity', async () => {
    let client = await connect();
    const first = await command(client, create);
    for (let i = 0; i < 253; i++) {
      if (i === 80 || i === 160) {
        client = await connect();
        await command(client, { type: 'reconnect', actionId: `recover-${i}`, code: first.session!.code, token: first.session!.token });
      }
      await command(client, { type: 'startMatch', actionId: `error-${i}` });
    }
    expect(await command(client, create)).toEqual(first);
    const disconnected = received(client, 'disconnect');
    client.emit(CLIENT_EVENT, { type: 'startMatch', actionId: 'overflow' });
    expect(await disconnected).toBe('io server disconnect');
    expect(rooms.require(first.session!.code).seats[0]!.receipts.size).toBe(256);
  });
});
