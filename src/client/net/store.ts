import { AckSchema, ClientMessageSchema, RoomSnapshotSchema, SERVER_EVENTS,
  type ClientMessage, type RoomSnapshot, type SessionSchema } from '../../shared/protocol.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema, type PrivateSnapshot, type PublicSnapshot } from '../../shared/snapshots.ts';
import type { z } from 'zod';

type Payload<T extends ClientMessage['type']> = Omit<Extract<ClientMessage, { type: T }>, 'type' | 'actionId' | 'round' | 'phase'>;
type Session = z.infer<typeof SessionSchema>;
export interface ClientState {
  room: RoomSnapshot | null;
  session: Session | null;
  publicSnapshot: PublicSnapshot | null;
  privateSnapshot: PrivateSnapshot | null;
  connection: 'connected' | 'connecting' | 'disconnected';
  pending: readonly string[];
  error: string | null;
  serverOffsetMs: number;
}
export interface StoreOptions {
  send: (message: ClientMessage) => void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export function createClientStore(options: StoreOptions) {
  let state: ClientState = { room: null, session: null, publicSnapshot: null, privateSnapshot: null,
    connection: 'connecting', pending: [], error: null, serverOffsetMs: 0 };
  let latestPrivate: PrivateSnapshot | null = null;
  let latestPublic: PublicSnapshot | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();
  const pending = new Map<string, { message: ClientMessage; startedMs: number; timer: ReturnType<typeof setTimeout> }>();
  const update = (patch: Partial<ClientState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const snapshots = () => update({ publicSnapshot: latestPublic,
    privateSnapshot: latestPrivate?.version === latestPublic?.version ? latestPrivate : null });
  const clearSnapshots = () => { latestPrivate = null; latestPublic = null; update({ room: null, publicSnapshot: null, privateSnapshot: null }); };
  const send = (raw: unknown): string | null => {
    if (disposed) return null;
    const actionId = crypto.randomUUID();
    const parsed = ClientMessageSchema.safeParse({ ...(typeof raw === 'object' ? raw : {}), actionId });
    if (!parsed.success) { update({ error: 'Invalid action' }); return null; }
    const message = parsed.data;
    const startedMs = Date.now();
    let attempts = 0;
    const transmit = () => {
      if (disposed) return;
      if (attempts === 3) {
        pending.delete(actionId);
        update({ pending: [...pending.keys()], error: 'No server acknowledgment. Check connection and try again.' });
        return;
      }
      attempts++;
      const timer = setTimeout(transmit, 1000);
      pending.set(actionId, { message, startedMs, timer });
      options.send(message);
    };
    transmit();
    update({ pending: [...pending.keys()], error: null });
    return actionId;
  };
  const matchAction = (type: ClientMessage['type'], fields: object = {}) => {
    if (!state.publicSnapshot) { update({ error: 'Waiting for match snapshot' }); return null; }
    return send({ type, ...fields, round: state.publicSnapshot.round, phase: state.publicSnapshot.phase });
  };
  const reconnect = (code: string) => {
    try {
      const token = options.storage?.getItem(`news-town:${code.toUpperCase()}`);
      if (!token) { update({ error: 'No saved seat for this room' }); return null; }
      clearSnapshots();
      return send({ type: 'reconnect', code, token });
    } catch {
      update({ error: 'Browser storage unavailable; saved seat cannot be recovered.' });
      return null;
    }
  };
  return {
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    remainingMs: () => Math.max(0, (state.publicSnapshot?.deadlineMs ?? 0) - Date.now() - state.serverOffsetMs),
    actions: {
      createRoom: (profile: Payload<'createRoom'>) => { clearSnapshots(); return send({ type: 'createRoom', ...profile }); },
      playSolo: (profile: Payload<'playSolo'>) => { clearSnapshots(); return send({ type: 'playSolo', ...profile }); },
      joinRoom: (profile: Payload<'joinRoom'>) => { clearSnapshots(); return send({ type: 'joinRoom', ...profile }); },
      reconnect,
      startMatch: () => send({ type: 'startMatch' }),
      skipIntro: () => matchAction('skipIntro'),
      investigate: (payload: Payload<'investigate'>) => matchAction('investigate', payload),
      skipInvestigate: () => matchAction('skipInvestigate'),
      lockHeadline: (payload: Payload<'lockHeadline'>) => matchAction('lockHeadline', payload),
      skipWrite: () => matchAction('skipWrite'),
    },
    receive(event: string, raw: unknown) {
      if (disposed) return;
      switch (event) {
        case SERVER_EVENTS.ack: {
          const parsed = AckSchema.safeParse(raw);
          if (!parsed.success) { update({ error: 'Invalid server acknowledgment' }); return; }
          const ack = parsed.data;
          const action = pending.get(ack.actionId);
          if (!action) return;
          clearTimeout(action.timer);
          pending.delete(ack.actionId);
          update({ pending: [...pending.keys()], error: ack.ok ? null : ack.error ?? 'Action failed',
            serverOffsetMs: ack.serverNowMs - (action.startedMs + Date.now()) / 2 });
          if (!ack.ok && action.message.type === 'reconnect') {
            clearSnapshots();
            update({ session: null, error: ack.error === 'ROOM_NOT_FOUND' ? 'The presses stopped — this match ended' : 'Seat recovery failed' });
          }
          if (ack.ok && ack.session) {
            update({ session: ack.session });
            try { options.storage?.setItem(`news-town:${ack.session.code}`, ack.session.token); }
            catch { update({ error: 'Browser storage unavailable; refresh cannot recover this seat.' }); }
          }
          return;
        }
        case SERVER_EVENTS.room: {
          const result = RoomSnapshotSchema.safeParse(raw);
          if (result.success) update({ room: result.data });
          else update({ error: 'Invalid room snapshot' });
          return;
        }
        case SERVER_EVENTS.public: {
          const result = PublicSnapshotSchema.safeParse(raw);
          if (!result.success) { update({ error: 'Invalid public snapshot' }); return; }
          if (latestPublic && result.data.version <= latestPublic.version) return;
          latestPublic = result.data;
          snapshots();
          return;
        }
        case SERVER_EVENTS.private: {
          const result = PrivateSnapshotSchema.safeParse(raw);
          if (!result.success) { update({ error: 'Invalid private snapshot' }); return; }
          if (state.session && result.data.seatId !== state.session.seatId) return;
          if (latestPrivate && result.data.version <= latestPrivate.version) return;
          latestPrivate = result.data;
          snapshots();
        }
      }
    },
    setConnection(connection: ClientState['connection']) { if (!disposed) update({ connection }); },
    reset() {
      for (const action of pending.values()) clearTimeout(action.timer);
      pending.clear();
      clearSnapshots();
      update({ session: null, pending: [], error: null });
    },
    dispose() {
      disposed = true;
      for (const action of pending.values()) clearTimeout(action.timer);
      pending.clear();
      listeners.clear();
    },
  };
}
export type ClientStore = ReturnType<typeof createClientStore>;
