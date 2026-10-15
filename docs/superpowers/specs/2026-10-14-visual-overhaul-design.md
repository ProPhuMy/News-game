# News Town — Visual Overhaul Design

Status: approved visual direction; revised for phase-gated execution and explicit user-controlled scope. Local agents author their own implementation plans.
Execution: Codex and Claude running on the user's machine. This conversation provides design and planning, not product implementation.

## 1. Goal and source of truth

Transform the working game into a readable, expressive Sunday-comics town: vintage-bright colors, toon lighting, dark outlines, working shadows, and citizens whose reactions tell a story. Halftone shadows are optional polish.

Preserve the current repository's gameplay, scoring, network privacy, and engine-owned outcomes. The user reports that gameplay and scoring work; this document does not independently certify them. The current repository spec remains authoritative for gameplay. This is a presentation addendum, not a replacement with the earlier brainstorming rules.

Success is visible in real rendered screenshots and reaction playback, not only passing component tests. The town must remain understandable with thirty citizens and during the darkest lighting state.

## 2. Baseline findings

Repository: https://github.com/ProPhuMy/News-game

In the inspected source, src/client/index.html already links styles/theme.css and styles/globals.css. The styles define tokens, resets, overlay positioning, and pointer handling, but omit most component layout and visual treatment. Verify the actual running build's stylesheet responses before making a fix; adding duplicate imports alone is not the proposed solution.

The renderer currently constructs buildings from primitive boxes and roofs, citizens from primitive bodies/heads/hats, and scenery from ground and roads. The inspected scene setup does not enable shadow mapping. These are source findings, not a browser reproduction or measured performance result.

Local implementers must first pull/read their current source and AGENTS.md. Do not assume the inspected revision is still current.

## 3. Priorities and art direction

Priority controls delivery order and allocation of work. Higher-tier work takes precedence whenever tasks compete for the same person, integration window, or performance budget. Lower-tier work may overlap on an otherwise available worker only when it does not displace higher-tier delivery or required security/deployment phases. The user tracks time. Agents never cut, skip, or rush scope on their own. When the user says "cut," remove work from Could first, then Should, and record the exact scope change. Testing, accessibility, screenshot verification, and deployment readiness apply to every tier. Tier labels are priorities, not permission to silently omit agreed work.

| Tier | Scope |
| --- | --- |
| Must | Styled UI and one results card; verified CC0 chibi citizens and readable paper-colored hats; toon shading and outlines; lighting and working shadows; recognizable buildings and signs; coherent props; tighter camera; bot publication fix; reader labels; server-enforced name filtering; reproducible screenshot capture and viewing; readable subscription-color updates |
| Should | Emotes, picket signs, day progression, short read/react presentation, latest-edition strip |
| Could | Halftone shadows, building occlusion fade, elaborate paper-handoff animation, shared-map redesign |

The individual feature descriptions below inherit these tiers. Protected release verification can proceed before lower-tier polish, but agents cannot remove pending features or declare full scoped completion without the user’s decision. If the user cuts day progression, ship one readable daytime lighting setup. If the user cuts other optional effects, retain existing public-state/reaction feedback and accessible text explanations.

- Setting: stylized old-time newspaper town; consistent illustrative interpretation rather than historical simulation.
- Materials: flat light/shadow bands with bold dark silhouettes. Use thinner or fewer interior outlines on tiny objects to avoid visual clutter.
- Optional halftone: dots mainly inside shadowed regions; keep faces, labels, and interface panels clean. Avoid crawling/shimmering patterns during movement.
- Palette family: cream, brick red, mustard, teal, and soft green. Newspaper identity colors remain the most saturated accents.
- Centralize visual color definitions in one presentation palette module. UI tokens and renderer materials derive from that source; do not duplicate hex values throughout code. Preserve the shared semantic paper-color IDs.
- Render three variants of the same bakery/street/citizen sample with identical camera, lighting, and composition. Toon shading, outlines, and representative shadows must already work in this sample. The user chooses the final palette before expanding the full town.
- If included, day progression runs from round-one morning through afternoon/dusk to final-edition night with glowing lamps. Visual time derives from authoritative round/phase data; it does not introduce a gameplay clock.
- Night retains readable citizen silhouettes, hat colors, street boundaries, and target labels. Avoid a global dark tint that makes interaction harder.

## 4. Town layout: unchanged-map default

