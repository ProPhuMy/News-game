# Name filter policy (for Codex D2)

Owner: Claude. Enforcer: Codex (`src/server/`).

## Policy

Names use the same word filter as headlines: `createWordFilter(content.wordList)` from `src/ai/text.ts`. The server already builds it at `src/server/matches.ts:16` and returns `FILTERED` for headlines at `src/server/matches.ts:67`. The list is `WORD_LIST` in `src/content/word-filter.ts`.

The filter lowercases and NFKC-normalizes the text, splits it into letter/digit runs, and rejects it if any list phrase appears as consecutive whole tokens. So `Scunthorpe` and `Shitake` pass, and full-width `ｓｈｉｔ` and `SHIT!` fail.

## Where to enforce

- Three entry points carry a `profile`: `createRoom`, `playSolo` and `joinRoom` (`src/shared/protocol.ts:52-54`). `playSolo` shares the `createRoom` case and calls `rooms.create` (`src/server/socket.ts:44-47`). `joinRoom` calls `rooms.join` (`:58`).
- Recommended: enforce inside `rooms.create` and `rooms.join` (`src/server/rooms.ts`), so every path is covered and a new entry point cannot skip it.
- Fields: `profile.displayName` and `profile.paperName` on all three.
- Order: `ClientMessageSchema.safeParse` (`src/server/socket.ts:29`) runs before any case. It applies `DisplayNameSchema` (max 20) and `PaperNameSchema` (max 24), which run `cleanText`, trim and check length. Then the filter runs on the parsed value. A hit returns the existing `FILTERED` error code and creates or joins nothing.
- The name is never rewritten, masked, or truncated by the filter.

## Examples

`NAME_FILTER_EXAMPLES` (`{ accepted, rejected }`) is exported from `src/content/word-filter.ts` and re-exported by `src/content/index.ts`. D2 server tests should import it and assert that every `rejected` name gets `FILTERED` at `createRoom`, `playSolo` and `joinRoom` for both fields, and that every `accepted` name is allowed. Every example is valid for both `displayName` and `paperName` (all are 20 characters or fewer). `tests/content-schema/content.test.ts` pins that each example passes both schemas, is unchanged by `cleanText`, and is accepted or rejected by the filter as listed.

`dick` and `chink` are rejected on purpose (see the header of `word-filter.ts`).

## Known limits (existing policy, unchanged)

- Leetspeak passes: `sh1t`.
- Spaced letters pass: `s h i t`.
- Zero-width characters inside a word pass: `cleanText` turns them into spaces, so `sh<ZWSP>it` becomes `sh it`.

## UI copy

A rejected player or newspaper name shows: "That name contains blocked language. Please choose another." (user decision, 2026-10-19). `formatErrorMessage(error, 'setup')` in `src/client/ui/mapper.ts` returns it for `FILTERED` on the join screen. Headlines keep "Our lawyers won't print that — try again."

This needs one store change from Codex: `src/client/net/store.ts:118` rewrites every `FILTERED` ack into the headline sentence. Limit that rewrite to `lockHeadline`, so a `FILTERED` ack for `createRoom`, `playSolo` or `joinRoom` reaches the UI as the code. See `requests/C1.5-codex-name-filter.md`.

## Counterpart acknowledgment

Codex: acknowledged at commit `7505d43` as sufficient for D2 (2026-10-19, relayed by the user). All three entry points and both name fields are covered. Citation fix for `socket.ts:44-47` applied afterwards.
