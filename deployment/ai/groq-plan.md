# Groq Free evaluation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans after Claude's plan review and user approval. No implementation in this planning delivery.

**Goal:** Evaluate the existing headline writing/rating adapter on Groq Free with a minimal optional HTTPS base URL, preserving engine authority and all fallbacks.
**Architecture:** Extend existing OpenAI-compatible transport configuration only. Reuse adapter validation, outcome events and persistent server allowance. Use synthetic, bounded evaluation cases outside the live game; production stays disabled until separately approved.
**Tech stack:** Existing Node/TypeScript, fetch, zod, filesystem and Vitest. No dependency, root-config or shared-contract change.
**Spec:** Gameplay §§5.4, 8, 9.3–9.5; accepted AI preparation at `113c6be`, acceptance record `e8616d3`; user's Groq-first/default-off/review-before-code decision.

## Base, ownership and gates

- Branch `codex/groq-evaluation`, isolated `.worktrees/codex-groq-evaluation`, from `e8616d3` on `codex/ai-evaluation`. Main is `d66660c`; prepared AI runtime is not merged/deployed. Preserve the accepted preparation commits; do not start from main without them. Claude independently passed 942 tests plus typecheck/lint/build at the identical runtime. No test suite is rerun for this plan-only commit.
- Codex-owned changes planned: `src/ai/providers.ts`, `src/server/index.ts`, `tests/ai/providers.test.ts`, `tests/server/index.test.ts`, `.env.example`, `deployment/ai/README.md`; new `deployment/ai/groq-plan.md`, `groq-evaluate.ts`, `groq-cases.ts`, `groq-result.json` (only after evaluation), and `tests/server/groq-evaluate.test.ts`. No new shared interface, engine, bot, content, client, root config or Claude-owned file changes.
- **Before code:** Claude reviews this plan. Account/model selection can remain pending while offline code is built; live evaluation waits for the model and real account quotas to be confirmed and explicit user approval of the capped Free-only run. Production enablement requires a separate user approval after results.
- No Anthropic spending approved. Haiku 5.5 up to a $5 top-up remains only a possible separately authorized fallback. No automatic provider/model failover, key reuse between providers, paid upgrade or AWS change.

## Verified public docs and unresolved account checks

Provisional candidate: **`openai/gpt-oss-20b`**, subject to its availability in the user's Free organization. Groq explicitly demonstrates this model with `response_format: {type: 'json_object'}`. JSON mode does not enforce our schema; existing RatingSchema remains required. [JSON mode](https://console.groq.com/docs/structured-outputs#json-object-mode).

Groq's GPT-OSS returns reasoning separately in `message.reasoning`; our parser reads only `message.content`. This minimal patch does not add model-specific reasoning parameters. Reasoning can consume the existing512-token completion budget; missing/truncated answers or failures inside3 seconds count against suitability, never justify silently raising the deadline/cap. If unsuitable, report and obtain a reviewed model/settings amendment before another run. [Reasoning](https://console.groq.com/docs/reasoning).

Published Free limits for the candidate are 30RPM, 1,000RPD, 8,000TPM and200,000TPD. These are **not account verification**. User must supply the Console's actual model access, Free plan, remaining limits and whether other clients share them. No key in chat; no new account/payment method/upgrade is requested. Groq says Developer upgrade requires a payment method. [Limits](https://console.groq.com/docs/rate-limits), [billing](https://console.groq.com/docs/billing-faqs).

Data-use review: Groq retains non-content usage metadata. Normal inference content is not retained by default, except temporary reliability/abuse logs (up to30 days, subject to legal retention). All customers can enable ZDR; confirm the user's Data Controls before a run. Use only synthetic cases initially, no real player data, batches, fine-tuning or feedback submission. [Data controls](https://console.groq.com/docs/your-data). Services agreement §8.2 limits its use of supplied prompting/training data to providing the service; this is not a blanket no-metadata/no-retention promise. [Agreement](https://console.groq.com/docs/legal/services-agreement). Account eligibility and specific model terms still need confirmation; do not substitute website terms for cloud-service terms.

## Constraints and review focus

1. No key leakage through URL userinfo/query, redirects, startup errors or evaluation logs; endpoint is trusted server config, never player input. HTTPS validation is not a guarantee that an arbitrary configured operator endpoint is trustworthy.
2. Unset optional URL preserves the exact existing OpenAI endpoint/body. Anthropic remains on its fixed endpoint. Groq uses its own key in the selected OpenAI-compatible key slot, never the real OpenAI key.
3. Default provider `none` and allowance0 remain unchanged. No HTTP request during tests or evaluation startup without explicit live opt-in. Every writing/rating attempt shares the same durable ledger; errors consume attempts and never retry automatically.
4. Game outcomes stay in engine; synthetic interpretation expectations never redefine truth/reactions/scoring. Bots retain their existing engine-selected location/claim and exact text fallback.
5. Separate genuine provider success, cache, disabled, failure and limited outcomes; output quality is not inferred from schema validity. Three-second operation deadline and512-token output cap remain unchanged.

## Task 1 — Optional HTTPS base URL, offline only

**Interface:** Add `baseUrl?: string` to Codex-owned `ProviderOptions`; read optional server env `AI_BASE_URL`. No Provider enum change: Groq uses `AI_PROVIDER=openai`, `AI_BASE_URL=https://api.groq.com/openai/v1`, `AI_MODEL=openai/gpt-oss-20b` and the **Groq key** in `OPENAI_API_KEY`. Never place credentials in a URL or introduce a general client-controlled endpoint.

