# Assets

All assets are local. The invitation does not hotlink fonts, photos, or stock imagery.

## Fonts

Self-hosted **WOFF2** subsets from Google Fonts:

| Family | Weights | Files | License |
|---|---|---|---|
| **Aref Ruqaa** | 400, 700 + Latin subsets | `fonts/aref-ruqaa-*-arabic.woff2`, `fonts/aref-ruqaa-*-latin.woff2` | SIL OFL 1.1 |
| **Tajawal** | 300, 400, 500 (Arabic) | `fonts/tajawal-*-arabic.woff2` | SIL OFL 1.1 |
| **Amiri Quran** | 400 (Arabic) | `fonts/amiri-quran-400-arabic.woff2` | SIL OFL 1.1 |

- Aref Ruqaa: Copyright 2015–2020 The Aref Ruqaa Project Authors
  (https://github.com/alif-type/aref-ruqaa), Reserved Font Name EURM10.
- Tajawal: Copyright 2018 Boutros International (http://www.boutrosfonts.com).
- Amiri Quran: Copyright 2010–2022 The Amiri Quran Project Authors
  (https://github.com/aliftype/amiri).
- Full license texts:
  - `fonts/OFL-ArefRuqaa.txt`
  - `fonts/OFL-Tajawal.txt`
  - `fonts/OFL-AmiriQuran.txt`
- Sources: https://fonts.google.com/specimen/Aref+Ruqaa and
  https://fonts.google.com/specimen/Tajawal and
  https://fonts.google.com/specimen/Amiri+Quran

The CSS references only the Arabic subsets for Tajawal and Amiri Quran, plus Arabic and minimal
Latin subsets for Aref Ruqaa. Amiri Quran is used for the Bismillah and Quranic excerpt only.

## Social preview

- `og-image.png` — **1200 × 630**, ready for Open Graph / Twitter / WhatsApp.
- `og-source.html` — the editable 1200×630 artboard used to produce it.
  - It contains static copies of the names and date.
  - It is marked `noindex` and is not linked from the invitation.
  - It uses the local fonts in `fonts/`.

After changing `js/config.js`, run `node tools/sync-static.mjs`; the script updates the
editable artboard text, static metadata, fallback, and manifest. The PNG still needs to
be rasterised from the updated artboard before deployment.

To regenerate after changing names/date:

1. Serve the project root locally.
2. Open `http://localhost:8080/assets/og-source.html`.
3. Set the viewport to exactly **1200×630** and wait until the Arabic fonts are visible.
4. Take a screenshot at 1200×630 and save it over `og-image.png`.
5. Verify the PNG is exactly 1200×630.
6. Update the static `og:image` alt/title/description in `index.html` if needed.
7. Deploy and test the preview in WhatsApp (or a social debugger).

The original artboard is intentionally editable HTML/CSS/SVG rather than a binary source so it
can be reproduced with no design software.

## Favicon and home-screen icon

- `favicon.svg` — a gold eight-point rosette on a dark-brown tile with accessible couple-specific text.
- `apple-touch-icon.png` — **180 × 180** home-screen icon.
- `icon-source.html` — the 180×180 source page used to capture the PNG.

## Ornaments and graphics

Most decorative graphics are custom inline SVG or CSS in the site:

- mihrab-style arch
- botanical sprigs and divider ornaments
- wax-seal treatment
- opening envelope and letter
- calendar / clock / pin / share / envelope icons
- layered champagne/warm-ivory paper texture and soft background wash

### Botanical rose source

- File: `rose-botanical-source.svg`
- Artwork: **“vintage flowers rose”** by **steklofox**
- Source: https://openclipart.org/detail/191669/vintage-flowers-rose
- License: **Public domain / CC0** (asserted in the source file's metadata)
- Usage: the path is embedded inline in `index.html` and recoloured with the invitation's gold tone; the original source SVG is kept locally for reference.

No couple photos or image hotlinks are used.

## Social image notes

The preview card is deliberately static because Open Graph crawlers do not execute JavaScript.
If the bride’s name, event date, or venue text changes, update:

- `assets/og-source.html`
- `assets/og-image.png`
- the static metadata in `index.html`

See the root `README.md` → “Static metadata / WhatsApp preview sync”.
