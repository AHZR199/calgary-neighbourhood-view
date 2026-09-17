# Lil Grotesk

By Bastien Sozeau / NoirBlancRouge, under the SIL Open Font License 1.1.

The variable and bold WOFF2 files are copied without modification from the [upstream repository](https://github.com/noirblancrouge/LilGrotesk/tree/150b9c8405ee95185c32023c09a430972309cfde), at `fonts/webfonts/LilGrotesk[wght].woff2` and `fonts/webfonts/LilGrotesk-Bold.woff2`.

- source commit: `150b9c8405ee95185c32023c09a430972309cfde`
- retrieved: 17 September 2026
- weight axis: 100–900, default 400
- copyright and licence: [OFL.txt](OFL.txt)
- authors: [AUTHORS.txt](AUTHORS.txt)

Next.js serves the interface font locally with preloading, a metric-adjusted fallback and `font-display: swap`. MapLibre also renders vector-map labels from these local files, using the bold file where the map style requests bold. Water and other formerly italic labels use the upright regular face. The original provider font keys and glyph URL remain available as a fallback if a local font file cannot load.