- [ ] Write RED provider tests: unset/empty URL uses existing OpenAI endpoint; a trailing slash is normalized once; Groq URL retains `/openai/v1/chat/completions`; JSON flag sends existing `json_object`, writing omits it; Anthropic stays unchanged. Mock HTTP boundary only.
- [ ] Write RED rejection tests: malformed/relative URL, non-HTTPS, userinfo, query or fragment rejected before fetch with fixed safe `Invalid AI_BASE_URL` error; no supplied value in logs. Whitespace-only env is treated as unset. Configure fetch to reject redirects for the custom endpoint, preventing key-bearing requests being redirected; test that option.
- [ ] Implement minimal URL validation in `providers.ts` using URL, appending `/chat/completions` to normalized base path. No arbitrary endpoint fallback or retry. Add server env wiring and fixed startup-error allowlist entry; startup tests prove secret-bearing invalid values are not printed. Add blank `.env.example` placeholder and document selected-provider key semantics. Optional URL with an enabled Anthropic provider is rejected to avoid ambiguous configuration; none mode remains network-free.
- [ ] GREEN focused AI/startup suites, then full `npm test`, typecheck, lint and build. Audit Codex-only diff and commit on this branch. Runtime remains default-off; obtain Claude code review before authenticated evaluation.

## Task 2 — Capped evaluator and offline verification

**Files/interfaces:** `groq-cases.ts` exports synthetic cases with fixed non-user case IDs, existing shared Claim/Location/Personality values and human-review expectations. `groq-evaluate.ts` consumes the real adapter and `createAiRequestGate`; exports a testable runner using injected fetch and clock, plus an explicit `--live` CLI entry. New `groq-result.json` is a sanitized summary, not raw responses. All are Codex-owned deployment tooling.

- [ ] Write RED tests for no live flag/no key/no ledger/zero allowance producing no requests; hard cap24 total attempts across both operations; cache hits excluded from live-success denominator; failures/timeouts count correctly without retry; summary contains no key, input/output text, thinking, URL credentials, room or session identifiers. Use real temporary ledger and adapter with mocked HTTP.
- [ ] Implement **24 distinct cases: 15 ratings and9 bot-writing cases**, no cache-only repeats. Ratings cover on-topic, off-topic/denial, inappropriate text, prompt injection and exposes (3 each); writing covers3 existing personalities across3 existing claim contexts. Inputs are synthetic, <=100-character headlines; no engine fixtures/content prompts modified. Expose cases include public rival context only. Review outputs transiently against case expectations; save only rubric verdicts and numeric metrics.
- [ ] Reuse3-second per-operation timeout,512-token provider cap, success/fallback counters and durable gate. Sequential live pacing at least20 seconds between attempts, adjusted slower if actual quotas require it; no burst/concurrency experiment or background paid traffic. Reserve24 attempts total in one pre-created persistent ledger, including failures. Stop on exhausted quota/auth error; never replenish/reset ledger or switch models automatically. A run interrupted before24 attempts reports incomplete, not passed.
- [ ] Record per-operation attempt/success/failure/limited/cache counts, genuine-provider success fraction, elapsed milliseconds p50/p95/max and number succeeding under3 seconds. Capture numeric token usage/finish reasons from HTTP metadata when available (whitelist only), so512-token truncation is not silently counted as good writing. Don't persist provider errors or reasoning. Outcome counters distinguish provider output from coincidentally identical fallback text.
- [ ] Review quality separately: rating on-topic/moderation judgments match fixed expectations; bubbles and bot text are safe, length-valid and claim/location-consistent, with no obeyed injection or outcome-setting instructions. Record per-case pass/fail and totals. Any safety/instruction-following failure is a rollout blocker, even with perfect transport success.
- [ ] Proposed pilot gate: >=90% genuine-provider success separately for writing and ratings, all successful calls under3 seconds, and all safety/critical semantic cases pass. Report the small sample/serial pacing limitation; passing does not prove public multi-room quota capacity. Failures get an explanation and a reviewed next decision, not scope expansion.
- [ ] GREEN focused evaluator/provider/server suites, full tests/typecheck/lint/build, ownership audit, commit/push. Claude reviews code and sanitized report schema; no live requests yet.

## Task 3 — Approved Free-only evaluation and report

- [ ] Confirm actual account plan/model quotas and Data Controls with user; obtain explicit approval of24 Free-only attempts and a secure local/server-only key. No credentials in conversation, command-line arguments, git, screenshots or evidence. Stop if enabling billing or payment is required.
- [ ] Run locally, isolated from production rooms, with `--live`, Groq endpoint/model, its own key, fresh evaluation-only ledger and allowance24. Pace within actual quotas and report progress; no production restart. Cost target **$0 on confirmed Free plan**; token/request quota consumption still counts. Keep Anthropic off.
- [ ] Report success versus fallback, latency, token/finish metadata, quality and safety verdicts plus actual limits. Save sanitized `deployment/ai/groq-result.json`, exact source revision and evaluation configuration excluding key/identities. If a request times out, do not log a later result as success. Do not equate mock regressions with live quality evidence.
- [ ] Claude reviews findings. User separately decides suitability and production enablement; if approved later, preserve known-good image/ledger, use a quiet window because restart loses rooms, and rerun production smoke plus successful events for both operations. Submission wording remains Claude-owned until live production success. Anthropic spending still needs separate go-ahead if Groq is unsuitable.

## Current handoff / stop condition

Plan-only delivery: public documentation checked, actual account limits pending user reply, no implementation or authenticated evaluation. Claude's plan review is the next gate. No contract requests, dependencies, purchases, live calls, main merge or production changes. Finish preparation only after accepted plan; finish evaluation only after the explicitly approved run and honest result report.
