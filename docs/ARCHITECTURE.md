# How Graphit works

Notes for anyone changing the code. For running the app, see the [README](../README.md).

## One rule for every chart

Every chart is a pure function of **data, settings, palette and time `t`**. The live preview, the gallery thumbnails, SVG export, every video frame and the code exports all call the same function, so they always match.

- A chart lives in `src/charts/<family>/<ID>.ts` and exports `defineChart({...})`: its data tables, demo data, settings, text defaults and a `draw(ctx)` function.
- `draw` builds a small virtual SVG tree with `el()`, `txt()` and `tip()` (`src/core/vnode.ts`). It never touches the page.
- `src/core/scene.ts` builds a scene: it cleans the settings, checks the data, lays out the card (`src/core/frame.ts`), then calls `draw`. Bad data becomes a message on the chart, never a crash.
- The tree is either mounted into a live `<svg>` (`src/core/mount.ts`) or written out as a file (`src/core/serialize.ts`).

## Settings and the editor

- Settings every chart shares (text, fonts, number format, artboard, interactivity, animation) are in `src/core/settings.ts`. Each chart adds its own.
- Every setting has a type, a range and a default. The editor builds its sliders, number boxes, colour pickers, switches and menus from that list, so a new chart never needs a hand-built panel.
- Saved edits, undo/redo and autosave live in `src/state/store.ts`; share links (compressed with lz-string) in `src/state/share.ts`.

## Animation

