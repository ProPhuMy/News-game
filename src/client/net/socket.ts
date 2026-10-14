import { io } from 'socket.io-client';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS } from '../../shared/protocol.ts';
import { createClientStore } from './store.ts';

export function createSocketStore(url?: string) {
  const socket = io(url, { autoConnect: false });
  const storage = {
    getItem: (key: string) => globalThis.localStorage.getItem(key),
    setItem: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
  };
  let ready = false;
  let recoveryId: string | null = null;
  const store = createClientStore({ send: (message) => {
    if (socket.connected && (ready || message.type === 'reconnect')) socket.emit(CLIENT_EVENT, message);
  }, storage });
  let joined = false;
  socket.on('connect', () => {
    const session = store.getState().session;
    if (joined && session) {
      ready = false;
      store.setConnection('connecting');
      recoveryId = store.actions.reconnect(session.code);
    } else {
      ready = true;
      store.setConnection('connected');
    }
    joined = true;
  });
  socket.on('disconnect', () => { ready = false; store.setConnection('disconnected'); });
  socket.on('connect_error', () => store.setConnection('disconnected'));
  for (const event of Object.values(SERVER_EVENTS)) socket.on(event, (value: unknown) => {
    store.receive(event, value);
    if (event === SERVER_EVENTS.ack && recoveryId) {
      const ack = AckSchema.safeParse(value);
      if (ack.success && ack.data.actionId === recoveryId) {
        recoveryId = null;
        if (ack.data.ok) { ready = true; store.setConnection('connected'); }
      }
    }
  });
  return {
    ...store,
    connect: () => socket.connect(),
    disconnect() { socket.disconnect(); store.reset(); joined = false; },
    dispose() { socket.removeAllListeners(); socket.disconnect(); store.dispose(); },
  };
}
