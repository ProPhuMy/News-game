# D4 production verification — incomplete

## Candidate and authorization

Codex branch: `codex/visual-d4`, starting from D3 `70d7d83`. User approved C4 integration ("merge it"); merge `a1c277b` includes reviewed C4 `e3600e6`, screenshot helper `b3b2513` and civic-sign fix `599c543`. Main and C4 branch/worktree were not changed. No shared gameplay contract or dependency changed.

This is preparation and native local verification, not production certification. No D4 production URL, deployed SHA or deployment ID has been verified. Historical Free staging at `https://news-town-staging.onrender.com/` remains a staging reference, not a certified D4 release.

## Release inputs still required

- User-selected always-on production host and authorized resources. Existing paid-resource prohibition remains in force; do not apply the paid `render.yaml` blueprint or upgrade staging without authorization.
- Public HTTPS origin, service ID, single-instance configuration, auto-deploy off and quiet deployment window. In-memory rooms are lost on deployment/restart/rollback.
- Exact candidate SHA published on an authorized Codex branch and selected for deployment; successful container build/start logs and actual runtime version.
- `AI_PROVIDER=none`, with provider keys/model unnecessary. If enabling AI instead, confirm provider/account limits and separately verify outage fallback without exposing keys or causing unauthorized spending.
- Actual trusted-proxy topology and edge sanitization/origin exposure evidence before relying on forwarded client addresses. Keep `TRUST_RENDER_PROXY=false` on direct hosts; D3 source tests do not prove live edge behavior.
- Current successful deployment ID/SHA and retained artifact for rollback. Historical D0.5 target `dep-dbapt3m1egvs73blprs0`, SHA `e1c17db`, service `srv-dbapt3e1egvs73blpr30` is not assumed retained or suitable for the new host.

## Repeatable verification

Build the exact candidate using `npm run build`. The probe compares each deployed asset against these local build bytes; this requires matching candidate build output, not merely the same branch name.

```bash
node deployment/D3-production-smoke.mjs http://127.0.0.1:45335 --out .superpowers/shots/D4/local-smoke-result.json
node deployment/D3-production-smoke.mjs https://APPROVED-HOST --remote --out deployment/D4-smoke-result.json
```

The second command is a template, not an executed result. Default invocation remains localhost-only; public HTTPS requires explicit `--remote`. Asset requests refuse redirects. Evidence includes asset hashes, versions and sanitized check results, never packets/tokens/private snapshots. Browser pages are isolated at 1280×720, DPR 1, reduced motion, SwiftShader. This does not establish hardware performance.

Captures use Claude's shared `watchPage`/`captureAppEvidence`, attached before navigation, at home and final results. PNGs and sanitized sidecars are written alongside the requested summary. Do not capture a lobby or join screen containing a room code. Sidecars omit page paths/queries; actual PNGs must be opened and inspected. Local screenshots are not remote evidence.

Required public pass: all built HTML/CSS/JS/models/textures/fonts/sounds match bytes and MIME; private/dev paths reject; two anonymous sessions create/join; WSS carries application messages; known guest submitted investigation survives token recovery without host reconnect; all five rounds finish through real server deadlines; both sessions render results with font and WebGL ready; no unexpected browser errors. C4 must review actual evidence before D4 exit.

## AI failure disposition

Focused `tests/ai` and `tests/server/ratings.test.ts` run independently of browser smoke. Existing tests exercise disabled, HTTP/network failure, invalid/filtered/overlong output, three-second timeout, late completion and exact engine fallbacks. They make no paid/live provider requests. An AI-disabled deployed match proves that deployed configuration only; it does not establish enabled-provider outage or capacity behavior.

## Rollback procedure — not executed

Before replacement, record and verify the retained known-good deploy ID/SHA and configuration. If release checks fail, stop release acceptance and diagnose; use the host's rollback to that exact retained artifact, or rebuild the recorded revision when supported. Recheck actual revision, single-instance/AI/proxy settings, health, assets, WSS and same-process reconnect after rollback. This interrupts active matches and cannot restore process-memory rooms. Never label this documented procedure an executed rollback.

## Evidence status

Integrated `npm test` passes 120 files / 826 tests; typecheck, lint and build exit 0. Focused deployment/evidence/AI/ratings checks pass 5 files / 62 tests. Existing jsdom canvas messages and >500 kB bundle warning remain. Docker daemon access is denied; no permissions changed. Local home PNG was directly viewed: town/shadows/display font visible, 1280×720 DPR 1, CSS/font HTTP 200, empty layout lists and zero console errors.