Keep the current shared street topology, node coordinates, building anchors, route contract, and logical locations unchanged for the Must tier. Earlier approval to explore a redesign is superseded by this deferred-map strategy. No contract change is authorized by this document alone.

Get a cozy-square feel through fountain-plaza paving, varied lot dressing, trees and props that break repetitive sightlines, and deliberate building frontage. Fill empty-looking areas while reserving clear walking and gathering spaces. The actual walking streets remain aligned with the engine's existing routes; do not draw misleading curves while citizens move straight across lawns.

Shared map data remains the source of building positions, street nodes, and route connectivity. No renderer-only relocation or independent pathfinding.

Only after the Must tier is complete may an implementer propose a shared-map redesign. Obtain explicit fresh user approval and document the precise contract request before editing shared data or dependent engine/renderer code. The approved change must preserve connectivity and access, validate all route consumers, and regenerate fixtures through the existing recorder. Never hand-edit recorded matches.

Camera: retain the fixed elevated MOBA-style angle with tighter framing. All interactive locations and offices must remain reachable/identifiable at supported viewport sizes. Frame scenery to hide the map boundary with trees and fog; do not hide relevant actors or truncate the town to achieve this.

## 5. Buildings and scenery

At the D1 art-sample gate, explicitly decide whether buildings use verified CC0 kit models, code-built geometry, or a combination. The recommended starting option is kit pieces plus custom signature details such as the pretzel sign, clock tower, cross-shaped clinic lamp, and newspaper banners. This is a recommendation to evaluate, not a preselected asset pack.

Record the chosen approach with the palette/art-sample decision before expanding the full town. Include selected kit names and local asset paths where applicable, licensing evidence, scale/orientation, material/palette handling, and which signature details are custom. Claude's building/prop modules and Codex's scene integration must use the same recorded decision and agreed module interfaces. If no suitable kit exists, a documented code-built approach is acceptable; avoid committing to a full kit pipeline before this checkpoint.

Each gameplay target must be recognizable without relying solely on a label:

| Target | Visual identity |
| --- | --- |
| Bakery | Striped awning, pretzel sign, welcoming storefront |
| Bank | Columns, substantial entrance, readable sign |
| Town hall | Distinct clock tower and civic frontage |
| Clinic | Cross-shaped illuminated medical sign |
| Newspaper offices | Printing-press chimneys, entrances, player-color banners |
| Fountain square | Fountain centerpiece and unobstructed crowd space |

Use gas-style lamps, newsstands, benches, varied trees, flower boxes, and a cart or vintage car. Paperboys at corners are decorative and do not imply extra citizens or new game entities. Props must not block prescribed routes or obscure target entrances.

Location signs establish personality; hover and selection labels provide exact identification. Provide an equivalent focus/selection path for users without hover.

If the Could-tier occlusion effect is included, fade a building when it blocks the camera's view of a citizen. This is occlusion presentation only, with no changes to collisions, visibility rules, or server outcomes. Avoid rapid opacity flicker and restore normal materials when the obstruction ends.

## 6. Citizens and animation

Use chibi characters from a verified CC0 pack, with idle, walk, run, and cheer coverage. The pack is not selected yet; the D0 asset-validation phase must establish a real candidate and inspect its actual rig/clips/license before full-town work.

Approved fallback: combine available character clips with simple procedural reading and cheering gestures if the pack lacks complete animation coverage. Do not promise nonexistent clips or use incompatible unlicensed animations. Procedural gestures remain presentation-only and must work with the chosen rig.

Start at twice the current character height; allow adjustment toward three times after checking crowd overlap, entrances, camera occlusion, and emotes. Size is an art-sample decision, not an unconditional multiplier.

- Newspaper-colored flat caps, bowlers, or cloches; grey for unsubscribed citizens.
- Should: read → pause/react → move sequences within the existing reaction phase duration.
- Should: emotes use ! for danger, ? for unusual sightings, an anger mark for protests, $ for offers.
- Should: protesters carry picket signs. Signs and gestures reflect the prescribed behavior, not a new decision made by the renderer.
- Must: immediately display reported subscription changes through a readable hat-color update, with a non-color identity cue. Could: add a brief paper handoff/unfolding. Neither may precede authoritative state.
- Retain the existing maximum of six speech bubbles; cap/cluster extra emotes so crowds do not become a wall of icons.

