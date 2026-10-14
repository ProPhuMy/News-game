# Preserve engine-owned bot fallback ratings

Spec §8 requires Tabloid fallback juiciness 4, Gazette 2, and a seeded random Wildcard value. Spec §9.3 and `AiAdapter` require calls to return a valid fallback rather than reject.

`RateHeadlineInput` currently has no fallback context. A provider failure returns claim base hype, indistinguishable from a successful rating. Applying it to a bot headline overwrites the personality fallback the engine should supply. The server cannot compute the Wildcard value because bot randomness and game rules belong to the engine.

Proposed shared change in `src/shared/ai.ts`:

```ts
export interface RateHeadlineInput {
  text: string;
  location: Location;
  claim: Claim;
  exposedHeadlineText?: string;
  /** Prepared by engine; adapter uses this only on provider failure. */
  fallbackRating?: Rating;
}
```

Proposed engine change in `src/engine/state.ts`: include `fallbackRating: Rating` on `EngineEvent`'s `headlineLocked` variant. Compute it in engine/bot code using the headline's author personality and seeded RNG. Human fallback remains base hype. Server passes it to `rateHeadline`; adapter returns a cloned, validated fallback on failure and never sends fallback context as model instructions.

Please have Claude approve and implement this before Codex enables bot rating integration. An alternative engine-authored interface that reports rating success/failure separately is acceptable if it preserves the public adapter contract and engine ownership.

No shared or engine files were edited for this request.
