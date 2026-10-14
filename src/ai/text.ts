export { cleanText as normalizeHeadline } from '../shared/protocol.ts';

/** Content supplies words; the server owns matching policy. */
export function createWordFilter(words: readonly string[]): (text: string) => boolean {
  const tokens = (text: string) => text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const phrases = words.map(tokens);
  return (text) => {
    const input = tokens(text);
    return !phrases.some((phrase) => phrase.length > 0 && input.some((_, start) =>
      phrase.every((word, offset) => input[start + offset] === word)));
  };
}
