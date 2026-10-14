import { describe, expect, it } from 'vitest';
import { createWordFilter, normalizeHeadline } from '../../src/ai/text.ts';
import { SAMPLE_CONTENT } from '../../src/sim/sample-content.ts';
import { HeadlineTextSchema } from '../../src/shared/protocol.ts';

describe('headline text boundary', () => {
  it('normalizes controls and whitespace without losing non-Latin text', () => {
    expect(normalizeHeadline('  NEWS\n\tNOW\u0000  ')).toBe('NEWS NOW');
    expect(normalizeHeadline('  今日のニュース  ')).toBe('今日のニュース');
    expect(HeadlineTextSchema.safeParse(normalizeHeadline(' \t\n ')).success).toBe(false);
    expect(HeadlineTextSchema.safeParse(normalizeHeadline('x'.repeat(100))).success).toBe(true);
    expect(HeadlineTextSchema.safeParse(normalizeHeadline('x'.repeat(101))).success).toBe(false);
  });

  it('matches approved words across punctuation without blocking substrings', () => {
    const passes = createWordFilter(SAMPLE_CONTENT.wordList);
    expect(passes('DARN!')).toBe(false);
    expect(passes('darn-news')).toBe(false);
    expect(passes('darn.news')).toBe(false);
    expect(passes('darned socks')).toBe(true);
    expect(passes('Scunthorpe')).toBe(true);
    expect(passes('grape')).toBe(true);
  });

  it('matches phrases and keeps apostrophes as word separators', () => {
    const passes = createWordFilter(['bad phrase', 'darn']);
    expect(passes('bad--phrase')).toBe(false);
    expect(passes('bad\tphrase')).toBe(false);
    expect(passes("'darn'")).toBe(false);
    expect(passes('not a badphrase')).toBe(true);
    expect(passes('darné')).toBe(true);
  });
});
