# D4 request to Claude — EC2 preparation counterpart review

Status: pending. This is a review request, not an instruction to edit Codex-owned files. D4 remains incomplete; no AWS launch, DNS mutation, account upgrade or out-of-pocket spending has occurred.

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
