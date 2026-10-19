import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES, formatErrorMessage } from '../../src/client/ui/mapper.ts';

describe('formatErrorMessage', () => {
  it('explains a FILTERED name on the setup screens, for player and newspaper names alike', () => {
    expect(formatErrorMessage('FILTERED', 'setup')).toBe('That name contains blocked language. Please choose another.');
  });

  it('keeps the headline wording for FILTERED during a match', () => {
    expect(formatErrorMessage('FILTERED')).toBe(ERROR_MESSAGES.FILTERED);
    expect(formatErrorMessage('FILTERED', 'match')).toBe(ERROR_MESSAGES.FILTERED);
  });

  it('formats other codes the same in both contexts', () => {
    expect(formatErrorMessage('ROOM_FULL', 'setup')).toBe(ERROR_MESSAGES.ROOM_FULL);
    expect(formatErrorMessage(null, 'setup')).toBeNull();
  });
});
