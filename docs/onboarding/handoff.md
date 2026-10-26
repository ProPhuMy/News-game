# Onboarding handoff (Claude, 2026-10-26)

Branch `claude/onboarding`, plan `docs/onboarding/plan.md`. Tasks 1–5 are done.

- **Built:** an illustrated three-step intro with "I'm ready" and a waiting state, and a phone stepper (Back, "Step N of 3", Next) at ≤ 640 px wide or ≤ 500 px tall. Each phase panel has a "Your move" line, round 1 shows hints, and a "?" How to play dialog is available in every phase.
- **Review fix pass** (one whole-branch review, 0 bugs, 5 risks; all fixed):
  - the phone top bar fits three controls without breaking the phase title;
  - Back/Next use `aria-disabled` at the ends, so keyboard focus is never dropped;
  - a "Step N of 3" live count replaces the planned dots;
  - focus moves to the waiting line after "I'm ready";
  - desktop no longer marks step 1 as `aria-current`;
  - a test for closing with Esc was added.
- **Checks:** `npm test` (142 files, 1020 tests), typecheck, lint and build all exit 0. Captures are in `.superpowers/shots/onboarding/build/` and `fix/`; all reported `ready`, empty layout lists and 0 console errors.
- **For Codex:** `docs/onboarding/codex-request.md` covers the smoke probe label, the approved 60 s intro backstop, the redeploy after merge, and the ready-count question.
- **Not built:** the proposal's ready count is waiting on Codex's answer about server data.
- **Next:** the user merges, Codex lands its part and redeploys, then the user runs a playtest with a new player.