ReactionPlan is authoritative for actors, routes, behaviors, and allegiance. Decorative pauses and gestures must fit scheduled playback; they cannot lengthen server phases or change destinations. Use a bounded animation timing policy so decorative preludes fit the available reaction interval without delaying authoritative movement. This per-playback timing behavior is not permission to drop the feature from scope; report any incompatibility that cannot meet both requirements. Under reduced motion, communicate state changes with stable icons/text and minimal movement.

## 7. Interface and information hierarchy

Complete missing component styles after checking loading in the actual build. Use newspaper-inspired typography, cream panels, restrained borders, readable spacing, and player-color accents. Preserve text-only rendering of user content.

Keep the town visible during play. Place standings in a compact panel, the timer/phase in a clear top bar, and actionable content in bounded panels. Preserve pass-through pointer behavior outside interactive panels.

If the Should-tier latest-edition strip is included, during reactions it shows the published headline and publisher color. Multiple simultaneous headlines must remain accessible; never imply one selected headline caused every citizen action. Do not invent attribution beyond what public data supplies.

Final results become one centered, bounded results card: winner, score table, and scrollable “truth comes out” history. Secondary records can collapse or appear in tabs. Long names and headlines wrap without pushing controls offscreen. Label current readership as “Readers now” and cumulative readership as “Total readers”; show the existing score formula accurately.

Retain loading, empty, disconnected, and error views. Add clear visible focus and usable contrast. Labels, emotes, and paper identity must not rely exclusively on color. Respect reduced motion and retain the no-WebGL fallback.

## 8. Assets, rendering, and performance

Models, textures, animations, and sounds remain verified CC0-only. Commit models under public/models/ and sounds under public/sounds/; append attribution entries to ASSETS.md with pack name, source URL, license evidence, and covered files. Nothing loads from third-party URLs at runtime. Custom procedural geometry may supplement imported models.

User decision: fonts under SIL OFL are approved as a narrow exception. Self-host them under public/fonts/, commit each font's OFL.txt beside its files, and record the family, source, license, and local files in a separate "Fonts (SIL OFL)" section of ASSETS.md. Claude owns public/fonts/ and font integration; Codex remains the sole ASSETS.md editor and records entries supplied by Claude. No external font CDN requests or broader non-CC0 asset exception is implied.

User decision: mixing Kenney, KayKit, and Quaternius packs is approved if the D1 art sample demonstrates that they read as one world under the toon materials. Compare representative assets side by side at the same scale/lighting; obtain the user's visual approval before full-town expansion. Approval to mix does not establish the license or suitability of every pack. Preserve useful atlas/texture details when adapting materials rather than blindly replacing all textures with flat colors.

Use docs/asset-shortlist.md as the starting point for D0. Its candidate listings are not asset approval or proof of downloaded-file contents. If that file has not been copied into the checkout, obtain it from the user/cloud research handoff before completing D0; do not silently reconstruct an unverified inventory.

Implementers must validate toon lighting, outlines, working shadows, and animated characters together in the D1 art sample before its exit gate passes. Halftone can be explored afterward only if it does not displace higher-tier or protected release work; it is not a prerequisite for choosing the palette. Choose the rendering technique after checking existing Three.js capabilities and dependencies. Any additional dependency or screenshot tool requires the appropriate repository configuration approval, not an unannounced install.

Avoid expensive whole-scene effects where material-local techniques suffice. Reuse geometry/materials where appropriate; dispose mixers, effects, and GPU resources on teardown. Keep decorative density subordinate to the crowd animation budget.

Proposed measurable acceptance target for review: aim for 60 FPS and sustain at least 30 FPS during the busiest thirty-citizen reaction on an identified reference laptop at 1280×720. Record the actual device, browser, rendering settings, and measurements. The reference laptop is chosen during execution; no performance result is claimed now. Quality optimizations must retain agreed effects, art direction, and information hierarchy. If meeting performance requires removing an effect or reducing agreed scope, report the tradeoff for a user decision rather than cutting it autonomously.

## 9. Screenshot and review loop

The renderer owner owns town screenshot scenarios, runs captures after every visual step, and must inspect the resulting PNGs directly. The UI owner captures and inspects UI changes with the same tool. Claude owns the shared screenshot command and package/config integration; Codex consumes it for town work. Keep one implementation rather than separate screenshot stacks.

During C0, demonstrate that the local agents can both capture a nonempty scene and view its PNG. This is a prerequisite to starting the art sample; report a blocked capture/viewing environment immediately rather than proceeding without feedback.

