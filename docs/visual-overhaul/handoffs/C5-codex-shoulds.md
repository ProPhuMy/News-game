# C5 Should renderer handoff — Codex

Status: renderer implementation, counterpart review and reference-laptop FPS are accepted. **C5 remains open** for final production screenshot/source-identity evidence and Claude's closeout. The candidate is now deployed and its user-run remote smoke passed; latest rollout details are recorded below. D5 has not started.

## Base, gates and ownership

- Branch `codex/c5-shoulds`, isolated worktree `.worktrees/codex-c5-shoulds`.
- Plan `plans/C5-codex-shoulds.md` at `7d46a94`, accepted by Claude through the user. Main `ee66d69` integrates Claude modules `ccf642c`; merged into this branch without conflicts. User relayed approval of all six looks ("yeah both are good").
- Source commits: `d304b9c` (day progression), `7b96b5e9adfe33fa5b7b335466bd79673f841bc7` (reading/arrival feedback and review fixes).
- Direct code changes are Codex-owned town renderer files and tests only. Claude UI/styles, props/buildings/architecture, palette/interface and shared capture tooling are byte-identical to main `ee66d69`. No shared gameplay contract, engine, route, fixture, asset, dependency or root configuration changes.
- Additive acknowledged API: `TownView.setTimeOfDay(time: TimeOfDay): void`. The fallback is a no-op. Mount derives the look from the authoritative round/phase, or midday without a snapshot.

## Delivered behavior

- All supplied look fields apply to the scene: background, fog, hemisphere sky/ground and sun colors. Intensities are 1.1/2.4 times `lightScale`; pool opacity uses `setLampLevel?.(lampLevel)`. Lantern emissive remains constant. First look is immediate, later changes interpolate over one second without restarting on duplicate targets; reduced motion switches immediately. Context restoration reapplies the current look.
- Prelude uses existing procedural reading pose for `min(1.2 seconds, 0.15 * remainingSeconds)`, followed by a neutral pause if needed. Travel remains the existing 15–70% normalized window and final-node/slot segment. Prescribed behavior gestures, hat changes, signs and emotes follow arrival. Very short reconnect intervals and reduced motion snap immediately.
- Emotes use Claude's mapping, with an anger glyph (💢), not the word "anger". Selection is deterministic by eligible destination groups and round-robin up to eight, independent of six speech bubbles. Empty/invalid routes use the playback coordinator's canonical resolved destination. A bounded projection-placement search avoids speech bubbles and other emotes; icons outside the viewport or without room are hidden rather than overpainted.
- All `protest` and `angry_mob` actors get signs at arrival, including reduced motion. One original per slogan lives in Claude's per-town kit; Codex reuses one clone per citizen with deterministic slogan selection. Clear detaches signs without growing the kit's clone set over repeated rounds. Dispose frees the kit before citizens/materials.
- Normal playback completion preserves arrival feedback until the next phase. Explicit stop, replacement plan, phase change and session reset clear it. Missing snapshot after an active match calls the existing renderer `setPhase('ended')` for cleanup, then selects midday; this is presentation cleanup only, with no store action or server event.
- Context loss hides the emote overlay; recovery restores it. Speech bubbles retain their existing clear-on-loss behavior. Full elapsed playback time catches up after a suspended frame or context recovery, with a per-plan baseline so a new plan never inherits time before it began. Camera/effect delta remains capped.

## Verification so far

Commands run in the isolated worktree:

- `npm test`: **130 files / 908 tests passed**.
- `npm run typecheck`, `npm run lint`, `npm run build`: exit 0. Build has the existing large-bundle warning; jsdom reports its existing canvas notices.
- RED/GREEN evidence: missing daylight import and absent mount call; missing emote/prop modules; absent arrival/reading behavior; suspension/reset regressions; fresh-plan elapsed-time and overlapping-icon regressions. Focused final tests passed before the full checks.
- Fresh independent whole-change review: two Important findings, both fixed in one RED/GREEN pass: pre-plan elapsed time being charged after a frame gap, and overlapping crowd emotes. No other correctness/interface findings. Reviewer ran the focused suite and opened the first arrival PNG. Updated desktop/phone captures are for Claude's final review.
- `git diff --exit-code main HEAD -- scripts/visual src/client/visuals src/client/ui src/client/styles src/client/town/architecture src/client/town/props src/client/town/buildings.ts`: exit 0.
- Browser live ticker check (no screenshot freeze): normal CSS transform changes; switching browser media preference to reduce yields animation name `none`. Browser 153.0.8010.12. Report: `.superpowers/shots/C5-codex-shoulds/final/live-ticker.json`.

