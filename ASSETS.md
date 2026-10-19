# Asset Attribution Log

Models and sounds listed below are dedicated to the Public Domain under Creative Commons 0 (CC0) 1.0 Universal. Fonts use the separately approved SIL OFL exception documented in "Fonts (SIL OFL)".

| Asset | Source URL | Author / Creator | License | Covered Files |
|---|---|---|---|---|
| Paper Slap Sound | https://kenney.nl/assets/impact-sounds | Kenney | CC0 1.0 Universal | `public/sounds/paper-slap.mp3` |
| Citizen Gasp Sound | https://kenney.nl/assets/voiceover-pack | Kenney | CC0 1.0 Universal | `public/sounds/gasp.mp3` |
| Crowd Murmur Sound | https://kenney.nl/assets/interface-sounds | Kenney | CC0 1.0 Universal | `public/sounds/crowd-murmur.mp3` |
| Smoke Poof Sound | https://kenney.nl/assets/rpg-audio | Kenney | CC0 1.0 Universal | `public/sounds/poof.mp3` |
| Citizen Gasp Sound (Replacement) | https://freesound.org/people/Topschool/sounds/360469/ | Topschool (`gasp.mp3`) | CC0 1.0 Universal | `public/sounds/gasp.mp3` |
| Crowd Murmur Sound (Replacement) | https://freesound.org/people/mglennsound/sounds/678671/ | mglennsound (`AF Crowd Suprised Murmur 1.wav`) | CC0 1.0 Universal | `public/sounds/crowd-murmur.mp3` |

*Note: Town buildings, environment, and citizens are original procedural Three.js code with no third-party assets.*

## Character candidates validated in D0 (Codex)

| Asset | Source URL | Creator | License evidence | Covered files |
|---|---|---|---|---|
| Mini Characters 1 (1.0), all 12 character variants and shared atlas | https://opengameart.org/content/mini-character-1 (archive: https://opengameart.org/sites/default/files/kenney_mini-characters.zip) | Kenney | CC0 1.0; original archive `License.txt` retained at `public/models/characters/kenney-mini/License.txt` | `public/models/characters/kenney-mini/character-{female,male}-{a,b,c,d,e,f}.glb`, `public/models/characters/kenney-mini/Textures/colormap.png`, accompanying license |

These are validation candidates, not yet the active town renderer or a user-approved D1 art sample. Downloaded 2026-10-15; archive SHA-256: `a95a02b556735246570549d0c4a1fcd13ea46ede18187c63d463575a56fd6e1d`. GLB files retain their original bytes and local atlas reference; no third-party runtime URL is used.

## Building and prop sample assets delivered in C2 (Claude)

| Asset | Source URL | Creator | License evidence | Covered files |
|---|---|---|---|---|
| City Kit Commercial (2.1), wide awning and its atlas | https://opengameart.org/content/city-kit-commercial (archive: https://opengameart.org/sites/default/files/kenney_city-kit-commercial_2.1.zip) | Kenney | CC0 1.0; original archive `License.txt` retained at `public/models/buildings/kenney-commercial/License.txt` | `public/models/buildings/kenney-commercial/detail-awning-wide.glb`, `public/models/buildings/kenney-commercial/Textures/colormap.png`, accompanying license |
| Nature Kit (2.1), two trees, a bush and flowers | https://opengameart.org/content/nature-kit (archive: https://opengameart.org/sites/default/files/Nature%20Kit%20%282.1%29.zip) | Kenney | CC0 1.0; original archive `License.txt` retained at `public/models/props/kenney-nature/License.txt` | `public/models/props/kenney-nature/{tree_oak,tree_default,plant_bush,flower_redA}.glb`, accompanying license |

Sample assets for the D1 art decision, not yet the active town renderer. Archive SHA-256: City Kit Commercial 2.1 `f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b`; Nature Kit 2.1 `fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d`. GLB files keep their original bytes; the awning references its local atlas. No third-party runtime URL is used.

## Fonts (SIL OFL)

| Family | Source | License | Files |
|---|---|---|---|
| Playfair Display (variable, weights 400–900, roman) | https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/playfairdisplay (upstream https://github.com/clauseggers/Playfair-Display) | SIL OFL 1.1, Reserved Font Name "Playfair Display"; unmodified; `public/fonts/playfair-display/OFL.txt` | `public/fonts/playfair-display/PlayfairDisplay[wght].ttf` |

Delivered by Claude's C1 branch for local heading-font loading through `src/client/styles/theme.css`; no font CDN request. The font and its license remain in Claude's delivery until integration. Verified against the pinned upstream files: font 300,724 bytes, SHA-256 `c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6`; license SHA-256 `566be814f8e96e93dfa16101331557eb6b5467e9e03f627c0910fe93ca12300e`.
