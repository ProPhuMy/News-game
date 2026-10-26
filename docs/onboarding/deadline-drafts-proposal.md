# Latest saved draft → deadline submission

Owner: Codex proposal/server/net/AI; Claude UI and authorized engine changes. Base main0f37c0c. Status: design for user/counterpart approval, no product implementation.

User requested deadline submission and server-preserved edits. User chose preserving drafts through a writing-phase disconnect, and clarified: "just let the AI interpret whatever headline is present, don't send anything when the headline is empty." Therefore this proposal interprets complete NONEMPTY saved drafts before the deadline, NOT only after locking. Shared-contract edits and engine implementation still need assignment/approval.

## Current behavior and approach

WriteScreen keeps selections/text in component state. Only lockHeadline sends a complete story; the server has no drafts. applyCommand rejects manual publication at/after cutoff; tick reveals already-locked headlines and applies deterministic fallback ratings when needed. Empty/unlocked human work publishes nothing. AI starts after lock today; neither draft interpretation nor draft status exists.

Use bounded private server autosave, revision-bound interpretation and atomic engine-owned deadline finalization. Browser-only timeout submission fails in disconnected/background tabs; saving only on blur/Lock loses work. No new persistence infrastructure or independent client deadline is needed. Drafts survive reconnect in the same live match, not server restart/room deletion. Truth/reactions/scoring remain engine-owned; AI never chooses the target/claim or generates new human text.

## Draft saving and identity

Scope draft identity to room generation, round and seat. Keep the latest raw payload only, no edit history. Payload is `{text, selection}`: text allows empty/incomplete/invalid content within the existing1000-character transport bound; selection is claim(location nullable, TownClaim nullable, attachEvidence boolean) or expose(headlineId nullable). Publication still requires existing normalized1–100-character text and the current filter/story/evidence/proof rules. Attach refers to the unique existing same-round/location/claim card; never trust a browser card ID or silently infer a true claim.

New saveDraft command includes actionId/round/phase, baseRevision and payload. Server increments revision only when baseRevision equals its current value (initial0). Existing idempotent actionId retries and revision compare-and-set prevent old/reordered writes overwriting newer work. Malformed/unbounded data is rejected without replacing state. Well-formed but incomplete/filtered/invalid data DOES replace earlier valid work and is privately marked needs_correction. Clearing text removes earlier AI eligibility and timeout eligibility; never revert to an old valid draft.

Client coalesces all editable fields into at most one autosave per1000ms, one request in flight. A manual Lock freezes editing at the clicked latest payload, flushes it, waits for acknowledgement, then locks that exact revision. Error re-enables editing without locking a substitute. Retry reuses actionId; unrelated pending saves must not freeze the whole editor. Verify normal five-round typing stays within the current120packets/minute and256receipt limits; do not raise/remove those safeguards silently. At approximately46saves/round including a final flush there is room for normal actions, but tests must prove actual bounds. If needed, propose a separate bounded latest-save receipt path instead of unbounded histories.

Only a current server acknowledgement/snapshot can mark current local work Saved. Queued/unacknowledged edits stay Unsaved/Saving. Server can publish only the latest revision received BEFORE cutoff: offline or in-flight unseen edits cannot be guaranteed. State that limit visibly and show actual submitted text after reconnect/reveal. No older acknowledgement may mark newer local text saved.

## Private delivery sequence — resolves reviewer finding

Draft state is server-owned transport/session data, not an engine outcome. Reusing engine version alone would lose draft-only updates: store.ts currently rejects private version <= previous and pairs public/private by version.

Add owner-only `draftStateVersion` (nonnegative safe integer) to PrivateSnapshot, alongside draft/submission metadata. Increment it for every draft/status update within the current round. Publish through an approved privateView(state, seatId, ownDraftContext?) projection; no raw-state broadcast. Engine/public snapshot version remains unchanged for a draft-only update.

Client accepts a private update with an equal engine version ONLY when draftStateVersion increased; lower engine versions stay stale. For a higher engine version, normal coherent pairing still applies; carry the current draftStateVersion into the fresh private projection. Reset private sequence only with a newer-round/engine version or cleared room/session. Preserve ownership checks and accept no other seat's data. This uses existing private delivery rather than a new public event or made-up engine version. Tests cover both arrival orders, same-version AI-status updates, stale private status, reconnect and cross-room reset.

