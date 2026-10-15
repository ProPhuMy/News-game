# AGENTS.md — News Town

Read this whole file before doing anything. It applies to every AI agent working in this repository. During the visual overhaul, Claude and Codex write the code. Gemini agents have no code ownership (see "Who owns what").

## What we're building

News Town is a multiplayer browser party game. Each player runs a newspaper in a small 3D town and publishes one headline per round, true or a lie. Citizens react and switch papers, and lies can get exposed. The final score is total readers multiplied by trust. AI newspapers fill any empty seats, and no login is required.

- **Design spec (source of truth for gameplay):** `docs/superpowers/specs/2026-10-09-news-town-design.md`
- **Visual overhaul design (source of truth for presentation, ownership, and phases):** `docs/superpowers/specs/2026-10-14-visual-overhaul-design.md`. It is a presentation addendum. It does not change gameplay, scoring, privacy, or engine-owned outcomes.
- **Your plan:** for the overhaul, each coder writes a short implementation plan for its current phase before writing code (overhaul design §13). The older task files `docs/superpowers/plans/2026-10-10-news-town-<role>.md` are history.

If this file, your plan, and a spec disagree, the **spec wins**: the gameplay spec for gameplay, the overhaul design for presentation and ownership. Stop and tell the user about the conflict.

## Who owns what

You may only create, edit, or delete files inside the paths listed for your role. This table is the overhaul ownership (overhaul design §11). It replaces the original Gemini implementation ownership. A more specific row wins over a broader one. Directories marked "new" do not exist yet; the table reserves them.