The final CLI and approved browser dependency belong in the implementation plan. The command loads deterministic fixture state, sets viewport, palette, round/phase, and reaction timestamp, then waits for assets and an explicit scene-ready state before capture.

Capture baseline and after shots at matching viewpoints. Review:

1. Actual UI styles and final results layout.
2. Bakery, street, several citizens, toon shading/outlines/shadows, and three palette variants.
3. Full town with unchanged shared map and tighter framing.
4. Busy reaction and authoritative subscription-color changes.
5. Reduced motion, no-WebGL fallback, and any included optional effects: protest signs/emotes, latest edition, dusk/night, occlusion, handoff, halftone.

Capture each implemented feature; explicitly report pending features and user-approved cuts rather than treating missing screenshots as implicit scope removal. Use identical inputs for comparisons. Do not rely on arbitrary long sleeps or accept empty WebGL captures as successful screenshots. Screenshot automation is execution work on the user's machine, not an artifact already created here.

## 10. Related fixes as separate work items

These do not change the visual renderer's authority:

- Morning Ledger skipped rounds: reproduce with a fixed seed, trace bot scheduling → generation/fallback → validation → accepted publication → reveal. Repair the failing boundary and add a regression showing every eligible bot publishes once per normal round, with AI disabled and generation failure covered. Investigate the cause before assuming missing fallback text.
- Standings labels: distinguish current and accumulated readers without recomputing engine scores in the client.
- Name filtering: apply the same existing headline word-filter policy to player and newspaper names at authoritative room-creation/join boundaries. Preserve legitimate names and length validation. The error must explain rejection in the UI. Do not create a divergent client-only filter or silently alter names.

## 11. Execution ownership and protected release work

Cloud Claude and cloud Codex provide research, design, acceptance criteria, and review. Local Claude and local Codex write their own phase-level implementation plans against the actual checkout, then implement and test them. This design specifies responsibilities and handoffs; it intentionally does not prescribe every function body or test implementation.

### Ownership activation

The user requests the following replacement for the original Gemini implementation ownership. Before feature implementation, local Claude performs a documentation-only bootstrap: update AGENTS.md with this ownership table, retain all unrelated safety/gameplay rules, and point both agents to this design. The user reviews/merges that bootstrap; local Codex reads the same revision before proceeding. Updating these instructions is an explicitly assigned bootstrap responsibility, not permission to rewrite gameplay policy. Until the bootstrap lands, neither coder edits paths forbidden by the current repository instructions.

### Single-writer file boundaries

Paths below are relative to the News-game repository. A more specific row takes precedence over a broader one. New directories are proposed ownership boundaries, not files already present.

| Owner | Exclusive write area for this overhaul |
| --- | --- |
| Claude | docs/visual-overhaul/presentation-interface.md; AGENTS.md bootstrap; root package/lock/TypeScript/Vite/Vitest/lint/CI configuration; shared screenshot scripts under scripts/visual/; screenshot browser harness under src/client/visual-test/ |
| Claude | src/client/ui/, src/client/styles/, src/client/main.tsx, src/client/index.html, public/fonts/, tests/ui/; CSS diagnosis and all interface/results work |
| Claude | New src/client/visuals/ palette definitions and presentation-only interface types, consumed by UI and renderer; these are not gameplay contracts |
| Claude | src/client/town/buildings.ts; new src/client/town/architecture/ and src/client/town/props/; tests/town/buildings.test.ts and new tests/town/architecture/ and tests/town/props/ |
| Claude | public/models/buildings/ and public/models/props/; new submission-building notes and the recorded art-sample decision |
| Claude | Existing src/engine/, src/bots/, src/sim/, src/content/ and their tests only as needed for bot-publication diagnosis, common filter policy, approved fixture recording, or agreed presentation fixtures; no unrelated gameplay redesign |
| Codex | src/client/town/ and tests/town/ except Claude's specific building/prop files and subtrees; scene assembly, character assets, materials, lighting, camera, playback, and renderer compatibility updates |
| Codex | public/models/characters/; ASSETS.md as the sole attribution editor; import validation and renderer review of all packs |
| Codex | src/server/, src/ai/, src/client/net/, tests/server/, tests/ai/, tests/net/; name enforcement, existing transport integration, privacy verification, security fixes |
| Codex | Dockerfile, render.yaml and other deployment files, .env.example; deployment, production smoke tests and rollback instructions |
| Neither by default | src/shared/, shared map topology/coordinates, engine scoring/tuning; retain the existing user-controlled contract-change process |