All 30 final captures have been opened directly by Codex (29 matrix scenarios plus one real WebGL context cycle). Shared command example:

```sh
npm run capture -- --target app --screen match --fixture solo-honest --round 3 --phase reveal --reaction-ms 15000 --width 390 --height 844 --timeout-ms 400000 --out .superpowers/shots/C5-codex-shoulds/final/reveal-phone.png
```

Evidence root: `.superpowers/shots/C5-codex-shoulds/final/` (ignored, retained in this worktree).

| Captures | Count | Result |
|---|---:|---|
| `day-round-1` through `day-round-5` (write), `night-town`, `night-app` | 7 | All six looks present; hat colors, street edges and lamp pools visible; fog color applied. |
| `reveal-0`, `reveal-1200`, `reveal-6000`, `reveal-15000` (town) | 4 | Lead-in, travel and arrival reviewed; all prescribed actors remain on their routes. |
| `reveal-desktop`, `reveal-phone`, `reveal-landscape` | 3 | 1280×720, 390×844, 844×390; bounded UI and readable emote glyphs. |
| `reveal-reduced`, `reveal-reduced-phone` | 2 | Stable icons and all protest signs; no movement/prelude. |
| `reveal-desktop-repeat` | 1 | `cmp` against `reveal-desktop.png` exits 0: byte-identical with ticker present. |
| `emote-question`, `emote-danger` (town, reduced motion) | 2 | Supplemental ? and ! coverage; anger and $ appear in round-3 captures. |
| `fallback-{intro,investigate,write,reveal,final}-{desktop,phone}` | 10 | Notice heading/body remain visible above HUD/ticker; controls retain scroll paths. |
| `context-cycle` (town, round 3 reveal, 15000 ms) | 1 | Real WebGL loss/fallback/restore passed, bubbles 4 → 0, restored frame advanced 100 ms and opened; signs/emotes survive. |

All 30 sidecars report ready, the expected WebGL/fallback renderer, zero console errors, empty app overflow/unreachable lists and HTTP 200 recorded CSS/font responses. Scene-only sidecars have no app layout report. Glyphs obey camera clipping; HUD panels can naturally cover town decorations, and bounded placement may hide icons when room is unavailable. Picket slogans are small at whole-town zoom; their scale is the supplied Claude prop scale.

Review bundle: `.superpowers/shots/C5-codex-shoulds/evidence.zip` (4,524,188 bytes; SHA-256 `bef5c46b340da3b5b8d07b91c7fcc90613dc4032e5f27004da478709c4c7eb5d`). Includes all 30 PNG/sidecar pairs, manifest, live ticker and source identity reports.

`manifest.json` holds each scenario's sidecar and PNG SHA-256. `live-ticker.json` records the live motion check. All capture paths above use the shared screenshot command; no replacement screenshot implementation. Scratch logs/ledger live under `.superpowers/sdd/C5-codex-shoulds/`.

Source identity: 179 tracked files under src/ plus package.json/package-lock.json; sorted records `relative-path,NUL,SHA256-of-bytes,newline`; combined SHA-256 `d4ef4b20e69849f32de9ebf0b093aa6bb0bdb405bec43213639b780541236b87`. The same value is saved in `source-identity.json`. `335f377` only relocates tests and updates the plan; its src/public/Dockerfile/package files are byte-identical to source commit `7b96b5e`. This is local identity evidence, not a host/deployment claim.

## Remaining gates and next operator steps

1. Claude reviews the integrated PNGs against §5c: night readability and fog; stable reduced-motion feedback; sign grip/scale; emote grouping/placement; ticker and fallback notice at phone/landscape sizes. Any defect inside a Claude-owned module goes back to Claude.
2. Repeat the **existing reference-laptop** realtime performance recording on this candidate: run `npm run dev`, then open `http://localhost:3000/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&palette=b&reducedMotion=false&playback=realtime` using the same laptop/browser/display scaling as the accepted D2 trace. Aim for 1280×720 CSS, but record actual dimensions and DPR; the accepted prior trace was 1280×691 CSS, DPR about 2, drawing buffer 2560×1382. Do not silently force DPR 1 and compare its FPS directly against that baseline. Wait for Ready, start the recorder and click Run. Preserve the harness report with `problems: []`, hardware/browser/settings and frame data, especially the 70–100% tail with 26 signs (18 protest, 8 angry_mob). Sign outlines are unbatched; no hardware FPS is claimed from software WebGL captures. Compare against recorded D2 performance (36.8 FPS average, user-accepted brief 29 FPS dip). Report regressions; do not silently drop agreed effects.
3. After approval of a concrete candidate, use the existing user-operated EC2 release/rollback procedure and D3/D4 smoke probe against `https://newstown.prophumy.com`. Retain the current image as recovery before restarting. Record exact source digest/image and remote home/final evidence. No Paid Plan upgrade, new paid resources or out-of-pocket spending authorized. Render Free fallback unchanged.
4. Claude completes C5's final whole-match review. Description approval is already recorded in Claude `5b42019` (integrated here). Only then can D5 start.

