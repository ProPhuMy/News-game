import { describe, expect, it } from 'vitest';
import { RATE_HEADLINE_SYSTEM_PROMPT } from '../../src/content/ai-prompts.ts';
import { content } from '../../src/content/index.ts';
import { ContentSchema } from '../../src/shared/content-schema.ts';

// The Groq pilot (deployment/ai/groq-result.json) rated a denial as on-topic. The prompt teaches
// assert-versus-deny with its own example pair, never with the evaluation's case headlines.
describe('rating prompt: asserting versus denying a claim', () => {
  it('tells the judge to rate assertion of the claim, not mention of the topic', () => {
    expect(RATE_HEADLINE_SYSTEM_PROMPT).toMatch(/asserts the selected claim, not just whether it mentions/);
    expect(RATE_HEADLINE_SYSTEM_PROMPT).toMatch(/Never judge whether the claim is actually true/);
  });

  it('gives one contrasting pair: an assertion (onTopic true) and a denial (onTopic false)', () => {
    expect(RATE_HEADLINE_SYSTEM_PROMPT).toContain('"Bank manager caught in shady deal!" asserts it (onTopic true)');
    expect(RATE_HEADLINE_SYSTEM_PROMPT).toContain('"Bank denies all scandal rumors" denies it (onTopic false)');
  });

  it('does not contain the evaluation case headlines, so a re-run tests generalization', () => {
    for (const evaluated of [
      'Bakery declared perfectly safe: no danger here!',
      'Fountain Square hosts a cheerful picnic!',
      'Clinic denies illness rumors: everyone is healthy!',
    ]) expect(RATE_HEADLINE_SYSTEM_PROMPT).not.toContain(evaluated);
    expect(RATE_HEADLINE_SYSTEM_PROMPT).not.toMatch(/illness|health_scare/i);
  });

  it('still fits the content schema limits', () => {
    expect(() => ContentSchema.parse(content)).not.toThrow();
  });
});
