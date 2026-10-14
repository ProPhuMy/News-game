import { randomInt } from 'node:crypto';
import { applyCommand, createMatch, privateView, publicView, tick as engineTick,
  type SeatInit } from '../engine/index.ts';
import { ContentSchema, type GameContent } from '../shared/content-schema.ts';
import { SERVER_EVENTS, type ClientMessage } from '../shared/protocol.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema } from '../shared/snapshots.ts';
import { TUNING } from '../shared/tuning.ts';
import type { Room, RoomManager } from './rooms.ts';

export function createMatchRunner(rooms: RoomManager, rawContent: GameContent,
  emit: (socketId: string, event: string, payload: unknown) => void) {
  const content = ContentSchema.parse(rawContent);
  let disposed = false;
  const publish = (room: Room) => {
    if (!room.state || disposed || !rooms.rooms.has(room.code)) return;
    const publicSnapshot = PublicSnapshotSchema.parse(publicView(room.state));
    for (const seat of room.seats) if (seat.socketId) {
      emit(seat.socketId, SERVER_EVENTS.public, publicSnapshot);
      emit(seat.socketId, SERVER_EVENTS.private, PrivateSnapshotSchema.parse(privateView(room.state, seat.seatId)));
    }
  };
  const advance = (room: Room, nowMs: number) => {
    if (!room.state) return;
    const result = engineTick(room.state, nowMs);
    const changed = result.state !== room.state;
    room.state = result.state;
    if (result.events.some((event) => event.type === 'matchEnded')) {
      room.status = 'finished';
      room.finishedAtMs = nowMs;
    }
    if (changed) publish(room);
  };
  return {
    handle(room: Room, seatId: number, message: ClientMessage, nowMs: number) {
      if (disposed) return 'NOT_ALLOWED' as const;
      if (message.type === 'startMatch') {
        if (room.hostSeatId !== seatId) return 'NOT_HOST' as const;
        if (room.status !== 'lobby') return 'MATCH_IN_PROGRESS' as const;
        const seats = Array.from({ length: TUNING.seats }, (_, index): SeatInit => {
          const human = room.seats.find((seat) => seat.seatId === index);
          return human ? { kind: 'human', displayName: human.displayName, paperName: human.paperName, color: human.color }
            : { kind: 'bot' };
        });
        room.state = createMatch({ content, startMs: nowMs }, randomInt(0x1_0000_0000), seats);
        room.status = 'playing';
        for (const seat of room.seats) if (!seat.socketId) {
          room.state = applyCommand(room.state, seat.seatId, { type: 'connection', connected: false }, nowMs).state;
        }
        publish(room);
        return undefined;
      }
      if (!room.state || room.status !== 'playing') return 'NOT_ALLOWED' as const;
      switch (message.type) {
        case 'skipIntro': case 'investigate': case 'skipInvestigate': case 'lockHeadline': case 'skipWrite': {
          const outcome = applyCommand(room.state, seatId, message, nowMs);
          if (!outcome.result.ok) return outcome.result.error;
          room.state = outcome.state;
          advance(room, nowMs);
          publish(room);
          return undefined;
        }
        default: return 'NOT_ALLOWED' as const;
      }
    },
    connection(room: Room, seatId: number, connected: boolean, nowMs: number) {
      if (!room.state || disposed) return;
      room.state = applyCommand(room.state, seatId, { type: 'connection', connected }, nowMs).state;
      advance(room, nowMs);
      publish(room);
    },
    tick(nowMs: number) {
      if (disposed) return;
      for (const room of rooms.rooms.values()) {
        const lifetime = room.status === 'lobby' ? TUNING.roomLifetimeMs.emptyLobby : TUNING.roomLifetimeMs.noHumans;
        const abandoned = room.status !== 'finished' && room.emptySinceMs !== null && nowMs - room.emptySinceMs >= lifetime;
        const expired = room.finishedAtMs !== null && nowMs - room.finishedAtMs >= TUNING.roomLifetimeMs.finished;
        if (abandoned || expired) { rooms.remove(room.code); continue; }
        advance(room, nowMs);
      }
    },
    dispose() { disposed = true; },
  };
}
