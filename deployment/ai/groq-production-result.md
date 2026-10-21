# Groq Free pilot — user-run production evidence

## Deployment and authorization

User approved a100-total-attempt Groq Free pilot, concurrency4, and restart now. Claude accepted the plan and concurrency amendment throughf5209a9, with case3 resolved as nonblocking and no retry required. No Paid upgrade, Anthropic spending, allowance refill, sample commit or main merge is authorized.

User-run deployment reported2026-10-21 at14:54:01UTC:

- Origin: https://newstown.prophumy.com
- Candidate: ff8a70b (codex/groq-evaluation).
- Source archive SHA256:3fae9b36656c4476d5fddf79772dc3ae8f2e3b0eafcead152443662f106e6a21. Agent independently reproduced this hash with git archive of ff8a70b.
- Running image:sha256:5abf016c83fbc8c8c232ac47dcd5c55e17a87fa2ee23acdd051c59ff0288dc8c; container news-town-app reported running; HTTPS returned HTTP/2 200.
- Previous AI-off image:sha256:4a038abd4b757e14f25455c0ca6c9f92787e9a220c2b6f63c17033a0705c87e6 (prior sourced86a2d5). Recovery retention command was provided; final retained tag inspection remains pending. Recovery was not executed.
- User-run container permission check passed for the initially empty production ledger under /var/lib/news-town-ai; observed bridge gateway172.17.0.1.
- Replacement command used a persistent directory bind mount, protected host env file, loopback3000 publication and exact proxy trust. Caddy/DNS configuration was not changed by the supplied procedure. Post-replacement external3000 check remains pending.

The agent did not access the host or either secret; host and browser results below are user-supplied evidence, not independently reproduced remote execution. No raw key, player headline, name, room path, reconnect token or provider envelope is saved.

## Genuine provider outcomes

User supplied20 consecutive fixed ai_outcome events from the new container:

| Operation | Success | Failure | Limited | Cache | Disabled |
|---|---:|---:|---:|---:|---:|
| writeBotHeadline |11|0|0|0|0|
| rateHeadline |9|0|0|0|0|
| Total |20|0|0|0|0|

The final cumulative counters agree with20 successes and zero other outcomes. Observed provider failure fraction is0/20; this is a small sample, not a reliability guarantee. The existing logger does not retain HTTP classes, latency, tokens or the cause of limited outcomes; none is inferred.

User-run wc reported20 entries in production.ledger. With the approved100-total allowance,80 attempts remained at that snapshot. Further public activity may consume them. This is a lifetime allowance across both operations/restarts, not a daily reset or a dollar balance. No replenishment is authorized. Provider errors, occupied slots and eventual exhaustion retain existing engine-prepared fallbacks.

## Production smoke

User supplied the passing summary from deployment/D3-production-smoke.mjs:

```json
{"passed":true,"origin":"https://newstown.prophumy.com","remote":true,"node":"v26.12.0","browser":"153.0.8010.12","assets":26,"fonts":1,"models":17,"sounds":4,"browserSessions":2,"restoredSeat":true,"results":true}
```

User also supplied the progress message confirming assets, separate seats, literal markup and reconnect before the five rounds. This verifies the reported smoke gate and genuine success events for both existing AI operations. The full generated smoke artifact/asset hashes and screenshots have not been received in this workspace; no independent byte comparison or screenshot inspection is claimed for this rollout.

## Status and remaining closeout

Live AI use is demonstrated for both operations and the user-run production smoke passed. Engine/gameplay contracts are unchanged. This is a bounded Free pilot, not unrestricted enablement or proven multi-room quota capacity.

Pending: Claude's final production-evidence review; post-replacement external3000 check, current recovery-tag inspection, resource/CPU-credit observations, and full smoke artifact if needed for independent asset review. Actual account remaining quota/Data Controls have not been independently authenticated by the agent. Samples remain uncommitted pending user approval. Claude may now propose submission wording using this live evidence, subject to the user's separate wording approval.

Local candidate verification before deployment:138test files/996tests passed; typecheck, lint and build exited0. This result record adds documentation only; those suites were not repeated. Recording this evidence made no API call, restarted no process, reset no ledger and changed no allowance. No contract requests.
