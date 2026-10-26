# Onboarding production rollout

Owner: Codex deployment. User explicitly requested deploying main af94c7f38e4fa18f07193eac281629b1261126a7 in a quiet window, server and client together, same Groq Free environment/concurrency4/30000-total allowance and same persistent ledger; no reset or refill. Current image must be retained for recovery. No paid upgrade, new resource, sample commit or unrelated source change is authorized.

## Candidate verification and procedure

`git diff 2ebd575 af94c7f` is empty for the entire tree. Reuse the matching144files/1033tests, typecheck/lint/build, real25s timeout and complete local production-smoke evidence in docs/onboarding/timing-codex-plan.md; no new runtime change justifies repeating it. Candidate includes the mini-comic, How to play, visible private inspection results,60s intro,25s first investigation, score copy and compatible smoke probe.

Exact archive command: `git archive --format=tar.gz af94c7f | sha256sum`. Independently observed SHA256:a328662f28494ba69e3bd132ad653e6b0cdb96902bac6be2770deee8f336f150. Transfer pinned source, compare host hash, build existing Dockerfile with full revision label before stopping the app. Inspect the current image and production ledger count; expected prior image sha256:dcc9369f5d0eed2c30d04e4c29107d48bf71f48e914552d82be97e7597cd6c7b, but actual host inspection governs recovery. Retain/tag that actual image and preserve older recovery images.

Do not edit /etc/news-town/groq.env or create/truncate /var/lib/news-town-ai/production.ledger. Recreate only the app using the existing protected env file and same directory bind mount, loopback3000, bridge peer trust, restart policy and bounded logs. Caddy/DNS/volumes unchanged. Restart loses in-memory rooms; user's requested quiet-window replacement covers that loss. No host key or API key is available to the agent; actions are user-run on Arch/EC2, not independent agent host execution.

After replacement, confirm exact running image/revision, selected safe AI settings and persistent-ledger count. Run the updated production smoke against the matching local af94c7f build, require real WSS/reconnect/asset/privacy/five-round results pass and new success events for both AI operations. Confirm served How to play/ready/results UI from the shipped build. Reinspect recovery tag and private binding, external3000 blockage and resource snapshot. If failed, restore retained known-good image with unchanged env/ledger in the authorized window and rerun smoke; never reset quota state during recovery.

Status: PREPARED, host build/transfer/replacement/production smoke not yet verified. Prior ledger59 observed is historical, not a current balance. Genuine unfamiliar-player comprehension test remains unavailable; deployment alone does not establish that success criterion. No production AI calls or host actions performed by the agent during preparation. No new contract request/dependency/source changes.

## User-run deployment and production verification — passed

Evidence supplied2026-10-26; all EC2/browser execution is attributed to the user. Agent did not access EC2 credentials or independently rerun the remote match.

- Pinned source:af94c7f38e4fa18f07193eac281629b1261126a7, built/transferred using the procedure above. New running image sha256:d2893de4211076e08f23aa57e307ba0d94d90ed55e5bd27ef7d5725e3481b6ab, status running. User supplied HTTPS HTTP/2 200 at21:38:58UTC, HTML content-length1454. No independent host source digest/revision-label output or new remote screenshots were supplied; do not claim those checks.
- Running selected environment:AI_PROVIDER=openai, AI_BASE_URL=https://api.groq.com/openai/v1, AI_MODEL=openai/gpt-oss-20b, AI_REQUEST_ALLOWANCE=30000, AI_MAX_CONCURRENT=4. No secret value is retained. Existing protected env file and persistent directory mount were reused by the supplied replacement command.
- Ledger346 before replacement and346 immediately after;358 after the smoke. This is consistent with preserving all existing entries plus12 new attempts.29642 lifetime attempts remained at that snapshot, not a current balance or daily allocation. No reset/recreation/refill or new allowance is authorized.
- Fresh ai_outcome events:10 writeBotHeadline successes and2 rateHeadline successes,12total. Final cumulative failure/limited/cache/disabled all0. Both required AI operations have genuine success evidence; the differing operation counts do not by themselves identify a defect or justify retrying/spending more calls.
- Recovery tag news-town:recovery-before-onboarding resolves to sha256:dcc9369f5d0eed2c30d04e4c29107d48bf71f48e914552d82be97e7597cd6c7b, matching the previously inspected running image. Recovery retained; rollback not executed.
- Current inspected publication:3000/tcp bound only to127.0.0.1:3000. The external connection test was not repeated for this deployment; historical external timeout evidence belongs to the earlier deployment and is not a new observation.
- Resource snapshot:app CPU0.12%, memory134.9MiB/911.3MiB; edge CPU0.00%, memory19.11MiB/911.3MiB. This is a point-in-time sample, not sustained-load capacity or CPU-credit balance evidence.

User supplied the updated full production smoke pass:

```json
{"passed":true,"origin":"https://newstown.prophumy.com","remote":true,"node":"v26.12.1","browser":"153.0.8010.12","assets":26,"fonts":1,"models":17,"sounds":4,"browserSessions":2,"restoredSeat":true,"results":true}
```

The supplied progress line confirms production assets, separate seats, literal markup and reconnect before five rounds. The probe checks asset bytes against the local build and exercises actual WSS, token-authorized recovery, privacy and final results; this is the user's passing run, not an agent-reviewed full smoke artifact. Matching local tree evidence and earlier browser verification cover the ready label, inspection visibility and updated timers. No production privacy/result assertions were relaxed.

## Closeout

The requested single-image server/client redeployment and production smoke are confirmed, with unchanged Groq Free settings, same30000-total ledger, fresh successes for both operations and retained recovery image. No further restart or API calls are necessary for these supplied gates. No main merge is performed by this closeout record. Codex's only change here is deployment documentation; git diff --check is the relevant fresh check. Full suites are not repeated for this record; the unchanged candidate's1033-test/typecheck/lint/build and local production-smoke evidence remains above.

Not established: unfamiliar-human comprehension (tester unavailable), newly repeated external3000 reachability, or sustained-load behavior. Do not describe the novice onboarding acceptance test as passed merely because deployment and automated smoke passed. Groq Free daily/minute/token limits may still trigger fallback. No paid upgrade, ledger refill, sample commit or contract request was made.
