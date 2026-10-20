import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { content, NAME_FILTER_EXAMPLES } from '../../src/content/index.ts';
import { createClientStore } from '../../src/client/net/store.ts';
import { formatErrorMessage } from '../../src/client/ui/mapper.ts';
import { CLIENT_EVENT, SERVER_EVENTS } from '../../src/shared/protocol.ts';
import { COLORS } from '../../src/shared/ids.ts';

type Store = ReturnType<typeof createClientStore>;
const waitForAck = (store: Store, id: string | null) => new Promise<void>((resolve, reject) => {
  if (!id) { reject(new Error('action was not sent')); return; }
  const timer = setTimeout(() => { unsubscribe(); reject(new Error('missing acknowledgment')); }, 2000);
  const check = () => { if (!store.getState().pending.includes(id)) { clearTimeout(timer); unsubscribe(); resolve(); } };
  const unsubscribe = store.subscribe(check); check();
});
const profile = { displayName: 'Ada', paperName: 'Town Daily', color: COLORS[1] };

describe('real setup rejection and correction through the store', () => {
  let game: Awaited<ReturnType<typeof createGameServer>>;
  let url: string;
  const connections: { socket: Socket; store: Store }[] = [];
  beforeEach(async () => {
    game = await createGameServer({ content, ai: { provider: 'none' } }); await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => { for (const { socket, store } of connections.splice(0)) { socket.disconnect(); store.dispose(); } await game.close(); });
  const connect = async () => {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    const store = createClientStore({ send: message => { socket.emit(CLIENT_EVENT, message); } });
    for (const event of Object.values(SERVER_EVENTS)) socket.on(event, (raw: unknown) => store.receive(event, raw));
    connections.push({ socket, store });
    await new Promise<void>(resolve => socket.once('connect', resolve)); store.setConnection('connected');
    return store;
  };
  for (const type of ['createRoom', 'playSolo', 'joinRoom'] as const) for (const field of ['displayName', 'paperName'] as const) {
    it(`${type} / ${field} shows approved copy and accepts a corrected name`, async () => {
      let code: string | undefined;
      if (type === 'joinRoom') {
        const host = await connect();
        await waitForAck(host, host.actions.createRoom({ ...profile, color: COLORS[0] }));
        code = host.getState().session!.code;
      }
      const store = await connect();
      const submit = (names: typeof profile) => type === 'joinRoom'
        ? store.actions.joinRoom({ ...names, code: code! }) : store.actions[type](names);
      await waitForAck(store, submit({ ...profile, [field]: NAME_FILTER_EXAMPLES.rejected[0]! }));
      expect(store.getState().session).toBeNull();
      expect(store.getState().error).toBe('FILTERED');
      expect(formatErrorMessage(store.getState().error, 'setup')).toBe('That name contains blocked language. Please choose another.');
      await waitForAck(store, submit(profile));
      expect(store.getState().error).toBeNull();
      const session = store.getState().session!;
      expect(game.rooms.require(session.code).seats[session.seatId]![field]).toBe(profile[field]);
    });
  }
});