Production is unchanged by this renderer branch. Last confirmed live source remains `6065715`, image `sha256:51f74f3518ec9145dad4fc135798f95d079f27484bc260135187daee05094bfa`; check the host again before any rollout. A restart loses in-memory rooms. No contract requests filed; no scope cuts added.


## Raised-picket candidate integration (latest)

Claude accepted `565eaae` with no required Codex changes (908 tests plus typecheck/lint/build, all 30 captures reviewed). Claude found/fixed its own small-board defect in `a1b658b`: board height 0.56 and stick top 1.3 above the grip, making the sign clear the head at Codex's existing 0.85 grip offset. Slogans now BOO!, NO!, FAKE!; modulo selection works unchanged. No API change. Interface §5c and Claude's final review are delivered in `6450302`.

User instructed integration for the candidate. Merged `claude/c5-final-review` through `6450302` into this branch at **`1001abad7c06c7511c4278c6835da5faa47c1e02`**, no conflicts. Claude-owned paths were consumed unchanged. This also brings in recorded description approval and parked AI-enablement findings; no AI provider/configuration was enabled.

Fresh combined checks: **130 files / 907 tests passed**, typecheck/lint/build exit 0. The one-test difference is the removed SHAME! parameterized case, not a failure or scope cut. The original 30-image ZIP above certifies the pre-resize renderer and is retained as historical evidence; fresh raised-sign town/phone captures are saved separately under `.superpowers/shots/C5-codex-shoulds/candidate/`.

Latest source identity is **179 files**, digest **`bb1e10483d5e92a2735c6683a31247b457805edbd79da26be694420da76bea92`**, same sorted-record format as above, computed at merge `1001abad`. `candidate/source-identity.json` records it. The earlier digest belongs to the pre-resize source and must not be used for this candidate's host check.

Ruling for FPS comparability: use the same reference display scaling/settings as D2 and preserve the actual viewport/DPR in the report. The earlier plan's DPR-1 instruction differed from the accepted D2 trace (approximately DPR 2); comparing those rates without disclosure would be misleading. Hardware FPS and production rollout/smoke remain pending.

Fresh candidate captures `picket-town.png` (1280×720) and `picket-phone.png` (390×844), both round-3 reveal at 15000 ms, passed and were opened directly by Codex: ready, WebGL, zero console errors; phone overflow/unreachable lists empty. Raised boards clear the heads; speech bubbles and HUD can still occlude parts of the town as before. Candidate bundle `candidate/evidence.zip`: 308,362 bytes, SHA-256 `3d8096204528ff79767c99761c262268f60fbb8977d6779b885bc837b30f7900`. It contains these PNG/sidecar pairs, manifest and new source identity. This supplements, rather than silently replaces, the pre-resize 30-capture bundle.

### Laptop FPS operator checklist (next)

On the reference laptop's repository, fetch/check out `codex/c5-shoulds` and verify its current SHA, then run `npm run dev`. Use the same browser/display scaling as the accepted D2 trace. Open:

`http://localhost:3000/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&palette=b&reducedMotion=false&playback=realtime`

Wait for **Ready**, start the browser's Performance recording, press **Run**, wait for **Finished**, then stop and export the recording. Preserve the full interval, including the 26 raised signs in the arrival tail. In the console, `copy(JSON.stringify(window.__NEWS_TOWN_VISUAL__, null, 2))` copies the harness report; save that alongside the trace. Include the actual viewport/DPR, browser and whether the reference hardware/settings changed. A valid harness run needs `report.run.problems: []` and 30 actors travelled; FPS still comes from the exported recording, not the report's duration alone.

