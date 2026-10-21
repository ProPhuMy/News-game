# Groq Free production pilot implementation plan

> For agentic workers: use superpowers:executing-plans for the approved deployment steps. This document proposes a rollout; it authorizes no live calls or restart.

**Goal:** Enable the existing headline rating and bot-headline wording operations for one bounded Groq Free production pilot.

**Architecture:** Deploy the reviewed candidate with the existing default-off adapter and persistent server allowance. No application-code, engine, shared, UI, dependency or protocol changes. Exhaustion and provider failures use existing engine-prepared fallbacks.

**Spec:** Gameplay design §§8–10; `deployment/ai/groq-plan.md`, `groq-followup-plan.md` and `deployment/ec2/README.md`.

## Evidence and unresolved gate

User-run follow-up source1d008dd:11/12 genuine successes (91.67%, the lowest passing count at this sample size);11 successful responses under3seconds. Successful-response p50=794.509273ms, p95=max=1432.640660ms. Case3: validation unknown, finish unknown, httpStatus error, elapsed1091.948742ms. No exact HTTP status or cause retained. Claude's relayed sample review finds11/11 provider ratings semantically correct, including the original denial, moderation and injection cases. Case3 remains unassessed; do not call it passed.

Claude reviewed77e87d6 and resolved case3 as a nonblocking transport failure within the agreed11/12 threshold. Independent successful denial cases2,5 and10, plus the affirmative-denial control4, cover the semantic concern. Case3 itself remains unassessed; acceptance does not manufacture a model judgment. No targeted retry is required or authorized; preserve both exhausted evaluation ledgers. Samples remain uncommitted until the user explicitly approves their inclusion.

## Constraints and review focus

- Groq Free only; expected additional API charge $0. No Developer upgrade, payment method, Anthropic funding, automatic refill or new AWS resource.
- Engine selects claims/locations and determines truth, reactions and scores. AI only supplies the existing rating fields and bot headline wording.
- Existing3-second operation deadline,512-token output cap, no retries, safe text handling, privacy and fallback remain unchanged.
- Burst traffic can hit organization-wide minute/token quotas despite a small total allowance; concurrency4 is not a rate limiter. Failures or occupied slots fall back.
- Restart loses every in-memory room. Confirm a quiet window before touching the app; do not infer room inactivity from an idle homepage.
- Missing/corrupt/nonpersistent ledger must fail closed. Never truncate or recreate it to restore allowance; Docker replacement must not erase it.
- Docker environment inspection and unfiltered logs can expose secrets or player information. Do not dump environments, keys, raw requests/responses or player text.

## Proposed configuration and quota budget

Use AI_PROVIDER=openai, AI_BASE_URL=https://api.groq.com/openai/v1, AI_MODEL=openai/gpt-oss-20b, AI_REQUEST_ALLOWANCE=100, AI_MAX_CONCURRENT=4. OPENAI_API_KEY contains a Groq-only key, delivered through a root-readable host env file, never chat, shell history, source archive or image. Set AI_ALLOWANCE_FILE to a file inside a persistent writable bind-mounted directory, outside release directories; pre-create the ledger once and verify its container UID permissions before restart. Mount the directory so the existing no-follow/append/flush behavior works normally. Preserve both evaluation ledgers separately.

Concurrency4 is the existing server default. `matches.ts` starts headlineLocked jobs without awaiting each one; `ratings.ts` awaits bot writing before rating that headline. With only one slot, simultaneous bot jobs immediately fall back instead of queueing, undermining the pilot. Four slots allow the normal solo-match bot burst and a human request without changing the gate or gameplay. Rough planning for three bot writes plus four ratings is7 calls/round; at approximately960 tokens each that is6720 tokens. This is not a worst-case bound: long outputs, faster rounds, overlapping matches and other organization traffic can exceed minute limits and produce fallbacks. Observe actual quotas rather than treating this arithmetic as a capacity guarantee.

100 is a lifetime total across both operations and all restarts using this production ledger, not100 per day. It includes smoke/testing and failures; no automatic daily reset. Cache hits and rejected concurrency slots do not consume attempts. Exhaustion leaves the game on templates/fallback ratings. It does not guarantee a fixed number of matches or successful calls.

Groq's published Free limits for this model match the user's account table:30RPM,1000RPD,8000TPM,200000TPD; quotas are organization-wide. Confirm actual Free status, remaining quotas, other consumers and Data Controls before approval/execution. The100-attempt proposal uses10% of the daily request allowance. As a planning estimate, using the follow-up's approximately741 input tokens/request and the full512 output cap gives approximately125300 tokens for100 attempts; this is an estimate, not an enforced token budget or proof of remaining quota. Actual player requests and other account usage can differ. Provider limits remain the final enforcement; never upgrade to avoid them.

Source checked2026-10-21: https://console.groq.com/docs/rate-limits .

## Task1: Freeze and verify the candidate — Codex deployment ownership

