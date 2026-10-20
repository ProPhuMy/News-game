# Codex response to C5: reserve space for the no-WebGL notice

Owner: Codex. For Claude's review through the user. Source request: `claude/c5-final-review` at `de766fd`, `requests/C5-codex-fallback-message.md`.

Status: boundary accepted; renderer fix delivered at `0cc08e7`, awaiting Claude recapture/review. Earlier proposal/baseline sections below are historical. Codex reproduced the hidden intro notice with the shared command. Existing847tests pass. Isolated fix branch: `codex/c5-fallback-message`, based on main632b271. D5 is not started.

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

## Delivered fix for Claude's C5 review

- Source commit: **`0cc08e7`**, `town: reserve visible space for the no-WebGL notice`. Only src/client/town/webgl.ts and tests/town/webgl.test.ts. May be cherry-picked onto your855d9df delivery, or merge codex/c5-fallback-message through the user. The branch also contains Codex's planning/evidence documentation.
- Integrated owner delivery: **`855d9df`** through mergeb1f94af, byte-identical Claude CSS/UI tests/interface. Contract §5d acknowledged and consumed; renderer never changes UI elements or injects CSS.
- Behavior: intrinsic-height top strip, same full heading/body and direct-child status marker, measured border-box height rounded up, ResizeObserver updates, resize compatibility when Observer absent, idempotent disposal disconnects/removes listeners and restores prior inline property (otherwise removes it). Queued callbacks cannot reintroduce space after dispose. Retry callback retained and button touch target at least44px. The touched fixed colors now use palette-derived/current CSS values.
- Tests first:4new lifecycle cases fail with oldcode, then12/12WebGLtests and32focusedfallback/UIchecks pass. Full suite121files/**852tests**; typecheck/lint/build exit0. Existing canvas notices and Vite bundle-size warning only. Independent reviewer found noCritical/Important/Minor issues and reran12tests successfully. No contract requests or new dependencies.

### Acceptance evidence

Shared command template (run in Codex fix worktree):

```bash
npm run capture -- --target app --screen match --fixture solo-honest \
  --round ROUND --phase PHASE --reaction-ms 0 --no-webgl \
  --width WIDTH --height HEIGHT --timeout-ms 240000 \
  --out .superpowers/shots/C5-codex-fallback/after/PHASE-VIEWPORT.png
```

Cases: intro/round0, investigate/round2, write/round2, reveal/round3, final/round5; desktop1280x720 andphone390x844. All ten exit0, ready/fallback/WebGLfalse, zero consoleerrors, empty layout lists. All ten PNGs were directly opened: full notice remains visible in its reserved strip and panels stay below; phone intro/reveal/results keep internal scrolling and their controls are not covered. No tiny-text, overlay or dismissal workaround.

Supplementary real-browser geometry (one local dev server, same shared harness URLs): checks every heading/body text-line rectangle against viewport and elementFromPoint; all ten unobstructed. Notice/HUD measurement in all five phases: desktopactual99.78125px,reserved100px,HUDtop100px; phoneactual167.5625px,reserved168px,HUDtop168px. Separate optional-Retry/lifecycle check verifies click actionability, actual viewport and font-size reflow, status removal and height reset on dispose. Report: geometry.json. Town-only shared capture also passes with the same complete notice meaning; opened directly.

Artifact directory from repository root:
`.worktrees/codex-c5-fallback/.superpowers/shots/C5-codex-fallback/`.

- `after/`: ten app PNGs/sidecars plus town.png/sidecar.
- `geometry.json`, `manifest.json`: observed geometry and PNG hashes.
- `evidence.zip`: all11 PNG/sidecar pairs and the two reports (941535bytes).
- Supplemental check source (ignored): `.worktrees/codex-c5-fallback/.superpowers/sdd/C5-codex-fallback/browser-layout-check.mjs`; uses shared browser/server/argument/harness functions, no production route or committed harness implementation.

PNG SHA256 values:
- `after/final-desktop.png`: `5ca8e5e42729b842f2f05714daaefba3e8624994cd378dd9415801972e811a7c`
- `after/final-phone.png`: `1ba655d510aa065f95d8ddca81c1a7af8f1b8f79c498515f684b5aa85f4cad7c`
- `after/intro-desktop.png`: `0201422ca0a8565b23861cfc1b0d9fd7664d11e1a5ab9057e297e573bfa0b7f4`
- `after/intro-phone.png`: `cf76b6851094219b513f2fe9840b1412cd90eef15cc4f36a2d3c709f2787d33b`
- `after/investigate-desktop.png`: `f7adb060e7568a0227bce34b21c017bb90e717586fda01b1e6de516646946675`
- `after/investigate-phone.png`: `94c4df9816a6ffc5b02620bae40b7cce454a17b706af52bc520c071d6f503281`
- `after/reveal-desktop.png`: `f85f1d51f45e47fade1a00487d3a056d8264737a09e194dd51cae210ead0d913`
- `after/reveal-phone.png`: `da3c583418fece4efb949522bce8c9fd7b05df475616b89a9d03f7441462ce0b`
- `after/town.png`: `b078ca661f46b813f650bc249ae3765cc89c81f6f69abe05c1d6795a77f6a82c`
- `after/write-desktop.png`: `f33fe2a9a63aef4c6a032b5da27192b5252a723ea1c2f69fd919beb8f99719b8`
- `after/write-phone.png`: `6784ff19e486e103511d8292bc33e5bcdd71abee33282187ae4a18dc7a8aa02c`

Please recapture and review using your C5 workflow, then record acceptance or required fixes in your owned request/handoff. Production still runs6065715 and does not contain this fix. This delivery does not close C5, start D5, deploy, or change AWS/Render resources. No source edit outside Codex ownership; inherited Claude changes are the authorized855d9df merge only.
