import { io, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { content } from '../../src/content/index.ts';
import { privateView, publicView } from '../../src/engine/index.ts';
import { COLORS, LOCATIONS } from '../../src/shared/ids.ts';
import { TUNING } from '../../src/shared/tuning.ts';
import { AckSchema, CLIENT_EVENT, SERVER_EVENTS, type Ack } from '../../src/shared/protocol.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema } from '../../src/shared/snapshots.ts';

const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
type Packet = { event: string; payload: unknown };

describe('prelaunch socket security', () => {
  let game: Awaited<ReturnType<typeof createGameServer>>;
  let url: string;
  const clients: Socket[] = [];
  const inbox = new Map<Socket, Packet[]>();
  beforeEach(async () => {
    game = await createGameServer({ content });
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('missing test port');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    inbox.clear();
    await game.close();
  });
  const connect = async (transport = 'websocket', headers: Record<string, string> = {}) => {
    const client = io(url, { transports: [transport], extraHeaders: headers, forceNew: true, reconnection: false });
    clients.push(client);
    const packets: Packet[] = []; inbox.set(client, packets);
    client.onAny((event: string, payload: unknown) => packets.push({ event, payload }));
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve); client.once('connect_error', reject);
    });
    return client;
  };
  const command = async (client: Socket, message: unknown): Promise<Ack> => {
    const pending = new Promise<Ack>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('missing acknowledgment')), 2000);
      client.once(SERVER_EVENTS.ack, (raw: unknown) => { clearTimeout(timer); resolve(AckSchema.parse(raw)); });
    });
    client.emit(CLIENT_EVENT, message);
    return pending;
  };
  const create = (client: Socket, actionId = 'create') => command(client, { ...profile, type: 'createRoom', actionId });

  it('revokes the displaced socket, isolates seat receipts and recovers a lost acknowledgment once', async () => {
    const old = await connect(); const first = await create(old, 'same-id');
    const room = game.rooms.require(first.session!.code);
    const guest = await connect();
    const joined = await command(guest, { ...profile, color: COLORS[1], type: 'joinRoom', actionId: 'same-id', code: room.code });
    expect(joined.session?.seatId).toBe(1);
    expect(joined.session?.token).not.toBe(first.session!.token);
    expect(await command(guest, { type: 'reconnect', actionId: 'switch-seat', ...first.session }))
      .toMatchObject({ ok: false, error: 'NOT_ALLOWED' });
    const start = { type: 'startMatch', actionId: 'start-once' };
    const started = await command(old, start);
    expect(started.ok).toBe(true);
    const replacement = await connect();
    expect(await command(replacement, { type: 'reconnect', actionId: 'recover', ...first.session }))
      .toMatchObject({ ok: true, session: first.session });
    await vi.waitFor(() => expect(inbox.get(replacement)!.some(p => p.event === SERVER_EVENTS.private)).toBe(true));
    const version = room.state!.version;
    expect(await command(replacement, start)).toEqual(started);
    expect(room.state!.version).toBe(version);
    expect(await create(replacement, 'same-id')).toEqual(first);
    inbox.get(old)!.length = 0;
    expect(await command(old, { type: 'skipIntro', actionId: 'displaced', round: room.state!.round, phase: room.state!.phase }))
      .toMatchObject({ ok: false, error: 'NOT_ALLOWED' });
    await command(guest, { type: 'skipIntro', actionId: 'guest-skip', round: room.state!.round, phase: room.state!.phase });
    await command(replacement, { type: 'skipIntro', actionId: 'host-skip', round: room.state!.round, phase: room.state!.phase });
    expect(inbox.get(old)!.map(p => p.event)).toEqual([SERVER_EVENTS.ack]);
    expect(game.rooms.authorized(old.id!)).toBeUndefined();
    expect(game.rooms.authorized(guest.id!)?.seatId).toBe(1);
  });

  it('requires tokens, ignores forged seat fields and rejects invalid commands without changing state', async () => {
    const host = await connect(); const first = await create(host);
    const room = game.rooms.require(first.session!.code);
    const outsider = await connect();
    expect(await command(outsider, { type: 'reconnect', actionId: 'code-only', code: room.code }))
      .toMatchObject({ ok: false, error: 'MALFORMED' });
    expect(await command(outsider, { type: 'reconnect', actionId: 'forged', code: room.code, token: '0'.repeat(32) }))
      .toMatchObject({ ok: false, error: 'BAD_TOKEN' });
    expect(await command(outsider, { type: 'startMatch', actionId: 'spoof', seatId: first.session!.seatId, code: room.code }))
      .toMatchObject({ ok: false, error: 'NOT_ALLOWED' });
    await command(host, { type: 'startMatch', actionId: 'start' });
    const state = room.state;
    for (const [index, fields] of [
      { type: 'connection', connected: false },
      { type: 'lockHeadline', round: -1, phase: room.state!.phase, text: 'x'.repeat(1001) },
      { type: 'skipIntro', round: 5, phase: room.state!.phase },
    ].entries()) {
      expect((await command(host, { ...fields, actionId: `invalid-${index}` })).ok).toBe(false);
      expect(room.state).toBe(state);
    }
    expect(inbox.get(outsider)!.every(p => p.event === SERVER_EVENTS.ack)).toBe(true);
  });

  it('delivers only legal public fields and the recipient private view through all match phases and recovery', async () => {
    const host = await connect(); const first = await create(host);
    const room = game.rooms.require(first.session!.code);
    const guest = await connect();
    const joined = await command(guest, { ...profile, color: COLORS[1], type: 'joinRoom', actionId: 'join', code: room.code });
    const seats = new Map<Socket, number>([[host, 0], [guest, 1]]);
    await command(host, { type: 'startMatch', actionId: 'start' });
    const checkpoint = async () => {
      for (const [client, seatId] of seats) {
        await vi.waitFor(() => {
          const latest = inbox.get(client)!.filter(p => p.event === SERVER_EVENTS.private).at(-1);
          expect(latest?.payload).toEqual(privateView(room.state!, seatId));
          const visible = inbox.get(client)!.filter(p => p.event === SERVER_EVENTS.public).at(-1);
          expect(visible?.payload).toEqual(publicView(room.state!));
        });
      }
    };
    await checkpoint();
    game.runner.tick(room.state!.deadlineMs); await checkpoint();
    expect(room.state!.phase).toBe('investigate');
    await command(host, { type: 'investigate', actionId: 'evidence-host', round: room.state!.round, phase: room.state!.phase,
      target: { kind: 'location', location: LOCATIONS[0] } });
    await command(guest, { type: 'investigate', actionId: 'evidence-guest', round: room.state!.round, phase: room.state!.phase,
      target: { kind: 'location', location: LOCATIONS[1] } });
    await checkpoint();
    expect(room.state!.phase).toBe('write');
    const card = room.state!.seats[0]!.evidence[0]!;
    const text = 'PRIVATE-UNTIL-REVEAL';
    expect((await command(host, { type: 'lockHeadline', actionId: 'publish', round: room.state!.round, phase: room.state!.phase,
      text, story: { kind: 'claim', location: card.location, claim: card.claim, attachEvidence: true } })).ok).toBe(true);
    await checkpoint();
    expect(JSON.stringify(inbox.get(guest))).not.toContain(text);
    expect(publicView(room.state!).headlines).toEqual([]);
    await command(guest, { type: 'skipWrite', actionId: 'skip', round: room.state!.round, phase: room.state!.phase });
    await checkpoint();
    expect(publicView(room.state!).headlines.find(h => h.text === text)).toMatchObject({ evidence: true, truth: 'true' });
    const displaced = guest;
    const replacement = await connect();
    await command(replacement, { type: 'reconnect', actionId: 'recover', ...joined.session });
    seats.delete(displaced); seats.set(replacement, 1);
    await checkpoint();
    while (room.state!.phase !== 'ended') { game.runner.tick(room.state!.deadlineMs); await checkpoint(); }
    expect(publicView(room.state!).headlines.every(h => h.truth !== 'unknown')).toBe(true);
    expect(publicView(room.state!).final).not.toBeNull();
    for (const [client, packets] of inbox) for (const { event, payload } of packets) {
      const value = JSON.stringify(payload);
      if (event === SERVER_EVENTS.public) {
        expect(payload).toEqual(PublicSnapshotSchema.parse(payload));
        expect(value).not.toMatch(/"(?:gullibility|events|templateId|isTrue|token|tip|proofs)":/);
      } else if (event === SERVER_EVENTS.private) {
        expect(payload).toEqual(PrivateSnapshotSchema.parse(payload));
        expect(PrivateSnapshotSchema.parse(payload).seatId).toBe(client === host ? 0 : 1);
      }
      if (client !== host) expect(value).not.toContain(first.session!.token);
      if (client === host) expect(value).not.toContain(joined.session!.token);
    }
  });

  it.each(['websocket', 'polling'])('shares create/solo IP budgets across new %s connections and ignores spoofed forwarding', async transport => {
    for (let index = 0; index < TUNING.limits.createRoomPerMinute; index++) {
      const client = await connect(transport, { 'cf-connecting-ip': `192.0.2.${index + 1}` });
      const result = await command(client, { ...profile, type: index % 2 ? 'playSolo' : 'createRoom', actionId: 'create' });
      expect(result.ok).toBe(true);
    }
    const blocked = await connect(transport, { 'x-forwarded-for': '192.0.2.200', 'cf-connecting-ip': '192.0.2.200' });
    expect(await create(blocked)).toMatchObject({ ok: false, error: 'RATE_LIMITED' });
    expect(game.rooms.rooms.size).toBe(TUNING.limits.createRoomPerMinute);
    const code = game.rooms.rooms.keys().next().value!;
    expect((await command(blocked, { ...profile, color: COLORS[1], type: 'joinRoom', code, actionId: 'healthy-join' })).ok).toBe(true);
  });

  it.each(['websocket', 'polling'])('closes oversized %s messages before action dispatch and preserves healthy service', async transport => {
    const client = await connect(transport);
    const disconnected = new Promise<void>(resolve => client.once('disconnect', () => resolve()));
    client.emit(CLIENT_EVENT, { ...profile, type: 'createRoom', actionId: 'too-large', displayName: 'x'.repeat(20_000) });
    await disconnected;
    expect(game.rooms.rooms.size).toBe(0);
    expect((await create(await connect())).ok).toBe(true);
  });
});