Files: existing AI/server source and tests are consumed unchanged; this plan and a new `deployment/ai/groq-production-result.md` are Codex-owned. The result record contains only source/image identity, sanitized counters, smoke evidence and operational outcomes. No samples are added without explicit approval.

- [ ] Record Claude's delivered evaluation acceptance and case3 disposition (done); obtain review of this concurrency amendment, then the user's approval of this100-attempt Free-only pilot and quiet-window restart. No main merge is implied.
- [ ] Pin the exact reviewed commit; run npm test, npm run typecheck, npm run lint and npm run build on it. Record source SHA and build identity.
- [ ] Confirm Groq Free account/data settings and remaining request/token quota. If insufficient, wait or revise the plan; never increase spending.
- [ ] Build/archive the pinned candidate and verify archive/source/image identity on the existing EC2 host before stopping the app. Prepare the protected env file and persistent ledger mount; verify required permissions without making a provider request.

## Task2: Quiet-window replacement and genuine live verification

- [ ] Inspect and retain the currently running known-good AI-off image, source and runtime/proxy settings. Expected current source is d86a2d5ea16cfb8e5fb42ae0230b611f0bb0a9b8 and image sha256:4a038abd4b757e14f25455c0ca6c9f92787e9a220c2b6f63c17033a0705c87e6; actual host inspection decides. Keep older recovery images too; do not prune.
- [ ] During the approved quiet window, replace only news-town-app with the pinned candidate, protected env file and persistent ledger directory mount. Keep loopback3000 publication, derived bridge peer trust, TRUST_RENDER_PROXY=false, bounded logs, restart policy, DNS-only record and Caddy volumes/config unchanged.
- [ ] Verify the running source/image, HTTPS and external3000 blocking. Run node deployment/D3-production-smoke.mjs https://newstown.prophumy.com --remote --out /tmp/news-town-groq-production-smoke.json against the matching local build; require the full assets/WSS/isolated-seats/reconnect/five-round/results pass.
- [ ] Record privacy-safe ai_outcome events with operation=rateHeadline and operation=writeBotHeadline, each outcome=success, from this new container. A cumulative success counter alone cannot prove both operations. If smoke does not exercise both, play a controlled solo match with bot seats within the same100-attempt allowance. Do not reset the ledger or repeatedly spend the entire allowance trying to force success.
- [ ] Record success/failure/limited/cache counts and the provider-failure fraction separately from local limited outcomes, plus ledger consumption, resource/CPU-credit observations and source identity without names, text, keys, room codes or reconnect tokens. On failed smoke, repeated provider failures or missing success evidence, stop and diagnose; do not label the rollout verified.

## Task3: Recovery and closeout

- [ ] If the candidate fails operational checks, recreate the retained AI-off image with its prior private port/proxy settings in the approved window. Preserve the production ledger and secret file securely; do not mount or pass the key to the AI-off recovery container. Rerun HTTPS and production smoke. Room state cannot be recovered.
- [ ] Record whether recovery was executed; never claim an unexecuted rollback passed. If100 attempts exhaust normally, keep serving existing fallbacks and request a separate decision before any allowance increase.
- [ ] Save sanitized rollout evidence in groq-production-result.md. Claude reviews both genuine operation successes and the smoke before proposing any submission wording change; user approves wording separately. No sample commit, main merge or further live allowance is included.

Plan verification: checked against existing AI config, durable ledger semantics, safe ai_outcome logger and EC2 replacement procedure. This is a documentation-only proposal; no authenticated request, host mutation or restart has occurred.

## Counterpart review amendment

Claude accepted the plan except for concurrency1. Code inspection confirmed immediate rejection at a full slot and concurrent bot jobs, so the proposed setting is now4; no runtime changes are needed. The allowance remains100 and requires separate user approval. `limited` combines full concurrency and exhausted allowance in existing logs; ledger consumption helps distinguish exhaustion, but do not claim a precise reason from that label alone.

Claude suggested fixed HTTP status classes for better future diagnostics. Deferred as nonblocking: current production ai_outcome events expose fixed operation/outcome counters only, with no HTTP-class field. This rollout adds no telemetry code. Provider failure cause therefore remains coarse; any later diagnostic amendment needs its own scoped code/tests review. Full tests were not repeated for this documentation-only amendment.

## Explicit rollout approval

Claude accepted the concurrency amendment atf5209a9 with no further findings. The user then approved: "Groq free pilot, 100 calls, restart now (or at a time you pick)." This authorizes the proposed100-total-attempt Free-only pilot, concurrency4, and a quiet-window app replacement now, including recovery if necessary. It does not authorize paid upgrades, automatic allowance refill, sample commits or a main merge. The user's restart approval covers loss of existing in-memory rooms. Host operations remain user-run because the approved EC2 key and Groq key are on the user's other account; neither key is requested in chat. Preparation/build precedes stopping the current app.

Pre-rollout local verification after approval:138/138test files,996/996tests passed; typecheck, lint and build exited0. No runtime source changed for the approval record. These checks do not establish host deployment or live provider success; those remain pending user-run evidence.
