# News Town — Codex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution, or superpowers:subagent-driven-development if the user chooses delegation. Implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the server, AI adapter, and client networking needed to finish solo and multiplayer matches without leaking private state or waiting on AI.

**Architecture:** One Node service serves the built client and Socket.IO endpoint. The server owns rooms, authorization, transport, and scheduling; the engine owns all game outcomes. A typed client store exposes snapshots and actions to the UI, with a fixture player for independent presentation development.

**Tech Stack:** TypeScript strict mode, Node LTS, Socket.IO, zod, Vitest, and platform fetch/AbortController. Reuse the exact dependency versions and scripts delivered by Claude at M0; add no dependencies. React, Vite, and Three.js integration remains with their owners.

**Spec:** [News Town design](../specs/2026-10-09-news-town-design.md), especially §§4, 9, and 10. Repository rules: [AGENTS.md](../../../AGENTS.md).

## Execution Status — October 13, 2026

Codex work is isolated in `/home/agent/.codex/worktrees/afb0/game` on `codex/project-work`. Claude's real engine and recorded fixtures from main commit `68487cf` are merged into this branch. No Codex changes have been merged or pushed to main.

Implemented and verified: text boundaries, rooms/seat authorization, socket idempotency and ingress limits, engine scheduling and private views, provider adapters, human asynchronous ratings, client store/reconnect, recorded playback, static/Vite service, and deployment configuration. An independent review's four significant findings have regression-tested fixes. Real-engine socket matches finish five rounds and the finale; all three Claude recordings play through their scoreboards.

Remaining: bot generation/rating integration awaits Claude's user-approved fallback contract addition in `docs/contract-requests/2026-10-13-codex-bot-rating-fallback.md`. Content and client UI are not yet on main, so the production build/browser acceptance cannot run. Docker daemon access is denied; the image is not built. Live provider/model smoke checks need credentials and a selected model. No deployment or paid provisioning has occurred.

Verification: `npm test` — 178 passed, 1 skipped (real content absent); `npm run typecheck`, `npm run lint`, and `git diff --check` pass. The updated shared tuning from Claude is used directly; server/client contain no copied balance values.

## Global Constraints

- Work on `codex/project-work`. The user merges; do not merge into main.
- Codex owns `src/server/`, `src/ai/`, `src/client/net/`, `tests/server/`, `tests/ai/`, `tests/net/`, and deployment files. This plan is explicitly requested by the user.
- Do not edit the engine, bots, content, UI, town, shared contract, root package configuration, or other agents' files.
- Game rules live only in `src/engine/` and `src/bots/`. Use `publicView()` and `privateView()` for snapshots.
- Exactly 4 newspaper seats; 1–4 humans. Reject new joins after starting; authenticated reconnects remain allowed.
- Reconnect tokens contain 128 random bits and live in browser localStorage per room code. A room code never authorizes an occupied seat.
- Every message has an `actionId`; match commands also have `round` and `phase`. Duplicate actions return the original acknowledgment.
- AI calls have a 3 s timeout, one attempt, validated output, normalized-input caching, and fallback. AI never delays a phase.
- Headlines contain 1–100 characters after normalization. Names have limits of 20 and 24 characters; bubbles have at most 60 characters.
- Use server environment variables for API keys. Never expose or log keys, tokens, private snapshots, or raw state.
- Validate socket messages, AI output, and loaded content with the shared zod schemas. Render user data as text.
- Limit createRoom/playSolo to 10 requests per minute per IP and 200 rooms in memory.
- Delete empty lobbies after 5 minutes, matches without connected humans after 2 minutes, and finished rooms after 15 minutes.
- No accounts, chat, durable recovery, matchmaking, multi-server support, mobile extras, or new game rules.
- Before each implementation commit, run `git diff --name-only main...HEAD` and review file ownership. If the base does not yet exist, wait for M0 before implementation commits.

## Preconditions and M0 Handoff

Only the spec and agent Markdown files exist at planning time. Implementation starts after spec approval and Claude's committed M0. Do not create substitute shared types, a local engine, root scripts, or replacement fixtures.

M0 must provide shared protocol/event schemas and exports; room/seat/config types; snapshot and rating schemas; tuning; engine stub with the six interfaces in §9.4; bot/Caretaker entry points; content schemas and fixtures; installed dependencies; and working documented scripts. Claude's plan must pin exact dependency versions. Hosting and AI model identifiers are finalized in Task 8 after checking current official documentation.

