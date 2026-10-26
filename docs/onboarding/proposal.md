# Onboarding proposal: players understand their next action before the stage advances

Owner: Claude (proposal and UI/copy); Codex (timers and transitions). Status: **proposal for Codex review and the user's plan approval**. Nothing is implemented yet.

## Problem (playtest, 2026-10-26)

Players haven't finished reading, or skip the instructions, before the game advances. What the code shows:

1. **The intro can't be read in time.** Three rule cards hold about 120 words (`src/content/rule-cards.ts`), shown for 20 s (`TUNING.phaseMs.intro`). Reading them takes about 30–40 s. The button says "Skip Intro", so players press it as if it meant "continue". The engine already ends the intro early once every connected human presses it (`skipIntro`), so in multiplayer one quick player rarely waits for the others to read.
2. **Investigate is tight for first-timers.** 15 s to read a tip plus two long option headings, and nothing says what investigating is for.
3. **No rules during play.** Once the intro is gone, nothing explains the game again.
4. **Write (45 s)** reads clearly, with its 1-2-3 steps.

## User decisions (2026-10-26)

- Claude may rewrite the rule cards in `src/content/rule-cards.ts`.
- Solo play keeps a long backstop timer on the intro; it does not wait forever.

## Claude: UI and copy (Claude paths, plus the user-approved content edit)

1. **Short intro cards.** About 12 words each, readable in about 10 s. The draft:
   - "Each round: get a tip, check one lead, print one headline."
   - "Truth builds trust. Lies win readers — until they're exposed."
   - "Your score is readers × trust. You need both."
2. **Button.** "Skip Intro" becomes **"I'm ready"**. It sends the same `skipIntro` command; the protocol is unchanged. After pressing it, the panel shows "Waiting for the other editors…" with a count of who is ready, read from existing public data, plus the timer.
3. **"Your move" line.** One bold line at the top of each phase panel, beside the timer:
   - Investigate: "Your move: check one place — or a rival's old headline."
   - Write: "Your move: pick a place and a claim, write a headline, lock it in."
   - Reveal: "Watch the town react. Nothing to do."

   Option headings get shorter, for example "Check a place (sure answer + evidence)" and "Dig into a rival's old headline (may find proof of a lie)".
4. **"How to play" button** in the top bar. It opens the full rules in a dialog at any time, closes with Esc, and is reachable by keyboard and screen reader. It never pauses: the server owns the timers.
5. **Round 1 only:** one short extra hint per panel, hidden from round 2 on, so later rounds stay fast.

Tests come first for each item: copy, `role=dialog`, focus return, round-1-only hints and the button label. Screenshots at desktop, 390×844 and 844×390, plus reduced motion and no-WebGL.

## Codex: timers and transitions (needs the contract change below)

1. **Intro backstop.** `TUNING.phaseMs.intro` goes from 20 000 to **60 000** ms (contract request `docs/contract-requests/2026-10-26-claude-intro-backstop.md`). The existing rule stays: the intro ends as soon as every connected human has pressed "I'm ready". Solo players usually continue in about 10 s; the 60 s backstop stops one idle player from holding up the room. Codex confirms caretaker and disconnected seats don't block the gate, and that bots never do.
2. **Optional, Codex to propose with numbers:** a longer round-1 Investigate, for example 25 s instead of 15 s, while later rounds keep 15 s. This needs a new tuning field, which is a separate contract request. Codex judges whether it's needed once the copy changes are in.
3. **Ready count:** if the public snapshot lacks who has pressed ready, Codex says so. A UI count must come from server data, never guessed.

## Success test (the user runs it)

Someone who has never played joins a 2-player room. Before each stage advances, they can say what they must do now. Watch especially intro → round 1 Investigate → Write.

## Out of scope

Gameplay rules, scoring and the AI are unchanged. Later rounds keep their pace, and no rereading is forced.
