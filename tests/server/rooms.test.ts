import { content } from '../../src/content/index.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { describe, expect, it } from 'vitest';
import { createRoomManager } from '../../src/server/rooms.ts';
import { COLORS, type Color } from '../../src/shared/ids.ts';
import { SessionSchema } from '../../src/shared/protocol.ts';

const profile = (color: Color = COLORS[0]) => ({ displayName: 'Editor', paperName: 'Daily', color });

describe('rooms', () => {
  it('allocates colors and seats without exposing credentials in lobby views', () => {
    const rooms = createRoomManager(createWordFilter(content.wordList));
    const first = rooms.create(profile(), 'a', 'ip', 0);
    expect(SessionSchema.safeParse(first).success).toBe(true);
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
    expect(first.token).toMatch(/^[0-9a-f]{32}$/);
    expect(() => rooms.join(first.code, profile(), 'b', 0)).toThrow('COLOR_TAKEN');
    for (const [index, color] of COLORS.entries()) if (index > 0) rooms.join(first.code, profile(color), String(index), 0);
    expect(() => rooms.join(first.code, profile(), 'e', 0)).toThrow('ROOM_FULL');
    const view = rooms.snapshot(first.code, first.seatId);
    expect(view.seats).toHaveLength(4);
    expect(JSON.stringify(view)).not.toContain(first.token);
  });

  it('authenticates reconnects and invalidates the old connection', () => {
    const rooms = createRoomManager(createWordFilter(content.wordList));
    const first = rooms.create(profile(), 'a', 'ip', 0);
    expect(() => rooms.reconnect(first.code, '0'.repeat(32), 'b', 1)).toThrow('BAD_TOKEN');
    expect(rooms.reconnect(first.code, first.token, 'b', 1)).toEqual(first);
    expect(rooms.authorized('a')).toBeUndefined();
    expect(rooms.authorized('b')?.seatId).toBe(0);
  });

  it('passes lobby hosting and starts no new seats mid-match', () => {
    const rooms = createRoomManager(createWordFilter(content.wordList));
    const first = rooms.create(profile(), 'a', 'ip', 0);
    rooms.join(first.code, profile(COLORS[1]), 'b', 0);
    rooms.disconnect('a', 1);
    expect(rooms.snapshot(first.code, 1).hostSeatId).toBe(1);
    rooms.require(first.code).status = 'playing';
    expect(() => rooms.join(first.code, profile(COLORS[2]), 'c', 1)).toThrow('MATCH_IN_PROGRESS');
    expect(rooms.reconnect(first.code, first.token, 'a2', 2).seatId).toBe(0);
  });

  it('enforces sliding creation limits and memory capacity', () => {
    const rooms = createRoomManager(createWordFilter(content.wordList));
    for (let i = 0; i < 10; i++) rooms.create(profile(), String(i), 'ip', i);
    expect(() => rooms.create(profile(), '11', 'ip', 59_999)).toThrow('RATE_LIMITED');
    expect(() => rooms.create(profile(), '12', 'ip', 60_010)).not.toThrow();
    for (let i = 11; i < 200; i++) rooms.create(profile(), `many${i}`, `ip${i}`, 60_010);
    expect(() => rooms.create(profile(), 'overflow', 'new', 60_010)).toThrow('SERVER_FULL');
  });
});

it('rejects blocked profiles before room, quota or seat allocation', () => {
  const rooms = createRoomManager(createWordFilter(content.wordList));
  for (let i = 0; i <= TUNING.limits.createRoomPerMinute; i++) {
    expect(() => rooms.create({ ...profile(), displayName: 'SHIT!' }, `bad${i}`, 'same-ip', 0)).toThrow('FILTERED');
  }
  expect(rooms.rooms.size).toBe(0);
  const first = rooms.create(profile(), 'host', 'same-ip', 0);
  const room = rooms.require(first.code); const before = JSON.stringify(room.seats);
  expect(() => rooms.join(first.code, { ...profile(COLORS[1]), paperName: 'Daily Shit' }, 'bad-join', 0)).toThrow('FILTERED');
  expect(JSON.stringify(room.seats)).toBe(before);
  expect(rooms.authorized('bad-join')).toBeUndefined();
  expect(rooms.join(first.code, profile(COLORS[1]), 'corrected', 0).seatId).toBe(1);
  for (let i = 1; i < TUNING.limits.createRoomPerMinute; i++) rooms.create(profile(), `good${i}`, 'same-ip', 0);
});