Read the actual M0 exports before implementing each task. Names in this plan for Codex modules are proposed local interfaces. Shared type names and imports must match M0 exactly. If a required protocol field or interface is missing, write `docs/contract-requests/YYYY-MM-DD-codex-<topic>.md` with the exact proposed change, tell the user, and continue an independent task. Never invent wire events, error codes, phase strings, or casts to bypass the contract.

## Review Focus

1. Duplicate/reordered actions and stale acknowledgments must not repeat mutations or regress client state. Tasks 2 and 6 test these.
2. Delayed AI results crossing phase or room boundaries must not change the wrong headline or revive a room. Tasks 4 and 5 test these.
3. Disconnect/reconnect races and takeover must retain an already locked action and restore only the token's seat. Tasks 3 and 6 test these.
4. Malformed output, injection text, Unicode, and storage failures must preserve validation and a usable fallback. Tasks 1, 4, and 6 test these.
5. Proxy IP handling and process restarts must preserve limits and report an ended match without reclaiming a new seat. Tasks 2 and 8 test these.

## File Map

Keep each source file focused and under about 300 lines. Split only when a responsibility requires it.

| Files | Responsibility |
|---|---|
| `src/ai/text.ts`, `tests/ai/text.test.ts` | Text normalization and shared content word filter |
| `src/server/rooms.ts`, `tests/server/rooms.test.ts` | Room creation, seat allocation, host selection, tokens, limits |
| `src/server/socket.ts`, `tests/server/socket.test.ts` | Validated protocol, authorization, acknowledgments, filtered broadcasts |
| `src/server/matches.ts`, `tests/server/matches.test.ts` | Engine calls, bot/Caretaker scheduling, deadlines, expiry |
| `src/ai/adapter.ts`, `src/ai/providers.ts`, `tests/ai/adapter.test.ts` | Provider calls, validation, deadlines, cache, fallbacks |
| `src/client/net/store.ts`, `src/client/net/socket.ts`, `src/client/net/index.ts`, `tests/net/store.test.ts` | Typed public client API and transport lifecycle |
| `src/client/net/fixtures.ts`, `tests/net/fixtures.test.ts` | Recorded-match playback through the store API |
| `src/server/index.ts`, `tests/server/static.test.ts`, `tests/server/integration.test.ts` | Static service and end-to-end socket acceptance |
| `Dockerfile`, `.dockerignore`, `.env.example`, `render.yaml` | Single-service deployment and environment placeholders |

## Task 1: Text Boundary and Word Filter

**Files:** Create `src/ai/text.ts` and `tests/ai/text.test.ts`.

**Interfaces:** Export `normalizeHeadline(text: string): string` and `passesWordFilter(text: string): boolean`. Consume the approved content word list, never a copied list. Schema validation follows normalization; these functions do not compute juiciness or truth.

- [ ] Write failing tests: `normalizeHeadline('  NEWS\n\tNOW\u0000  ') === 'NEWS NOW'`; whitespace-only input fails the shared headline schema; 100 characters pass and 101 fail; non-Latin text survives; configured blocked words fail with the content's documented matching policy. Include case and word-boundary examples from the actual word list.
- [ ] Run `npm run test -- tests/ai/text.test.ts`; expect failures for missing implementation, not broken tooling.
- [ ] Implement control-character removal, whitespace collapse, trim, and the content-backed filter. Do not silently truncate user headlines.
- [ ] Run the focused tests; expect all pass.
- [ ] Run the global commit gate below; commit `ai: normalize and filter headline text`.

## Task 2: Rooms, Seats, and Authorized Socket Commands

**Files:** Create `src/server/rooms.ts`, `src/server/socket.ts`, and corresponding tests.

**Interfaces:** Export `createRoomManager()` and `registerSocketHandlers(io, rooms)` using installed Socket.IO types and M0 protocol types. The manager owns a Map of rooms; its methods create, find, join, reclaim, and remove rooms. Room metadata is server-only. Use cryptographic random bytes for tokens and 5-character unambiguous codes; retry code collisions. Snapshot transmission calls only engine view functions.

