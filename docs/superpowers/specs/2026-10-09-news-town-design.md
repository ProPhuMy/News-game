# News Town — Design Spec

Date: October 9, 2026
Status: written spec awaiting user review. No implementation is authorized until this spec is approved and an implementation plan is written (Superpowers `writing-plans`).
Name: "News Town" is a working title.
Supersedes: the earlier GPT draft of the same name. Decisions that changed are listed in §2.

---

## 1. Purpose and success criteria

A short multiplayer browser party game. Each player runs a newspaper in a small 3D town. Every round, players publish one headline. Each headline can be true or a lie. Citizens react visibly in the town and switch which paper they read. Lies can win readers, but they may blow up later and wreck the paper's trust. The best combination of readers and trust wins.

The game is being built for the Handshake AI Skills Studio "Create a Multiplayer Game" challenge. Entries are due **October 30, 2026, 11:59 PM PT**, and our internal target is **October 28**. Judging weighs Execution, Creativity, Usefulness/Value, and Polish equally.

The game is a success when:

1. A single visitor, such as a judge clicking the link alone, can press **Play Solo** and finish a full match against AI papers with no setup and no login.
2. Two to four friends can join one room through a link and finish a synchronized match.
3. After every round, a player can see *why* citizens and scores changed.
4. A full match takes about 8 minutes.
5. The game never hangs or shows a blank screen. That includes a slow or failing AI provider, a disconnect, or a browser without WebGL.

## 2. Key decisions (and changes from the GPT draft)

| Topic | Decision | GPT draft had |
|---|---|---|
| Solo play | AI newspapers fill every empty seat; there is a "Play Solo" button | 3–4 humans, no bots |
| Win condition | Score = total readers × (final trust ÷ 50) | Most revenue |
| Headline input | Pick target + claim from a menu, then write the headline freely; AI never blocks publishing | Free text interpreted by AI, which may demand rewrites |
| Catching lies | Rival investigation **and** town exposure, both probability-based; juicier lies blow up faster | Rival exposes only |
| Visual style | Real-time low-poly 3D, fixed MOBA-style camera, CC0 asset packs | Same direction (3D, fixed camera) |
| Match length | ~8 min, 5 rounds + finale | ~10 min |
| Final phase | "Final Edition": automatic truth reveal and last exposure rolls | Extra player expose round |
| AI provider | Provider-agnostic adapter (OpenAI or Anthropic via config) | OpenAI implied |
| Stack | TypeScript, Node, Socket.IO, React, Three.js | Same |
| Team | Separate ownership: Claude + Codex own all logic; Gemini agents own presentation and content | Not specified |

## 3. Scope

**In scope:**

- 1–4 humans per room and always exactly 4 newspapers. AI papers fill the empty seats.
- 30 citizens.
- 5 targetable locations: Bakery, Bank, Fountain Square, Town Hall, Clinic.
- 4 newspaper office buildings. These are not targetable by town claims.
- 5 rounds plus the Final Edition.
- English only. Desktop browsers first; phone layout is a stretch goal.
- Rooms by code or link; reconnecting after a refresh; an AI editor takes over a disconnected seat.

**Out of scope:** accounts, chat, bots in matchmaking queues, ranked play, persistence between matches, trading or bribery, AI-generated 3D assets, procedural towns, multiple servers, and durable recovery after a server restart.

## 4. Match flow

### 4.1 Entry

- **Home screen:** "Play Solo", "Create Room", and a "Join" field for a room code.
- **Play Solo:** creates a room with 1 human and 3 AI papers, then starts immediately. The match still runs on the server.
- **Create Room:** produces a 5-character room code built from unambiguous characters (no 0/O/1/I), plus a join link `/r/CODE`.
- **Joining:** players enter a display name (max 20 characters) and a newspaper name (max 24 characters). They then pick one of 4 fixed colors that isn't already taken. Each color has an icon (quill, megaphone, eye, lightning bolt) so color is never the only identifier.
- **Lobby:** shows the seats. Empty seats are labeled "AI paper will take this seat". The host can start with 1–4 humans. Lobby hosting passes to another connected human if the host leaves.
- **After the match starts:** new joins are rejected ("Match in progress"). Reconnecting to an existing seat is still allowed.

### 4.2 Timing

