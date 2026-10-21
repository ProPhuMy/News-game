import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAiAdapter } from '../../src/ai/adapter.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { LOCATIONS, EVENT_CLAIMS, PERSONALITIES } from '../../src/shared/ids.ts';

const input = { text: 'Bakery in danger!', location: LOCATIONS[0], claim: EVENT_CLAIMS[0] };
const rating = { juiciness: 5, onTopic: true, inappropriate: false, bubbles: ['Run!', 'Stay away!'] };
const response = (text: string) => Response.json({ content: [{ type: 'text', text }] });
const options = { provider: 'anthropic' as const, model: 'claude-haiku-5-5', apiKey: 'SYNTHETIC', content: SAMPLE_CONTENT };
afterEach(() => vi.useRealTimers());

describe('AI evaluation runtime', () => {
  it.each(['```json\n', '```\n'])('accepts a complete JSON fence %s while validating its payload', async (fence) => {
    const adapter = createAiAdapter({ ...options, fetch: async () => response(`${fence}${JSON.stringify(rating)}\n\x60\x60\x60`) });
    expect(await adapter.rateHeadline(input)).toEqual(rating);
  });

  it.each(['Here is JSON: ', '```json\n{}\n```\n', '```json\n'])('rejects prose, invalid or incomplete fenced output %s', async (prefix) => {
    const adapter = createAiAdapter({ ...options, fetch: async () => response(prefix + JSON.stringify(rating)) });
    expect((await adapter.rateHeadline(input)).juiciness).toBe(4);
  });

  it('distinguishes provider successes, cache and disabled fallback without private data', async () => {
    const events: unknown[] = [];
    const adapter = createAiAdapter({ ...options, onOutcome: (operation, outcome) => events.push({ operation, outcome }),
      fetch: async () => response(JSON.stringify(rating)) });
    await adapter.rateHeadline(input);
    await adapter.rateHeadline(input);
    const disabled = createAiAdapter({ provider: 'none', content: SAMPLE_CONTENT,
      onOutcome: (operation, outcome) => events.push({ operation, outcome }) });
    await disabled.rateHeadline(input);
    expect(events).toEqual([
      { operation: 'rateHeadline', outcome: 'success' }, { operation: 'rateHeadline', outcome: 'cache' },
      { operation: 'rateHeadline', outcome: 'disabled' },
    ]);
    expect(JSON.stringify(events)).not.toMatch(/Bakery|SYNTHETIC|bubbles/);
  });

  it('limits writing and rating before network access and preserves exact engine fallbacks', async () => {
    const events: string[] = [];
    let calls = 0;
    const adapter = createAiAdapter({ ...options, acquireRequest: () => { throw new Error('private ledger error'); },
      onOutcome: (_operation, outcome) => events.push(outcome), fetch: async () => { calls++; return response('unexpected'); } });
    expect((await adapter.rateHeadline(input)).juiciness).toBe(4);
    expect(await adapter.writeBotHeadline({ personality: PERSONALITIES[0], location: input.location, claim: input.claim,
      fallbackText: 'Engine-selected headline' })).toBe('Engine-selected headline');
    expect(calls).toBe(0);
    expect(events).toEqual(['limited', 'limited']);
  });

  it('counts failures and keeps permits occupied after timeout until transport settles', async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    let releaseCount = 0;
    let finish: ((response: Response) => void) | undefined;
    const adapter = createAiAdapter({ ...options,
      acquireRequest: () => () => { releaseCount++; }, onOutcome: (_operation, outcome) => events.push(outcome),
      fetch: async () => new Promise<Response>((resolve) => { finish = resolve; }) });
    const pending = adapter.rateHeadline(input);
    await vi.advanceTimersByTimeAsync(3000);
    expect((await pending).juiciness).toBe(4);
    expect(events).toEqual(['failure']);
    expect(releaseCount).toBe(0);
    finish!(response(JSON.stringify(rating)));
    await vi.advanceTimersByTimeAsync(0);
    expect(releaseCount).toBe(1);
    expect(events).toEqual(['failure']);
  });

  it('releases failed requests and never lets an observer override results', async () => {
    let released = 0;
    const adapter = createAiAdapter({ ...options, acquireRequest: () => () => { released++; },
      onOutcome: () => { throw new Error('observer failed'); }, fetch: async () => response('{}') });
    expect((await adapter.rateHeadline(input)).juiciness).toBe(4);
    expect(released).toBe(1);
  });
});
