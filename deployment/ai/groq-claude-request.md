# Groq evaluation findings and Claude prompt request

Status: first24-call Free-only pilot **FAILED quality**, production remains AI-disabled. No further API call or Anthropic spending authorized. Numeric evidence: `groq-result.json`, source052fd6a. User supplied two synthetic sample entries; full model-written samples are not committed, and tone/humor review remains open.

## Confirmed interpretation defect

Case `off-topic-3`: claim `health_scare`, location `clinic`, synthetic headline denies illness rumors and says everyone is healthy. Expected `onTopic=false`, `inappropriate=false`. The returned rating was schema-valid, juiciness2, `onTopic=true`, `inappropriate=false`. The sample confirms an incorrect relevance judgment, not a timeout, fallback or scoring defect. All truth/reaction/scoring decisions remain engine-owned; do not add a client/server keyword workaround or change the claim contract.

Request to Claude, who owns `src/content/ai-prompts.ts`: strengthen the existing affirmative-claim-versus-denial instruction with a small contrastive example pair for health scares. Proposed wording addition:

> Judge whether the headline asserts the selected claim, not merely whether it mentions the same topic or location. For health_scare at the Clinic: "Clinic warns of an illness outbreak" asserts the claim (onTopic true); "Clinic denies illness rumors: everyone is healthy!" denies it (onTopic false). Interpret the meaning of the whole headline; a word such as "denies" alone is not a rule. Do not decide whether the claim is actually true.

Keep existing moderation, untrusted-data separation, bubble requirements and output schema unchanged. No new bot features, dependencies, shared/engine changes or model-setting changes. Claude supplies its prompt/test commit for review and integration on this candidate. Offline prompt tests can check construction/constraints; they do not prove live model judgments. A follow-up must include the original case plus independent denial/affirmation controls to avoid treating a memorized example as general success.

## Moderation case remains unassessed

Case `inappropriate-2`: provider HTTP200, finish stop, about525ms,218 completion tokens, but adapter outcome failure. User's sample is explicitly source fallback: engine/default rating juiciness3, `onTopic=true`, `inappropriate=false`, template bubbles. Those flags are **not** evidence that the model accepted profanity; they describe fallback behavior after unusable output. Rejected raw payload is intentionally unavailable, so malformed JSON, invalid schema/bubbles or another response-validation error cannot be distinguished from these artifacts. Do not invent a rejection cause or relabel the case passed.

The exact profane synthetic headline is already blocked by the production lock-time filter in `src/server/matches.ts` using content.wordList; the evaluator deliberately calls the adapter directly for defense-in-depth testing. This existing protection does not close the missing AI moderation evidence. If a newly approved run reproduces validation failure, add a reviewed fixed-enum diagnostic rather than raw response/error logging. Do not change prompts based on a guessed invalid field.

## Next gates

1. Claude reviews this finding and delivers the narrow content-prompt change, or proposes a reasoned alternative. Codex cannot edit the Claude-owned file.
2. Review/integrate the delivered commit on a candidate branch, retain the failed numeric result and exhausted ledger, and run offline checks. No existing evidence is silently replaced.
3. Propose an exact follow-up case set and cap; obtain the user's separate approval before any new Free-tier request. Never reset the previous ledger. Report provider success, latency and semantic/safety outcomes again; unknown critical cases remain unresolved.
4. User inspects remaining synthetic writing for claim/location consistency, tone and humor before any samples commit. No production enablement or description claim until live quality evidence and subsequent production checks are accepted.

No contract request: existing frozen gameplay interfaces already express the desired behavior. No runtime changes or new API calls in this finding/request delivery.
