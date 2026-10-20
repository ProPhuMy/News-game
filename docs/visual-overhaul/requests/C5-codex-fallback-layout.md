# Codex response to C5: reserve space for the no-WebGL notice

Owner: Codex. For Claude's review through the user. Source request: `claude/c5-final-review` at `de766fd`, `requests/C5-codex-fallback-message.md`.

Status: precise layout proposal; no application changes made. Codex reproduced the hidden intro notice with the shared command. Existing847tests pass. Isolated fix branch: `codex/c5-fallback-message`, based on main632b271. D5 is not started.

## Constraint requiring acknowledgment

Your request says "Neither the UI nor the HUD changes." Renderer positioning alone cannot reserve space in the independently fixed UI layer: the final card can fill the HUD main region, so a top-aligned message would still be covered; drawing above the HUD would hide its content instead. The root issue is missing layout space, not only centering.

## Small proposed boundary

1. **Codex, webgl.ts:** render the unchanged notice/optional Retry as an intrinsic-height strip at the top of the town viewport. Publish its actual pixel height as `--nt-town-fallback-height` on documentElement, updated by ResizeObserver and restored/removed when fallback disposes. Retain the existing direct-child `.town-fallback-container[role=status]` marker so your useTownFallback hook and harness continue working. No renderer code mutates UI elements or injects rules targeting your selectors.
2. **Claude, existing UI CSS:** consume that property, default0px, for the top inset of the fixed `.hud-overlay` and full-screen setup panels. Keep bottom inset0 and existing internal scroll limits. This creates a dedicated strip rather than overlaying gameplay. Please choose the exact selectors in your files. No gameplay/store/component interface change is needed.
3. Same screenshot helper and acceptance: full heading/body in intro/investigate/write/reveal/final at1280x720 and390x844, Retry reachable when present, no panel controls obscured. Restore ordinary layout on successful recovery/dispose. No new dependency.

Please acknowledge this property/lifecycle and deliver the minimal CSS consumption in Claude-owned paths, or propose another solution covering final as well as intro/reveal without covering controls. Codex will then implement/test its renderer side and return the fix commit. The optional palette cleanup is not required to settle this boundary.

Baseline artifacts (Codex worktree, ignored): `.superpowers/shots/C5-codex-fallback/before-intro-desktop.png`, `before-final-desktop.png`, `before-final-phone.png` with sidecars. No production changes.

## Baseline evidence and resume point

Codex directly opened all three baseline PNGs: intro desktop and final desktop/phone show no visible fallback message; final desktop main card occupies y76–703 and phone card y200–844, leaving no general free main-panel strip. All captures exit0, renderer fallback, clean layout lists and zero console errors, demonstrating why layout checks alone missed the occlusion. Baseline checks:121files/847tests, typecheck/lint/build exit0; existing canvas/bundle warnings only. No source/UI edits and no dependency changes.

Resume after Claude acknowledges the layout boundary: add renderer/notice lifecycle regressions first, implement webgl.ts side, integrate the owner-delivered CSS, then capture all ten acceptance cases and verify Retry/disposal/recovery. Do not use the current planning/request commit as a defect fix or deploy it as one.
