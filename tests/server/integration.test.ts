import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { createClientStore } from '../../src/client/net/store.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS, type Ack, type ClientMessage } from '../../src/shared/protocol.ts';
import { PublicSnapshotSchema } from '../../src/shared/snapshots.ts';

const receive = (socket: Socket, event: string, predicate: (data: unknown) => boolean = () => true) =>
  new Promise<unknown>((resolve, reject) => {
    const listener = (data: unknown) => {
      if (!predicate(data)) return;
      clearTimeout(timer); socket.off(event, listener); resolve(data);
    };
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Missing ${event}`)); }, 2000);
    socket.on(event, listener);
  });

describe('integrated socket service with M0 engine', () => {
  let game: Awaited<ReturnType<typeof createGameServer>>;
  let url: string;
  const clients: Socket[] = [];
  beforeEach(async () => {
    game = await createGameServer({ content: SAMPLE_CONTENT });
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => { for (const socket of clients.splice(0)) socket.disconnect(); await game.close(); });
  const connect = async () => {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    await receive(socket, 'connect');
    return socket;
  };
  const command = async (socket: Socket, message: unknown): Promise<Ack> => {
    const promise = receive(socket, SERVER_EVENTS.ack);
    socket.emit(CLIENT_EVENT, message);
    return AckSchema.parse(await promise);
  };

  it('runs three clients through five rounds with valid isolated snapshots and stale rejection', async () => {
    const sockets = await Promise.all([connect(), connect(), connect()]);
    const payloads: unknown[] = [];
    for (const socket of sockets) socket.on(SERVER_EVENTS.public, (data: unknown) => payloads.push(data));
    const first = await command(sockets[0]!, { type: 'createRoom', actionId: 'create', displayName: 'One', paperName: 'Daily', color: 'red' });
    for (let i = 1; i < 3; i++) {
      const joined = await command(sockets[i]!, { type: 'joinRoom', actionId: 'join', code: first.session!.code,
        displayName: `Editor ${i}`, paperName: 'Weekly', color: i === 1 ? 'blue' : 'green' });
      expect(joined.ok).toBe(true);
    }
    expect((await command(sockets[0]!, { type: 'startMatch', actionId: 'start' })).ok).toBe(true);
    const room = game.rooms.require(first.session!.code);
    expect(await command(sockets[1]!, { type: 'skipIntro', actionId: 'stale', round: 1, phase: 'intro' }))
      .toMatchObject({ ok: false, error: 'STALE_PHASE' });
    for (let step = 0; step < 17; step++) {
      const expected = room.state!.version + 1;
      const next = receive(sockets[2]!, SERVER_EVENTS.public, (data) => PublicSnapshotSchema.parse(data).version >= expected);
      game.runner.tick(room.state!.deadlineMs);
      expect(PublicSnapshotSchema.safeParse(await next).success).toBe(true);
    }
    expect(room.state!.phase).toBe('ended');
    expect(room.state!.round).toBe(5);
    for (const payload of payloads) expect(JSON.stringify(payload)).not.toMatch(/gullibility|templateId|"tip"|"proofs"|"token"|"isTrue"/);
  });

  it('starts solo immediately and restores one token-authorized seat', async () => {
    const socket = await connect();
    const solo = await command(socket, { type: 'playSolo', actionId: 'solo', displayName: 'One', paperName: 'Daily', color: 'red' });
    const room = game.rooms.require(solo.session!.code);
    expect(room.state!.seats.filter((seat) => seat.controller === 'bot')).toHaveLength(3);
    socket.disconnect();
    const replacement = await connect();
    expect(await command(replacement, { type: 'reconnect', actionId: 'bad', code: solo.session!.code, token: '0'.repeat(32) }))
      .toMatchObject({ ok: false, error: 'BAD_TOKEN' });
    expect((await command(replacement, { type: 'reconnect', actionId: 'recover', code: solo.session!.code, token: solo.session!.token })).session)
      .toEqual(solo.session);
    expect(room.state!.seats[0]!.controller).toBe('human');
  });

  it('reports ended match through client store after a server restart', async () => {
    const socket = await connect();
    const saved = await command(socket, { type: 'playSolo', actionId: 'solo', displayName: 'One', paperName: 'Daily', color: 'red' });
    await game.close();
    game = await createGameServer({ content: SAMPLE_CONTENT });
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing port');
    url = `http://127.0.0.1:${address.port}`;
    const replacement = await connect();
    const store = createClientStore({ send: (message: ClientMessage) => replacement.emit(CLIENT_EVENT, message),
      storage: { getItem: () => saved.session!.token, setItem: () => {} } });
    const ack = receive(replacement, SERVER_EVENTS.ack);
    store.actions.reconnect(saved.session!.code);
    store.receive(SERVER_EVENTS.ack, await ack);
    expect(store.getState().error).toBe('The presses stopped — this match ended');
    expect(game.rooms.rooms.size).toBe(0);
    store.dispose();
  });
});