Claude owns root configuration including any added screenshot/browser dependency; Codex requests those edits instead of changing the same files. Claude uses the existing filter policy and exposes any needed content-side export; Codex owns its enforcement in server create/join handlers. If a privacy/reliability fix requires the other owner's area, send a precise change request rather than copying logic or editing across the boundary.

Codex is the renderer integration owner. Claude delivers building/prop modules and their assets; Codex wires them into the scene and playback. If integration reveals an issue inside Claude's module, Claude fixes that module. Cross-cutting existing tests are updated by their file owner, using examples or findings provided by the other coder.

Codex maintains ASSETS.md; Claude supplies complete license/source/file entries with building/prop deliveries. No simultaneous append edits. One owner per new file and per data-export interface must be recorded in local plans.

Cloud research supplies candidate URLs, explicit license evidence, and inventories with confidence levels; local import/rig/animation checks determine actual suitability. Gemini 1 can supply bounded asset research if the user assigns it, without becoming a dependency for delivery or gaining automatic code ownership. Gemini 3 drafts the submission description; the user reviews it. Codex captures the cover and verifies the production URL; the user approves the final title/materials and submits.

### Handoff decisions before parallel implementation

During C0, local Claude writes and local Codex reviews docs/visual-overhaul/presentation-interface.md. Claude owns the note. It covers:

- Palette access shared by CSS and 3D, semantic newspaper colors, and who applies materials to imported meshes.
- Building/prop factory inputs and outputs, asynchronous asset readiness/failure, world units, orientation, ground/entrance anchors, and disposal responsibility.
- A single representation for building anchors consistent with the existing shared map; decorative changes cannot move logical destinations.
- Screenshot CLI inputs, deterministic fixture/time selection, renderer-ready signaling, and how each agent views the resulting PNG.

Choose exact TypeScript names/signatures in that note using the current source. Both agents acknowledge it before dependent code. This is a presentation interface, not authority to modify src/shared/. At the D1 sample gate, append the chosen building source (kit, code, hybrid), asset paths, and palette before full-town expansion. Reopen the note explicitly if compatibility changes; do not make silent assumptions on either branch.

Codex's deployment/security phases are protected and cannot be displaced by optional renderer polish. D0.5 validates staging before D1/D2 expansion; D3–D4 validate security and production readiness after Must integration. Any reassignment needs an explicit ownership change; it does not authorize skipping acceptance gates.

Pre-launch security review in D3 covers anonymous seat/reconnect authorization, command validation, private-state leakage, untrusted text/AI boundaries, name filtering, request/room resource limits, server-side secret handling, and production configuration. Record findings, regression checks, and disposition. Launch-blocking findings must be fixed and rechecked before production readiness. Report any conflict with optional work to the user; never defer security to accommodate it.

D4 deploys the release candidate and runs the production multiplayer smoke test: load production HTML/CSS/models/sounds/fonts, create and join from separate browser sessions without accounts, complete a match with AI disabled, confirm result rendering, and test reconnect. Verify configured AI failure fallback separately where applicable. Record the deployed commit, URL, results, and rollback procedure. Avoid logging secrets or private match data.

Submission assets have explicit owners. Codex, as renderer owner, captures the cover image from a busy reaction shot of the actual finished game using the approved palette and rendering style. Choose a composition that remains legible at cover size and accurately represents shipped visuals. Gemini 3 drafts the project description; the user reviews it before submission. Prepare both at the final-acceptance gate, leaving submission contingent on user review. If Gemini 3 is unavailable, report the gap for explicit reassignment rather than silently omitting the description. The user owns final title approval and submission; Codex supplies the verified production URL.

## 12. Phase-gated execution and user-controlled scope

There are no calendar deadlines or date-based milestones in this design. The user tracks time. A phase starts only when its listed dependencies have passed their exit gates and ends only when its required evidence is supplied. An earlier phase's work-in-progress or a promised delivery does not satisfy a dependency. Independent agents may work concurrently when both sets of dependencies have passed.

Agents never cut, skip, or rush scope on their own. Report blockers, failed checks, workload conflicts, or proposed changes to the user. When the user instructs a cut, remove Could work first, then Should; record the selected removals and update the local plan. Must requirements cannot be dropped under an ambiguous instruction to cut optional work. Deployment/security phases remain protected from optional polish regardless of tier overlap.

