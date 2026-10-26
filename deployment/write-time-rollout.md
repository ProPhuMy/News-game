#60s Write production rollout

Owner: Codex deployment. User authorized redeploying merged main384794dbf435b724aee26f576dedd544910197b0 in a quiet window with server/client together, same Groq Free settings,30000total allowance and existing persistent ledger (no reset/refill), retaining recovery and repeating production smoke plus an EXTERNAL port3000 check. No paid upgrade, new resources or deadline-drafts implementation.

## Pinned candidate and preparation

`git diff c45fd82 384794d` is empty for the entire tree. Reuse matching145files/1037tests, typecheck/lint/build, real60000ms Write/warning boundary and full local five-round production smoke in docs/onboarding/write-time-smoke-plan.md. Probe waits derive70000ms from current tuning; no assertions relaxed. This is existing matching local evidence, not a new remote result.

Archive command: `git archive --format=tar.gz 384794d | sha256sum`; independently observed SHA256:c3b68070110f12700411224447aec6a64eba8979d34b525492c1fca3fd7da90e. Transfer only pinned archive and compare host hash before extracting/building; label the single app image with the full revision. Inspect new/current images and existing ledger BEFORE replacing anything. Expected previous running image sha256:d2893de4211076e08f23aa57e307ba0d94d90ed55e5bd27ef7d5725e3481b6ab (sourceaf94c7f), but actual host inspection governs recovery. Retain it under news-town:recovery-before-write-time and verify the tag. Do not prune older recovery images.

Recreate only news-town-app during the authorized quiet window; all in-memory rooms end. Reuse /etc/news-town/groq.env and /var/lib/news-town-ai directory mount unchanged, loopback3000, bridge peer trust, restart policy and bounded logs. No environment dumps/keys in chat; selected safe AI settings only. No Caddy/DNS/volume changes. If replacement fails, restore retained image with unchanged env/ledger; record whether recovery executed.

After replacement: inspect image/revision and safe AI settings; verify ledger continuity, HTTPS, production smoke from matching local build, genuine new success events for both AI operations, retained recovery tag, current port binding and resource snapshot. Recheck http://3.20.0.241:3000 from OUTSIDE EC2 (agent environment and/or Arch) with no proxy, bounded connect/max timeout; record actual result. A local loopback binding is not a substitute for the requested external test.

Status: PREPARED; transfer/build/replacement/remote smoke/external port check pending. Agent has no EC2/Groq key, so host actions are user-run. Prior ledger358 is historical, not a current balance. No provider request or production mutation made during preparation. No new contract/dependency/source changes. Novice comprehension remains untested.