| Phase | Duration | Ends early when |
|---|---|---|
| Intro: camera sweep + 3 rule cards | 20 s | Every connected human presses "Skip" |
| Round × 5: Investigate | 15 s | Every connected human has investigated or skipped |
| Round × 5: Write | 45 s | Every connected human has locked or skipped |
| Round × 5: Front page + reaction | 20 s | Never (fixed-length animation) |
| Final Edition | 40 s | Never |

The maximum total is 20 + 5 × 80 + 40 = 460 s, about 7 min 40 s.

AI papers decide instantly at the start of each phase. Their "locked" indicator appears after a random 3–15 s delay so the table feels alive. That delay is for display only and never holds up a phase.

### 4.3 A round

1. **Tip (shown at the start of Investigate).** Each paper privately receives one vague tip about a current town event (§5.3).
2. **Investigate (15 s).** Choose one option:
   - **Check a location:** reveals the truth at that location for *this round* and grants an evidence card (§5.5). The result is certain.
   - **Investigate a rival headline:** pick any unexposed headline that a rival published in an earlier round. There's a chance of finding proof that it's a lie (§6.2). This option is unavailable in round 1.
   - **Skip.**
3. **Write (45 s).** Pick a target location, then a claim type (§5.2). Alternatively, if you hold proof, choose "Expose [paper]: '[headline]'". Then write a headline of 1–100 characters and optionally attach a matching evidence card. Press **LOCK IT IN**. You can't edit after locking. When the timer runs out, nothing is published unless a headline was already locked.
4. **Front page + reaction (20 s).** All headlines are revealed together as four front pages. Exposures happen first ("THE TRUTH COMES OUT"). Then the citizens react, and a one-line recap appears ("9 citizens rushed the bank; 3 now read The Daily Gasp").

### 4.4 Final Edition (40 s)

1. Every surviving lie gets a final exposure roll at doubled odds, capped at 90%. Lies pop one at a time for drama.
2. The game reveals the truth of every headline in the match. Each true headline that had no evidence attached now earns +2 trust (§6.3).
3. The scoreboard shows: total readers, final trust, score, and a truth record ("4 lies told, 3 caught, 1 got away"). The highest score wins, and equal scores share the win.

### 4.5 Disconnects and room lifetime

