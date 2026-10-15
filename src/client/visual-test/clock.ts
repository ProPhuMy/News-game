// Harness-only deterministic time. Never import this from game code.
type FrameCallback = (time: number) => void;

export interface VirtualClock {
  /** Current virtual epoch time in ms. */
  now(): number;
  /** Replaces Date.now, performance.now, requestAnimationFrame, cancelAnimationFrame and Math.random. Returns a restore function. */
  install(): () => void;
  /** Moves time forward in fixed frames, running each queued animation frame once per frame (at least one frame). */
  advance(ms: number, frameMs?: number): void;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createVirtualClock(startMs: number, seed: number): VirtualClock {
  let nowMs = startMs;
  let nextId = 1;
  let queue = new Map<number, FrameCallback>();
  const random = mulberry32(seed);

  return {
    now: () => nowMs,

    install() {
      const hadRaf = 'requestAnimationFrame' in globalThis;
      const saved = {
        dateNow: Date.now,
        perfNow: performance.now,
        raf: globalThis.requestAnimationFrame,
        caf: globalThis.cancelAnimationFrame,
        random: Math.random,
      };
      Date.now = () => nowMs;
      performance.now = () => nowMs - startMs;
      globalThis.requestAnimationFrame = (callback: FrameCallback) => {
        const id = nextId++;
        queue.set(id, callback);
        return id;
      };
      globalThis.cancelAnimationFrame = (id: number) => {
        queue.delete(id);
      };
      Math.random = random;

      return () => {
        Date.now = saved.dateNow;
        performance.now = saved.perfNow;
        Math.random = saved.random;
        if (hadRaf) {
          globalThis.requestAnimationFrame = saved.raf;
          globalThis.cancelAnimationFrame = saved.caf;
        } else {
          Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
          Reflect.deleteProperty(globalThis, 'cancelAnimationFrame');
        }
        queue = new Map();
      };
    },

    advance(ms: number, frameMs = 1000 / 60) {
      const end = nowMs + ms;
      // do-while: advancing by 0 still runs one frame, so a capture at the exact frame time is drawn.
      do {
        nowMs = Math.min(end, nowMs + frameMs);
        const due = queue;
        queue = new Map();
        for (const callback of due.values()) callback(nowMs - startMs);
      } while (nowMs < end);
    },
  };
}
