import { ContentSchema, type GameContent } from '../shared/content-schema.ts';
import { SAMPLE_CONTENT } from './sample-content.ts';

const isMissingContent = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'ERR_MODULE_NOT_FOUND' &&
  'message' in err && String(err.message).includes('content/index.ts');

/** Real content from src/content when it exists (and must be valid), else the sample. */
export async function loadContent(): Promise<{ content: GameContent; source: 'src/content' | 'sample' }> {
  const path = '../content/index.ts';
  let mod: unknown;
  try {
    mod = await import(path);
  } catch (err) {
    if (isMissingContent(err)) return { content: SAMPLE_CONTENT, source: 'sample' };
    throw err;
  }
  const raw = typeof mod === 'object' && mod !== null && 'content' in mod ? mod.content : undefined;
  return { content: ContentSchema.parse(raw), source: 'src/content' };
}
