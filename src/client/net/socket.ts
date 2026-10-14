import { io } from 'socket.io-client';
import { CLIENT_EVENT, SERVER_EVENTS } from '../../shared/protocol.ts';
import { createClientStore } from './store.ts';

export function createSocketStore(url?: string) {
  const socket = io(url, { autoConnect: false });
  const storage = {
    getItem: (key: string) => globalThis.localStorage.getItem(key),
    setItem: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
  };
  const store = createClientStore({ send: (message) => socket.emit(CLIENT_EVENT, message), storage });
  let joined = false;
  socket.on('connect', () => {
    store.setConnection('connected');
    const session = store.getState().session;
    if (joined && session) store.actions.reconnect(session.code);
    joined = true;
  });
  socket.on('disconnect', () => store.setConnection('disconnected'));
  socket.on('connect_error', () => store.setConnection('disconnected'));
  for (const event of Object.values(SERVER_EVENTS)) socket.on(event, (value: unknown) => store.receive(event, value));
  return {
    ...store,
    connect: () => socket.connect(),
    disconnect() { socket.disconnect(); store.reset(); joined = false; },
    dispose() { socket.removeAllListeners(); socket.disconnect(); store.dispose(); },
  };
}