- When a human disconnects mid-match, the **Caretaker** editor (Gazette rules, §8) controls their seat right away. Timers keep running.
- On reconnect, control returns immediately. Any action the Caretaker already locked in the current phase stands.
- A reconnect token (128-bit random, stored in the browser's localStorage per room code) reclaims the seat. Knowing the room code alone never grants control of an occupied seat.
- A lobby with no humans is deleted after 5 minutes.
- A match with no connected humans for 2 minutes ends and is deleted.
- A finished room is deleted after 15 minutes.
- If the server process restarts, all matches end. Clients show "The presses stopped — this match ended" and a button back to the home screen.

## 5. Town, truth, tips, claims

### 5.1 Hidden truth per round

At the start of each round, the engine rolls **3 town events** at 3 different locations, drawn from the event template catalogue (§5.6, at least 10 templates).

Each event has one `realClaim` (a claim type). It is "real" with that template's probability `pReal` (0.35–0.6). If it isn't real, it is "innocent". Truth at each location for that round:

- **Event is real:** the claim `(location, realClaim)` is TRUE. Every other claim there is FALSE, including `all_clear`.
- **Event is innocent, or there's no event at that location:** only `all_clear` is TRUE there.

Truth is fixed to its round. Later rounds never change an earlier headline's truth.

### 5.2 Claim types

| Claim | Base hype (1–5) | Citizen behavior |
|---|---|---|
| `danger` | 4 | Flee from the location |
| `health_scare` | 4 | Boycott: stand outside, arms crossed |
| `scandal` | 3 | Protest at the location |
| `great_deal` | 2 | Queue at the location |
| `weird_sighting` | 5 | Curious crowd at the location |
| `all_clear` | 1 (effective juiciness capped at 2) | Relaxed visit or celebrate |
| `expose` (needs proof) | 4 | Protest at the exposed paper's office |

`all_clear` means an honest paper always has a safe, true story available. It's boring, but it's never a lie.

### 5.3 Tips

- Each paper's tip points at one of the round's 3 events. Two papers may get tips about the same event, but never the same tip text in the same round. Each template therefore provides at least 2 tip variants.
- Tips are worded so they fit *both* the real and the innocent outcome ("A truck was at the bakery at 3 AM"). A tip alone never reveals the truth.

### 5.4 Headline text and the AI

When a headline is locked, the server asks the AI adapter (§9.3) to rate it. The adapter returns:

- `juiciness`: an integer from 1 to 5.
- `onTopic`: whether the text actually matches the chosen claim.
- `inappropriate`: whether the text is offensive.
- `bubbles`: 2–3 citizen speech lines of at most 60 characters each.

**Effective juiciness** is computed as `round((aiJuiciness + baseHype) / 2)`, clamped to 1–5. Two adjustments then apply:

- If the headline is off-topic, effective juiciness is 1.
- An `all_clear` headline is capped at 2.

Averaging with base hype keeps the claim type meaningful and limits how much a cleverly written headline can game the AI.

**Moderation** happens in two layers:

- A local word filter runs at lock time and rejects the headline with "Our lawyers won't print that — try again". The player can still edit and resubmit.
- If the AI later flags the headline as inappropriate, it is displayed as "[PULLED BY THE EDITOR]". The claim still counts, with effective juiciness 1.

If the AI times out or fails, the base hype stands in for `aiJuiciness`, `onTopic` is assumed true, and bubbles come from templates.

### 5.5 Evidence

- An evidence card is `{round, location, claimType}`. It records the true claim at that location in that round, which may be `all_clear`.
- A card can only be attached to a headline published in the **same round** with the **same location and claim type**. The editor shows only matching cards.
- Evidence is public once published, so attaching it reveals that the story is true. That's intended.

### 5.6 Event template catalogue (content)

Each template has:
- `id`, `location`, `realClaim`, `pReal`
- ≥2 `tipVariants`
- `evidenceReal` and `evidenceInnocent` texts
- `explanationReal` and `explanationInnocent` (used for the finale and for town exposures)

There must be at least 10 templates covering all 5 locations and all 5 non-`all_clear` claim types. Example: Bakery, `health_scare`, pReal 0.45. Tip: "A truck was unloading at the bakery at 3 AM." Real: the flour was spoiled. Innocent: it was an early delivery for a festival.

## 6. Trust, exposure, citizens, scoring

All numbers in this section live in `shared/tuning.ts` and are starting values, to be tuned using bot simulations (§10).

### 6.1 Reveal resolution order (per round)

Resolution is always computed from the state as it was before resolution started, with all inputs sorted by seat ID and citizen ID. Command arrival order therefore never matters.

1. **Player exposes.** Each published `expose` lowers the target's trust (§6.3) if that headline hasn't been exposed yet. Every player who published an expose of it this round gains +8.
2. **Town exposure rolls.** Every unexposed lie published in an *earlier* round rolls once (§6.2). This round's new lies are not rolled.
3. **Evidence trust.** Each headline published this round with evidence attached gives its paper +6 trust.
4. **Clamp** all trust to 0–100.
5. **Citizens choose** (§6.4) and readers are counted.
6. **Build the reaction plan** for the renderer (§9.5).

### 6.2 Exposure probabilities

- **Town:** chance = 5% + 5% × effective juiciness + 10% × `roundsSurvived`, where `roundsSurvived = currentRound − publishedRound − 1`. A juiciness-5 lie starts at 30% on its first roll. A juiciness-1 lie starts at 10%.
- **Final Edition:** the town chance is doubled, capped at 90%.
- **Rival investigation of a lie:** 60% to find proof. That rises to 85% if the investigator's tip this round points at the same location as the headline.
- **Rival investigation of a true headline:** always returns "Nothing conclusive". A failed roll on a lie returns the same text, so the result never leaks the truth.
- **Proof cards** are tied to one headline. A proof card becomes void once that headline is exposed by anyone.
- **Exposure is one-time per headline.** The trust penalty applies only once.

### 6.3 Trust

Every paper starts at 50, and trust is clamped to 0–100.

| Event | Trust change |
|---|---|
| Your lie is exposed | −(10 + 2 × effective juiciness), so −12 to −20 |
| You publish a successful expose | +8 |
| You publish a true headline with evidence | +6, applied at reveal |
| You published a true headline without evidence | +2, applied in the Final Edition |

The +2 for unevidenced truths is delayed until the finale on purpose. Applying it right away would make the trust bars leak which stories are true.

### 6.4 Citizens

Each citizen has:
- `favoriteLocation`: one of the 5 locations.
- `gullibility`: between 0.1 and 1.0.
- `paper`: a paper ID, or none. Citizens start unsubscribed.
- A home node on the street graph.

All of these are seeded per match.

**Appeal of headline h for citizen c:**

```
relevance   = 10 if h.location == c.favoriteLocation else 3
              (for an expose, h.location is the exposed headline's location)
juice       = effectiveJuiciness(h) × c.gullibility × 4          (0–20)
trust       = trust(h.paper) / 5                                 (0–20)
evidence    = 8 if evidence attached
loyalty     = 6 if c.paper == h.paper and h.paper was not exposed this reveal
repeat      = −10 × (earlier headlines by h.paper with the same location+claim), min −20
appeal      = relevance + juice + trust + evidence + loyalty + repeat
```

**Subscription choice:**

- `best` is the headline with the highest appeal. Ties are broken by the seeded RNG.
- **Subscribed citizen.** Compute the value of staying: the appeal of their current paper's headline, or `6 + trust/5` if that paper published nothing.
  - They switch to `best.paper` only if `best` beats the value of staying.
  - If their paper was exposed this reveal, its loyalty bonus is already 0.
- **Unsubscribed citizen.** They subscribe to `best.paper` if its appeal is at least 15, and otherwise stay unsubscribed.

**Reaction (separate from subscription).** A citizen acts out the behavior of their highest-appeal headline if that appeal is at least 12. Otherwise they keep their routine. Citizens who left an exposed paper this round join an angry mob at its office.

**Readers this round** = the number of citizens subscribed to the paper after step 5.

### 6.5 Score

`score = round(totalReaders × finalTrust / 50)`

`totalReaders` is the sum of a paper's readers over the 5 rounds. The Final Edition changes trust only, not readers.

## 7. Presentation

- **Camera:** perspective, tilted about 55°, MOBA-like. Limited pan and zoom, no rotation.
- **Art:** low-poly CC0 packs (Kenney and/or Quaternius buildings and animated characters), a warm toy-town palette, soft lighting. Every asset's license is recorded in `ASSETS.md`.
- **Paper colors on citizens:** each citizen wears a hat or scarf in their paper's color. Unsubscribed citizens are grey. Switching papers plays a "poof" and a color change.
- **Movement:** citizens follow the routes in the reaction plan along a predefined street graph. Each location has gathering slots, with an overflow ring for extra citizens.
- **Speech bubbles:** at most 6 visible at once, drawn from the AI bubbles or templates.
- **Interface:**
  - Top bar: round, phase, countdown.
  - Side panel: each paper's readers, trust bar, and current score.
  - Phase panel: first the tip card and investigate choices; then the editor (target picker, claim chips, 100-character text box with counter, evidence toggle, LOCK IT IN).
  - Front pages slide in side by side at the reveal.
- **Sound:** a small set of CC0 effects (paper slap, gasp, crowd murmur, poof) plus a mute toggle.
- **Accessibility:** a reduced-motion option that shortens the camera sweep and replaces the poof with a fade. Icons always accompany colors.
- **Failure views:** a readable message if WebGL is unavailable (the match is still playable through the panels), and clear connection-lost and server-restarted screens.
- **Cover image:** a reaction-phase screenshot, used for the contest entry.

## 8. AI newspapers (bots)

Bots are rule-based. The AI only writes their headline text, with template fallback.

**The Tabloid ("The Daily Gasp")**
- Investigate: 30% chance to investigate a random rival headline (from round 2); otherwise skip.
- Write: if it holds proof, it exposes. Otherwise it writes about its tip's location using that event's `realClaim`, whether true or not, or 30% of the time the highest-hype claim there.

**The Gazette ("The Morning Ledger")**
- Investigate: checks its tip location. From round 2 onward, there's a 50% chance it instead investigates the latest unexposed headline from the paper with the lowest trust.
- Write, in order of preference:
  1. Expose if it holds proof.
  2. Otherwise, if its evidence shows a real event, a true story with evidence.
  3. Otherwise `all_clear` with evidence at the location it checked.
  4. There's a 10% chance it lies instead.

**The Wildcard ("Rumor Mill Weekly")**
- Makes uniformly random valid choices, but if it holds proof it exposes 50% of the time.

**General rules**
- In a match with fewer than 3 bots, personalities are assigned in the order Tabloid → Gazette → Wildcard.
- The Caretaker for disconnected humans uses Gazette rules but keeps the human's paper identity.
- Fallback headline juiciness for bots: Tabloid 4, Gazette 2, Wildcard random 1–5. This is used only when the AI fails. Bot headlines are otherwise rated like any other headline.

## 9. Architecture

### 9.1 Stack

TypeScript everywhere, on the current Node LTS. Tools: Vite + React (client UI), Three.js (town), Socket.IO (realtime), Vitest (tests), zod (runtime validation). One repository and one deployable Node service that serves the built client and the socket endpoint. Exact versions, the hosting provider (it must support always-on WebSockets with no idle sleep), and AI model names are chosen in the implementation plan.

### 9.2 Modules and ownership

| Folder | Responsibility | Owner | Network/IO? |
|---|---|---|---|
| `src/shared/` | Types, protocol messages, zod schemas, `tuning.ts`, street-graph/town map data | **Claude** (contract, frozen at milestone M0) | No |
| `src/engine/` | Pure game rules: match creation, commands, phases, events, truth, investigations, exposures, trust, citizens, routes, scoring, public/private views, reaction plans | **Claude** | No |
| `src/bots/` | Bot personalities and Caretaker as pure functions over a bot-visible view | **Claude** | No |
| `src/sim/` | Headless bot-only match runner, balance reports, fixture recorder for the UI/town | **Claude** | No |
| `src/ai/` | AI adapter: providers (OpenAI, Anthropic, none), timeout, cache, output validation, word filter, fallbacks | **Codex** | Yes (server only) |
| `src/server/` | Socket.IO rooms, seats, reconnect tokens, timers, command handling, per-seat snapshots, rate limits, expiry, static serving | **Codex** | Yes |
| `src/client/net/` | Client store: socket connection, acks, retries, reconnect, server-time offset, stale-snapshot discard; exposes typed state + actions | **Codex** | Yes |
| `src/client/town/` | Three.js scene: camera, assets, citizen animation, playback of reaction plans, bubbles, reduced motion, WebGL fallback | **Gemini 1** | No |
| `src/client/ui/` | React screens: home, lobby, intro cards, investigate, editor, front pages, scoreboard, finale, error views, sound playback | **Gemini 2** | No |
| `src/content/` | Event templates, tip variants, evidence/explanation text, bubble templates, bot headline templates, rule card text, AI prompt wording, word list, bot paper names, CC0 sound selection | **Gemini 3** | No |

**Ownership rules**
- An agent edits only its own folders.
- Changes to `src/shared/` after M0 go through the user. The user approves, then Claude edits.
- All game rules live in `engine/` and `bots/`. The client, renderer, and content contain no rules.
- Content files must pass zod schema tests written by Claude, so bad content fails CI instead of breaking a match.
- Every Gemini merge is reviewed by Claude or Codex before the user merges it.

### 9.3 AI adapter interface (Codex)

```ts
rateHeadline(input: { text; location; claimType; exposedHeadlineText? })
  → { juiciness: 1–5; onTopic: boolean; inappropriate: boolean; bubbles: string[] }
writeBotHeadline(input: { personality; location; claimType; exposedHeadlineText? })
  → string  // 1–100 chars
```

- Provider selected by `AI_PROVIDER=openai|anthropic|none`. With `none`, only fallbacks are used, which serves tests and local development without a key. The model comes from `AI_MODEL`.
- Each call has a 3 s timeout and one attempt. Results are cached by normalized input.
- Output is validated with zod. Anything invalid or slow falls back to the template/base-hype result.
- Headline text is passed to the model as delimited, untrusted data. It is never interpreted as instructions, and its only possible influence is a clamped number plus short bubbles. Bubbles are length-limited and pass the word filter.
- API keys exist only in server environment variables.

### 9.4 Engine interface (Claude)

```ts
createMatch(config, seed, seats) → MatchState
applyCommand(state, seatId, command, nowMs) → { state, result }
applyRating(state, headlineId, rating) → state      // AI results enter as data
tick(state, nowMs) → { state, events }               // deadlines, early phase ends, resolution
publicView(state) → PublicSnapshot
privateView(state, seatId) → PrivateSnapshot
```

- **Determinism.** All randomness comes from a seeded PRNG consumed in a fixed sorted order. The same seed and the same inputs always produce the same match.
- **Unrated headlines.** Any headline still unrated at reveal gets the fallback rating, so the reveal never waits on the AI.
- **Routes.** The engine computes citizen routes with BFS on the shared street graph, so the renderer never decides anything.

### 9.5 Protocol and snapshots

**Client to server.** Messages are `createRoom`, `playSolo`, `joinRoom`, `reconnect`, `startMatch`, `skipIntro`, `investigate`, `skipInvestigate`, `lockHeadline`, and `skipWrite`.
- Every message carries a unique `actionId`. Match commands also carry `round` and `phase`.
- A duplicate `actionId` returns the original acknowledgment.
- Commands with a stale round or phase, malformed fields, or from an unauthorized seat are rejected with an error code.

**Server to client.**
- `ack {actionId, ok, error?}`
- `publicSnapshot`: version, phase, deadline (epoch ms), papers with readers, trust, and score, revealed headlines, exposures, and the latest `ReactionPlan`.
- `privateSnapshot` (to that seat only): tip, evidence cards, proof cards, investigation results, and their locked headline.
- Clients drop any snapshot whose version is older than the one they already have.

**Privacy invariants.** The client never receives the hidden truth for the current round, other seats' tips, evidence, or proof, unrevealed headlines, or citizen gullibility. Truth is revealed only through exposures, published evidence, and the Final Edition.

**`ReactionPlan`.** This is the renderer contract. It contains the round, a list of exposures with explanations, and per-citizen entries of `{citizenId, behavior, route: nodeId[], fromPaper, toPaper, bubble?}`, plus the recap line.

**Limits.**
- `createRoom` and `playSolo`: 10 per minute per IP.
- At most 200 rooms in memory.
- Headline text is trimmed, whitespace is collapsed, and control characters are stripped. It is always rendered as text.

## 10. Testing and acceptance

1. **Engine unit tests:** truth rules, evidence matching, exposure math, trust deltas and clamping, appeal formula, subscription choice, tie-breaking, score, phase timing, and stale/duplicate command handling.
2. **Determinism:** replaying the same seed and inputs gives identical results, and shuffling command arrival order within a phase doesn't change the outcome.
3. **Bot simulations:** 500 bot-only matches with zero crashes. Matched against each other, always-honest must win at most 50% of the time, mixed at least 20%, and always-lying at least 10% (revised 2026-10-13; see `docs/contract-requests/2026-10-13-claude-tuning.md`). Matches must last 5 rounds without stalls. Tuning values are adjusted until this holds.
4. **Content schema tests:** at least 10 templates covering all 5 locations and all 5 non-`all_clear` claim types, with valid tips and evidence texts and no empty or oversized strings.
5. **AI adapter tests:** timeout leads to fallback; invalid JSON leads to fallback; prompt-injection headlines still return clamped, valid output; the word filter blocks at lock time; `none` mode works.
6. **Server/socket tests:** a 3-client match runs end to end; no payload ever contains a privacy-invariant field (checked automatically); reconnect with a token restores the seat; a code alone can't take a seat; Caretaker takeover and handback work; room expiry works.
7. **Manual browser checklist:** Play Solo completes, a 3-browser room completes, the WebGL fallback works, reduced motion works, there's no label or bubble overlap at the reveal, and the recap matches what happened.
8. **Human playtests** (at least 2 sessions before submission): check rule comprehension within the first round, match length of 7–9 minutes, and whether players try lying, honesty, and exposing.

## 11. Milestones

Day counting starts Oct 10.

| Milestone | By | Done when |
|---|---|---|
| M0 Contract | Oct 11 | Repo skeleton, `src/shared/` types, protocol, schemas, `tuning.ts`, street graph committed and frozen; each agent's task file handed out |
| M1 Parts work alone | Oct 17 | Engine + bots + sims pass; server runs full matches on the engine with `AI_PROVIDER=none`; UI and town play back recorded fixture matches; content passes schema tests; AI adapter tests pass |
| M2 First integration | Oct 21 | Play Solo playable in a browser, end to end, locally |
| M3 Feature complete + deployed | Oct 25 | Multiplayer rooms, AI ratings, all screens, deployed to an always-on host |
| M4 Polish + playtests | Oct 27 | Acceptance checklist (§10) passes; tuning adjusted from playtests |
| Submit | Oct 28 | Title, cover image, description, URL submitted on Handshake |

## 12. Contest deliverables

- **Required by the rules PDF:** project title, cover image, description, and URL, submitted to the Handshake "Create a Multiplayer Game" mission by Oct 30, 2026, 11:59 PM PT.
- **Check the mission page.** The rules PDF refers to "that month's project requirements," which aren't in the PDF. The mission page in Handshake should be checked for extra requirements, including whether the project must use OpenAI. The AI adapter can switch to OpenAI with one environment variable if required.
- **Entrant eligibility** (age, residency, Handshake account) is the entrant's responsibility and is not verified by this spec.