## Interpretation of the latest nonempty draft

Validate publication shape and filter first using the same pure engine validator and server filter used for manual Lock. Empty/whitespace-only text makes ZERO provider calls; no stale pending timer/result survives a clear. Missing target/claim/proof or invalid text shows needs_correction and cannot be interpreted meaningfully by the existing contextual API. Once a complete valid nonempty revision is saved, interpret its actual text and explicitly selected story; the model must not guess a target or claim on the player's behalf.

Schedule once after1000ms without a newer accepted revision; coalesce rather than send on every keystroke. Only one interpretation job per seat in flight. Superseding work cancels any not-yet-started timer and invalidates the current job immediately; best-effort abort of an active request must not release its durable concurrency permit early. After it settles, schedule only the current eligible revision. No retries or queue of old revisions. Every attempt uses the existing persistent30000-total gate, concurrency4,3s timeout and512-token cap. Additional draft interpretation consumes existing allowance/quota faster; it authorizes neither an increase nor payment. Provider none/disabled/failure/limited are explicit fallback states, not silent success.

Freeze the job key to room generation/round/seat/revision and full normalized model inputs (text, target/claim and expose context). Evidence changes increment revision even when model inputs cache-hit. Accept completion only for the exact current revision AND inputs, still in a live Write phase AND received by authoritative server time strictly before its deadline. A reply arriving after cutoff but before a delayed scheduler tick is still late. Record interpretation completion time so deadline finalization cannot consume a post-cutoff rating. Do not compare only text, headline ID or global snapshot version; a late result for an earlier revision cannot overwrite the new status/rating. Current full-input adapter cache remains usable, but a cached older input is never treated as the latest input's interpretation. No raw text, keys, packet content or arbitrary provider errors in logs.

Per-job provenance requires an explicit seam: AiAdapter.rateHeadline currently returns only Rating and global onOutcome has no request ID. Proposed additive optional second argument is a trusted call observer `{onOutcome?: (outcome: AiOutcome) => void}`, with the fixed shared outcome union success/cache/disabled/failure/limited. Preserve the existing first argument, return type and old callers; never include observer/job identifiers in model DATA or cache keys. Actual adapter emits a per-call outcome once, independently of global numeric logging. Server uses the observer for the exact job, not comparison of returned rating values. This shared type/method addition needs user-controlled delivery. Test callback exceptions and missing metadata without inventing provider success.

Engine preflight supplies normalized validated story/text and its own deterministic fallbackRating via an approved pure interface, without locking, consuming RNG state or revealing hidden truth. AI's onTopic/inappropriate fields retain existing engine semantics, not newly invented hard rejection rules. UI may show the returned interpretation and warnings; structural/filter invalidity and AI semantic feedback remain distinct.

## Manual lock and deadline finalization

New lockDraft identifies expectedRevision, without a separate mutable story/text. Server rejects conflicts rather than publishing another revision. Keep legacy lockHeadline compatibility, but use one server filter and one engine validator for both manual paths, preflight and timeout. Do not make timeout validation more permissive.

At the first authoritative tick/command at or after cutoff, freeze latest accepted eligible drafts. Engine finalizes all candidates atomically BEFORE reveal using normal publication validation and the matching revision's completed rating, if present. If its interpretation is pending/disabled/failed/limited, use the existing engine fallback for THAT exact draft. Never wait past the deadline or substitute an older interpretation. Pending jobs become terminal fallback at reveal; late completions cannot rewrite the revealed outcome. An early manual lock may retain its same-revision pending job while Write remains active; it does not launch a duplicate request, and late jobs stop applying on reveal. New edits are rejected after lock.

Manual Lock before cutoff wins; deadline skips acted seats. Deadline first wins; a late/retried manual request observes locked/stale state and cannot duplicate or overwrite. Exactly-at-cutoff new edits/locks are too late, even before scheduler tick. A normal early phase transition cannot run between individual deadline candidates. No forged deadline-1 command timestamps, phase extension or separate browser submission clock.

