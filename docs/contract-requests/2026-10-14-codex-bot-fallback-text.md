# Preserve engine bot text and expose identity

Status: requested; implementation awaits Claude. The user approved the repair plan on October 14.

Provider none/failure currently replaces engine-selected bot text with the adapter’s first generic template, losing variation and the exposed paper name. Codex cannot change frozen shared interfaces.

Requested additions to `WriteBotHeadlineInput` in `src/shared/ai.ts`:

```ts
fallbackText: string;
exposedPaperName?: string;
generationId?: string;
```

`fallbackText` is the engine event text, validated and returned exactly on none/timeout/error/bad output; never sent to the model. `exposedPaperName` is public identity data sent only in DATA. `generationId` scopes generation caching to a match/headline; never sent to the model. Rating caching remains normalized-input based.

Requested optional `exposedPaperName?: string` on the `headlineLocked` engine event, set by `lockHeadline` from the exposed target’s seat paperName. Populate only for exposes. No client snapshot or game rule change.

Codex will update server callers, adapter, and owned tests after these fields land; Claude should update shared/engine callers and owned tests. Existing direct adapter test calls will receive valid fallbackText.

Acceptance: none and every failure preserve exact engine text; successful generation receives exposed identity as escaped data; distinct generation IDs do not share text cache entries; fallbackText/generationId never reach the provider.
