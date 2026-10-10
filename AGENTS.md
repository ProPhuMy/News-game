# AGENTS.md — News Town

Read this whole file before doing anything. It applies to every AI agent working in this repository: Claude, Codex, Gemini 1, Gemini 2, and Gemini 3.

## What we're building

News Town is a multiplayer browser party game. Each player runs a newspaper in a small 3D town and publishes one headline per round, true or a lie. Citizens react and switch papers, and lies can get exposed. The final score is total readers multiplied by trust. AI newspapers fill any empty seats, and no login is required.

- **Design spec (source of truth):** `docs/superpowers/specs/2026-10-09-news-town-design.md`
- **Your task file:** `docs/superpowers/plans/2026-10-10-news-town-<role>.md`. The user tells you which one is yours.

If this file, your task file, and the spec disagree, the **spec wins**. Stop and tell the user about the conflict.

## Who owns what

You may only create, edit, or delete files inside the paths listed for your role.

| Role | Owns | Never touches |
|---|---|---|
| **Claude** | `src/shared/` (the contract), `src/engine/`, `src/bots/`, `src/sim/`, `tests/engine/`, `tests/bots/`, `tests/content-schema/`, root config (`package.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, lint config, CI workflow) | Server, client, AI adapter, content |
| **Codex** | `src/server/`, `src/ai/`, `src/client/net/`, `tests/server/`, `tests/ai/`, `tests/net/`, deployment files (`Dockerfile`, host config, `.env.example`) | Engine rules, UI, town, content |
| **Gemini 1** | `src/client/town/`, `public/models/`, `tests/town/`, `ASSETS.md` (append-only) | Everything else |
| **Gemini 2** | `src/client/ui/`, `src/client/main.tsx`, `src/client/index.html`, `src/client/styles/`, `tests/ui/` | Everything else |
| **Gemini 3** | `src/content/`, `public/sounds/`, `ASSETS.md` (append-only) | Everything else |

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
7. **No new dependencies** unless your task file lists them. Every planned dependency is installed at M0. If you need something else, file a contract request.
8. **Assets and sounds must be CC0.** Record each one in `ASSETS.md` with its name, source URL, license, and the files it covers. Don't use anything you can't attribute.
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

- **Client UI and town (Gemini 1 and 2):** develop against the recorded matches in `src/sim/fixtures/`, loaded through the fixture player in `src/client/net/`. Don't hand-edit fixtures. If a fixture is missing a case you need, ask the user.
- **Server (Codex):** use the real engine once it lands. Until then, use the stub engine that Claude ships at M0.
- **AI adapter (Codex):** everything must work with `AI_PROVIDER=none`, which uses fallbacks only.
- **Content (Gemini 3):** your files must pass `npm run test -- tests/content-schema`.

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

## Definition of done (every task)

A task is done only when all of these are true:

1. The "done when" checks in your task file pass.
2. `npm test`, `npm run typecheck`, and `npm run lint` all pass.
3. Your diff only touches your paths.
4. You've committed on your branch.

## End every session with a summary

Reply to the user with:

1. The tasks you completed.
2. The commands you ran and their results.
3. Anything unfinished or blocked.
4. Any contract requests you filed.
5. Your open questions.

Never claim something works unless you actually ran the command that shows it.

## Role notes

- **Claude:** you deliver M0. That means the repo skeleton, all of `src/shared/`, the stub engine, the content zod schemas, and the CI setup, finished and committed **before** anyone else starts. After M0 you own the engine, the bots, the simulations, and the fixtures.
- **Codex:** never let the AI delay a phase. Every AI call has a 3 s timeout and a fallback. Server-side tests must automatically check the privacy invariants (spec §9.5).
- **Gemini 1:** the renderer only plays back the `ReactionPlan`. Citizens walk the `route` node lists they're given; never pathfind or choose behaviors yourself. Keep at most 6 speech bubbles on screen. Support reduced motion and the no-WebGL fallback.
- **Gemini 2:** read state and send actions only through the store exported by `src/client/net/`. Never open sockets yourself. Every screen needs loading, empty, and error states. Timers display the server deadline; never run your own phase clock.
- **Gemini 3:** content is data, not code. No logic in content files. Keep it witty and family-friendly. No real people, brands, or real places. Respect every length limit in the schema: headlines ≤ 100 characters, speech bubbles ≤ 60. Tips must fit **both** the real and the innocent outcome of their event.
