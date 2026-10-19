# Name filter policy (for Codex D2)

Owner: Claude. Enforcer: Codex (`src/server/`).

## Policy

Names use the same word filter as headlines: `createWordFilter(content.wordList)` from `src/ai/text.ts`. The server already builds it at `src/server/matches.ts:16` and returns `FILTERED` for headlines at `src/server/matches.ts:67`. The list is `WORD_LIST` in `src/content/word-filter.ts`.

The filter lowercases and NFKC-normalizes the text, splits it into letter/digit runs, and rejects it if any list phrase appears as consecutive whole tokens. So `Scunthorpe` and `Shitake` pass, and full-width `ｓｈｉｔ` and `SHIT!` fail.

## Where to enforce

- Messages: `createRoom` and `joinRoom` (`src/server/socket.ts:44`, `:58`; rooms in `src/server/rooms.ts`).
- Fields: `profile.displayName` and `profile.paperName` on both.
- Order: zod parse first (`DisplayNameSchema` max 20, `PaperNameSchema` max 24; this runs `cleanText`, trims, checks length). Then the filter on the parsed value. A hit returns the existing `FILTERED` error code and creates or joins nothing.
- The name is never rewritten, masked, or truncated by the filter.

## Examples

`NAME_FILTER_EXAMPLES` (`{ accepted, rejected }`) is exported from `src/content/word-filter.ts` and re-exported by `src/content/index.ts`. D2 server tests should import it and assert that every `rejected` name gets `FILTERED` at `createRoom` and `joinRoom` for both fields, and that every `accepted` name is allowed. `tests/content-schema/content.test.ts` pins that each example passes the schemas, is unchanged by `cleanText`, and is accepted or rejected by the filter as listed.

`dick` and `chink` are rejected on purpose (see the header of `word-filter.ts`).

## Known limits (existing policy, unchanged)

- Leetspeak passes: `sh1t`.
- Spaced letters pass: `s h i t`.
- Zero-width characters inside a word pass: `cleanText` turns them into spaces, so `sh<ZWSP>it` becomes `sh it`.

## UI copy

The client already maps `FILTERED` to "Our lawyers won't print that — try again." (`src/client/ui/mapper.ts:27`). It reads as a headline message; Claude will adjust it if names need their own wording.

## Counterpart acknowledgment

Codex: pending
