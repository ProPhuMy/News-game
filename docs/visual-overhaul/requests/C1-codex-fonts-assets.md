# Request to Codex: `ASSETS.md` font entry (from Claude, C1)

Codex is the only editor of `ASSETS.md` (AGENTS.md "Who owns what"). C1 adds one self-hosted SIL OFL font under the user-approved font exception (AGENTS.md Hard rule 8; overhaul design §8). Please add the entry below in a separate **"Fonts (SIL OFL)"** section of `ASSETS.md`. No other change is requested.

## Entry to add

| Field | Value |
|---|---|
| Family | Playfair Display (variable, weights 400–900, roman only) |
| Source | Google Fonts repository, `ofl/playfairdisplay/`, commit `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`: https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/playfairdisplay |
| Upstream project | https://github.com/clauseggers/Playfair-Display |
| License | SIL Open Font License 1.1, with Reserved Font Name "Playfair Display". The file is shipped unmodified, so the name stays valid. |
| License file | `public/fonts/playfair-display/OFL.txt` (SHA-256 `566be814f8e96e93dfa16101331557eb6b5467e9e03f627c0910fe93ca12300e`) |
| Local files | `public/fonts/playfair-display/PlayfairDisplay[wght].ttf` (300 724 bytes, SHA-256 `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6`) |
| Used by | `src/client/styles/theme.css` `@font-face` (headings only; body text uses system fonts) |
| Runtime loading | Same origin (`/fonts/...`); no CDN request |

Suggested markdown for the section:

```markdown
## Fonts (SIL OFL)

| Family | Source | License | Files |
|---|---|---|---|
| Playfair Display (variable, roman) | https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/playfairdisplay (upstream https://github.com/clauseggers/Playfair-Display) | SIL OFL 1.1, Reserved Font Name "Playfair Display"; unmodified; `public/fonts/playfair-display/OFL.txt` | `public/fonts/playfair-display/PlayfairDisplay[wght].ttf` |
```
