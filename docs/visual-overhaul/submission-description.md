# Submission description — draft for user review

Owner: Claude (reassigned from Gemini 3 by the user on 2026-10-20). Status: **approved by the user on 2026-10-20** ("i think it is good enough"). If the Should features ship, one sentence about day-to-night, emotes, picket signs and the ticker can be added after their final review; that addition needs the user's OK. The user approves the title, edits the text and submits. The cover image is Codex's D5 deliverable and is still pending.

Live URL: https://newstown.prophumy.com

---

## Title

**News Town** (working title; the user decides)

## Tagline

Run a small-town newspaper. Print the truth, or print what sells, and hope nobody checks.

## Short description (about 120 words)

News Town is a multiplayer browser party game for one to four players. Each player runs a newspaper in a tiny 3D town. Every round you get a vague tip, investigate one lead, then write a headline that is either true or a lie. All front pages hit the streets at once, and thirty citizens react right in front of you: they queue, protest, flee or crowd around, and switch to the paper they now believe. Lies can win readers fast, but they can be exposed later by the town or by a rival, and that wrecks your trust. Your final score is total readers times trust. Press Play Solo to face three computer-run rival papers. No login, no download.

## Long description (about 380 words)

**The idea.** In News Town, readers are the prize and trust is the multiplier. A sensational lie can pull half the town to your paper in one round, but every lie keeps rolling to be exposed for the rest of the match, and the juicier it was, the faster it blows up. Honest papers grow slower but safer. The tension between the two is the game.

**A round.** Each of the five rounds has three short phases. You get a private tip that fits both a real event and an innocent explanation, so the tip alone never tells you the truth. In **Investigate** you can check a location to learn its real story and earn an evidence card, or dig into a rival's earlier headline to look for proof that it was a lie. In **Write** you pick a location and a claim, such as a scandal, a health scare, a great deal or a weird sighting, and type your own headline. Attach evidence to boost your trust, or publish proof to expose a rival. Then all four front pages are revealed together. Exposures land first ("the truth comes out"), and the citizens act it out on screen while a one-line recap sums up what changed.

**The finale.** After round five, the Final Edition gives every surviving lie one last chance to be caught, reveals the truth behind every headline, and scores each paper: total readers × trust ÷ 50.

**Play together or alone.** Create a room and share the five-letter code or link with up to three friends. Empty seats are filled by computer-run papers with distinct personalities: a tabloid, a cautious gazette and a wildcard. If you lose your connection, a caretaker editor holds your seat until you reload. A full match takes about eight minutes.

**The look.** The town is drawn like a Sunday comic: bright vintage colors, toon shading with bold outlines and real shadows. Citizens wear caps in their newspaper's color. The bakery has its striped awning and pretzel sign, the bank its columns, the town hall its clock tower and the clinic its lit cross.

**Accessible by design.** Every paper has an icon as well as a color. There is a reduced-motion setting. If your browser has no WebGL, the whole match is still playable through the panels.

## Credits

- 3D characters: Kenney "Mini Characters 1" (CC0).
- Trees and plants: Kenney "Nature Kit" (CC0).
- Sound effects: Kenney (paper slap, poof), Topschool (gasp) and mglennsound (crowd murmur) on Freesound, all CC0.
- Typeface: Playfair Display (SIL Open Font License), self-hosted.
- Buildings, props, interface and game code: built for this project.

## Building notes (for the submission)

The buildings are built in code, not imported from a kit. Each is a few palette-colored pieces with a signature detail chosen so that it reads without a label. The bakery has a striped awning, a pretzel sign and a lit window. The bank has four columns, a pediment and a `BANK` sign. The town hall has a clock tower. The clinic has a lit red cross. The four newspaper offices have printing-press chimneys and banners in each paper's color. The fountain square has a fountain and an open plaza. Gas lamps, newsstands, benches, a cart, flower boxes and Kenney Nature Kit trees dress the streets without ever blocking a citizen's route. All colors come from one approved palette, shared by the 3D town and the interface.

---

## Sources (for the user's fact check; not part of the submission)

| Claim | Source |
|---|---|
| 1–4 humans, always 4 papers, 30 citizens, 5 locations, 5 rounds plus Final Edition | Gameplay spec §3 |
| Play Solo, 5-character room code and `/r/CODE` link, no login | Gameplay spec §4.1; D4 production smoke (two separate sessions, no accounts) |
| About eight minutes (at most 7 min 40 s) | Gameplay spec §4.2 |
| Tips fit both outcomes; investigate a location or a rival headline; evidence; exposes | Gameplay spec §4.3, §5.3, §5.5, §6.2 |
| Juicier lies are exposed faster; exposure rolls every later round | Gameplay spec §6.2 |
| Score = total readers × trust ÷ 50, rounded | Gameplay spec §6.5; on-screen formula in the D4 production final capture |
| Tabloid, gazette and wildcard bots; caretaker on disconnect | Gameplay spec §4.5, §8 |
| Reaction recap line; exposures shown first | Gameplay spec §4.3, §6.1; C5 reveal captures |
| Toon shading, outlines, shadows, paper-colored caps | Overhaul design §3, §6; presentation interface §5b; D2 handoff |
| Building identities | Overhaul design §5; C3 handoff; C4 sign fix |
| Icons with colors, reduced motion, no-WebGL fallback | Gameplay spec §4.1, §7; overhaul design §7; C5 fallback and reduced-motion captures |
| Credits | `ASSETS.md`, including the sound replacement rows |
| Live URL | C5 closeout and D5 handoff: deployed source `d86a2d5`, image `sha256:4a038abd…`, HTTPS 200 rechecked in D5 |

**Deliberately left out:**
- **Language models:** the live build runs with `AI_PROVIDER=none`. Rival headlines and speech bubbles come from hand-written templates, and the "AI" papers are rule-based. The text calls them "computer-run" to avoid implying language-model generation. If the mission requires AI use, say so and the text can describe the optional AI adapter (gameplay spec §9.3, §12).
- **Frame rate:** no claim. The current release's reference-laptop result is a 34.73 FPS average, with a worst one-second window of 26, accepted by the user as an exception (C5). The earlier D2 figures (36.8 / 29) describe an older build.
- **Phone support:** not claimed as a feature. Phone layouts work in captures, but the spec lists phone layout as a stretch goal.
- **Unbuilt features:** none of the Should or Could items in the overhaul design is described (emotes, picket signs, day/night, latest-edition strip, halftone, and so on).
