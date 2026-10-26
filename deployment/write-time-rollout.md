#60s Write production rollout

Owner: Codex deployment. User authorized redeploying merged main384794dbf435b724aee26f576dedd544910197b0 in a quiet window with server/client together, same Groq Free settings,30000total allowance and existing persistent ledger (no reset/refill), retaining recovery and repeating production smoke plus an EXTERNAL port3000 check. No paid upgrade, new resources or deadline-drafts implementation.

## Pinned candidate and preparation

`git diff c45fd82 384794d` is empty for the entire tree. Reuse matching145files/1037tests, typecheck/lint/build, real60000ms Write/warning boundary and full local five-round production smoke in docs/onboarding/write-time-smoke-plan.md. Probe waits derive70000ms from current tuning; no assertions relaxed. This is existing matching local evidence, not a new remote result.

Archive command: `git archive --format=tar.gz 384794d | sha256sum`; independently observed SHA256:c3b68070110f12700411224447aec6a64eba8979d34b525492c1fca3fd7da90e. Transfer only pinned archive and compare host hash before extracting/building; label the single app image with the full revision. Inspect new/current images and existing ledger BEFORE replacing anything. Expected previous running image sha256:d2893de4211076e08f23aa57e307ba0d94d90ed55e5bd27ef7d5725e3481b6ab (sourceaf94c7f), but actual host inspection governs recovery. Retain it under news-town:recovery-before-write-time and verify the tag. Do not prune older recovery images.

Recreate only news-town-app during the authorized quiet window; all in-memory rooms end. Reuse /etc/news-town/groq.env and /var/lib/news-town-ai directory mount unchanged, loopback3000, bridge peer trust, restart policy and bounded logs. No environment dumps/keys in chat; selected safe AI settings only. No Caddy/DNS/volume changes. If replacement fails, restore retained image with unchanged env/ledger; record whether recovery executed.

After replacement: inspect image/revision and safe AI settings; verify ledger continuity, HTTPS, production smoke from matching local build, genuine new success events for both AI operations, retained recovery tag, current port binding and resource snapshot. Recheck http://3.20.0.241:3000 from OUTSIDE EC2 (agent environment and/or Arch) with no proxy, bounded connect/max timeout; record actual result. A local loopback binding is not a substitute for the requested external test.

Status: PREPARED; transfer/build/replacement/remote smoke/external port check pending. Agent has no EC2/Groq key, so host actions are user-run. Prior ledger358 is historical, not a current balance. No provider request or production mutation made during preparation. No new contract/dependency/source changes. Novice comprehension remains untested.

## User-run replacement and agent external check

User supplied built image sha256:b1eabf469e22f2d7077a19feee12dff5a9ca607ff14e431143c38a6ef1f7d002, previous running image sha256:d2893de4211076e08f23aa57e307ba0d94d90ed55e5bd27ef7d5725e3481b6ab and ledger399 before replacement. After the prescribed single-image replacement, user reported the new image running, ledger still399, and HTTPS HTTP/2 200 at2026-10-26 22:29:54UTC (HTML1454bytes).

Selected running process environment was explicitly supplied:AI_PROVIDER=openai; AI_BASE_URL=https://api.groq.com/openai/v1; AI_MODEL=openai/gpt-oss-20b; AI_REQUEST_ALLOWANCE=30000; AI_MAX_CONCURRENT=4. The protected env file and persistent directory mount were reused, not edited by this procedure. No key is retained. Preservation is supported by the user-run before/after count, not independent filesystem access.

Agent executed an independent OUTSIDE-EC2 check after replacement:

```bash
curl --noproxy '*' --connect-timeout 5 --max-time 8 -sS -o /dev/null -w 'port3000_http_code=%{http_code}\n' http://3.20.0.241:3000/
```

Result:exit28, `Connection timed out after 5001 milliseconds`, HTTP code000. Positive control, also no proxy, pinned TLS hostname to the same IP using `--resolve newstown.prophumy.com:443:3.20.0.241`:HTTPS returned HTTP/2 200 at22:30:17UTC with valid certificate handling. This establishes app port3000 was unreachable from the agent's external network while HTTPS on that host was reachable; not a claim about all possible networks or an independently inspected AWS security group. This specifically closes the external recheck omitted last release.

Agent is running the approved production smoke against matching local384794d source/build with --remote; final result/capture checks and final host recovery/tag/port/resource/AI outcome/ledger evidence remain pending at this point. Host build/replacement remains user-attributed; public smoke and external checks are agent-executed. No raw packets, tokens, keys or player text are exported in this record.

## Agent-executed production smoke — assertions passed, teardown interrupted

Ran the matching local384794d build/probe directly against https://newstown.prophumy.com with --remote. The complete result is saved in deployment/write-time-production-smoke.json (including all26asset SHA256 values). Observed summary:passed=true, remote=true, Nodev26.12.1, Chromium153.0.8010.12,26assets/17models/1font/4sounds,2isolated browser sessions, restoredSeat=true, results=true. All probe assertions completed and the result file was written before the passing summary printed. Actual browser traffic verifies WSS, token-authorized seat recovery, private-recipient/rival-token protections, asset-byte/MIME identity and five-round results, not merely an HTTP homepage check.

Execution session subsequently returned143 (SIGTERM) after the passing output, during/after final browser teardown. Cause is not established; do not claim a clean exit0 or classify it as a game/server defect. The process is no longer running. Independently reopened/validated the complete saved result and both remote sidecars: origin correct, fonts ready, overflowX=[], unreachable=[], consoleErrors=[]. Both home and final PNGs were opened directly at `.superpowers/shots/write-time-production-384794d/` in the codex/write-time-smoke worktree. No failed application assertion appears in the log. No additional public match was started just to repeat already-completed gameplay assertions. Log:/tmp/news-town-write-time-production-smoke.log.

No raw packets, room codes, tokens, keys or arbitrary provider payloads were exported. The report contains standard sanitized summary fields and static asset hashes. Pending final host evidence: new-container AI outcome counters, latest ledger count, retained recovery tag inspection, current loopback binding and resource snapshot. Do not infer remaining allowance from399 once new public activity occurs. Same AI settings remain as supplied by the user. No additional source changes, restart, allowance increase or ledger operation was made by the agent.
