# AI evaluation preparation — no live enablement

## Scope and status

This branch prepares the existing adapter for a separately approved live evaluation. Production remains AI-disabled. No real keys were accessed, paid requests made, account funding enabled, host changed or container restarted. The engine remains authoritative for story selection, truth, exposure, reactions, readers and scoring. Existing bot logic selects the location and claim; existing AI writing can supply only headline text, with the engine's exact template fallback. There are no new bot-generation features.

## Implementation

- Anthropic response parsing validates the envelope and text blocks and ignores non-text content, including thinking. Missing/malformed text fails back; thinking is never logged or passed to gameplay.
- Exact model `claude-haiku-5-5` uses `thinking: {type: 'disabled'}` and `output_config: {effort: 'low'}`. Other configured model/provider requests retain their existing settings. Low effort does not guarantee latency or quality.
- Rating JSON may have one complete outer `json` or plain code fence. Only that wrapper is removed; arbitrary prose, incomplete fences and invalid schema values still fail back. Bot headlines do not acquire fence stripping.
- Unchanged: 3-second timeout per operation, one attempt, 512 output tokens, normalized successful-result cache, local moderation, escaped untrusted data, Zod output validation, engine-prepared fallbacks and stale-result rejection. Bot writing followed by rating can take up to two operation deadlines; reveal never waits on either.
- New server configuration in `.env.example`: `AI_REQUEST_ALLOWANCE=0`, `AI_ALLOWANCE_FILE` and `AI_MAX_CONCURRENT=4`. Positive allowance requires an existing valid persistent ledger. Default zero makes no outbound calls even if a provider/key is configured. This is an operational allowance, not a gameplay tuning value; `src/shared/` is unchanged.

## Allowance and observability

Every permitted outbound attempt for **either** writing or rating appends `1` and a newline to the ledger and flushes it before fetching. Failures/timeouts are not refunded. Existing entries count on startup, so an allowance of 100 means 100 total attempts over the retained ledger, not 100 after each restart. Success-cache hits and disabled calls consume no allowance. Full concurrency slots fall back immediately, without queueing or consuming allowance. A timed-out request holds its slot until the underlying operation settles; a hung request cannot start unlimited replacement calls.

Missing/corrupt ledgers fail closed; runtime write errors return fallbacks. A partial-write/flush error disables further requests for that process. The ledger contains no text, keys, identifiers or monetary values. It is a **single-process** guard, not an account-wide monetary cap or a distributed ledger. Run exactly one app process with exclusive use of its ledger; do not run parallel containers against it. Do not delete, truncate, restore an older copy of or replace the ledger to replenish usage. Raising the configured allowance is a new spending decision. Preserve the same ledger across image replacements.

Server logs emit JSON with only `event: 'ai_outcome'`, fixed `operation` (`rateHeadline`/`writeBotHeadline`), fixed `outcome` (`success`, `cache`, `disabled`, `failure`, `limited`) and numeric cumulative counts. No user text, responses, thinking, keys, exception details, room paths or player/session identity. Counts reset at process restart; the request ledger does not. AI-disabled servers suppress these operational logs. `success` means newly fetched output passed adapter validation; cache/fallback results cannot increment it. To prove production behavior, collect new `success` events for **both operations**, check timing/actual gameplay and complete production smoke; a passing smoke alone can also run entirely on fallbacks.

## Revised cost estimate — approval required

Official short-prompt Haiku 5.5 rates checked during preparation: **$0.10/M input tokens, $0.50/M output tokens**. No cache discount assumed. These are estimates, not measured token counts or guaranteed invoice caps.

| Operation | Assumed input/output tokens | Estimated cost/call |
|---|---:|---:|
| Rating | 1,000 / 100 | $0.00015 |
| Bot headline writing | 500 / 40 | $0.00007 |

