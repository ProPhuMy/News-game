# Request: round1 Investigate gets25seconds

Status: proposed, requires user-controlled contract approval; no code changed. Owner: Codex request, companion to Claude's intro60000ms request at154b558. See docs/onboarding/codex-combined-plan.md.

Need: first-time players must read their first tip and understand investigation before selecting a lead; giving only15s while changing UI copy leaves little first-use learning time. Recommend a one-time10s increase rather than slowing all5rounds or adding another required tutorial gate. This is a hypothesis pending genuine novice acceptance.

Exact shared proposal: add TUNING.firstRoundInvestigateMs=25_000 while retaining TUNING.phaseMs.investigate=15_000. Engine enterPhase uses the new field only when phase is investigate AND round is1; all deadlines remain finite numeric server epochs and all early-completion rules stay unchanged. Spec§4.2/4.3 state25s for first investigation,15s later. With the proposed60s intro, nominal maximum total is510s (8m30s) rather than460s. No scoring, truth, reaction, bot strategy or other duration changes.

The user assigns/approves src/shared changes. Claude needs explicit authorization for the engine timing implementation/tests under current AGENTS scope; Codex implements server/net integration/tests only after contract delivery and counterpart acknowledgement. No duplicate timing literal in server/client. No independent server clock, no public ready field, no new command.

Verify first entry receives full25000ms, later investigations15000ms, all-human early completion preserved, correct exact-deadline rejection and delayed-tick budget, engine/server/privacy regressions, matching UI timers/fixtures/probes. Approve or decline together with the combined plan, before either implementation starts.
