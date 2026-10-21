# AI evaluation preparation implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Prepare existing writing/rating AI paths for a capped evaluation, with no paid calls or rollout.
**Architecture:** Preserve shared AiAdapter and engine APIs. Harden existing provider parsing, add narrow fenced-JSON handling and adapter outcome events, and enforce a persistent server request allowance before outbound calls.
**Stack:** Existing TypeScript, zod, Node filesystem and Vitest; no dependencies.
**Spec:** Gameplay §§5.4, 8, 9.3–9.5; C5 handoff §4e; user's clarified existing bot-writing scope.

## Ownership and boundaries

All new/changed files are Codex-owned: src/ai/{providers,adapter}.ts; new tests/ai/providers.test.ts and new tests/ai/adapter-runtime.test.ts; new src/server/ai-budget.ts and tests/server/ai-budget.test.ts and tests/server/ai-budget-failure.test.ts; src/server/index.ts and its startup tests plus new tests/server/ai-runtime.test.ts; .env.example; deployment/ai/{plan,README}.md. ProviderOptions remains provider transport configuration. New AdapterOptions extends it with content, optional acquireRequest(): () => void and onOutcome(operation, outcome). Server-only AiLimits holds requestAllowance, allowanceFile and maxConcurrent. No shared/engine/bot/content/UI/root config edits or new bot behavior. No cross-owner data interface changes.

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

Preparation authorized; paid calls are not. Propose 100 outbound attempts only after tests/review and provider funding/limit confirmation. Prices: Haiku 5.5 $0.10/M input and $0.50/M output (short prompts); provisional 1,000 input/100 output tokens per rating, 500 input/40 output per bot writing. Normal five-round solo: 20 ratings + 15 writes = $0.00405; four humans: 20 ratings = $0.003. Up to $0.01171 solo at 512 output tokens on all 35 requests, under those input assumptions. Cache savings excluded, failed attempts can be charged, replacements/extra matches add calls. 100 attempts with 1,000 input/512 output each ≈ $0.0356, not a guaranteed invoice cap. Provider-console limits and explicit funding approval remain necessary. Live success/latency/quality and production smoke are later gates; Claude changes description only after successful production outcomes.

## Execution and handoff — offline preparation complete

- Base main `d66660c`; branch `codex/ai-evaluation`, isolated `.worktrees/codex-ai-evaluation`. Runtime implementation `e19913e`.
- Task 1 complete: provider regression tests observed RED (3 failed / 4 passed), then GREEN. Mixed text/thinking, missing/malformed text, exact Haiku settings and unchanged OpenAI/older-Claude requests covered.
- Task 2 complete: adapter runtime tests observed RED (6 failed / 3 passed), then GREEN. Full fences, invalid/prose rejection, safe event labels, both-operation permit checks, timeout/late completion and observer failure covered. Existing engine fallback/privacy tests retained.
- Task 3 complete: budget module first failed import before implementation, then passed 14 tests. Startup tests observed RED (2 failed / 8 passed), then GREEN. Two full server/runner/engine/adapter tests with only HTTP transport replaced prove zero requests at default allowance and seven shared writing/rating requests for one solo round with allowance7. Extra fault-injection test proves flush failure disables further attempts. Existing engine-selected claims/locations/truth are unchanged after successful text/rating output.
- Task 4 complete locally: final `npm test` **135 files / 942 passed**; `npm run typecheck` and `npm run lint` exit0. `npm run build` exit0 on the same final runtime source, before the extra test-only flush case; existing >500kB bundle warning remains. `git diff --check` clean. No screenshots required because there is no client/renderer/UI change.
- Independent fresh whole-branch review accepted with no required findings; reviewer also accepted README and the added flush-failure coverage. Claude subsequently accepted `113c6be` with no blocking findings; counterpart review is complete. Claude independently reran 942 tests, typecheck, lint and build successfully.
- Ownership audit: only Codex AI/server/tests, `.env.example` and `deployment/ai/` changed. No shared/engine/bot/content/client/root config edits. No contract requests, dependencies, keys, real API calls, live deployment or new hosting resources.
- Detailed cost/allowance/rollout instructions: [README.md](README.md). Preparation is complete; live compatibility, moderation quality, <3-second success rate, actual billed tokens, provider account funding/limits and production smoke remain open and require a separately approved evaluation/quiet-window rollout. Do not infer live success from mocked tests.
- User decision still needed after review: approval of any provider funding and the proposed total100-attempt evaluation allowance. Estimated normal solo $0.00405/match including writing; proposed100-attempt evaluation about$0.0356 at stated conservative token assumptions, not a hard dollar cap. No funding minimum/account credit eligibility is assumed. Recreate container only after approval, preserve recovery image and ledger; restart loses rooms. Claude owns wording changes after live production success.

Test/build logs are local `/tmp/news-town-ai-*.log`; implementation workspace ledger under ignored `.superpowers/sdd/plan/`. No generated secrets or private packets are in evidence.


## Counterpart acceptance — live gates remain open

User relayed Claude's acceptance of `113c6be`: ownership, provider compatibility, persistent allowance and privacy-safe counters accepted; no blocking findings. Claude reported focused AI/budget tests 7 files/63 tests, full 135 files/942 tests, typecheck/lint/build all passing. This is independently rerun evidence attributed to Claude, not a live provider test.

Nonblocking suggestions retained without changing the reviewed runtime: validate Anthropic `stop_reason` as `end_turn` (currently a truncated or refused bot response can pass headline length validation if it is otherwise valid text), and separate concurrency exhaustion from allowance exhaustion in the `limited` outcome. Both remain deferred; the initial evaluation must inspect output quality, not infer complete answers from schema success alone. No new gameplay contract, source change or spending authorization follows from this acceptance.

Next prerequisite: user confirmation of usable Anthropic credits or required minimum funding, enforceable provider limits, and explicit approval of funding plus the100-attempt evaluation allowance. No live calls, production restart or main merge performed. Submission wording remains Claude-owned and unchanged pending successful live-production evidence for both operations.
