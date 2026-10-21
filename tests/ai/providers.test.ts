import { describe, expect, it } from 'vitest';
import { createProvider } from '../../src/ai/providers.ts';

const signal = new AbortController().signal;
const options = { provider: 'anthropic' as const, model: 'claude-haiku-5-5', apiKey: 'SYNTHETIC' };

describe('provider transport', () => {
  it('reads text blocks without returning thinking or tool data', async () => {
    const provider = createProvider({ ...options, fetch: async () => Response.json({ content: [
      { type: 'thinking', thinking: 'PRIVATE', signature: 'signature' },
      { type: 'text', text: 'Hello' }, { type: 'tool_use', id: 'tool', name: 'unused', input: {} },
      { type: 'text', text: ' world' },
    ] }) });
    expect(await provider('system', 'data', false, signal)).toBe('Hello world');
  });

  it.each([
    { content: [{ type: 'thinking', thinking: 'PRIVATE' }] },
    { content: [{ type: 'text', text: 123 }] },
    { content: [{ type: 'text', text: '' }] },
  ])('rejects missing or malformed text: %j', async ({ content }) => {
    const provider = createProvider({ ...options, fetch: async () => Response.json({ content }) });
    await expect(provider('system', 'data', true, signal)).rejects.toThrow();
  });

  it.each(['claude-haiku-5-5', 'claude-haiku-4-5'])('sends compatible settings for %s', async (model) => {
    let body: unknown;
    const provider = createProvider({ ...options, model, fetch: async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ content: [{ type: 'text', text: '{}' }] });
    } });
    await provider('system', 'data', true, signal);
    expect(body).toEqual({ model, max_tokens: 512, system: 'system', messages: [{ role: 'user', content: 'data' }],
      ...(model === 'claude-haiku-5-5' ? { thinking: { type: 'disabled' }, output_config: { effort: 'low' } } : {}) });
  });

  it('keeps OpenAI JSON mode and authentication unchanged', async () => {
    let request: unknown;
    let headers: unknown;
    const provider = createProvider({ ...options, provider: 'openai', model: 'model', fetch: async (_url, init) => {
      request = JSON.parse(String(init?.body)); headers = init?.headers;
      return Response.json({ choices: [{ message: { content: '{}' } }] });
    } });
    expect(await provider('system', 'data', true, signal)).toBe('{}');
    expect(request).toEqual({ model: 'model', max_completion_tokens: 512,
      messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'data' }], response_format: { type: 'json_object' } });
    expect(headers).toEqual({ 'content-type': 'application/json', Authorization: 'Bearer SYNTHETIC' });
  });
});
