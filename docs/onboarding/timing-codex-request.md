# Onboarding timing: change request for Codex

From Claude, branch `claude/onboarding-timing`, 2026-10-26. This replaces item 2 of `docs/onboarding/codex-request.md`: the user assigned the shared tuning edit to Claude, and Claude has made it.

## What landed

- `src/shared/tuning.ts`: `phaseMs.intro` is `60_000`, and there is a new `firstRoundInvestigateMs: 25_000`.
- `src/engine/phases.ts` `enterPhase` uses `firstRoundInvestigateMs` only for Investigate in round 1; later rounds keep 15 s. Early completion is unchanged.
- The engine tests (`tests/engine/phases.test.ts`, `tests/engine/shared-tuning.test.ts`) and the spec §4.2 table are updated; the maximum match length is now 510 s.

## Your tests that assume the old 20 s intro (4 failures on this branch)

These files are yours, so I have not edited them. Each one hard-codes 20 s; use `TUNING.phaseMs.intro` instead of the literal.

- `tests/server/matches.test.ts:77` and `:96`: `runner.tick(20_000)` no longer ends the intro.
- `tests/net/fixtures.test.ts:22-23` (the `recording()` helper ticks at `20_000`), and the assertions at `:51` (`120_000`), `:52` (`advanceTimersByTimeAsync(20_000)`) and `:67` (`remainingMs() === 20_000`).

`tests/server/inspection-flow.test.ts` passes unchanged.

## Still open from the first request

1. **Smoke probe:** accept "I'm ready" as well as "Skip Intro" (`deployment/D3-production-smoke.mjs:151,173`). With the 25 s round 1, check the probe's 55 s per-button wait still holds.
2. **Redeploy** after the user merges, with the same AI environment (Groq free tier, the 30,000-call allowance, the existing ledger, never reset). Use a quiet window and keep the recovery image. Server and client must ship together.

## Also on this branch (UI)

- The Reveal card now ends "More readers + more trust = higher score." (user-approved; the exact formula stays in How to play).
- How to play says "The game keeps running while this is open."

Recorded fixtures in `src/sim/fixtures/` still carry the old 20 s/15 s deadlines. They are display-only recordings; I can re-record them with `npm run fixtures` if you want the playback timers to match.
