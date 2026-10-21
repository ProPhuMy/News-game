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

Claude accepted candidate `113c6be` with no blocking findings and independently reran 942 tests, typecheck, lint and build. See `plan.md` for exact checks, deferred nonblocking suggestions and review attribution. Tests replace only the HTTP transport; real adapter, server, runner, engine and temporary filesystem ledger are exercised. Live compatibility, quality, latency, account billing and production behavior remain unverified until the paid evaluation/rollout gates pass. No contract requests or dependency changes.

Sources: [Anthropic thinking configuration](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting), [Haiku pricing](https://www.anthropic.com/claude/haiku). Existing host replacement/rollback topology: [EC2 README](../ec2/README.md).

## Groq Free — offline candidate, not enabled

Groq is now the preferred evaluation path; Anthropic remains an unapproved paid fallback. Claude accepted `groq-plan.md` and its three amendments at `c9406a7`. The implementation and the two exported report schemas still require Claude's review before any authenticated request, followed by separate user approval of24 Free-only attempts. No live result or samples file has been produced.

### Endpoint configuration

`AI_BASE_URL` is optional. Blank/unset preserves `https://api.openai.com/v1/chat/completions`. A custom base is HTTPS-only, with no credentials, query or fragment, and redirects are refused. It is trusted operator configuration, never player input. Enabling Anthropic with a custom base is rejected. The safe startup message is `Invalid AI_BASE_URL`, without the supplied URL.

Future Groq configuration, **reference only**:

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-20b
# OPENAI_API_KEY must contain this endpoint's GROQ key, never an OpenAI key.
AI_REQUEST_ALLOWANCE=0
```

The placeholder remains default-off; no key is committed or needed for offline tests. When the normalized base and model match the exact Groq values above, the request includes `reasoning_effort: 'low'`. Other hosts/models, default OpenAI and Anthropic are unchanged. The512-token cap and3-second operation deadline remain. Groq JSON mode is used for ratings only; schema validation still determines whether output is usable.

### Evaluator and report schemas for review

The synthetic evaluator is `deployment/ai/groq-evaluate.ts`; it imports the actual production adapter/prompts and persistent request gate. Cases are in `groq-cases.ts`; strict schemas are exported as `GroqSummarySchema` and `GroqSamplesSchema` from `groq-report.ts`. No public route, socket event, client bundle or real-player logging changes.

- `groq-result.json`: version/model/source revision, incomplete/failed/pending-review status, completed case count and cap24; per-operation attempt/outcome counts, genuine-provider success fraction, under-deadline count and successful-output p50/p95/max latency. Each case records only fixed case ID/operation/outcome, elapsed time, allowlisted finish reason, coarse HTTP status category, filtered/quality booleans and numeric token usage (or null). No raw text, provider errors or URL.
- `groq-samples.json`: synthetic case ID and whitelisted input fields, final headline or rating/bubbles, provider/fallback/cache source label, and `review: 'pending'`. No secrets, URLs, HTTP envelope, reasoning, refusal text or arbitrary model metadata. Secret/URL redaction can lengthen displayed strings; the sample schema intentionally allows that representation, while actual adapter output retains gameplay validation. Files are JSON text, never executable HTML. Samples are an exception for these known synthetic cases, not a logging feature for player content.
-24 distinct cases:15 ratings (topic, denial/off-topic, inappropriate, injection and exposes) plus9 existing bot headline writes (3 personalities ×3 claim/location contexts). Case1 is the ordinary rating/access/JSON pre-check, included in the24; failure stops incomplete immediately. Cached results cannot masquerade as provider success; the evaluator uses a new adapter per case and the same request gate for all cases.
- Every attempt is counted, including errors and timeouts. Auth/quota errors stop the run; no retries/provider switching. Sequential pacing is at least20 seconds, adjustable only slower via `GROQ_EVALUATION_INTERVAL_MS` if actual quotas require it. Allowance cannot exceed24. A transport that outlives the deadline cannot promote a fallback or mutate captured report rows afterward.
- `finish_reason` allows only `stop`, `length`, `content_filter`, `tool_calls` or `unknown`. Truncation, refusal, filtered output, failed rating expectations or known injection sentinels fail observed quality even if output passed schema. This is not comprehensive moderation: human review must inspect safety, relevance, bot context, style and humor.
- Transport threshold stays >=90% separately for ratings/writing. Unknown/unavailable cases are recorded as unsuccessful quality checks, never passed; non-success cases do not silently turn the transport threshold into100%. Human review must resolve any unassessed critical safety/semantic case before rollout. Observed bad provider quality blocks the pilot. Even perfect metrics only produce `pending-review`, never automatic PASSED. Small serial tests do not certify public multi-room capacity.

### Live-run prerequisites — not executed

The user supplied the Free model table: GPT-OSS20B30RPM/1,000RPD/8,000TPM/200,000TPD. This is user-reported, not an authenticated verification of organization status or remaining quota. Confirm the actual organization is Free, model enabled, other quota consumers and Data Controls. Free-plan evaluation targets$0; no Developer upgrade, payment method, Anthropic top-up or AWS credit consumption is authorized.

After Claude code/schema review and explicit user approval, run from this reviewed worktree with a securely set **Groq-only** key in the selected key env slot. Use a new pre-created persistent evaluation ledger, `AI_ALLOWANCE_FILE` set to its absolute path, and `AI_REQUEST_ALLOWANCE=24`. Never truncate/replenish the ledger, expose the key through CLI arguments/chat/logs or use the production ledger. The command for that later approved run is:

```sh
node deployment/ai/groq-evaluate.ts --live
```

Without `--live`, the CLI exits without consuming a request even if credentials are present. It writes the two fixed report files only after the run returns, and logs only numeric outcome/latency aggregates. Early interruption is not completion; preserve the ledger and any prior reports, and check source revision and counts rather than treating an older file as a new result. Do not use other inputs or production player text with this evaluator. No report or key is generated by a dry command.

Production enablement remains a separate decision after live results, including user tone/humor review. A later container replacement loses active rooms, requires the retained recovery image/ledger, matching production smoke and genuine success events for both operations. Submission description is unchanged until Claude has that evidence and the user's wording approval.

### Twelve-rating follow-up — offline tooling, live approval still required

Claude accepted `groq-followup-plan.md`. The prompt-only follow-up is explicitly selected by `--follow-up` **together with** `--live`; no flag silently changes the existing24-case pilot. It contains exactly12 fixed rating cases and no bot-writing calls, caps the durable allowance at12, keeps concurrency1, and retains the counted access pre-check, auth/quota stop, no retries, minimum20-second spacing,3-second deadline and512-token response cap.

After code/schema review and a separate user approval, the command will be `node deployment/ai/groq-evaluate.ts --live --follow-up`, using a separately approved evaluation ledger with allowance12. Do not run it yet or reset the exhausted pilot ledger. Follow-up filenames are `groq-followup-result.json` and `groq-followup-samples.json`; the original failed `groq-result.json` is preserved. Samples contain synthetic moderation material and must be inspected by the user before any commit.

Report compatibility: both schemas retain version1. Optional `suite: 'follow-up'` distinguishes the12-case artifacts; without it, pilot cap24 and original case IDs apply. Summary cap, case IDs and operations must match the selected suite; samples also enforce suite IDs/operations/count. Follow-up case rows additionally require a `validation` value from `valid`, `invalid_envelope`, `invalid_json`, `invalid_rating`, `unknown`. This is transient inspection of response usability, not a classifier's moderation judgment. Invalid ratings do not expose Zod messages, rejected text or arbitrary field names. No extra constraint enum is added this round.

At12 attempts,11/12=91.67% clears the numeric transport threshold;10/12=83.33% fails it. Unusable moderation/injection/denial cases remain unassessed even if the transport fraction clears90%; human review must resolve critical gaps before any rollout. `pending-review` is never a safety approval. Late transport metadata cannot change the saved validation category after timeout. The user's previous24-request permission does not authorize these12 additional calls, and no new request has been made during offline implementation.
