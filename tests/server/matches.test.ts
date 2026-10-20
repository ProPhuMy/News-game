import { content as nameFilterContent } from '../../src/content/index.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { describe, expect, it, vi } from 'vitest';
import { createRoomManager } from '../../src/server/rooms.ts';
import { createMatchRunner } from '../../src/server/matches.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS, LOCATIONS, EVENT_CLAIMS } from '../../src/shared/ids.ts';
import { SERVER_EVENTS } from '../../src/shared/protocol.ts';
import { privateView, publicView } from '../../src/engine/index.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema } from '../../src/shared/snapshots.ts';

const setup = () => {
  const rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
  const session = rooms.create({ displayName: 'Editor', paperName: 'Daily', color: COLORS[0] }, 'human', 'ip', 0);
  const messages: { socket: string; event: string; value: unknown }[] = [];
  const runner = createMatchRunner(rooms, SAMPLE_CONTENT, (socket, event, value) => messages.push({ socket, event, value }));
  return { rooms, room: rooms.require(session.code), session, runner, messages };
};

describe('match runner', () => {
  it('projects every publication from engine views and isolates private tip, evidence, proof and lock sentinels', () => {
    const rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
    const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
    const room = rooms.require(rooms.create(profile, 'human', 'ip', 0).code);
    rooms.join(room.code, { ...profile, color: COLORS[1] }, 'other', 0);
    let publications = 0;
    const runner = createMatchRunner(rooms, SAMPLE_CONTENT, (socket, event, value) => {
      const seatId = socket === 'human' ? 0 : 1;
      const forbidden = socket === 'human' ? 'PRIVATE-OTHER' : 'PRIVATE-HUMAN';
      expect(JSON.stringify(value)).not.toContain(forbidden);
      expect(JSON.stringify(value)).not.toMatch(/"(?:token|gullibility|templateId|isTrue|events)":/);
      if (event === SERVER_EVENTS.public) {
        expect(value).toEqual(publicView(room.state!));
        expect(value).toEqual(PublicSnapshotSchema.parse(value));
        expect(JSON.stringify(value)).not.toMatch(/PRIVATE-(?:HUMAN|OTHER)/);
      } else {
        expect(event).toBe(SERVER_EVENTS.private);
        expect(value).toEqual(privateView(room.state!, seatId));
        expect(value).toEqual(PrivateSnapshotSchema.parse(value));
      }
      publications++;
    });
    try {
      runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
      runner.tick(room.state!.deadlineMs);
      for (const [index, seat] of room.state!.seats.entries()) if (index < 2) {
        const marker = index === 0 ? 'PRIVATE-HUMAN' : 'PRIVATE-OTHER';
        seat.tip = { round: 1, location: LOCATIONS[index]!, claim: EVENT_CLAIMS[0], text: `${marker}-TIP` };
        seat.evidence.push({ round: 1, location: LOCATIONS[index]!, claim: EVENT_CLAIMS[0], text: `${marker}-EVIDENCE` });
        seat.proofs.push({ headlineId: `h1-${index + 2}`, round: 1 });
      }
      runner.connection(room, 0, true, room.state!.deadlineMs - 1);
      expect(privateView(room.state!, 0).proofs).toEqual([{ headlineId: 'h1-2', round: 1 }]);
      expect(privateView(room.state!, 1).proofs).toEqual([{ headlineId: 'h1-3', round: 1 }]);
      // Synthetic private markers test serialization, not investigation or outcome rules.
      expect(privateView(room.state!, 0).evidence[0]!.text).toBe('PRIVATE-HUMAN-EVIDENCE');
      for (let step = 0; step < 16; step++) runner.tick(room.state!.deadlineMs);
      expect(room.state!.phase).toBe('ended');
      expect(publications).toBeGreaterThan(60);
    } finally { runner.dispose(); }
  });
  it('removes only a room whose publication throws and keeps ticking healthy rooms', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
      const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
      const bad = rooms.require(rooms.create(profile, 'bad', 'bad-ip', 0).code);
      const good = rooms.require(rooms.create(profile, 'good', 'good-ip', 0).code);
      let broken = false;
      const disconnect = vi.fn();
      const runner = createMatchRunner(rooms, SAMPLE_CONTENT, (socket) => {
        if (broken && socket === 'bad') throw new Error('SECRET-state');
      }, undefined, disconnect);
      runner.handle(bad, 0, { type: 'startMatch', actionId: 'bad-start' }, 0);
      runner.handle(good, 0, { type: 'startMatch', actionId: 'good-start' }, 0);
      broken = true;
      expect(() => runner.tick(20_000)).not.toThrow();
      expect(rooms.rooms.has(bad.code)).toBe(false);
      expect(disconnect.mock.calls).toEqual([['bad']]);
      expect(good.state!.phase).toBe('investigate');
      expect(() => runner.tick(good.state!.deadlineMs)).not.toThrow();
      expect(good.state!.phase).toBe('write');
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET');
    } finally { log.mockRestore(); }
  });

  it('isolates an unknown engine phase without blocking another room', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { rooms, room, runner } = setup();
      const session = rooms.create({ displayName: 'Other', paperName: 'Weekly', color: COLORS[1] }, 'other', 'other-ip', 0);
      const healthy = rooms.require(session.code);
      runner.handle(room, 0, { type: 'startMatch', actionId: 'bad-start' }, 0);
      runner.handle(healthy, 0, { type: 'startMatch', actionId: 'good-start' }, 0);
      Object.defineProperty(room.state, 'phase', { value: 'corrupted-runtime-phase', writable: true });
      expect(() => runner.tick(20_000)).not.toThrow();
      expect(rooms.rooms.has(room.code)).toBe(false);
      expect(healthy.state!.phase).toBe('investigate');
      expect(log).toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it('starts one human plus three bots and follows engine deadlines to completion', () => {
    const { runner, room } = setup();
    expect(runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0)).toBeUndefined();
    expect(room.state!.seats.map((seat) => seat.controller)).toEqual(['human', 'bot', 'bot', 'bot']);
    const phases: string[] = [];
    for (let i = 0; i < 17; i++) {
      runner.tick(room.state!.deadlineMs);
      phases.push(room.state!.phase);
    }
    expect(phases.filter((phase) => phase === 'reveal')).toHaveLength(5);
    expect(phases.at(-1)).toBe('ended');
    expect(room.status).toBe('finished');
    expect(room.state!.round).toBe(5);
  });

  it('rejects nonhost/stale actions and gives disconnected seats to Caretaker', () => {
    const { runner, room, rooms } = setup();
    rooms.join(room.code, { displayName: 'Other', paperName: 'Weekly', color: COLORS[1] }, 'other', 0);
    expect(runner.handle(room, 1, { type: 'startMatch', actionId: 'bad' }, 0)).toBe('NOT_HOST');
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    expect(runner.handle(room, 0, { type: 'skipIntro', actionId: 'stale', round: 1, phase: 'intro' }, 0)).toBe('STALE_PHASE');
    rooms.disconnect('human', 1);
    runner.connection(room, 0, false, 1);
    expect(room.state!.seats[0]!.controller).toBe('caretaker');
    expect(room.state!.seats[0]!.acted).toBe(true);
    runner.connection(room, 0, true, 2);
    expect(room.state!.seats[0]!.controller).toBe('human');
    expect(room.state!.seats[0]!.acted).toBe(true);
  });

  it('ends action phases early through engine but keeps reveal fixed', () => {
    const { runner, room } = setup();
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    runner.handle(room, 0, { type: 'skipIntro', actionId: 'skip', round: 0, phase: 'intro' }, 1);
    expect(room.state!.phase).toBe('investigate');
    runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'skip2', round: 1, phase: 'investigate' }, 2);
    runner.handle(room, 0, { type: 'skipWrite', actionId: 'skip3', round: 1, phase: 'write' }, 3);
    expect(room.state!.phase).toBe('reveal');
    runner.tick(4);
    expect(room.state!.phase).toBe('reveal');
  });

  it('sends only engine views and each seat receives only its own private data', () => {
    const { runner, room, rooms, messages } = setup();
    rooms.join(room.code, { displayName: 'Other', paperName: 'Weekly', color: COLORS[1] }, 'other', 0);
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    room.state!.seats[0]!.tip = { round: 1, location: LOCATIONS[0], claim: EVENT_CLAIMS[0], text: 'secret human tip' };
    room.state!.seats[1]!.tip = { round: 1, location: LOCATIONS[1], claim: EVENT_CLAIMS[1], text: 'secret rival tip' };
    messages.length = 0;
    runner.connection(room, 0, true, 1);
    const publicText = JSON.stringify(messages.filter((entry) => entry.event === SERVER_EVENTS.public));
    expect(publicText).not.toMatch(/gullibility|secret human tip|secret rival tip|templateId/);
    const own = JSON.stringify(messages.filter((entry) => entry.socket === 'human'));
    expect(own).toContain('secret human tip');
    expect(own).not.toContain('secret rival tip');
  });

  it('expires empty lobbies and abandoned matches, with reconnect canceling expiry', () => {
    const { rooms, room, runner, session } = setup();
    rooms.disconnect('human', 0);
    runner.tick(299_999);
    expect(rooms.rooms.size).toBe(1);
    runner.tick(300_000);
    expect(rooms.rooms.size).toBe(0);
    expect(room.code).toBe(session.code);

    const playing = setup();
    playing.runner.handle(playing.room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    playing.rooms.disconnect('human', 0);
    playing.runner.connection(playing.room, 0, false, 0);
    playing.runner.tick(119_999);
    expect(playing.rooms.rooms.size).toBe(1);
    playing.rooms.reconnect(playing.room.code, playing.session.token, 'new', 119_999);
    playing.runner.connection(playing.room, 0, true, 119_999);
    playing.runner.tick(120_000);
    expect(playing.rooms.rooms.size).toBe(1);
    playing.rooms.disconnect('new', 120_000);
    playing.runner.tick(240_000);
    expect(playing.rooms.rooms.size).toBe(0);
  });

  it('keeps finished rooms for fifteen minutes even without humans', () => {
    const { rooms, room, runner } = setup();
    runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
    for (let i = 0; i < 17; i++) runner.tick(room.state!.deadlineMs);
    const endedAt = room.finishedAtMs!;
    rooms.disconnect('human', endedAt);
    runner.tick(endedAt + 899_999);
    expect(rooms.rooms.size).toBe(1);
    runner.tick(endedAt + 900_000);
    expect(rooms.rooms.size).toBe(0);
  });
});
