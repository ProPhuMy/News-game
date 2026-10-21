import { closeSync, constants, fsyncSync, openSync, readFileSync, writeSync } from 'node:fs';
import { isAbsolute } from 'node:path';

export interface AiLimits { requestAllowance: number; maxConcurrent: number; allowanceFile?: string }
const invalid = () => new Error('Invalid AI request configuration');

export function parseAiLimits(env: Record<string, string | undefined>): AiLimits {
  const integer = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw invalid();
    return Number(value);
  };
  const limits = { requestAllowance: integer(env.AI_REQUEST_ALLOWANCE, 0), maxConcurrent: integer(env.AI_MAX_CONCURRENT, 4),
    ...(env.AI_ALLOWANCE_FILE ? { allowanceFile: env.AI_ALLOWANCE_FILE } : {}) };
  validate(limits);
  return limits;
}

function validate(limits: AiLimits) {
  if (!Number.isSafeInteger(limits.requestAllowance) || limits.requestAllowance < 0 ||
      !Number.isSafeInteger(limits.maxConcurrent) || limits.maxConcurrent < 1 ||
      (limits.requestAllowance > 0 && (!limits.allowanceFile || !isAbsolute(limits.allowanceFile)))) throw invalid();
}

/** One process per ledger; reserve durably before each attempt, including failed requests. */
export function createAiRequestGate(limits: AiLimits): () => () => void {
  validate(limits);
  let used = 0;
  let active = 0;
  if (limits.requestAllowance > 0) {
    try {
      const text = readFileSync(limits.allowanceFile!, 'utf8');
      if (!/^(?:1\n)*$/.test(text)) throw invalid();
      used = text.length / 2;
    } catch { throw invalid(); }
  }
  return () => {
    if (used >= limits.requestAllowance || active >= limits.maxConcurrent) throw new Error('AI request limited');
    // Do not create a missing ledger: deletion must never reset the allowance automatically.
    const fd = openSync(limits.allowanceFile!, constants.O_WRONLY | constants.O_APPEND);
    try {
      // A partial write or flush error disables further calls until an operator reviews the ledger.
      used++;
      try { if (writeSync(fd, '1\n') !== 2) throw invalid(); fsyncSync(fd); }
      catch { used = limits.requestAllowance; throw invalid(); }
    } finally { closeSync(fd); }
    active++;
    let released = false;
    return () => { if (!released) { released = true; active--; } };
  };
}