- [ ] Write failing room tests: four distinct fixed colors are allocatable; a fifth human fails; duplicate colors fail; code contains none of `0O1I`; token encodes 128 random bits; code alone cannot reclaim a seat; invalid token fails; lobby host passes to a connected human; new joins fail after match start.
- [ ] Write failing socket tests: malformed messages fail shared validation; unauthorized sockets fail; stale phase/round commands fail; same actionId replays the original ack without another mutation; identical IDs from separate clients do not collide; a retry with changed payload cannot replace its original result. Test the 11th creation within 60 seconds and the 201st room are rejected. Spoofed forwarding headers cannot bypass limits.
- [ ] Run `npm run test -- tests/server/rooms.test.ts tests/server/socket.test.ts`; expect missing-implementation failures.
- [ ] Implement lobby handlers, per-client action-result bookkeeping, limits, and token authorization. Keep request validation before mutation. Use shared error codes and icon/color identities. Do not broadcast tokens. Trust forwarding headers only under explicitly configured host proxy rules.
- [ ] Run focused tests; expect all pass. Capture every emitted lobby payload and assert that tokens and private room metadata are absent.
- [ ] Run the global commit gate; commit `server: add validated rooms and seat authorization`.

## Task 3: Engine Scheduling, Caretaker, and Privacy

**Files:** Create `src/server/matches.ts`, `tests/server/matches.test.ts`; modify Task 2 files.

**Interfaces:** Export `createMatchRunner(rooms, ai)`; expose start, handleCommand, disconnect, reconnect, tick, and dispose operations. Consume `createMatch`, `applyCommand`, `tick`, `publicView`, `privateView`, and the M0 bot entry points with their exact exported types. The runner accepts injected clock/timer dependencies for tests; production supplies wall-clock time. The engine receives time as an argument.

- [ ] Write failing tests with fake time: playSolo immediately starts one human plus three bots; host starts a 1–4-human room; non-host start fails; engine deadlines drive phases; early completion excludes disconnected humans and cosmetic bot delay; reaction and finale do not end early. Bot locked display uses engine/contract-owned seeded delay, never a server game-rule roll.
- [ ] Add disconnect tests: Caretaker acts immediately using Gazette policy; reconnect restores control; an existing Caretaker lock remains; a disconnected old socket cannot issue commands after handback. Test host departure and all-human disconnect races.
- [ ] Add expiry tests at 5, 2, and 15 minutes for the three room states; reconnect cancels abandoned-match expiry; deletion cancels timers and pending work.
- [ ] Add privacy tests capturing every public/private emission through all phases: unrevealed rival headlines, current hidden truth, other-seat tips/evidence/proof, citizen gullibility, and reconnect tokens never appear. Published evidence and finale truth appear only when the engine view permits them.
- [ ] Run `npm run test -- tests/server/matches.test.ts`; expect failures.
- [ ] Implement engine delegation and per-seat emissions. Bot choices use the engine's bot-visible view. Timers trigger tick; they never independently advance phases or calculate outcomes. Do not block scheduling on promises. Missing bot/view/delay contract support triggers a contract request.
- [ ] Run all server tests; expect all pass.
- [ ] Run the global commit gate; commit `server: schedule matches and protect private snapshots`.

## Task 4: Provider Adapter with Guaranteed Fallback

**Files:** Create `src/ai/adapter.ts`, `src/ai/providers.ts`, `tests/ai/adapter.test.ts`; modify `.env.example`.

**Interfaces:** Export `createAiAdapter(options)` returning `rateHeadline(input)` and `writeBotHeadline(input)` as promised in spec §9.3. Import the shared input/output types and content fallback templates. Options supply provider, model, server credentials, and injectable fetch for tests. All providers implement the same internal call interface. Use installed provider libraries if M0 lists them; otherwise native fetch.

- [ ] Write failing tests: `none` uses no network; timeout at 3000 ms aborts and returns fallback; rejected requests, non-success responses, invalid JSON, missing fields, and out-of-range juiciness fall back with no retry. Provider output cannot bypass shared schemas.
- [ ] Add tests: normalized identical inputs use cache; inputs differing in location, claim, personality, or exposed text do not collide; malformed results are not retained as successful provider results; generated headlines satisfy 1–100 characters; rating supplies 2–3 bubbles of at most 60 characters; filtered bubbles use safe template replacements.
- [ ] Add injection tests inspecting the outgoing body: headline and exposed headline appear only as serialized, delimited untrusted data; instructions remain separate. Include delimiter-like strings and quoted JSON. Validate the returned data even when injection appears successful.
- [ ] Run `npm run test -- tests/ai/adapter.test.ts`; expect failures.
- [ ] Implement one-attempt OpenAI/Anthropic calls, whole-call timeout through response parsing, output validation, bounded in-memory cache, and template fallbacks. `none` needs no key. Invalid provider/configuration fails clearly at startup; operational provider failures fall back. Never log request text or credentials. Content owns prompt wording.
- [ ] Run all AI tests; expect all pass. Bot fallback juiciness/personality randomness remains with the engine/bots, not this adapter.
- [ ] Run the global commit gate; commit `ai: add validated providers with timeout fallbacks`.

