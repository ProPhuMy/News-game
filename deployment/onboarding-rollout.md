# Onboarding production rollout

Owner: Codex deployment. User explicitly requested deploying main af94c7f38e4fa18f07193eac281629b1261126a7 in a quiet window, server and client together, same Groq Free environment/concurrency4/30000-total allowance and same persistent ledger; no reset or refill. Current image must be retained for recovery. No paid upgrade, new resource, sample commit or unrelated source change is authorized.

## Candidate verification and procedure

`git diff 2ebd575 af94c7f` is empty for the entire tree. Reuse the matching144files/1033tests, typecheck/lint/build, real25s timeout and complete local production-smoke evidence in docs/onboarding/timing-codex-plan.md; no new runtime change justifies repeating it. Candidate includes the mini-comic, How to play, visible private inspection results,60s intro,25s first investigation, score copy and compatible smoke probe.

Exact archive command: `git archive --format=tar.gz af94c7f | sha256sum`. Independently observed SHA256:a328662f28494ba69e3bd132ad653e6b0cdb96902bac6be2770deee8f336f150. Transfer pinned source, compare host hash, build existing Dockerfile with full revision label before stopping the app. Inspect the current image and production ledger count; expected prior image sha256:dcc9369f5d0eed2c30d04e4c29107d48bf71f48e914552d82be97e7597cd6c7b, but actual host inspection governs recovery. Retain/tag that actual image and preserve older recovery images.

Do not edit /etc/news-town/groq.env or create/truncate /var/lib/news-town-ai/production.ledger. Recreate only the app using the existing protected env file and same directory bind mount, loopback3000, bridge peer trust, restart policy and bounded logs. Caddy/DNS/volumes unchanged. Restart loses in-memory rooms; user's requested quiet-window replacement covers that loss. No host key or API key is available to the agent; actions are user-run on Arch/EC2, not independent agent host execution.

After replacement, confirm exact running image/revision, selected safe AI settings and persistent-ledger count. Run the updated production smoke against the matching local af94c7f build, require real WSS/reconnect/asset/privacy/five-round results pass and new success events for both AI operations. Confirm served How to play/ready/results UI from the shipped build. Reinspect recovery tag and private binding, external3000 blockage and resource snapshot. If failed, restore retained known-good image with unchanged env/ledger in the authorized window and rerun smoke; never reset quota state during recovery.

Status: PREPARED, host build/transfer/replacement/production smoke not yet verified. Prior ledger59 observed is historical, not a current balance. Genuine unfamiliar-player comprehension test remains unavailable; deployment alone does not establish that success criterion. No production AI calls or host actions performed by the agent during preparation. No new contract request/dependency/source changes.