Before completion, run repository-required tests, typecheck, lint, and build; report actual results. Review screenshots in addition to tests. Preserve gameplay/scoring outputs in visual-only fixtures except separately reviewed reliability fixes. A future approved map redesign requires its own compatibility checks.

No gameplay redesign, new economy, new headline mechanics, or replacement scoring system is included. Final palette, concrete CC0 packs, building approach, and performance reference hardware are staged outputs, not assumed completed decisions. Shared-map redesign is deferred and requires fresh approval after Must completion.

## 13. Agent phases and completion gates

Each local coder has one active implementation phase at a time. Finish its acceptance checks and fix defects before marking it complete. A paired review or user art choice is a dependency, not permission to guess the missing result. When blocked, report the missing handoff; work on a different phase only through an explicit user-approved phase-order adjustment, preserving required dependencies. Separate agents may progress concurrently inside their own ownership boundaries.

Local agents write a short implementation plan for their current phase before code: actual files, interfaces, needed dependencies, meaningful checks, and expected output. The counterpart reviews cross-agent interfaces and file ownership before dependent implementation. Do not spend time detailing later phases whose asset or palette decisions are not settled. This cloud conversation does not author those implementation plans.

### Local Claude phases

| Phase | Deliverable and exit gate | Dependencies whose exit gates must pass before start |
| --- | --- | --- |
| C0 — Foundation | Documentation-only ownership bootstrap; CSS runtime diagnosis; shared capture command/harness; nonempty PNG captured and viewed by both agents; acknowledged docs/visual-overhaul/presentation-interface.md | User-supplied approved design; bootstrap reviewed/merged before product edits. C0 does not depend on D0: capture uses the current working renderer, and Codex participates in the tooling proof without starting dependent feature work |
| C1 — UI baseline | Styled gameplay panels, loading/error states, reader-label clarification, centered results card with usable scroll/wrapping; inspected desktop/small-viewport screenshots and UI checks | C0 |
| C1.5 — Bot reliability and filter interface | Reproduce Morning Ledger skipped publications; fix the failing boundary with AI-disabled/failure regressions; document/export the existing name-filter policy interface and accepted/rejected examples so Codex can enforce the same policy | C1 |
| C2 — Architecture sample delivery | Sample bakery and representative props using the accepted interface; evaluate viable kit/code/hybrid construction options; license/material/scale checks; inspected sample screenshots; deliver compatible sample modules and recommendations to Codex | C1.5. Does not depend on D1. D1 integrates these delivered modules and owns the joint final palette/building decision |
| C3 — Complete architecture | All required recognizable buildings/props in the unchanged map footprint; checked anchors, no route obstruction; inspected screenshots and module checks | C2 and D1, including user palette/building-source approval |
| C4 — Integration support | Fix building/UI integration defects; assist cross-owner security fixes; review production-check evidence; optional UI work cannot block mandatory support | C3 and D2. Run alongside D3–D4; neither phase waits for all of C4 before starting, but each blocks its own exit on required C4 fixes |
| C5 — Final review | Whole-match UI/architecture screenshots reviewed; required checks pass; Gemini 3 description presented for user review; required integration fixes closed | C4 and D4 |

### Local Codex phases

| Phase | Deliverable and exit gate | Dependencies whose exit gates must pass before start |
| --- | --- | --- |
| D0 — Runtime and asset validation | Read current renderer and docs/asset-shortlist.md; download/inspect candidates, actual licenses, character clips/rig/head attachment and material constraints; record candidate suitability/blockers; capture and directly view baseline PNG with C0 tooling | C0 |
| D0.5 — Early staging deploy | Deploy the current working build to staging before visual expansion. Prove production build/start behavior, asset loading and WebSocket connection; create/join from separate sessions, advance gameplay and reconnect. Record staging URL, deployed commit, configuration requirements and smoke-test evidence; fix hosting/build/WebSocket blockers before exit | D0. This is Codex's immediate next phase, before D1 and D2; staging is not a substitute for D3 security review or D4 release-candidate verification |
| D1 — Rendering sample and joint art decision | Integrate delivered bakery/street props and animated citizens; prove clip/fallback coverage, hats, toon shading, outlines and shadows; inspect three palette PNGs and representative mixed-pack assets. User chooses palette and building approach; record choices in the presentation-interface note via Claude | D0.5 and C2 |
| D2 — Must-tier renderer and server validation | Complete town assembly, thirty citizens, authoritative reaction playback/hat changes, readable camera/lighting, reduced motion/fallback; server name filtering tested against C1.5 policy interface at create/join boundaries | D1, C3 and C1.5. Finish town acceptance, then the server validation substep |
| D3 — Security and release candidate | Protected pre-launch review, findings fixed/retested, production configuration checked; integrated Must build ready for release-candidate deployment | D2. Optional renderer requests cannot displace this phase |
| D4 — Production verification | Release candidate deployed; separate-session multiplayer, asset loading, complete match, reconnect, AI-disabled/failure fallback checks and rollback record verified | D3; required Claude integration fixes must close before exit |
| D5 — Final acceptance and cover | Regression/performance checks and matching screenshots; launch blockers resolved; busy-reaction cover captured from approved shipped visuals; user-reviewed description/materials ready | D4 and C5 |

