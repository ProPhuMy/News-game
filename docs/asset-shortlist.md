# News Town: Asset Shortlist for the Visual Overhaul

Scouted October 14, 2026. This is a starting point for the Oct 17 art sample. It does not approve any asset.
The renderer owner still downloads each pack, inspects the actual files, and records it in `ASSETS.md`.

**Verified** means the zip was downloaded and the license file and model list were read.
**Found** means the pack's listing page says CC0, but nobody has opened the files yet.

## 1. Citizens (Must tier, highest risk)

| Pack | Status | License | Contents | Fit |
|---|---|---|---|---|
| **Kenney Mini Characters**: https://opengameart.org/content/mini-character-1 | Found | CC0 (listing) | 12 characters, 32 animations each (incl. wheelchair animations), 2.4 MB | **First choice.** Big-head "mini" proportions are the closest chibi match |
| Kenney Animated Characters 1/2/3: https://opengameart.org/content/animated-characters-2 | Found | CC0 (listing) | 1 rig, 4 skins, 3 animations per pack | Fallback only: blocky, too few clips |
| Quaternius Ultimate Animated Character Pack | Found (secondhand) | Check: a third-party guide lists a "Quaternius license" instead of CC0 | 50+ characters | Normal proportions, not chibi. Verify the license on Quaternius's own page before considering |

Verify for Kenney Mini Characters:
- Does it ship glTF/GLB, or only FBX? (FBX needs a conversion step.)
- **Are there really 32 clips?** One third-party guide describes Mini Characters as unanimated, but Kenney's own listing says 32 animations. Open the files to settle it.
- Do the clip names cover idle, walk, run, and cheer (or close equivalents)?
- Do all 12 characters share one skeleton, so the clips are interchangeable?
- Is there a head bone or socket to attach a paper-colored hat?
- How many triangles per character? 30 will be on screen.

## 2. Buildings and street props

| Pack | Status | License | Contents | Fit |
|---|---|---|---|---|
| **KayKit City Builder Bits 1.0**: https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 | **Verified** | CC0 (`addons/kaykit_city_builder_bits/Assets/LICENSE.txt`) | 41 glTF models sharing one 1024px gradient atlas: buildings A–H (with/without base), bench, bush, streetlight, fire hydrant, water tower, trash, dumpster, boxes, road pieces, traffic lights, 5 modern cars | Cute, chunky style. **Modern era**: use the bench, bush, hydrant, and water tower, and possibly buildings as background filler. Skip the cars and traffic lights |
| **Kenney City Kit (Commercial)**: https://opengameart.org/content/city-kit-commercial | Found | CC0 (listing) | 50+ objects: commercial buildings plus awnings, building parts, signs. FBX/OBJ/DAE/glTF | Awnings and storefront parts suit the bakery and shopfronts |
| Kenney Retro Urban Kit | Found | CC0 | 100+ models with low-resolution textures | **Skip.** "Retro" here means PS1-era graphics, which clash with toon shading |

## 3. Trees and greenery

| Pack | Status | License | Contents |
|---|---|---|---|
| **Kenney Nature Kit**: https://opengameart.org/content/nature-kit | Found | CC0 (listing) | 330+ objects: trees, rocks, plants, terrain pieces |
| **Quaternius Stylized Nature MegaKit**: https://opengameart.org/node/174566 | Found | CC0 (listing) | 110+ models: 40 trees, 35 plants/flowers, rocks, grass, bushes. Its softer stylized look may suit toon shading better |

## 4. Gaps: no fitting CC0 asset found, so build custom

These are simple shapes, best made as custom geometry in the shared palette:
- gas lamps (the KayKit streetlight is modern)
- newsstand
- pretzel sign
- clock tower
- clinic red-cross lamp
- printing-press chimneys
- office banners in each paper's color
- picket signs
- horse cart or vintage car

Also hats, if the character pack's hats can't be recolored or attached.

## 5. Mixing packs

Kenney, KayKit, and Quaternius look different out of the box. The toon approach helps here: if every imported mesh gets the palette's toon material, and its original textures are replaced, the outlines and limited colors pull them into one style.

Check this in the Oct 17 sample: place one asset from each pack side by side and confirm they read as one world.

## 6. Fonts

Newspaper-style candidates: a bold display serif for headlines (e.g. Abril Fatface or Playfair Display), a classic serif for body text (e.g. Old Standard TT), and a typewriter face for tips and notes (e.g. Special Elite).

- **Self-host the font files.** The design doc says nothing loads from third-party URLs at runtime.
- Check each font's license. Google Fonts are usually SIL OFL, not CC0. OFL is fine for fonts, but **`ASSETS.md` currently says CC0 only**, so the user must approve adding an OFL fonts section, with each font's license file committed next to it.
