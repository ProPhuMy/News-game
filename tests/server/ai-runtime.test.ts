import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createGameServer } from '../../src/server/index.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { COLORS, EVENT_CLAIMS, LOCATIONS } from '../../src/shared/ids.ts';

// Real server, runner, engine and adapter; only the paid transport is replaced.
describe('server AI wiring', () => {
  it.each([0, 7])('shares allowance %i across existing bot writing and all headline ratings', async (allowance) => {
    const dir = mkdtempSync(join(tmpdir(), 'news-town-ai-runtime-'));
    const file = join(dir, 'requests'); writeFileSync(file, '');
    let calls = 0;
    const messages: string[] = [];
    const log = vi.spyOn(console, 'info').mockImplementation((message: string) => { messages.push(message); });
    const game = await createGameServer({ content: SAMPLE_CONTENT,
      aiLimits: { requestAllowance: allowance, maxConcurrent: 4, allowanceFile: file },
      ai: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'PRIVATE-KEY', fetch: async (_url, init) => {
        calls++;
        const isWriting = String(init?.body).includes('Return only headline text');
        return Response.json({ content: [{ type: 'text', text: isWriting ? 'Fresh bakery news!' : JSON.stringify({
          juiciness: 5, onTopic: true, inappropriate: false, bubbles: ['Run!', 'Stay away!'],
        }) }] });
      } } });
    try {
      await game.listen(0);
      const session = game.rooms.create({ displayName: 'PRIVATE-NAME', paperName: 'PRIVATE-PAPER', color: COLORS[0] }, 'socket', 'ip', 0);
      const room = game.rooms.require(session.code);
      game.runner.handle(room, 0, { type: 'startMatch', actionId: 'start' }, 0);
      game.runner.handle(room, 0, { type: 'skipIntro', actionId: 'intro', round: 0, phase: 'intro' }, 1);
      game.runner.handle(room, 0, { type: 'skipInvestigate', actionId: 'skip', round: 1, phase: 'investigate' }, 2);
      const choices = room.state!.headlines.map(({ id, location, claim, isTrue }) => ({ id, location, claim, isTrue }));
      await vi.waitFor(() => expect(room.state!.headlines.every((h) => h.rating !== null)).toBe(true));
      expect(room.state!.headlines.map(({ id, location, claim, isTrue }) => ({ id, location, claim, isTrue }))).toEqual(choices);
      game.runner.handle(room, 0, { type: 'lockHeadline', actionId: 'lock', round: 1, phase: 'write',
        text: 'PRIVATE headline!', story: { kind: 'claim', location: LOCATIONS[0], claim: EVENT_CLAIMS[0], attachEvidence: false } }, 3);
      await vi.waitFor(() => expect(messages).toHaveLength(7));
      expect(calls).toBe(allowance);
      expect(readFileSync(file, 'utf8')).toBe('1\n'.repeat(allowance));
      const events: unknown[] = messages.map((message) => JSON.parse(message));
      expect(events).toContainEqual(expect.objectContaining({ event: 'ai_outcome', operation: 'writeBotHeadline', outcome: allowance ? 'success' : 'limited' }));
      expect(events).toContainEqual(expect.objectContaining({ event: 'ai_outcome', operation: 'rateHeadline', outcome: allowance ? 'success' : 'limited' }));
      expect(events.at(-1)).toEqual(expect.objectContaining({ counts: { success: allowance, cache: 0, disabled: 0, failure: 0, limited: allowance ? 0 : 7 } }));
      expect(messages.join('')).not.toMatch(/PRIVATE|Fresh bakery|Stay away|thinking/);
    } finally { await game.close(); log.mockRestore(); rmSync(dir, { recursive: true, force: true }); }
  });
});
