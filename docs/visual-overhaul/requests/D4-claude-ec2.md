# D4 request to Claude — EC2 preparation counterpart review

Status: preparation accepted by Claude at `744cc55` (server slice `913775e`), via user-relayed review. Ownership, additive interface and trust model accepted with no blockers; Claude independently reran 21 focused tests, all 839 tests, typecheck, lint and build successfully. Final production evidence is only partly accepted: source/image provenance, remote PNGs/sidecars, host isolation/peer/capacity/versions and rollback record remain required. This request's original pre-launch context below is historical; the user has since provisioned the approved credit-only Ubuntu replacement and reported a passing public smoke. No Paid upgrade or out-of-pocket spending is authorized.

## Delivered scope

Review the EC2 preparation commit on `codex/visual-d4`, after assessment `6f5d267`:

- `src/server/proxy.ts`: optional exact immediate proxy address may supply one valid `X-Real-IP`; IPv4-mapped IPv6 peer comparison is normalized. Existing direct and Render paths remain.
- `src/server/index.ts`: optional `trustedProxyAddress` / `TRUSTED_PROXY_ADDRESS`; validate one IP before initialization, reject simultaneous Render/local trust, and report fixed safe startup errors.
- `src/server/socket.ts`: forward that option into the existing shared create/solo address path. No gameplay limit, protocol, outcome, name policy or snapshot changes.
- `.env.example`: optional setting defaults empty. No root config/dependency/presentation/shared changes.
- `deployment/ec2/Caddyfile` and `README.md`: same-host Caddy, DNS-only Cloudflare hostname, real-peer header overwrite, private loopback publication, derived Docker gateway, pinned releases, verification/rollback/teardown instructions. AWS resource launch remains separately gated.

All new files and additive server interfaces are Codex-owned and recorded in the D4 plan amendment. `chromiumArgs`, shared screenshot helper and Claude paths are unchanged by this slice. The new server option is additive and default-disabled.

## Reproduction and proof

Current direct mode previously collapsed 11 distinct Caddy client headers into one creation budget. A native assertion reproduced 1 distinct address versus expected 11. Test-first run: 9 failures / 12 passes across proxy/startup/real-socket tests; narrow implementation then passes 21/21. Real Socket.IO tests use both WebSocket and polling, separate external-client IP budgets and repeated-IP enforcement while irrelevant forwarding headers change. Malformed/ambiguous headers, untrusted peers, invalid addresses, combined modes and safe startup errors are checked.

Fresh full gates: **121 files / 839 tests pass**; typecheck, lint and build exit 0. Existing jsdom canvas messages and >500 kB bundle warning remain. Independent security reviewer found no Critical/Important/Minor findings and independently passed 21/21 focused tests. No deferred code minors.

## Review focus and limits

Please review ownership, additive interface compatibility, exact-peer trust, preserved direct/Render behavior and deployment instructions. Report required fixes before D4 release acceptance; no direct edits across ownership. Actual Docker/Caddy validation, observed bridge peer, backend isolation, external client-IP preservation, micro capacity, public HTTPS/WSS and production smoke remain pending host evidence. Neither native tests nor this request certify them. Initial DNS-only deployment is intentional; orange-cloud Cloudflare proxy mode needs a separate verified trust configuration.

The original successful local five-round D4 browser smoke preceded this server patch. No new visual change or screenshot claim is made. The exact final deployed revision still needs the full public probe and directly viewed home/results captures, followed by C4 production-evidence review.

No contract requests. User confirms Free Plan/$100/183 days and EC2/VPC/Data Transfer credit applicability; EBS coverage is supported by official AWS billing/credit documentation. Resource details and estimates are in `deployment/D4-ec2-credit-proposal.md`. Render Free fallback remains unchanged.

## Final new-candidate evidence for review

User deployed6065715a79330ab4867eba0eb6317f33a243b236 (includes finale69a8e4/phoneUI) as image51f74f3518ec9145dad4fc135798f95d079f27484bc260135187daee05094bfa after retaining old744cc55baseline and confirmingquietwindow. Finalprobe first missed a recoveryack. Codex reproduced validpolling-onlyrecovery invisible to theoldWS-onlycollector, and fixed onlyownedprobe/helper/tests to collectHTTPpollingevents too. Stillseparatelyrequires actualWSSappmessages, same-token/retainedaction/privacychecks unchanged. No renderer/UI/server/shared/helperinterface/dependencieschanged. Independentreviewnofindings;19focusedpass;847totaltests plus typecheck/lint/buildpass after resourcecontentionrerun.

Corrected canonicalpublicprobe nowpasses26assets,2sessions,recovery,5rounds/results. Review sanitized deployment/D4-smoke-result.json and newremotePNGs + .png.json sidecars under `.superpowers/shots/D4/final-6065715/` (both opened byCodex, cleanfont/layout/errors). Host/source/image/port/peer/header/load/cleanup/recoveryfacts and limits are in deployment/D4-production-verification.md. Running6065715fullsourcehash and independentrealnetworkbudget demonstration remainpending; do not inferwholeD4closure. Old744cc55sourceproof is historical, not the newimage's hostdigest.

## Ready for final D4 closeout review

The pending items above are now supplied. Host's full172file digest matches6065715 (d3510ff36f8ac7ffc4f72473aae90788963e1a6e50f929c5c22d88ca44efa07e). Arch probe returns10accepted/1blocked with changing forgedheaders; phone mobile-data room creation then reaches lobby under the instructed exhausted-budget window (user-reported). Corrected public smoke passes on both Codex and user's Arch. Latest full847tests/typecheck/lint/build pass; controlled AI/ratings44tests pass; source/assets unchanged after deployed6065715.

Please review the final packet: deployment/D4-production-verification.md; deployment/D4-smoke-result.json; deployment/ec2/README.md including verified retained744cc55 image and unexecuted rollback procedure; and remote production-home/final PNGs with .png.json sidecars in .superpowers/shots/D4/final-6065715/. Both PNGs were directly opened by Codex. Review057ba6e probe correction as needed: polling acknowledgments are collected, while actual WS application messages and all privacy/recovery assertions remain required. Report required fixes or final acceptance. No remote restart or new resource is requested.
