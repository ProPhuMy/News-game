import { z } from 'zod';

export type Provider = 'openai' | 'anthropic' | 'none';
export interface ProviderOptions { provider: Provider; model?: string; apiKey?: string; baseUrl?: string; fetch?: typeof fetch }

const OpenAiResponse = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) });
const AnthropicResponse = z.object({ content: z.array(z.object({ type: z.string(), text: z.unknown().optional() })).min(1) });

export function createProvider(options: ProviderOptions) {
  if (!['openai', 'anthropic', 'none'].includes(options.provider)) throw new Error('Invalid AI_PROVIDER');
  if (options.provider !== 'none' && (!options.model?.trim() || !options.apiKey?.trim())) {
    throw new Error('AI_MODEL and provider API key are required');
  }
  let baseUrl: string | undefined;
  if (options.baseUrl?.trim()) {
    try {
      const parsed = new URL(options.baseUrl.trim());
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.href.includes('?') || parsed.href.includes('#') ||
          options.provider === 'anthropic') throw new Error();
      baseUrl = parsed.href.replace(/\/+$/, '');
    } catch { throw new Error('Invalid AI_BASE_URL'); }
  }
  const request = options.fetch ?? fetch;
  return async (system: string, data: string, json: boolean, signal: AbortSignal): Promise<string> => {
    const anthropic = options.provider === 'anthropic';
    const response = await request(anthropic ? 'https://api.anthropic.com/v1/messages' : `${baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST', signal, ...(baseUrl ? { redirect: 'error' } : {}),
      headers: anthropic
        ? { 'content-type': 'application/json', 'x-api-key': options.apiKey!, 'anthropic-version': '2023-06-01' }
        : { 'content-type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
      body: JSON.stringify(anthropic
        ? { model: options.model, max_tokens: 512, system, messages: [{ role: 'user', content: data }],
          ...(options.model === 'claude-haiku-5-5'
            ? { thinking: { type: 'disabled' }, output_config: { effort: 'low' } } : {}) }
        : { model: options.model, max_completion_tokens: 512,
          ...(baseUrl === 'https://api.groq.com/openai/v1' && options.model === 'openai/gpt-oss-20b'
            ? { reasoning_effort: 'low' } : {}),
          messages: [{ role: 'system', content: system }, { role: 'user', content: data }],
          ...(json ? { response_format: { type: 'json_object' } } : {}) }),
    });
    if (!response.ok) throw new Error('AI provider request failed');
    const body: unknown = await response.json();
    if (!anthropic) return OpenAiResponse.parse(body).choices[0]!.message.content;
    const text = AnthropicResponse.parse(body).content.filter((block) => block.type === 'text')
      .map((block) => z.string().parse(block.text)).join('');
    return z.string().min(1).parse(text);
  };
}
