# D3 security and release-candidate review

Status: in progress on `codex/visual-d3`, base `088b334`. This is a source and local-runtime review, not production certification. User approved `docs/visual-overhaul/plans/D3.md` on 2026-10-20. Claude counterpart review remains requested through the user.

## Trust boundaries and findings

| Boundary | Implementation | Evidence and disposition |
| --- | --- | --- |
| Anonymous seats and recovery | `src/server/rooms.ts`, `socket.ts` | Cryptographic room/token generation, timing-safe token comparison, one seat per socket, old socket loses authorization. New real-socket tests cover active replacement, cross-seat recovery, code-only/forged recovery, altered seat fields and recovered duplicate acknowledgments. No defect reproduced. |
| Message validation and replay | `ClientMessageSchema` at socket dispatch; per-socket and per-seat receipt maps | Shared schema cleans/limits fields; only authorized socket determines seat. Existing malformed/stale/host tests plus D3 forged fields and unchanged-state assertions. Duplicate action IDs stay seat scoped and effects execute once across recovery. No defect reproduced. |
| Private state | `src/server/matches.ts` emits schema-validated `publicView()` and recipient `privateView()` | D3 actual-socket coverage through investigate/write/reveal/recovery/final; own evidence and unpublished text stay private, published evidence and final truth remain public. Runner test checks every emitted payload against engine views and synthetic private markers, including distinct evidence/proof cards. No production raw-state emission found. |
| Name/headline filtering | Existing `createWordFilter(content.wordList)` in room manager and match runner | C1.5 accepted/rejected matrix at create/solo/join and both fields, cleaning/length checks, headline-specific error preservation. D2 behavior retained; no divergent policy introduced. |
| Request/room resources | Server buffer cap; socket packet/receipt caps; room creation budget/cap and engine-driven expiry | D3 WebSocket/polling tests prove oversized payload rejection and shared creation/solo IP budget across new connections. Direct mode ignores spoofed forwarded headers. Existing tests exercise 200 rooms, sliding budget, receipt capacity and all expiry states. See residual limits below. |
| AI data and failures | `src/ai/adapter.ts`, `providers.ts`, `src/server/ratings.ts` | Delimited JSON escapes angle brackets; provider instructions are separate from headline/paper text. zod rejects invalid output; word filter checks output. Three-second abort/race, single attempt and engine fallback remain; late results cannot change revealed/deleted rooms. Additional checks and final counts recorded at closure. |
| Browser text | React text interpolation and `src/client/town/bubbles.ts` `textContent` | Source search found no HTML injection sink in production client. Lint prohibits HTML sinks. Local browser literal-markup check pending. No UI changes needed so far. |
| Static files and secrets | `src/server/static.ts`, `index.ts`, Docker stages | MIME allowlist, decoded-path dot/backslash checks, realpath containment; only built client served. Errors log fixed safe messages rather than supplied values or private payloads. Additional static/startup and built-runtime checks pending. |

No confirmed launch-blocking source finding at this checkpoint. Passing tests establish the exercised boundaries, not absence of all vulnerabilities.

## Resource and operational limits to preserve

- Anonymous unseated connections have no application-wide connection/IP ceiling. Packet budget is 120/minute per socket, so opening many sockets bypasses that individual budget. Room creation remains 10/minute/IP and 200 concurrent rooms; packet payloads remain at most 16,384 bytes. This is not DDoS certification. Hosting must provide connection/traffic controls; no new gameplay/protocol limits are invented here.
- Creation-address history is pruned on later creations and contains successful creations only. Room/expiry limits constrain ordinary growth; this is process memory, not persistent or distributed rate limiting.
- AI response `max_tokens`/`max_completion_tokens` is 512 at the provider, cache stores at most 1000 successful results, and each call times out in 3 s. There is no application-wide provider concurrency/spend cap or explicit streamed-response byte cap. Enabled AI requires provider/account quotas and a trusted endpoint; `AI_PROVIDER=none` avoids outbound AI requests. Review does not certify an enabled provider under hostile-volume traffic.
- Per-seat receipts cap at 256 for the match lifetime; new IDs then disconnect the socket, while stored IDs remain replayable. This is intentional existing resource behavior, not a new D3 restriction.
- Reconnect tokens are bearer credentials in browser localStorage. Sharing or compromising a browser/token permits seat recovery; room code alone does not. No durable recovery exists after process replacement.
- Render proxy trust is opt-in and assumes the managed edge overwrites `cf-connecting-ip`; direct hosts must leave it false. Origin reachability/proxy header sanitization must be verified for the actual D4 host, not inferred from local tests.

## Configuration and verification record

- Native runtime: Node `v26.12.0`; this is not proof of the Docker Node 24 image.
- `npm audit --omit=dev --json`: zero production dependency advisories on 2026-10-20. A package audit is not source review and adds no dependencies.
- `docker version --format '{{.Server.Version}}'`: daemon socket permission denied. No permission changes or privileged retries; container build/start remains unverified here.
- D0.5 Free staging is accepted as staging only. Its sleep/restart behavior does not establish always-on production readiness. Paid resources remain unauthorized; do not apply `render.yaml` blindly or treat it as the staging configuration. D4 must resolve production hosting and verify deployment-specific proxy behavior.

Final local build/smoke/capture/check results, reviews and candidate commits will be recorded before D3 closure.