The graph has no sample-phase cycle: C2 produces the building sample without waiting for D1; D1 consumes it and obtains the joint art decision; C3 then expands the architecture; D2 integrates the completed Must town. D0.5 runs immediately after D0 while Claude may independently progress through C1/C1.5/C2 when their gates permit.

C0 uses the current renderer for both agents' PNG-viewing proof, so it does not require D0 asset validation. C4 integration support is concurrent with D3–D4 and blocks their exit only for identified defects, not their start. D5 waits for both production verification and Claude's final review.

Should/Could work remains agreed scoped work subject to user-controlled cuts. It may proceed only when its dependencies pass and it cannot displace higher-tier or protected release phases. Agents must not silently omit it or declare the entire overhaul complete with agreed work pending. If an optional enhancement would interfere with D3–D4, pause that enhancement, preserve the release sequence, and ask the user to sequence, reassign, or cut it. Shared-map redesign remains separately gated by fresh user approval.

### Every phase ends with evidence

1. One reviewable commit or coherent branch delivery containing only owned files; user controls merges and agents consume the agreed merged base.
2. Actual check commands and results relevant to the phase, plus repository-required tests/typecheck/lint/build before merge; no success claims from unrun checks.
3. Viewed screenshots for visual changes, including comparison inputs and known limitations. Logic fixes need reproductions/regressions, not invented visual tests.
4. Counterpart review focused on handoff compatibility; user review for palette/art direction. Review is evidence, not a guarantee of defect-free work.
5. A brief handoff: completed scope, commit/base, asset/interface decisions, blockers, and exactly what the next phase can consume.

If a check fails, stay in the phase and fix or diagnose it. Report its impact to the user instead of skipping the gate or changing scope. Only the user decides whether to cut or reorder work. The aim is a small working delivery at each phase, not one large unverified overhaul.

## 14. Planning handoff

The approved design defines responsibilities and phase gates. Local Claude and local Codex author and review their own implementation plans from this design and the actual repository. Cloud agents remain researchers/design reviewers. No new approval of already-agreed visual direction is needed merely to write those local plans. Product implementation follows the ownership bootstrap and reviewed current-phase plan.

Local Claude owns docs/visual-overhaul/presentation-interface.md and records both agents' acknowledgment. Codex D0 begins from docs/asset-shortlist.md; its research claims remain subject to local download/import/license verification. The user has approved self-hosted SIL OFL fonts with colocated OFL.txt and separate ASSETS.md documentation, and conditional mixing of Kenney/KayKit/Quaternius assets demonstrated in the art sample.

No product files, GitHub branches, repository AGENTS.md, presentation-interface note, asset-shortlist file, or local-agent implementation plans were created or changed by this design revision. The named handoff documents must be placed in the actual checkout by their assigned owners/user handoff.

## Revision summary

- Removed calendar dates, deadline milestones and autonomous time-based scope cuts; execution uses dependency exit gates and evidence only.
- Retained phase order and tier priorities, with user-controlled cuts from Could before Should and protected security/deployment work.
- Recorded the SIL OFL font exception and conditional mixed-pack approval; D0 starts from docs/asset-shortlist.md.
- Added D0.5 staging deployment immediately after D0, before visual expansion.
- Moved bot repair and the name-filter policy interface to C1.5 after UI baseline, before Codex enforcement.
- Assigned docs/visual-overhaul/presentation-interface.md to Claude and removed circular sample-phase dependencies.
