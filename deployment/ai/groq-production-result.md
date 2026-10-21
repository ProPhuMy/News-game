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

## Counterpart acceptance and host closeout update

Claude accepted efe9bec with no required findings: ff8a70b runtime matches reviewed3e364e1 and includes prompt2f15853; client/public match byte-verifiedd86a2d5. Claude accepted the supplied20/20 outcomes and passing smoke, while requiring the remaining host checks before completion.

Exact reproducible archive command used for the independently checked hash:

```bash
git archive --format=tar.gz ff8a70b | sha256sum
```

The user transferred an archive produced with `git archive --format=tar.gz --output="$rollout_archive" ff8a70b`; its EC2 hash matches the piped command. A plain-tar archive has different bytes and therefore a different hash. Compression is part of this artifact identity.

User-run EC2 observations at2026-10-21 15:11:35UTC:

- Recovery tag news-town:recovery-before-groq resolves to expectedsha256:4a038abd4b757e14f25455c0ca6c9f92787e9a220c2b6f63c17033a0705c87e6. Retained-image check is now closed; rollback remains unexecuted.
- Running app binding is3000/tcp on127.0.0.1:3000 only. This confirms the binding; the independent external connection test remains pending.
- App CPU0.12%, memory93.02MiB/911.3MiB; edge CPU0.00%, memory30.02MiB/911.3MiB.
- Host available memory400MiB; swap137MiB used of2GiB; root7.0GiB used/12GiB available,39% used.
- These are point-in-time resource observations, not a sustained-load or during-match measurement. No new CPU-credit balance was supplied. Resource-observation closeout is satisfied; no additional capacity claim is made.

The remaining rollout-closeout gate is the user-run external3000 connection check. Total allowance remains100 on the same retained ledger; no increase/reset is approved. No source changes, new calls or host mutations were made while recording this update. Prior pending lists above are historical snapshots superseded by this section.

## Final closeout — passed

The user supplied the external Arch connection result for http://3.20.0.241:3000/: `curl: (28) Connection timed out after 5002 milliseconds`. Combined with the inspected127.0.0.1-only Docker publication, this closes the remaining external-port gate for this deployment.

The approved Groq Free pilot rollout is complete: reviewed candidate running, public HTTPS and full production smoke passed, genuine successes demonstrated for both operations, recovery image retained, external backend inaccessible in the supplied test, and host resource observations recorded. Claude accepted the production evidence with no required findings before these final host checks. All host evidence remains attributed to user-run commands; no executed rollback or sustained-load capacity claim is made.

Allowance remains100 lifetime attempts shared across operations on the same persistent ledger. The last supplied usage snapshot was20 consumed/80 remaining, not a current balance. Any increase needs new user approval on that ledger; no automatic reset/refill. No sample commit, main merge, paid upgrade or submission wording change occurred. Full candidate checks were996tests/typecheck/lint/build passing; no suite rerun was needed for this evidence-only closeout. No new API calls were made by the agent.

## Contest allowance increase — approved, not yet executed

User relayed approval for3000 total attempts during the contest, Groq Free only, $0, no payment method and no refill beyond3000. Existing production ledger must remain intact; all existing entries count, including the20 observed earlier and any subsequently consumed attempts. No ledger reset, recreation or automatic daily renewal. This supersedes the prior100-total cap only after the approved container replacement.

Approved action: quiet-window app recreation with AI_REQUEST_ALLOWANCE=3000 and all other image, environment, mount, proxy, publication and runtime settings unchanged. Retain recovery image. Confirm the new running allowance without dumping secrets, observe new success events from the replacement container, and record the preserved ledger count. These confirmations remain pending. Groq organization daily/minute request/token limits still apply;3000 total is not3000/day or a quota guarantee, and no paid upgrade is authorized.

Previously requested host-closeout items are already recorded above: external3000 timeout5002ms; matching recovery tag; CPU0.12% app/0% edge with memory/disk observations at15:11:35UTC; exact gzip archive command reproducing the host hash. CPU-credit balance was not supplied; do not claim it was measured. Recheck binding/recovery/resources after replacement. Claude wording eff1c41 is not merged by this record; the relayed request gates that merge on running-allowance and new-success confirmation.
