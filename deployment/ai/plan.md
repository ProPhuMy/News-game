# AI evaluation preparation implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Prepare existing writing/rating AI paths for a capped evaluation, with no paid calls or rollout.
**Architecture:** Preserve shared AiAdapter and engine APIs. Harden existing provider parsing, add narrow fenced-JSON handling and adapter outcome events, and enforce a persistent server request allowance before outbound calls.
**Stack:** Existing TypeScript, zod, Node filesystem and Vitest; no dependencies.
**Spec:** Gameplay §§5.4, 8, 9.3–9.5; C5 handoff §4e; user's clarified existing bot-writing scope.

## Ownership and boundaries

All new/changed files are Codex-owned: src/ai/{providers,adapter}.ts; new tests/ai/providers.test.ts and existing adapter tests; new src/server/ai-budget.ts and tests/server/ai-budget.test.ts; src/server/index.ts and its tests; .env.example; deployment/ai/{plan,README}.md. ProviderOptions remains provider transport configuration. New AdapterOptions extends it with content, optional acquireRequest(): () => void and onOutcome(operation, outcome). Server-only AiLimits holds requestAllowance, allowanceFile and maxConcurrent. No shared/engine/bot/content/UI/root config edits or new bot behavior. No cross-owner data interface changes.

## Constraints and review focus

- Engine still chooses claims, truth, reactions and scoring. Existing AI only writes bot headline text and supplies validated ratings.
- Default allowance zero; every outbound attempt consumes one permit before fetch, including failures/timeouts. Cache/disabled calls consume none. One server process, one persistent pre-created ledger mounted from existing host storage; missing/corrupt/unwritable ledger fails closed. Restart never resets allowance. Not a currency or account-wide cap.
- Concurrency overflow falls back immediately; no waiting queue. Hung requests retain slots until settled, even after adapter timeout.
- Only fixed operation/outcome labels and numeric counters logged. Never response bodies, input text, model thinking, keys, errors or room identity.
- Existing 3-second timeout, one attempt, 512 output-token cap and fallbacks stay. Haiku settings are model-specific; other provider/model request bodies stay compatible.

## Tasks

1. Provider compatibility: write failing tests for mixed thinking/text blocks, malformed text/no text, Haiku low-effort/disabled-thinking request and unchanged OpenAI/older Claude body. Implement text-only extraction with validation and conditional settings. Red → green.
2. Adapter: failing tests for a single complete JSON fence, rejection of prose/invalid payloads, success/cache/disabled/failure/limited events, and permits across writing/rating including timeouts/late completions. Implement minimal adapter changes; preserve engine fallback/privacy tests. Red → green.
3. Server guard: failing tests with real temporary ledger for zero default, invalid config, exhaustion, restart persistence, failures retaining usage, concurrency and unreadable/corrupt ledger. Implement budget/config helpers, wire both operations at server creation, numeric safe logs, placeholder env. Red → green.
4. Run focused and full tests, typecheck, lint and build. Audit ownership and diff. Independent review; fix required findings. Save preparation handoff and revised estimate including generation, live evaluation/rollout gates and room-loss/recovery warnings. Commit/push own branch; no main merge or live calls.

## Paid evaluation gate

Preparation authorized; paid calls are not. Propose 100 outbound attempts only after tests/review and provider funding/limit confirmation. Prices: Haiku 5.5 $0.10/M input and $0.50/M output (short prompts); provisional 1,000 input/100 output tokens per rating, 500 input/40 output per bot writing. Normal five-round solo: 20 ratings + 15 writes = $0.00405; four humans: 20 ratings = $0.003. Up to $0.01246 solo at 512 output tokens on all 35 requests, under those input assumptions. Cache savings excluded, failed attempts can be charged, replacements/extra matches add calls. 100 attempts with 1,000 input/512 output each ≈ $0.0356, not a guaranteed invoice cap. Provider-console limits and explicit funding approval remain necessary. Live success/latency/quality and production smoke are later gates; Claude changes description only after successful production outcomes.
