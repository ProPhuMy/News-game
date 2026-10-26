import { io, type Socket } from 'socket.io-client';
import { expect, it } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { createClientStore } from '../../src/client/net/store.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { CLIENT_EVENT, SERVER_EVENTS } from '../../src/shared/protocol.ts';
import { COLORS, LOCATIONS } from '../../src/shared/ids.ts';

it('delivers a private inspection result through the socket and coherent store in all five rounds, usable when writing', async () => {
  const game = await createGameServer({ content: SAMPLE_CONTENT, ai: { provider: 'none' } });
  const clients: { socket: Socket; store: ReturnType<typeof createClientStore> }[] = [];
  try {
    await game.listen(0);
    const address = game.http.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    const connect = async () => {
      const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], forceNew: true, autoConnect: false });
      const store = createClientStore({ send: message => { socket.emit(CLIENT_EVENT, message); } });
      clients.push({ socket, store });
      for (const event of Object.values(SERVER_EVENTS)) socket.on(event, value => store.receive(event, value));
      await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); socket.connect(); });
      return store;
    };
    const act = async (store: ReturnType<typeof createClientStore>, action: () => string | null) => {
      expect(action()).not.toBeNull();
      await expect.poll(() => store.getState().pending.length).toBe(0);
      expect(store.getState().error).toBeNull();
    };
    const owner = await connect(), other = await connect();
    await act(owner, () => owner.actions.createRoom({ displayName: 'Owner', paperName: 'Daily', color: COLORS[0] }));
    const code = owner.getState().session!.code;
    await act(other, () => other.actions.joinRoom({ code, displayName: 'Other', paperName: 'Weekly', color: COLORS[1] }));
    const room = game.rooms.require(code);
    await act(owner, () => owner.actions.startMatch());
    await act(owner, () => owner.actions.skipIntro());
    await act(other, () => other.actions.skipIntro());
    for (let round = 1; round <= 5; round++) {
      await expect.poll(() => owner.getState().publicSnapshot?.round).toBe(round);
      expect(owner.getState().publicSnapshot?.phase).toBe('investigate');
      expect(owner.getState().privateSnapshot?.tip?.round).toBe(round);
      const initialTip = owner.getState().privateSnapshot!.tip;
      const location = LOCATIONS[(round - 1) % LOCATIONS.length]!;
      await act(owner, () => owner.actions.investigate({ target: { kind: 'location', location } }));
      const snapshot = owner.getState();
      expect(snapshot.publicSnapshot?.phase).toBe('investigate');
      expect(snapshot.publicSnapshot?.version).toBe(snapshot.privateSnapshot?.version);
      expect(snapshot.privateSnapshot?.tip).toEqual(initialTip);
      const card = snapshot.privateSnapshot!.evidence.find(entry => entry.round === round && entry.location === location);
      expect(card).toBeDefined();
      expect(card!.text.length).toBeGreaterThan(0);
      expect(snapshot.privateSnapshot!.investigations).toContainEqual({ round, target: { kind: 'location', location }, outcome: 'evidence' });
      expect(other.getState().privateSnapshot?.evidence).toEqual([]);
      expect(other.getState().privateSnapshot?.investigations).toEqual([]);
      expect(other.getState().privateSnapshot?.tip?.text).not.toBe(initialTip?.text);
      for (const store of [owner, other]) {
        const publicData = store.getState().publicSnapshot!;
        expect(publicData).not.toHaveProperty('tip');
        expect(publicData).not.toHaveProperty('investigations');
        expect(JSON.stringify(publicData)).not.toContain(card!.text);
        expect(JSON.stringify(publicData)).not.toContain(initialTip!.text);
      }
      await act(other, () => other.actions.skipInvestigate());
      await expect.poll(() => owner.getState().publicSnapshot?.phase).toBe('write');
      expect(owner.getState().privateSnapshot!.evidence).toContainEqual(card);
      await act(owner, () => owner.actions.lockHeadline({ story: { kind: 'claim', location, claim: card!.claim, attachEvidence: true }, text: 'Verified local report' }));
      const headline = room.state!.headlines.find(entry => entry.round === round && entry.seatId === owner.getState().session!.seatId)!;
      expect(headline.evidence).toBe(true);
      expect(headline.isTrue).toBe(true);
      await act(other, () => other.actions.skipWrite());
      await expect.poll(() => owner.getState().publicSnapshot?.phase).toBe('reveal');
      expect(owner.getState().publicSnapshot!.headlines).toContainEqual(expect.objectContaining({ id: headline.id, evidence: true, truth: 'true' }));
      // Exercise the real next-round transition without waiting through each fixed reveal animation.
      game.runner.tick(room.state!.deadlineMs);
    }
    await expect.poll(() => owner.getState().publicSnapshot?.phase).toBe('final');
  } finally {
    for (const { store, socket } of clients) { store.dispose(); socket.disconnect(); }
    await game.close();
  }
}, 20_000);
