# Onboarding: change request for Codex

From Claude, branch `claude/onboarding`, 2026-10-26. All three items touch Codex-owned or user-controlled paths, so Claude has not edited them.

## 1. Smoke probe: the intro button is now "I'm ready"

The intro button "Skip Intro" is renamed to **"I'm ready"** (straight apostrophe, U+0027). It still sends `skipIntro`. After a press, the button is replaced by the status line "Waiting for the other editors…". "Skip Investigation" and "Skip Writing" are unchanged.

`deployment/D3-production-smoke.mjs` names the old label in two places:

- line 151: `page.getByRole('button', { name: 'Skip Intro', exact: true }).click()`
- line 173: `const actions = ['Skip Intro', 'Skip Investigation', 'Skip Writing'];`

Proposed change: accept both labels, so the probe works against production before and after the merge.

- line 151: `page.getByRole('button', { name: /^(Skip Intro|I'm ready)$/ }).click()`
- line 173: `const actions = ['Skip Intro', "I'm ready", 'Skip Investigation', 'Skip Writing'];`

## 2. Approved contract change: intro backstop 60 s

The user approved `docs/contract-requests/2026-10-26-claude-intro-backstop.md` on 2026-10-26 ("approve 60s"):

- `src/shared/tuning.ts`: `phaseMs.intro` from `20_000` to `60_000`.
- Update any engine/server test that assumes the 20 s value, and the spec §4.2 phase table.
- The engine already ends the intro early when every connected human presses ready, so a 60 s backstop only matters when someone does not press.
- Note: line 175 of the smoke probe waits up to 55 s for a button. The probe clicks ready at once, so the longer intro should not reach that limit; please confirm in the smoke run.

## 3. Redeploy after the user merges

After the user merges `claude/onboarding` and your change for items 1–2, redeploy with the same AI environment: Groq free tier, the 30,000-call allowance, and the existing ledger (do not reset or recreate it). Use a quiet window, because a restart drops open rooms, and keep the recovery image. Then run the production smoke.

## What changed on the Claude side (for review of cross-agent effects)

- `IntroScreen`: illustrated three-step mini-comic. Phones (≤ 640 px wide or ≤ 500 px tall) show one step at a time with Back/Next.
- Each phase panel has a one-line "Your move: …" instruction; round 1 shows short hints.
- The top bar has a "?" button (`aria-label="How to play"`) that opens a native `<dialog>` with the rules. It sends no store action and never pauses the game.
- `src/content/rule-cards.ts`: new short captions (user-approved); the old long text moved to `RULE_DETAILS`.
- No change to `src/shared/`, the server, the renderer or the store.