Initial local smoke and diagnostic rerun failed because the probe required the investigation panel after its 15-second authoritative phase expired during reload. Recovery acknowledgment passed; diagnostic snapshot phase was write with acted true. The probe now submits a real investigation and checks its retained private record after recovery, allowing legal phase progression. No product defect or deadline change. Corrected final smoke exits 0: 26 assets (17 GLBs, one font, four sounds, plus JS/CSS/textures), two separate seats, literal markup, actual WebSocket application traffic, retained submitted investigation after token recovery, host connection preserved and five-round final results in both browsers. Zero unexpected browser/page/request errors. Native Node v26.12.0, Chromium 153.0.8010.12, SwiftShader; no Docker or public-host claim.

Home and final PNGs were directly viewed under `.superpowers/shots/D4/`, with JSON sidecars and `local-smoke-result.json`. Both are 1280×720 DPR 1, have font readiness, CSS 20773 bytes and TTF 300724 bytes at HTTP 200, empty overflow/unreachable lists and zero console errors. Home shows the town/shadows/display font. Final shows a readable scoreboard/truth history and Play Again; literal markup remains text. Scratch may disappear; this record preserves the sanitized results. No remote smoke, container proof, rollback execution or final C4 evidence acceptance yet. D4 remains open; D5/C5 are not started.

## Independent tooling review and final checks

Independent reviewer identified one Important failure-path issue: raw console/page-error text could reach a screenshot sidecar before the probe rejected errors. Codex added `requireCleanWatch` in its own helper, leaving Claude’s shared implementation unchanged. Two regressions first failed on the missing function, then pass: secret-bearing errors reject with fixed text before evidence is returned; clean evidence stays unchanged. Options/watch tests now pass 16/16. Final repository suite passes 120 files / 826 tests; typecheck, lint, build and probe syntax check pass. The successful complete local smoke preceded this wrapper-only addition; unit regressions verify the changed evidence boundary. No new full-match result is inferred for a different deployed revision.

Reviewer independently passed the earlier 14 options tests and syntax check, and declined to certify public deployment/SHA, container runtime, proxy controls, live AI outage, rollback or hardware performance. These remain external D4 requirements. No deferred code minors or contract requests.

Viewed PNG SHA-256: home `bb6f126fe2da777091b2807edeafd54c3861795fc42f8e7a28c9728486339eb1`; final `e691056f0e874096b5209c1744391c4ae8b35d9ad025705c1a2a66ac392a69af`.

## Credit-only EC2 proposal

User requested evaluation, not provisioning, of one EC2 instance using eligible Free Plan credits, with no Paid Plan upgrade. See `deployment/D4-ec2-credit-proposal.md` for exact conditional resources, compute/storage/IPv4/transfer arithmetic, account checks, HTTPS/proxy prerequisites and retained Render Free fallback. User's expired domain is unconfirmed. No host selection/resource launch is approved by this proposal; no AWS/Render/DNS change occurred.

User subsequently confirms Free Plan/$100/183 days. Assessment now proposes t3.micro to fit that window ($12.84/month base; approximately $77.26 over 183 days), superseding the larger instance estimate. See credit proposal for assumptions, $20 reserve, capacity limits and remaining approval gates. No provisioning or Paid Plan change is authorized by these confirmations.

Credit-only hosting assessment is now complete: user confirms EC2/VPC/Data Transfer applicability and credit expiry 2027-10-20 15:09 UTC, with Free Plan/$100/183 days. AWS documents EBS billing under EC2 and Free Tier credit support, so absent separate EBS entry is not an assessment blocker. Recommend one seven-day t3.micro trial only after deployment preparation/launch review and explicit approval. This is not provisioning authorization or D4 production acceptance. See the finalized credit proposal for exact budget and gates.

## Local EC2 preparation evidence

Added exact-peer TRUSTED_PROXY_ADDRESS with default disabled; Caddy overwrites X-Real-IP and backend is loopback-published per deployment/ec2/README.md. Current direct-mode collapse reproduced (11clients,1budget). Test-first proxy/startup/WebSocket/polling regressions fail9cases before fix, then focused21/21pass; full suite121files/839tests, typecheck/lint/build exit0. Independent review reports no Critical/Important/Minor findings and reruns21focused tests. Claude counterpart request: docs/visual-overhaul/requests/D4-claude-ec2.md. No actual host/proxy/cloud execution or new browser smoke was performed for this slice. Host/Docker/Caddy validation and full exact-revision public evidence remain required; no Paid upgrade/out-of-pocket authority.
