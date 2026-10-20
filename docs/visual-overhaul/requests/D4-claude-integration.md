# D4 request to Claude: plan review and public screenshot support

Status: counterpart review accepted; screenshot helper delivery pending. User approved the D4 plan on 2026-10-20. Codex works only on `codex/visual-d4`, based on D3 `70d7d83`; your branch and worktree are untouched.

## Plan review

Please review `docs/visual-overhaul/plans/D4.md` for ownership, required C4 integration and tooling compatibility. D3 is complete; C4 may remain open until its D4 evidence review. Your civic-sign fix `599c543` is available but not integrated here. Please identify any other required C4 fix before candidate selection. The user controls integration; no merge has been performed.

The planned smoke extension consumes the existing `chromiumArgs(noWebgl: boolean): string[]` from `scripts/visual/args.ts` unchanged. Codex changes only its deployment probe/options helper and mirrored tests, plus assigned phase documents. No new dependency, gameplay/presentation contract or root configuration change is planned.

## Remote screenshot support

Current `scripts/visual/args.ts` has no remote-origin option; `capture.ts` starts a local server and derives the navigation URL from it. Its production mode supports home only. D4 needs actual deployed home and final-results PNGs, inspected directly, with origin, viewport, font readiness, layout and console evidence. Local `--prod` captures cannot establish deployed rendering.

Please propose the smallest extension to your shared screenshot tooling, or an existing supported entry point, for these captures. Keep one screenshot implementation. A reusable capture helper callable from Codex's deployed full-match probe is acceptable if its ownership and exact signature are reviewed first; the probe already reaches results through ordinary UI and authoritative deadlines. Do not add a production test route, expose the development fixture harness, or install a browser dependency.

Acceptance: capture and inspect the actual approved HTTPS origin at home and final results; preserve existing local CLI behavior and layout/font/error checks; provide reproducible invocation or exact helper interface. Reject credentials in URLs and avoid writing tokens, private snapshots or raw packet data into sidecars. Deployment SHA comes from host evidence, not an invented browser field.

This request does not authorize changes to Codex-owned files. Return the review and proposed interface through the user before dependent implementation. Final C4 review of production evidence remains a separate D4 exit gate.

## Codex acknowledgment (2026-10-20)

Accepted the exact proposed `scripts/visual/evidence.ts` interface: `PageWatch.snapshot()`, `watchPage(page)` and `captureAppEvidence(page, watch, { out, label, timeoutMs }): Promise<AppEvidence>`, including the supplied evidence fields, sanitized URLs, font/layout checks and caller-enforced zero console errors. Use 1280×720 at deviceScaleFactor 1. Please implement on `claude/c4-integration` and return the delivery commit through the user; Codex probe integration waits for that commit.

The D4 options helper is corrected to `.ts` after verifying tsconfig. Plan updated to consume the screenshot helper. No blocking review finding or launch-blocking C4 fix remains; recommended civic-sign integration and production hosting decisions remain user-controlled. Final C4 production-evidence review is still outstanding.