## Task 5: Headline Lock and Asynchronous Ratings

**Files:** Modify `src/server/socket.ts`, `src/server/matches.ts`, `tests/server/socket.test.ts`, `tests/server/matches.test.ts`.

**Interfaces:** Consume Task 1 text functions, Task 4 adapter, and `applyRating(state, headlineId, rating)`. Keep the accepted headline identifier and room/match identity with each pending call. The shared contract must expose an authorized way to obtain the accepted headline ID.

- [ ] Write failing tests: blocked headline returns `Our lawyers won't print that — try again` and remains editable; successful lock receives ack without waiting for AI; duplicate lock causes one provider call; rating arriving before reveal enters through applyRating; a timeout never delays reveal.
- [ ] Add tests: a result after reveal cannot overwrite the engine fallback; results for deleted rooms or completed/replaced matches are ignored; inappropriate rating produces the engine-owned pulled-headline behavior and effective juiciness 1; off-topic/all_clear handling stays in engine tests, not duplicate server rules.
- [ ] Run focused socket/match tests; expect failures.
- [ ] Implement normalization/filter before lock, then engine command, then asynchronous rating of accepted headlines. Engine establishes lock legality and fallback. Attach bot text generation without delaying phase entry or replacing actions already locked; use the M0 bot/engine hook for fallback-first generation, or file a contract request if absent.
- [ ] Run server and AI tests; expect all pass.
- [ ] Run the global commit gate; commit `server: integrate nonblocking headline ratings`.

## Task 6: Client Store, Reconnect, and Server Time

**Files:** Create `src/client/net/store.ts`, `src/client/net/socket.ts`, `src/client/net/index.ts`, `tests/net/store.test.ts`.

**Interfaces:** Export one singleton store exposing `getState`, `subscribe`, and typed actions matching all ten shared client messages. Also export `createClientStore` for tests and fixture playback. State includes validated public/private snapshots, connection status, pending actions, and acknowledged errors. UI consumes this API; no UI code opens sockets. Publish the exact exports to Gemini 2 before implementation integration.

- [ ] Write failing tests: every action uses a unique actionId; retries reuse the same ID and payload; match actions carry current round/phase; duplicate/out-of-order acks cannot clear another action; timeout produces a usable error; stale snapshots are discarded independently per stream. Shared version ordering must prevent mismatched round/phase data from being presented together.
- [ ] Add reconnect tests: token is stored per room, never in links; reconnect sends token, not join; refresh restores the seat; a failed token shows an ended/unavailable-room state and does not autojoin a new seat; localStorage read/write failures yield a visible recoverability error without crashing. Validate inbound snapshots before updating state.
- [ ] Add timer tests: countdown comes from server deadline plus measured clock offset; client never advances a phase. Use the M0 time-sync/ack fields; request additions rather than inventing a wire message. Dispose removes handlers and retry timers.
- [ ] Run `npm run test -- tests/net/store.test.ts`; expect failures.
- [ ] Implement bounded acknowledgment retries, connection transitions, server-time estimation, stale-version checks, and external-store subscription using installed/platform APIs. Keep private state scoped to room/seat and clear it on leaving or failed recovery.
- [ ] Run net tests; expect all pass.
- [ ] Run the global commit gate; commit `net: add typed store and reconnect lifecycle`.

## Task 7: Fixture Playback for UI and Town

**Files:** Create `src/client/net/fixtures.ts`, `tests/net/fixtures.test.ts`; modify `src/client/net/index.ts` only as needed.

**Interfaces:** Export `createFixturePlayer(recording, store)` with play, pause, and dispose methods. Consume Claude's actual recording schema and pass snapshots through the same validated store ingestion as live transport. No socket and no copied game logic.

- [ ] Write failing tests against an actual M0 recording: playback emits phases, public/private views, and reaction plans in recorded order; pause stops progression; dispose cancels timers; repeated playback does not retain a previous seat's private state; normal stale-snapshot rules still apply.
- [ ] Run `npm run test -- tests/net/fixtures.test.ts`; expect failures. If a recording or necessary case is missing, ask for Claude's fixture rather than writing one.
- [ ] Implement the smallest fixture player and expose it to Gemini 1 and Gemini 2. Fixture actions do not invent game outcomes; recordings remain immutable.
- [ ] Run fixture/net tests; expect all pass.
- [ ] Run the global commit gate; commit `net: expose recorded match playback`.

