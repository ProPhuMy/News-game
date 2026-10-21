# Contest icon redeployment and allowance increase

Owner: Codex (deployment only). User approved deploying main c038745149135e996a607c67e56dbe09456082d2 and raising the existing production allowance to30000 total attempts, Groq Free only, $0, no payment method. This document records the authorized procedure, not executed host actions.

## Scope and checks

Compared with deployed ff8a70b, runtime source/public/Docker/package changes are confined to one inline SVG favicon link in src/client/index.html. No application-source edits, engine/shared changes, new dependency, AI endpoint/model/concurrency change, sample commit or additional resource is needed. Claude owns and delivered the favicon. All prior ledger entries count, including the40 last observed and any subsequent attempts.30000 is a lifetime ceiling, not a daily allocation; Groq Free daily/minute/token quotas still apply. No automatic reset/refill or paid upgrade is authorized.

## Approved execution sequence

1. Verify local c038745 tests/typecheck/lint/build; archive that exact source with git archive --format=tar.gz c038745. Record SHA256 and compare the transferred archive on EC2. Build the image before stopping production, with full source revision label.
2. Inspect the running app image, mounts, proxy, private publication and safe AI settings without dumping the environment/key. Retain the actual running image under an explicit recovery tag (expected previous image sha256:5abf016c83fbc8c8c232ac47dcd5c55e17a87fa2ee23acdd051c59ff0288dc8c). Inspect the tag. Record the existing production ledger count; never create, truncate or replace that ledger.
3. Change only AI_REQUEST_ALLOWANCE=3000 to30000 in the protected host env file, checking the existing value first. Keep endpoint/model/concurrency4, mount, proxy, port, bounded logs and Caddy unchanged. During the authorized quiet window recreate only the app container using the pinned new image. All in-memory rooms are lost.
4. Confirm the running image/revision and AI_REQUEST_ALLOWANCE=30000 using selected fields only. Confirm HTTPS and the served index favicon link by parsing the retrieved HTML and comparing its icon href with the pinned local build. No external favicon fetch is expected: the image is an inline data SVG.
5. Run the existing full production smoke against the matching local build. Require success events for both rateHeadline and writeBotHeadline from the replacement container; distinguish failure and limited. Record the new ledger count and remaining lifetime allowance at that snapshot. No refill to force success.
6. Record recovery retention, loopback-only binding/external3000 blocking, and host CPU/memory/disk observations. Keep the prior AI-off recovery image too. If replacement fails, restore the retained current image with the existing settings and same ledger; record whether recovery actually ran. Do not reset spending state during recovery.

No host key or Groq key is available to the agent; host commands are user-run on EC2 via the user's other account. No credentials should be pasted into chat. Rollout remains pending actual build/replacement/smoke/icon and provider-success evidence.

Local predeployment verification:139test files/998tests passed; typecheck, lint and build exited0. Exact gzip archive command `git archive --format=tar.gz c038745 | sha256sum` produced5695a3aad723093e880b95c3010e8329646ab53b890ecd146e6e4124a8e58c4d. No production action or authenticated AI request occurred in this preparation. No contract requests or dependency changes. Source remains pinned to main c038745; this deployment record lives on a separate Codex branch.

## User-run deployment confirmation

The user supplied the new running image sha256:dcc9369f5d0eed2c30d04e4c29107d48bf71f48e914552d82be97e7597cd6c7b, status running, and selected running-process output AI_REQUEST_ALLOWANCE=30000. Previous inspected running image was sha256:5abf016c83fbc8c8c232ac47dcd5c55e17a87fa2ee23acdd051c59ff0288dc8c. Recovery-tag creation/inspection commands were supplied, but their output was not returned; retention is not independently confirmed in this record. Rollback was not executed.

Archive SHA256 supplied by the user matches the independently reproduced gzip archive hash above. New image was built from the transferred c038745 release using its full revision label in the supplied command; no host full-source digest was collected. Host operations and browser smoke remain attributed to user-run commands, not agent remote execution.

Served production index HTML includes the inline SVG image/svg+xml favicon link. Its supplied encoded href matches the link in c038745 src/client/index.html (newspaper artwork using the approved palette). This verifies delivery in HTML, not browser-tab rendering or favicon-cache behavior; no visual tab inspection was performed by the agent.

Before smoke, user reported40 ledger entries after replacement, unchanged from the prior snapshot. After smoke, user reported59. This is consistent with preserving all existing usage and adding19 requests. At that snapshot29941 attempts remained under the30000-total ceiling; further public activity may consume them. No reset, recreation, refill beyond30000 or paid upgrade is authorized.

Fresh fixed ai_outcome events from the new container:11 writeBotHeadline successes and8 rateHeadline successes,19 total, with cumulative failure/limited/cache/disabled all0. This confirms genuine success for both required operations. Different counts from earlier runs do not establish a defect; cache, engine timing and exercised branches can affect which operations occur, and no unsupplied cause is inferred. No text, room/session identifiers, keys or provider payloads were retained.

User-run production smoke summary:

```json
{"passed":true,"origin":"https://newstown.prophumy.com","remote":true,"node":"v26.12.0","browser":"153.0.8010.12","assets":26,"fonts":1,"models":17,"sounds":4,"browserSessions":2,"restoredSeat":true,"results":true}
```

The user also supplied the progress line confirming assets, separate seats, literal markup and reconnect before five rounds. Full smoke artifact, screenshots and independent asset byte comparison were not received for this deployment. Earlier release reviews established the sole runtime difference is the favicon link.

## Status

All four specifically requested postdeployment confirmations are supplied: running30000 allowance, fresh successes for both operations, passing production smoke, and favicon in served index HTML. Recovery retention reinspection and postreplacement port/resource checks in the procedure remain unconfirmed; their prior deployment observations are historical evidence, not new checks. No browser-tab appearance claim is made. Existing Groq Free daily/minute/token limits may still produce fallbacks despite the larger lifetime cap. Current snapshot shows zero failures/limits, not guaranteed capacity.

Evidence-only closeout: no runtime source changes or additional calls made by the agent, no main merge, no sample commit, no ledger reset and no description change. The local candidate verification remains139files/998tests plus typecheck/lint/build passing; these suites were not repeated for documentation. Record remains on Codex's deployment branch for user/counterpart review. No contract request.
