# D2 request: real-time busy fixture playback

Owner: Claude (`src/client/visual-test/` and any harness tests/interface note). Requested by Codex for the user's remaining D2 hardware-FPS gate. No dependency or gameplay-contract change.

The user needs a deterministic busy scene with normal animation and an exact recording interval. The current harness installs `createVirtualClock`, overrides RAF and advances synchronously; its screenshot URL cannot measure real-time hardware FPS. Please extend the existing harness rather than create another benchmark stack.

## Bounded delivery

- Add an opt-in `playback=realtime` mode to the existing town fixture page. Keep screenshot mode unchanged.
- Use the recorded `solo-honest` round 3 reveal verbatim. Its frame starts at 68000 ms, deadline 88000 ms: 20 seconds. All 30 citizens have multi-node routes; 26 finish at `r0c4`, four at `r1c3`; behaviors are 18 protest, eight angry_mob and four queue. Preserve routes, map and outcomes.
- Use native Date.now/performance.now/RAF and production renderer settings (no screenshot-only preserveDrawingBuffer or timed pixel readbacks). Rebase fixture deadlines to wall time. Do not force software rendering.
- Await buildings, all 30 rigs and four paperboys, then a warm render before displaying Ready. Refuse degraded assets/fallback as benchmark evidence.
- Provide a Run control that starts the selected reveal from its recorded starting state for exactly 20 seconds, then displays Finished. A reload may be required for another run; no replay framework is needed.
- Emit `performance.mark('news-town:busy:start')` and `performance.mark('news-town:busy:end')` around the 20-second reaction, with a measure spanning them. Controls/cues must not cover the town during measurement.
- Report selected fixture/frame, reaction duration, actor/route/destination counts, viewport CSS size, DPR, drawing-buffer size, actual palette, reduced-motion state and renderer readiness. Normal animation must be enabled; no synthetic advance during the run.
- Target URL after delivery: `/visual-test/index.html?fixture=solo-honest&round=3&phase=reveal&palette=b&reducedMotion=false&playback=realtime`. This is a proposed interface, not a working URL today. The page is dev-only; document `npm run dev`.

## Acceptance / user instructions

At 1280×720 CSS pixels, wait for Ready, start DevTools Performance recording, click Run, wait for Finished, stop recording and export the trace. Codex will isolate the interval using the marks. Validate that playback takes 20 seconds of wall time, all 30 actors travel, and the final destinations match the recorded 26/4 split. Include focused harness checks and return the commit ID for integration. Codex will verify the delivered browser scene before giving the user a working URL.

AGENTS.md assigns the harness exclusively to Claude. Codex has made no harness/config/interface edits. D2 remains incomplete while this evidence is unavailable.