| Owner | Exclusive write area |
|---|---|
| **Claude** | `docs/visual-overhaul/presentation-interface.md`; the `AGENTS.md` ownership bootstrap (later rule changes go through the user); root config (`package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, lint config, CI workflow); shared screenshot scripts under `scripts/visual/` (new); screenshot browser harness under `src/client/visual-test/` (new) |
| **Claude** | `src/client/ui/`, `src/client/styles/`, `src/client/main.tsx`, `src/client/index.html`, `public/fonts/` (new), `tests/ui/`; CSS diagnosis and all interface and results work |
| **Claude** | `src/client/visuals/` (new): palette definitions and presentation-only interface types used by the UI and the renderer. These are not gameplay contracts. |
| **Claude** | `src/client/town/buildings.ts`; `src/client/town/architecture/` (new) and `src/client/town/props/` (new); `tests/town/buildings.test.ts`, `tests/town/architecture/` (new) and `tests/town/props/` (new) |
| **Claude** | `public/models/buildings/` and `public/models/props/` (new); building notes for the submission and the recorded art-sample decision |
| **Claude** | `src/engine/`, `src/bots/`, `src/sim/`, `src/content/` and their tests, **only** as needed for the bot-publication diagnosis, the shared name-filter policy, approved fixture recording, or agreed presentation fixtures. No unrelated gameplay redesign. |
| **Codex** | `src/client/town/` and `tests/town/`, except Claude's building and prop files above: scene assembly, character assets, materials, lighting, camera, playback, and renderer compatibility |
| **Codex** | `public/models/characters/` (new); `ASSETS.md` as its **only** editor; import validation and renderer review of all asset packs |
| **Codex** | `src/server/`, `src/ai/`, `src/client/net/`, `tests/server/`, `tests/ai/`, `tests/net/`: name-filter enforcement, transport integration, privacy checks, security fixes |
| **Codex** | `Dockerfile`, `render.yaml` and other deployment files, `.env.example`: deployment, production smoke tests, and rollback instructions |
| **Neither by default** | `src/shared/`, shared map topology and coordinates, engine scoring and tuning. These change only through the user-controlled contract-change process (Hard rule 1). |

- **Paths not listed** (for example `public/sounds/`) have no overhaul owner. Ask the user before editing them.
- **Gemini agents:** Gemini 1 may do asset research if the user assigns it, without code ownership. Gemini 3 drafts the submission description for user review. Gemini 2 has no overhaul assignment.
- **Cross-owner changes:** if your fix needs a file the other coder owns, send that owner a precise change request. Do not copy their logic or edit across the boundary. Codex asks Claude for root-config changes, including any screenshot or browser dependency. Claude sends Codex complete license, source, and file entries for `ASSETS.md`.
- **Integration:** Codex is the renderer integration owner. Claude delivers building and prop modules with their assets, and Codex wires them into the scene. If integration shows a defect inside Claude's module, Claude fixes it. An existing test that crosses both areas is updated by its file owner.
- **New files:** every new file and every data-export interface has one owner, recorded in the current phase plan.

Before every commit, run `git diff --name-only main...HEAD` and confirm that every file listed is inside your paths. If you changed something outside your paths, revert it.

## Hard rules

1. **The contract is frozen.** After milestone M0, `src/shared/` changes only through the user. If a type, message, or tuning value seems wrong or missing:
   - Do **not** work around it with local copies of the type or with casts.
   - Write a request in `docs/contract-requests/YYYY-MM-DD-<role>-<topic>.md` covering what you need, why, and the exact proposed change.
   - Tell the user, then continue with other tasks.
2. **Game rules live only in `src/engine/` and `src/bots/`.** The client, renderer, server, AI adapter, and content never decide outcomes: truth, exposure, trust, readers, scores, or citizen choices. The server calls the engine, and the client displays what the server sends.
3. **The engine is pure.** Inside `src/engine/`, `src/bots/`, and `src/shared/`:
   - No `Date.now()`, no `Math.random()`, no network, no file system, no `console` noise.
   - Time comes in as an argument, and randomness comes from the seeded RNG in the match state.
4. **Privacy.** Never send a client the current round's hidden truth, another seat's tip, evidence, or proof, unrevealed headlines, or citizen gullibility. Snapshots must come from `publicView()` and `privateView()` only, never from raw state.
5. **Untrusted text.** Headlines, names, and AI output are user data.
   - Render them as text only: no `innerHTML`, no `dangerouslySetInnerHTML`, no building HTML strings.
   - Never pass them to the AI as instructions; they always go inside a delimited data block.
6. **Secrets.** API keys come only from server environment variables. Never commit keys, never put them in client code, never log them. Keep `.env.example` up to date with placeholder values.
7. **No new dependencies** unless your task file lists them. Every planned dependency is installed at M0. If you need something else, file a contract request. During the overhaul, a dependency named in an approved phase plan (for example the screenshot browser tool) still needs the user's approval before Claude adds it to root config. No unannounced installs.
8. **Assets and sounds must be CC0.** Record each one in `ASSETS.md` with its name, source URL, license, and the files it covers. Don't use anything you can't attribute. Nothing loads from third-party URLs at runtime.
   - **Font exception (user decision):** fonts under the SIL OFL are allowed. Self-host them under `public/fonts/`, commit each font's `OFL.txt` next to its files, and record family, source, license, and local files in a separate "Fonts (SIL OFL)" section of `ASSETS.md`. No font CDN requests. This exception covers fonts only.
   - **Mixed packs (user decision):** Kenney, KayKit, and Quaternius packs may be mixed if the art sample shows they read as one world. Each pack's license and fit must still be verified.
9. **Stay in scope.** Don't add features, settings, or "nice extras" that aren't in your task file. Note ideas in your session summary instead.

## Commands

These scripts are created at M0. If one is missing or broken, stop and tell the user. Don't create your own replacement.

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Run the server and client locally (`AI_PROVIDER=none` by default) |
| `npm test` | Run all tests (Vitest) |
| `npm run test -- <path>` | Run tests for one folder |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | Lint |
| `npm run sim -- --matches 500` | Bot-only simulation and balance report |
| `npm run fixtures` | Re-record sample matches into `src/sim/fixtures/` (Claude only) |

## Working without the other parts

Each part must work on its own before integration. Here's how each role does that:

- **Client UI and town:** develop against the recorded matches in `src/sim/fixtures/`, loaded through the fixture player in `src/client/net/`. Don't hand-edit fixtures. If a fixture is missing a case you need, ask the user.
- **Server (Codex):** use the real engine once it lands. Until then, use the stub engine that Claude ships at M0.
- **AI adapter (Codex):** everything must work with `AI_PROVIDER=none`, which uses fallbacks only.
- **Content:** content files must pass `npm run test -- tests/content-schema`.

## Coding conventions

- **TypeScript:** strict mode. No `any`; use `unknown` and narrow it. No `@ts-ignore`. Use named exports.
- **Validation:** validate external data with the zod schemas in `src/shared/` at every boundary: socket messages, AI output, and content files.
- **File size:** keep files focused and under about 300 lines. If one grows past that, split it by responsibility.
- **Tests first:** for logic, write the failing test, make it pass, then commit. Test file names mirror source names.
- **Commits:** small and frequent, with messages like `engine: resolve town exposure rolls`.
- **Identifiers:** location IDs, claim types, and phase names come from `src/shared/`. Never hard-code them as strings elsewhere.
- **Tuning numbers:** every number from spec §6 lives in `src/shared/tuning.ts`. Never copy those numbers into other files.

## Git workflow

- Before starting a session, pull the latest `main`.
- Work on your own branch: `<role>/<short-task-name>`, for example `codex/socket-rooms`.
- Never merge into `main` and never push to someone else's branch. The user merges.
- **Gemini branches** must be reviewed by Claude or Codex before the user merges them. Your session summary should list exactly what a reviewer should look at.
- **Overhaul branches:** the counterpart (Claude or Codex) reviews cross-agent interfaces and file ownership before dependent work starts. The user reviews palette and art direction.

## Visual overhaul phases

Follow the phase gates in overhaul design §12–§13:

- Each coder has one active phase at a time. A phase starts only after its dependencies have passed their exit gates. Promised or in-progress work does not count.
- Before writing code for a phase, write a short plan for that phase only: actual files, interfaces, dependencies, checks, and expected output.
- **Never cut, skip, or rush scope on your own.** Report blockers, failed checks, and conflicts to the user. Only the user cuts or reorders work. When the user says "cut", remove Could work first, then Should, and record exactly what was removed. Must work is never dropped under a vague instruction.
- Deployment and security phases (D0.5, D3, D4) are protected. Optional polish never displaces them.
- If a check fails, stay in the phase and fix or diagnose it.
- The shared presentation interface lives in `docs/visual-overhaul/presentation-interface.md` (owned by Claude). Both coders acknowledge it before dependent code. Reopen it explicitly if compatibility changes.

## Definition of done (every task)

A task is done only when all of these are true:

1. The "done when" checks in your task file or phase plan pass.
2. `npm test`, `npm run typecheck`, and `npm run lint` all pass. Before merge, `npm run build` also passes.
3. Your diff only touches your paths.
4. You've committed on your branch.
5. For visual changes: you captured screenshots with the shared screenshot command and looked at the PNGs yourself. Empty WebGL captures don't count.

## End every session with a summary

Reply to the user with:

1. The tasks you completed.
2. The commands you ran and their results.
3. Anything unfinished or blocked.
4. Any contract requests you filed.
5. Your open questions.

Never claim something works unless you actually ran the command that shows it.

## Role notes

- **Claude:** you deliver M0. That means the repo skeleton, all of `src/shared/`, the stub engine, the content zod schemas, and the CI setup, finished and committed **before** anyone else starts. After M0 you own the engine, the bots, the simulations, and the fixtures. During the overhaul you also own the UI and the building/prop modules (see "Who owns what").
- **Codex:** never let the AI delay a phase. Every AI call has a 3 s timeout and a fallback. Server-side tests must automatically check the privacy invariants (spec §9.5). During the overhaul you also own the renderer (see "Who owns what").
- **Renderer (Codex; Claude's building and prop modules):** the renderer only plays back the `ReactionPlan`. Citizens walk the `route` node lists they're given; never pathfind or choose behaviors yourself. Keep at most 6 speech bubbles on screen. Support reduced motion and the no-WebGL fallback. Decorations never move logical destinations or block routes.
- **UI (Claude):** read state and send actions only through the store exported by `src/client/net/`. Never open sockets yourself. Every screen needs loading, empty, and error states. Timers display the server deadline; never run your own phase clock.
- **Content (whoever edits `src/content/`):** content is data, not code. No logic in content files. Keep it witty and family-friendly. No real people, brands, or real places. Respect every length limit in the schema: headlines ≤ 100 characters, speech bubbles ≤ 60. Tips must fit **both** the real and the innocent outcome of their event.