No new FPS result is claimed. Once that evidence is reviewed, proceed through candidate approval and the existing EC2 release/smoke workflow; production has not been touched here.

## Reference-laptop trace received — initial failure, superseded by user acceptance below

Analyzed `/home/agent/projects/Trace-20261020T225721.json` (52 MB; SHA-256 `a5b46be76067b32dc23f2f416dea02bb6c5d7edc03fb315993bd96c93a724e14`). The trace identifies the exact realtime round-3 URL and renderer PID 531704. The user supplied the matching new harness report in chat; it is saved separately as `.superpowers/sdd/C5-codex-shoulds/fps/harness-report.json`. The older `/home/agent/projects/busy-report.json` was **not** used for this run or overwritten.

Harness validity: finished, 30 actors/30 multi-node routes, destinations 26/4, 18 protest + 8 angry_mob + 4 queue, no degraded assets, normal motion, `run.problems: []`, all 30 travelled. Harness duration 20010.3 ms agrees with trace marks delimiting 20.010255 s. Viewport 1280×691 CSS, DPR 2.000000031789142, drawing buffer 2560×1382 match the accepted D2 recording. Exact Git SHA is not embedded in the trace; the profile does contain the new daylight/emote/reaction-props code. Hardware identity is not independently encoded by this report.

Using the **same** distinct `AnimationFrame::Presentation` timestamps for the marked page renderer and the same full-window convention as D2:

| Measurement | Accepted D2 | New Should recording |
|---|---:|---:|
| Full-interval presentations | 737 | 695 |
| Average FPS | 36.7866 | **34.7322** |
| Lowest exact rolling one-second count | 29 (user-accepted exception) | **26** |
| Frame gap p95 | 41.680 ms | 48.606 ms |
| Maximum frame gap | 62.522 ms | 55.557 ms |
| Maximum main-thread RunTask | 34.282 ms | 58.731 ms |

Average is down 5.58%. Fixed one-second counts: 29, 37, 37, 37, 37, 37, 37, 37, 37, 36, 30, 29, 33, 31, 34, 36, 37, 32, 36, 36. Worst rolling window begins 10.289081 s after Run, during travel. Arrival tail 14–20 s averages 35.1667 FPS. This trace therefore does **not** establish that unbatched sign outlines caused the worst dip: the minimum precedes sign attachment. No causal diagnosis is claimed from these counts alone.

The script also reproduced the old trace's 737 presentations and rolling minimum 29, checking that the comparison uses the same measurement convention. The new trace's filmstrip ends at 11.755837 s after Run: extracted start/last-travel images were opened, but the filmstrip supplies **no arrival/finished image**. The frame-event stream and matching harness report do cover the full run. Do not label the last filmstrip image as arrival/end evidence.

Structured analysis: `.superpowers/sdd/C5-codex-shoulds/fps/summary.json`; raw trace remains unchanged outside git. No source changes, new app tests, hardware FPS claim from software rendering, deployment or contract request. Prior candidate checks (907 tests/typecheck/lint/build) still apply to unchanged source; they were not rerun for this read-only analysis.

**Initial outcome (before the user decision below):** the run is valid, but FPS does not pass the stated 30 floor or the previously accepted brief 29 exception. C5 remains open. Next is profiling the mid-run dip and deciding on a targeted correction; do not silently broaden the old exception to 26 or remove agreed effects. Production remains unchanged.


## User performance acceptance — FPS gate CLOSED

After receiving the full measurement and comparison, the user said: **"right i think that's acceptable"**. This explicitly accepts this candidate's measured **34.7322 FPS average** and **26-frame minimum rolling one-second window**, at the recorded reference configuration (1280×691 CSS, DPR approximately 2), as a new exception to the proposed 30 FPS floor. It does not imply sustained 30 FPS, 60 FPS, improved performance, or approval of an unmeasured later regression. Keep the trace, profile limitations and measured values above intact.

The required FPS gate is therefore **accepted by user decision**. No additional optimization, feature removal or identical recording is required for this candidate. All agreed Should effects remain present. Product source is unchanged; candidate identity remains merge `1001abad` / 179-file source digest `bb1e10483d5e92a2735c6683a31247b457805edbd79da26be694420da76bea92`.

Next: use the existing user-operated EC2 candidate deployment and production smoke workflow, retain the current image for rollback, record the actual deployed source/image identity, and send the resulting production evidence for C5 closeout. C5/D5 are not declared passed here. No paid services, account upgrade, contract change or production action was authorized or executed by this acceptance record. Documentation-only update: `git diff --check` and ownership/source checks; no app tests rerun.


