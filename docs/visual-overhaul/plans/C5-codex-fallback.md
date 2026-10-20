# C5 integration support — fallback notice visibility

Owner: Codex. This is the user-requested Must fix raised in Claude's `de766fd:docs/visual-overhaul/requests/C5-codex-fallback-message.md`; it does not start D5 or reopen unrelated D4 work.

Base: local main `632b271`, clean isolated worktree `.worktrees/codex-c5-fallback`, branch `codex/c5-fallback-message`. Origin/main remains older (`72ffd6d`) after fetch; do not reset local main to that older remote or merge it into the fix. Local main contains D4 closeout and the shipped source. Claude's C5 worktree remains untouched. Reuse existing installed dependencies; no package/config edits.

## Reproduction and layout constraint

`createFallbackView` is a direct child of the full-viewport town container at z-index0; UI lives in a separate fixed layer at z-index10. The centered status lies behind intro/reveal panels. The final results card can occupy the whole main HUD region, including its top edge, so top alignment alone cannot guarantee an unobstructed notice in every requested phase. Raising the notice above the HUD would instead obscure game content/controls.

The source request says "Neither the UI nor the HUD changes." A reserved, non-overlapping notice strip therefore needs counterpart agreement for a tiny layout consumption change before implementation. Exact proposal is in `../requests/C5-codex-fallback-layout.md`.

## Proposed scope after counterpart acknowledgment

- Codex-owned `src/client/town/webgl.ts`: put the existing full notice and optional Retry button in an intrinsic-height strip; publish its measured height through one presentation-only CSS property while mounted; update it on resize/font reflow and restore previous state on dispose. No DOM reparenting, game/protocol changes or UI-selector patching from renderer code.
- Codex-owned `tests/town/webgl.test.ts`: failing-then-passing regression for the property lifecycle and notice/Retry/disposal, using the existing DOM unit test setup.
- Claude-owned UI CSS, delivered by Claude only: consume the measured height to start fixed HUD/setup panels below the notice, keeping their bottom bounded and scroll behavior. No component/engine redesign.
- New planning/request documents in this fix are Codex-owned: this plan and `docs/visual-overhaul/requests/C5-codex-fallback-layout.md`.
- CSS property proposal `--nt-town-fallback-height`: presentation-only, set/restored by Codex, consumed by Claude. Not agreed or implemented yet. No frozen gameplay contract affected.

## Checks and output

1. Record/view baseline captures; baseline npm test passes121files/847tests.
2. Get Claude acknowledgment or an alternative that meets all acceptance cases without hiding game content. No dependent implementation before that boundary is agreed.
3. Test first, implement the narrow renderer change, integrate Claude's authorized CSS delivery through the user workflow.
4. Shared `--no-webgl` captures for intro/investigate/write/reveal/final at1280x720 and390x844; directly view all PNGs, inspect full heading/body and optional Retry reachability; town-only semantics unchanged. Use real layout hit-testing as necessary, not just empty overflow lists (the original hidden notice passed those).
5. Existing fallback/context-loss/disposal tests and full npm test/typecheck/lint/build; ownership/whitespace audit; commit on own branch and send exact delivery to user for Claude recapture/review.

No production deployment, dependency, new asset, scope cut or contract request. Current status: reproduction verified; counterpart layout acknowledgment pending, no source fix implemented.
