import { content as nameFilterContent } from '../../src/content/index.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { createServer } from 'node:http';
import { Server, type Socket as ServerSocket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSocketStore } from '../../src/client/net/socket.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { createMatchRunner } from '../../src/server/matches.ts';
import { registerSocketHandlers } from '../../src/server/socket.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { AckSchema, CLIENT_EVENT, ClientMessageSchema, SERVER_EVENTS } from '../../src/shared/protocol.ts';
import { COLORS } from '../../src/shared/ids.ts';

const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
const waitFor = (store: ReturnType<typeof createSocketStore>, predicate: () => boolean) => new Promise<void>((resolve, reject) => {
  if (predicate()) { resolve(); return; }
  const stop = store.subscribe(() => {
    if (predicate()) { clearTimeout(timer); stop(); resolve(); }
  });
  const timer = setTimeout(() => { stop(); reject(new Error('Missing store transition')); }, 4000);
});

describe('socket-store reconnect ordering', () => {
  let server: Server;
  let rooms: ReturnType<typeof createRoomManager>;
  let store: ReturnType<typeof createSocketStore>;
  let currentSocket: ServerSocket;
  let dropType: string | null;
  const received: { socket: string; type: string; id: string }[] = [];
  beforeEach(async () => {
    const saved = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => { saved.set(key, value); } });
    const http = createServer();
    server = new Server(http);
    rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
    dropType = null;
    received.length = 0;
    server.on('connection', (socket) => {
      currentSocket = socket;
      const emit = socket.emit.bind(socket);
      let lostId: string | null = null;
      socket.on(CLIENT_EVENT, (raw: unknown) => {
        const message = ClientMessageSchema.parse(raw);
        received.push({ socket: socket.id, type: message.type, id: message.actionId });
        if (message.type === dropType) { lostId = message.actionId; dropType = null; }
      });
      socket.emit = (event: string, ...args: unknown[]) => {
        if (event === SERVER_EVENTS.ack && AckSchema.parse(args[0]).actionId === lostId) {
          lostId = null;
          setTimeout(() => socket.conn.close(), 0);
          return true;
        }
        return emit(event, ...args);
      };
    });
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, (id, event, payload) => server.to(id).emit(event, payload));
    registerSocketHandlers(server, rooms, runner);
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    if (!address || typeof address === 'string') throw new Error('missing port');
    store = createSocketStore(`http://127.0.0.1:${address.port}`);
    const socket = store.connect();
    socket.io.reconnectionDelay(1200).reconnectionDelayMax(1200).randomizationFactor(0);
    await waitFor(store, () => store.getState().connection === 'connected');
  });
  afterEach(async () => { store.dispose(); vi.unstubAllGlobals(); await new Promise<void>((resolve) => server.close(() => resolve())); });

  it('reclaims seat before retrying an accepted match action with a lost ack', async () => {
    const created = store.actions.createRoom(profile)!;
    await waitFor(store, () => !store.getState().pending.includes(created));
    const firstSocket = currentSocket.id;
    dropType = 'startMatch';
    const id = store.actions.startMatch()!;
    await waitFor(store, () => store.getState().connection === 'disconnected');
    await waitFor(store, () => !store.getState().pending.includes(id));
    expect(store.getState().error).toBeNull();
    const replay = received.filter((message) => message.socket !== firstSocket);
    expect(replay[0]?.type).toBe('reconnect');
    expect(replay.find((message) => message.type === 'startMatch')?.id).toBe(id);
  });

  it('does not replay uncertain room creation on a new socket', async () => {
    dropType = 'createRoom';
    const id = store.actions.createRoom(profile)!;
    await waitFor(store, () => store.getState().connection === 'disconnected');
    await waitFor(store, () => store.getState().connection === 'connected');
    await waitFor(store, () => !store.getState().pending.includes(id));
    expect(rooms.rooms.size).toBe(1);
    expect(received.filter((message) => message.type === 'createRoom')).toHaveLength(1);
    expect(store.getState().error).toContain('before seat was saved');
  });
});
