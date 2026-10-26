# Inspection result in the UI: plan (Claude)

Answers Codex's `docs/onboarding/inspection-result-claude-request.md` (branch `codex/inspection-flow`, `ee58133`). User priority on 2026-10-26: the playtest showed the result of a check (and the tip while writing) never appears. Branch `claude/inspection-result`, based on `claude/onboarding`.

**Boundary (acknowledged):** UI only. The data already reaches the owner's store (`privateSnapshot.tip`, `.evidence`, `.investigations`). There is no change to `src/shared/`, the server, the net layer or the engine. Claude owns the new prop types.

## Files

- **`src/client/ui/mapper.ts`:** `deriveInspectionReport(priv, pub)` returns an `InspectionReport | null` for the current round only. Kinds:
  - `evidence`: location, claim and text;
  - `proof`: rival paper and headline;
  - `nothing`: rival paper and headline;
  - `none`: no investigation this round.

  It never reads another seat's data and never invents a result. `CLAIM_LABELS` moves here from `WriteScreen`.
- **`src/client/ui/components/InspectionReport.tsx`** (new): a read-only card headed "Your inspection result", with text rendering only. When the report sits beside the editor it also says how to attach the evidence (pick that place and claim).
- **`src/client/ui/components/TipCard.tsx`:** add the line "A hint, not proof." to separate the tip from the certain result.
- **`src/client/ui/components/keepFocus.ts`** (new): the focus helper moved out of `IntroScreen`; reused when the result replaces a pressed button.
- **`InvestigateScreen.tsx`:** in the locked state, show the result immediately with "Waiting for the other editors…". A skip says so and shows no evidence.
- **`WriteScreen.tsx`:** show the tip and the result above the pickers before any selection. The attachment selector is unchanged (matching cards only).
- **`AppRouter.tsx`:** pass `report` and `tipText` from the private snapshot.
- **CSS** in `components.css`.

## States

| State | Investigate | Write |
|---|---|---|
| No action yet / pending / rejected | Pickers, tip, and an error if any; no result | — |
| Location checked | Result: place, claim, evidence text | The same result, plus how to attach it |
| Rival proof | "Proof found: {paper}'s headline was a lie"; use Expose while writing | The same; the Expose button already exists |
| Rival nothing | "Nothing conclusive about {paper}'s headline" | The same |
| Skipped / timed out | "You skipped checking this round." | "You didn't check a place this round." |

An older round's results never show: everything is filtered to `investigation.round === publicSnapshot.round`.

## Checks

- **Tests first:**
  - the mapper for every kind, including round filtering and no other seat's data;
  - Investigate shows the result immediately when locked, plus the skip state;
  - Write shows the result and tip with no selection, keeps the attach selector matching-only, and keeps typed text across a rerender with a new report;
  - literal text, with no HTML rendered.
- `npm test`, typecheck, lint and build.
- Captures with the shared command at 1280×720 and 390×844, of Investigate locked (if the CLI can reach it) and of Write; open every PNG.

## Result (2026-10-26)

- **Delivered** on `claude/inspection-result`, which builds on `claude/onboarding`.
- **Checks:** `npm test` passed (143 files, 1031 tests); typecheck, lint and build all exit 0.
- **Captures** (`.superpowers/shots/inspection-result/`): Write in round 1 at desktop size, Write in round 2 on a phone (with and without stress text), Write in round 1 on a phone without WebGL, and Investigate in round 2 on a phone. All reported `ready`, empty layout lists and 0 console errors, and every PNG was opened.
- **Not captured:** the fixture CLI can't reach the locked Investigate state, because it needs a click. Component tests cover it.
- **Request to Codex:** repeat your real-browser flow and the 5-round transport and privacy checks on this branch.