Skip Writing cancels draft auto-publication. Empty/incomplete/filtered/mismatched-evidence/missing-proof/otherwise invalid latest work publishes NOTHING, matching existing human fallback. Never publish an older valid draft or fabricate a template human headline. A valid headline with missing AI receives fallback RATING instead; that is a different fallback rule. Keep proof/evidence checks engine-owned and repeat at commit.

## Disconnect and reconnect

User chose preserving writing work. Unacted human-origin seats are not replaced by Caretaker during Write. Keep their drafts eligible until cutoff. Early Write completion must wait for ALL human-origin seats to act/skip, including disconnected ones, or the deadline; otherwise a disconnect could advance past the saved draft. Bots retain instant actions; Intro/Investigate Caretaker/early-completion and existing no-humans cleanup stay unchanged. A disconnected unacted writer can hold this phase until its normal45s cutoff.

Token-authorized reconnect restores current draft/revision/selections/validation/interpretation status. Hydrate once and reconcile queued edits against server revision; don't clobber local typing on unrelated snapshots or blindly overwrite a newer server revision. If publication already occurred, show the immutable submitted result. Expired/other-round drafts cannot auto-submit. Match restart remains an unrecoverable match end, not durable draft storage. Clear per-seat timers/jobs/drafts on round change, room deletion and runner disposal.

## Claude UI coordination

Use store-controlled drafts; wire text, location/claim, evidence checkbox, expose selection and cancellation into the same save path. Preserve current tip/report and matching evidence filtering. Exact copy/prop types are Claude-owned and reviewed before dependent code.

Show Unsaved/Saving for unacknowledged changes; Saved for server acceptance; Saved · validating for the current revision's pending AI job; Needs correction for publication-validation errors; and an explicit fallback indication when no AI interpretation is available. Don't call structural validation an AI approval. Stale callbacks cannot alter the displayed latest status. Lock freezes/flushes and submits exact revision; Skip cancels. Keep keyboard/phone/help/no-WebGL usable, retain focus and inputs, and avoid per-keystroke live-region announcements. Confirm the result displayed after timeout is the exact payload actually published, even if some last local edits never arrived.

## Ownership and approval gates

User assigns frozen shared schemas/errors/private projection and AI call-observer interface. Propose Claude handles that delivery plus explicitly authorized engine validator/deadline/disconnect work and UI; Codex handles server draft lifecycle/socket/net store/adapter observer integration/tests. No new dependency/root-config changes. Both coders acknowledge concrete shared delivery and write scoped implementation plans before coding. No contract copies, casts or server-owned gameplay decisions.

Tests first: valid latest draft/evidence/expose at cutoff; empty/no-AI and invalid latest replacing older valid; edited text/target/evidence revision supersedes pending interpretation; same-version private updates; delayed old/cleared/round-changed/deleted-room AI discarded; pending latest fallback at reveal; exact-cutoff and manual-vs-timeout race publishes once; retry/CAS/ack order; disconnected drafts prevent early reveal and restore on reconnect; cutoff during reconnect; full-match save-rate/receipt limits; current AI budget/timeouts/provider-none/fallback provenance; public/other-seat privacy; desktop/phone actual edit→save→interpret→timeout and manual/reconnect flows, captures viewed; full tests/typecheck/lint/build and counterpart review.

Stop after those conditions. No bot features, unlimited calls, extra persistence/settings, deadline extension or production deployment. Genuine human comprehension remains separate.

## Investigation evidence

Existing npm run test -- tests/server/ratings.test.ts tests/server/matches.test.ts tests/net/store.test.ts:3files/34tests passed against unchanged main0f37c0c. No claim that drafts work yet. Fresh builder review identified private-version delivery, all-timeout fallback under the rejected post-lock-only alternative and per-call AI provenance; the above design resolves all three. Full suites not repeated for these design documents; no actual provider request or runtime change.

Fresh builder check completed after the user's AI clarification: no remaining design blockers or new product decisions. It specifically confirmed the separate private sequence, pre-cutoff nonempty interpretation and correlated outcome seam. Implementation must reuse the exact revision's existing AI job/result on manual Lock (no duplicate request), and lower-engine-version private packets stay stale regardless of their private sequence. Design/shared-engine assignment approval remains pending; no implementation plan or product code has started.
