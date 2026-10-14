import type { Server } from 'socket.io';
import { ActionIdSchema, AckSchema, CLIENT_EVENT, ClientMessageSchema, SERVER_EVENTS,
  type Ack, type ClientMessage } from '../shared/protocol.ts';
import type { Room, RoomManager } from './rooms.ts';
import { RoomError } from './rooms.ts';
import { clientAddress } from './proxy.ts';

export interface MatchHandlers {
  handle(room: Room, seatId: number, message: ClientMessage, nowMs: number): Ack['error'] | undefined;
  connection(room: Room, seatId: number, connected: boolean, nowMs: number): void;
}

export function broadcastRoom(io: Server, rooms: RoomManager, room: Room): void {
  for (const seat of room.seats) if (seat.socketId) {
    io.to(seat.socketId).emit(SERVER_EVENTS.room, rooms.snapshot(room.code, seat.seatId));
  }
}

export function registerSocketHandlers(io: Server, rooms: RoomManager, matches?: MatchHandlers, trustRenderProxy = false): void {
  io.on('connection', (socket) => {
    const receipts = new Map<string, Ack>();
    let windowStartMs = Date.now();
    let packets = 0;
    socket.on(CLIENT_EVENT, (raw: unknown) => {
      try {
        const nowMs = Date.now();
        if (nowMs - windowStartMs >= 60_000) { windowStartMs = nowMs; packets = 0; }
        if (++packets > 120) { socket.disconnect(true); return; }
        const parsed = ClientMessageSchema.safeParse(raw);
        const possibleId = raw && typeof raw === 'object' && 'actionId' in raw ? raw.actionId : undefined;
        const id = ActionIdSchema.safeParse(possibleId);
        if (!id.success) return;
        const current = rooms.authorized(socket.id);
        const previous = receipts.get(id.data) ?? current?.seat.receipts.get(id.data);
        if (previous) { socket.emit(SERVER_EVENTS.ack, previous); return; }
        // Preserve old results for the match lifetime; new IDs cannot grow memory forever.
        if (receipts.size >= 256 || (current?.seat.receipts.size ?? 0) >= 256) { socket.disconnect(true); return; }
        let ack: Ack = { actionId: id.data, ok: false, serverNowMs: nowMs };
        if (!parsed.success) ack.error = 'MALFORMED';
        else {
          const message = parsed.data;
          try {
            switch (message.type) {
              case 'createRoom':
              case 'playSolo': {
                ack.session = rooms.create(message, socket.id,
                  clientAddress(socket.handshake.address, socket.handshake.headers, trustRenderProxy), nowMs);
                if (message.type === 'playSolo') {
                  const error = matches?.handle(rooms.require(ack.session.code), ack.session.seatId,
                    { type: 'startMatch', actionId: message.actionId }, nowMs);
                  if (!matches || error) {
                    rooms.remove(ack.session.code);
                    throw new RoomError(error ?? 'NOT_ALLOWED');
                  }
                }
                break;
              }
              case 'joinRoom': ack.session = rooms.join(message.code, message, socket.id, nowMs); break;
              case 'reconnect': {
                ack.session = rooms.reconnect(message.code, message.token, socket.id, nowMs);
                matches?.connection(rooms.require(message.code), ack.session.seatId, true, nowMs);
                if (!rooms.rooms.has(message.code)) throw new RoomError('NOT_ALLOWED');
                break;
              }
              default: {
                if (!current) throw new RoomError('NOT_ALLOWED');
                const error = matches?.handle(current.room, current.seatId, message, nowMs);
                if (!matches || error) throw new RoomError(error ?? 'NOT_ALLOWED');
              }
            }
            ack.ok = true;
          } catch (error) {
            if (!(error instanceof RoomError)) console.error('News Town socket action failed.');
            const code = error instanceof RoomError ? error.code : 'NOT_ALLOWED';
            ack = { actionId: id.data, ok: false, error: code, serverNowMs: nowMs };
            if (code === 'COLOR_TAKEN' && message.type === 'joinRoom') {
              ack.takenColors = rooms.require(message.code).seats.map((seat) => seat.color);
            }
          }
        }
        ack = AckSchema.parse(ack);
        receipts.set(id.data, ack);
        const found = rooms.authorized(socket.id);
        found?.seat.receipts.set(id.data, ack);
        socket.emit(SERVER_EVENTS.ack, ack);
        if (found) {
          try { broadcastRoom(io, rooms, found.room); }
          catch { console.error('News Town room broadcast failed.'); }
        }
      } catch {
        console.error('News Town socket boundary failed.');
        const id = ActionIdSchema.safeParse(raw && typeof raw === 'object' && 'actionId' in raw ? raw.actionId : undefined);
        if (id.success) {
          const ack: Ack = { actionId: id.data, ok: false, error: 'NOT_ALLOWED', serverNowMs: Date.now() };
          receipts.set(id.data, ack);
          socket.emit(SERVER_EVENTS.ack, ack);
        }
      }
    });
    socket.on('disconnect', () => {
      try {
        const nowMs = Date.now();
        const found = rooms.disconnect(socket.id, nowMs);
        if (found) {
          matches?.connection(found.room, found.seatId, false, nowMs);
          broadcastRoom(io, rooms, found.room);
        }
      } catch { console.error('News Town socket disconnect failed.'); }
    });
  });
}