## Task 8: End-to-End Acceptance and Deployable Service

**Files:** Create `src/server/index.ts`, `tests/server/static.test.ts`, `tests/server/integration.test.ts`, `Dockerfile`, `.dockerignore`, `render.yaml`; finalize `.env.example`.

**Interfaces:** Service starts the room manager, runner, adapter, and handlers; serves the Vite build and `/r/CODE` browser route from the same origin. Environment covers PORT, AI_PROVIDER, AI_MODEL, and provider keys with placeholders only. Use the M0 build/start commands; ask Claude to supply any missing root script. Shutdown cancels timers and stops accepting new work.

- [ ] Write failing static tests: home and `/r/CODE` serve the client; built assets have correct content types; missing assets do not incorrectly return HTML; `.env`, source files, tokens, and server internals are inaccessible.
- [ ] Write failing integration tests using three real Socket.IO clients and real engine: join/start, all five rounds, finale, matching public versions, seat-specific private payloads, idempotent commands, disconnect/Caretaker/reconnect, and expiry. Capture all outbound payloads and check privacy throughout. Run a separate Play Solo match with AI_PROVIDER=none.
- [ ] Add restart test: start a room, restart the service, reconnect with its old token; show `The presses stopped — this match ended` through the agreed store error state without creating a replacement match. Test the configured proxy's authoritative IP behavior.
- [ ] Run `npm run test -- tests/server/static.test.ts tests/server/integration.test.ts`; expect failures.
- [ ] Implement static serving, SPA route handling, startup validation, and service teardown using M0 dependencies. Finalize Render as the proposed host only after checking its current official documentation for an always-on paid service with WebSockets and no idle sleep. Verify official API/model documentation before pinning usable OpenAI and Anthropic model identifiers in server configuration. Record chosen runtime/dependency/host/model versions in this plan; no paid provisioning or deployment is part of writing this plan.
- [ ] Build Docker with M0's exact runtime version, lockfile installation, build, and production start. Exclude secrets and local dependencies from build context. Verify AI_PROVIDER=none startup and real same-origin socket/static access. Live provider smoke checks require available server credentials; do not print them.
- [ ] Run full acceptance commands below. Record results and any unavailable browser/provider checks. Coordinate the browser checklist with UI/town owners; do not modify their files.
- [ ] Run the global commit gate; commit `server: package service and verify multiplayer acceptance`.

## Global Commit Gate

Run after each task's focused tests:

```bash
npm test
npm run typecheck
npm run lint
git diff --name-only main...HEAD
git diff --name-only
git ls-files --others --exclude-standard
```

All three project checks must pass. Review committed, unstaged, and untracked paths for ownership. Stage only the task's files, then use its stated commit message. If M0 scripts are missing/broken, stop and report; do not create replacements. Report failures in another owner's files rather than editing them.

## Acceptance and Handoff

- [ ] Spec §§9.3–9.5 and §10.5–6 have passing automated tests; full test, typecheck, and lint commands pass.
- [ ] Solo and three-client matches finish without AI credentials and without leaking protected fields.
- [ ] Reconnect restores exactly one authorized seat and preserves Caretaker locks; restart reports the ended match.
- [ ] UI/town owners can import the typed store and play Claude's recordings without sockets.
- [ ] Docker runs the client and socket endpoint as one service. Environment placeholders contain no secrets.
- [ ] Manual integrated browser checks cover Play Solo, three browsers, connection loss, and server restart. UI/town owners cover WebGL fallback, reduced motion, overlap, and recap accuracy.
- [ ] Changes are committed on the Codex branch; user receives command results, unfinished work, contract requests, and open questions. Deployment and final merge remain separate user actions.

## Planning Review

Coverage: lobby/auth/limits (§4.1, §9.5) in Task 2; timing/disconnect/expiry/bots (§4.2–4.5, §8) in Task 3; text/moderation/provider behavior (§5.4, §9.3) in Tasks 1, 4, 5; transport/store/privacy (§9.5) in Tasks 2, 3, 6; fixture support in Task 7; packaging and acceptance (§9.1, §10) in Task 8. Engine rules, visual presentation, content authoring, balancing, assets, playtest organization, and contest submission stay with their owners.

Implementation blockers: approved spec; committed M0 contract and scripts; Claude recordings for Task 7; real engine for final integration. External checks: current host/model availability and optional live provider/browser credentials. No implementation or deployment has been performed by writing this plan.
