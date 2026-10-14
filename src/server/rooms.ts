import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { MatchState } from '../engine/index.ts';
import type { Color, ErrorCode, SeatId } from '../shared/ids.ts';
import type { Ack, RoomSnapshot } from '../shared/protocol.ts';
import { TUNING } from '../shared/tuning.ts';

export interface Profile { displayName: string; paperName: string; color: Color }
export interface HumanSeat extends Profile {
  seatId: SeatId;
  token: string;
  socketId: string | null;
  receipts: Map<string, Ack>;
}
export interface Room {
  code: string;
  status: RoomSnapshot['status'];
  hostSeatId: SeatId | null;
  seats: HumanSeat[];
  state: MatchState | null;
  emptySinceMs: number | null;
  finishedAtMs: number | null;
}
export class RoomError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) { super(code); this.code = code; }
}

export function createRoomManager() {
  const rooms = new Map<string, Room>();
  const creations = new Map<string, number[]>();
  const fail = (code: ErrorCode): never => { throw new RoomError(code); };
  const requireRoom = (code: string): Room => rooms.get(code) ?? fail('ROOM_NOT_FOUND');
  const authorized = (socketId: string) => {
    for (const room of rooms.values()) {
      const seat = room.seats.find((seat) => seat.socketId === socketId);
      if (seat) return { room, seat, seatId: seat.seatId };
    }
    return undefined;
  };
  const session = (room: Room, seat: HumanSeat) => ({ code: room.code, seatId: seat.seatId, token: seat.token });
  const host = (room: Room) => {
    if (!room.seats.some((seat) => seat.seatId === room.hostSeatId && seat.socketId)) {
      room.hostSeatId = room.seats.find((seat) => seat.socketId)?.seatId ?? null;
    }
  };
  const add = (room: Room, profile: Profile, socketId: string, nowMs: number) => {
    if (authorized(socketId)) fail('NOT_ALLOWED');
    if (room.status !== 'lobby') fail('MATCH_IN_PROGRESS');
    if (room.seats.length === TUNING.seats) fail('ROOM_FULL');
    if (room.seats.some((seat) => seat.color === profile.color)) fail('COLOR_TAKEN');
    const seat: HumanSeat = { ...profile, seatId: room.seats.length, socketId,
      token: randomBytes(16).toString('hex'), receipts: new Map() };
    room.seats.push(seat);
    room.emptySinceMs = null;
    host(room);
    void nowMs;
    return session(room, seat);
  };
  return {
    rooms,
    require: requireRoom,
    authorized,
    create(profile: Profile, socketId: string, ip: string, nowMs: number) {
      if (authorized(socketId)) fail('NOT_ALLOWED');
      for (const [address, times] of creations) if (!times.some((time) => time > nowMs - 60_000)) creations.delete(address);
      const times = (creations.get(ip) ?? []).filter((time) => time > nowMs - 60_000);
      if (times.length >= TUNING.limits.createRoomPerMinute) fail('RATE_LIMITED');
      if (rooms.size >= TUNING.limits.maxRooms) fail('SERVER_FULL');
      times.push(nowMs);
      creations.set(ip, times);
      let code: string;
      do {
        code = Array.from({ length: TUNING.limits.roomCodeLength }, () => {
          const alphabet = TUNING.limits.roomCodeAlphabet;
          return alphabet[randomInt(alphabet.length)];
        }).join('');
      } while (rooms.has(code));
      const room: Room = { code, status: 'lobby', hostSeatId: null, seats: [], state: null,
        emptySinceMs: null, finishedAtMs: null };
      rooms.set(code, room);
      return add(room, profile, socketId, nowMs);
    },
    join(code: string, profile: Profile, socketId: string, nowMs: number) {
      return add(requireRoom(code), profile, socketId, nowMs);
    },
    reconnect(code: string, token: string, socketId: string, _nowMs: number) {
      const room = requireRoom(code);
      const tokenBytes = Buffer.from(token, 'hex');
      const seat = room.seats.find((seat) => {
        const expected = Buffer.from(seat.token, 'hex');
        return tokenBytes.length === expected.length && timingSafeEqual(tokenBytes, expected);
      }) ?? fail('BAD_TOKEN');
      const existing = authorized(socketId);
      if (existing && existing.seat !== seat) fail('NOT_ALLOWED');
      seat.socketId = socketId;
      room.emptySinceMs = null;
      host(room);
      return session(room, seat);
    },
    disconnect(socketId: string, nowMs: number) {
      const found = authorized(socketId);
      if (!found) return undefined;
      found.seat.socketId = null;
      host(found.room);
      if (!found.room.seats.some((seat) => seat.socketId)) found.room.emptySinceMs = nowMs;
      return found;
    },
    remove(code: string) { rooms.delete(code); },
    snapshot(code: string, you: SeatId): RoomSnapshot {
      const room = requireRoom(code);
      return {
        code, status: room.status, hostSeatId: room.hostSeatId, you,
        seats: Array.from({ length: TUNING.seats }, (_, seatId) => {
          const human = room.seats.find((seat) => seat.seatId === seatId);
          const paper = room.state?.seats[seatId];
          return { seatId, occupant: human ? 'human' : 'ai', connected: Boolean(human?.socketId),
            displayName: human?.displayName ?? paper?.displayName ?? null,
            paperName: human?.paperName ?? paper?.paperName ?? null,
            color: human?.color ?? paper?.color ?? null };
        }),
      };
    },
  };
}
export type RoomManager = ReturnType<typeof createRoomManager>;
