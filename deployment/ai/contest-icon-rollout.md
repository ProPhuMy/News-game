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