## EC2 candidate rollout and remote smoke — user-run, passed

The user uploaded the reviewed `d86a2d5ea16cfb8e5fb42ae0230b611f0bb0a9b8` Git archive. Arch archive regeneration initially failed because an existing same-named /tmp archive belonged to the other user; its reported checksum exactly matched Codex's prepared archive, and upload succeeded. Host checksum also matched: `cd402f0196ef73ee3c17a3db24606b8a636febd5d30ae004f9d0966e4a023279`.

User-run Docker build succeeded from that release directory. Inspection returned image **`sha256:4a038abd4b757e14f25455c0ca6c9f92787e9a220c2b6f63c17033a0705c87e6`**, OCI revision **`d86a2d5ea16cfb8e5fb42ae0230b611f0bb0a9b8`**. The existing running image was retained as `news-town:recovery-before-c5`, resolving to **`sha256:51f74f3518ec9145dad4fc135798f95d079f27484bc260135187daee05094bfa`**. Observed bridge gateway remained `172.17.0.1`.

User replaced only `news-town-app` using the inspected image and the same loopback port, local log limits, AI_PROVIDER=none, Render trust off and exact bridge-proxy trust settings. Caddy/DNS/EC2 resources were not changed by these commands. Post-replacement inspection returned that same image ID; HTTPS returned HTTP/2 200 via Caddy on 2026-10-21 03:11:34 UTC.

User then ran the existing remote smoke from Arch against `https://newstown.prophumy.com` with output `$HOME/news-town-C5-smoke/smoke.json`. Supplied stdout:

```json
{"passed":true,"origin":"https://newstown.prophumy.com","remote":true,"node":"v26.12.0","browser":"153.0.8010.12","assets":26,"fonts":1,"models":17,"sounds":4,"browserSessions":2,"restoredSeat":true,"results":true}
```

This is **user-run and user-reported** passing evidence: all asset byte/MIME checks, isolated seats, actual WebSocket traffic, submitted investigation recovery, privacy assertions and complete five-round results passed according to the probe. The stdout omits assetHashes by design; the saved JSON retains them. The existing probe also writes shared-helper `production-home.png`/`production-final.png` plus sidecars alongside the output. Codex cannot yet read those private-home files; do not substitute the earlier local screenshots or claim remote PNG inspection.

Remaining closeout evidence: copy the five saved smoke/evidence files into a readable shared location, inspect remote PNGs/sidecars and asset hashes, obtain the running container's same 179-file source digest, then relay the production evidence for Claude's final C5 closure. Expected digest remains `bb1e10483d5e92a2735c6683a31247b457805edbd79da26be694420da76bea92`; archive/revision/image identity is recorded, but the full container fingerprint has not been supplied yet. Rollback image is retained; rollback remains **not executed**. D5 remains unstarted. No new app code, resources, paid upgrade or contract request.

### Production evidence inspected by Codex

User copied the five saved smoke/evidence files to `/tmp/news-town-C5-production-evidence` and made that folder readable. Codex opened both actual remote PNGs directly and retained copies under `.superpowers/shots/C5-codex-shoulds/production-d86a2d5/`. No substitute local capture was used.

- All **26 assetHashes** in the saved `smoke.json` independently match bytes in the local candidate `dist/client` build.
- Both sidecars: origin `https://newstown.prophumy.com`, 1280×720, DPR 1, browser 153.0.8010.12, fontsReady true, CSS/font HTTP 200, empty overflowX/unreachable and zero console errors. CSS is 22,668 bytes; TTF is 300,724 bytes. Sidecars contain bare origin and sanitized resource URLs, not room paths or tokens.
- Home PNG: complete title, solo/create/join controls and toon town; SHA-256 `bb6f126fe2da777091b2807edeafd54c3861795fc42f8e7a28c9728486339eb1`.
- Final PNG: readable centered card on night town, visible Play Again, the name `<b>Ink</b>` is literal text; scores agree with the formula (67×47/50 rounds to63; 83×59/50 rounds to98). SHA-256 `e35b84146b3fa8db4a5470eef84defa15983cbafa16e23cf306f60853eb555b0`.

Only the running container's full source fingerprint remains for Codex's production identity record, then Claude's final C5 closeout. The existing archive/OCI revision/running image match and remote asset identity are already recorded. No app code changed; no tests rerun for this read-only PNG/hash review.