A normal five-round solo match has 20 rating attempts plus 15 writing attempts: **about $0.00405/match**, or **$4.05/1,000 matches**. Four connected humans require 20 ratings: about **$0.003/match**. At 512 output tokens for every call with those same input assumptions, solo is approximately **$0.01171/match**. Replacements, failed charged requests, different tokenization and additional games change usage. Cached inputs may reduce it.

Proposed initial evaluation: **at most 100 outbound attempts**, counting writing and rating together. At 1,000 input and 512 output tokens each, approximately **$0.0356**. This is not spending authorization. Actual billable usage, provider funding minimum, available credits, tax and account limits must be checked before approval; existing AWS EC2 credits are not assumed to pay the direct Anthropic API. Set provider-console limits as available and verify whether they enforce a hard stop. Notifications alone are not a spending cap. Request allowance protects this one app, not other consumers of the key.

## Rollout gate — reference only, not executed

1. Obtain counterpart review of owned server/adapter changes and explicit user approval of provider funding, evaluation allowance and quiet-window restart. No real key should be pasted into chat or git. Use a scoped server-only key and a restrictive host env file; never export Docker's whole environment into evidence.
2. Build/test the reviewed image before touching production; retain the exact currently running image and safe proxy settings as recovery. Production baseline was `d86a2d5` / image `sha256:4a038abd4b757e14f25455c0ca6c9f92787e9a220c2b6f63c17033a0705c87e6`; re-read the actual host before rollout rather than assume it has not changed. Keep existing earlier recovery images too.
3. On existing host storage only, create a dedicated directory and a **new empty ledger exactly once**, writable by the image's `node` user (verify its numeric UID/GID). Bind-mount the directory at an absolute container path such as `/var/lib/news-town-ai`; configure `AI_ALLOWANCE_FILE=/var/lib/news-town-ai/requests`. Preserve ownership, restrictive permissions and content across restarts; never use a truncating creation command on an existing ledger. No new AWS resource or paid-plan upgrade is authorized.
4. With spending approved, configure `AI_PROVIDER=anthropic`, `AI_MODEL=claude-haiku-5-5`, the server-only `ANTHROPIC_API_KEY`, `AI_REQUEST_ALLOWANCE=100` and `AI_MAX_CONCURRENT=4`. An isolated bounded evaluation first checks normal/on-topic/off-topic/injection/invalid/timeout behavior, actual charged tokens, valid output rate and <3-second success latency. Stop if results are unsuitable; do not extend the allowance automatically.
5. In the agreed quiet window, recreate only the app container with the reviewed image, persistent ledger and new env file. Keep loopback publication, exact trusted bridge peer, Caddy/HTTPS, log limits and restart policy unchanged. **All active in-memory rooms are lost.** Container restart alone cannot add environment settings. Retain a known-good AI-off recreation procedure/image; restoring it also loses rooms and does not restore match state.
6. Re-run the existing remote production smoke against a matching local build; inspect home/final evidence, assets, actual WSS/reconnect/privacy and results. Record source SHA/image identity, remaining ledger allowance and new successful output events for writing and rating. Public traffic also consumes the evaluation allowance; use the isolated evaluation to distinguish its own outcomes. Do not log packets or headline data to establish success.
7. Send actual successful live-production evidence to Claude. Claude owns any submission-wording update and obtains the user's approval. Do not imply that every headline uses AI when cache, limits or failures may select fallbacks. Main merge and live enablement remain separate decisions.

## Verification record

See `plan.md` execution record for exact checks and review status. Tests replace only the HTTP transport; real adapter, server, runner, engine and temporary filesystem ledger are exercised. Live compatibility, quality, latency, account billing and production behavior remain unverified until the paid evaluation/rollout gates pass. No contract requests or dependency changes.

Sources: [Anthropic thinking configuration](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting), [Haiku pricing](https://www.anthropic.com/claude/haiku). Existing host replacement/rollback topology: [EC2 README](../ec2/README.md).