- Marks animate with `fade`, `pop` or `draw` plus a delay and duration. `el()` records those, so any moment can be computed from `t` instead of left to the browser.
- Charts with a story over time (G07's morph, G14's race, G15's stream, the force graphs settling) compute every frame from `t` themselves.
- The Animation settings scale duration and stagger, swap the easing (`src/core/ease.ts`), and add delay, hold and loop.

## Layout helpers

| File | What it does |
|---|---|
| `src/charts/glance/plot.ts` | round axis ticks, crisp hairlines, category slots, rounded bars, ring slices (d3-shape's `arc`), smoothed lines |
| `src/charts/glance/pielabels.ts` | labels outside a donut: lined up per side, spread apart, shortened or hidden when they don't fit |
| `src/charts/glance/morph.ts` | G07's shape morph: sample two outlines, line them up, blend |
| `src/charts/shared/ring.ts` | nodes round a circle, each taking the arc its dot needs (G04, N02) |
| `src/charts/shared/forcegraph.ts` | seeded d3-force physics, recorded step by step, plus live dragging (N01, G09) |
| `src/core/geom.ts` | polar helpers, blobs, path flattening |

B13's treemap and G05's tree use d3-hierarchy.

## Networks

- A layout starts every node at a seeded random spot, so the same "Layout variation" number always gives the same layout.
- The settling is recorded tick by tick, so scrubbing and video export replay it exactly.
- Dragging runs the physics live. When it settles, every node's position is saved into the data (px from the centre of the chart area), and a layout with saved positions is drawn exactly as saved. "Clear dragged positions" hands it back to the physics.

## Maps

- Outlines come from public-domain data: **Natural Earth** 1:50m countries (via the world-atlas package) and **U.S. Census Bureau** state boundaries (via us-atlas).
- `scripts/build-geo.mjs` (`npm run geo`) downloads them once into `.cache/geo/`, simplifies the shared borders (so neighbours still meet), keeps countries that cross the date line in one piece, and writes compact modules: `src/charts/maps/geo-usa.ts` and `geo-world.ts`.
- `geo.ts` places the outlines on a plain longitude/latitude grid: Alaska, Hawaii and Puerto Rico move into inset boxes, longitude is squeezed by 0.75, and the map is fitted and centred. Labels sit at the centroid of each region's largest piece.
- `choropleth.ts` is the body both maps share (five shades and a legend, or bubbles). `names.ts` accepts names, everyday names and codes (US postal codes, ISO 3166 codes).

## Text and fonts

- Nine fonts: Inter (default), Aeonik, Roboto, Fira Sans, Montserrat, IBM Plex Serif, PT Serif, JetBrains Mono and Cascadia Mono. `src/core/fonts.ts` lists them with their kind and weights.
- Charts measure text without the browser, from tables of letter widths (`src/core/text/<font>-metrics.json`, made by `npm run gen:metrics` from the font files). Inter's table is built in; the app registers the others at start-up (`src/core/text/all-metrics.ts`). While a chart is drawn, the scene builder switches to the table for its Font setting.
- Font files (`src/export/fonts.ts`): Inter and Aeonik live in `public/fonts/` (WOFF2 for the browser, TTF for outlining text in SVG exports); the others come from `@fontsource` packages (Latin WOFF2, and WOFF for outlining). The app declares every chart font with `@font-face` at start-up.
- Each chart uses six faces (weights 400–800 and italic). A font without one of those weights uses the one a browser would pick (`weightFor`): for example PT Serif draws 500 as Regular and 600 as Bold. Symbols a font lacks fall back to Inter, in the browser, the measurer and outlined SVG exports.

## Colour

- Four palettes (Mono, Porcelain, Palm, Wire) plus custom palettes, in `src/core/theme.ts`. Charts colour their marks by role (text, data, highlight, ramps), so every chart works in every palette.
- Custom palettes build the full role set from five inputs: paper, ink, grid, series colours and highlight.

## Exports

- **SVG** (`src/export/svg.ts`): literal colours, prefixed IDs, Illustrator-safe label halos and baselines; text can be turned into outlines with opentype.js.
- **Video** (`src/export/video.ts`): each frame is drawn to a canvas with the fonts embedded and encoded by Mediabunny as H.264 MP4, or WebM where the browser can't do H.264.
- **Code** (`src/export/code.ts`): `scripts/vite-runtime-plugin.ts` bundles each chart and the small runtime (`src/runtime/`) into `/runtime/<ID>.js` with esbuild. The exporter wraps it so it defines no global variables and draws inside a shadow root, so the host page's CSS can't touch it. Formats: HTML snippet, complete HTML page, React component, JavaScript module (with a `<graphit-<id>>` custom element), iframe embed and settings JSON.
- Fonts in code exports load from Google Fonts, are embedded, or use the page's own. Aeonik isn't on Google Fonts, so it is always embedded. A chart set in any font but Inter carries that font's letter widths in its export (`addTextFont`), so its text is placed as in the app.
- Every code export starts with a "Made with Graphit" line.
- When a chart's export bundles d3 code, d3's copyright and permission notice is printed at the top (the chart's `notices`).

## App

- Vite + React + TypeScript, a static single-page app. Routes: `/` (gallery), `/chart/:id` (editor) and `/embed/:id`.
- `vercel.json` sends every address to the app, so links like `/chart/b01` work when hosted.
- Vercel Web Analytics counts visits on the built site only (`src/main.tsx`). Its `beforeSend` keeps just the path, because share links carry the chart's data after the `#`. Exported code doesn't include it.

## Tests

- `npm test` (Vitest, in `tests/unit/`): every chart in every palette, every setting at its limits, bad data, clean SVG output, plus focused checks for layouts, maps, fonts and exports.
- `npm run test:e2e` (Playwright, in `tests/e2e/`): the editor, every chart's thumbnail, and the code exports pasted into real pages.

## Dependencies

All versions are pinned exactly and the lockfile is committed.

- **App:** react, react-dom, react-router, @vercel/analytics, zustand, lz-string, papaparse, mediabunny, opentype.js, d3-force, d3-hierarchy, d3-shape, and the @fontsource packages for Roboto, Fira Sans, Montserrat, IBM Plex Serif, PT Serif, JetBrains Mono and Cascadia Mono.
- **Development:** typescript, vite, @vitejs/plugin-react, esbuild, vitest, @playwright/test.
