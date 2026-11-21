// Generates the letter-width tables the charts measure text with: src/core/text/<slug>-metrics.json.
// Inter's table also lists the characters and Inter's vertical metrics; the other tables use the
// same character order. A monospaced font stores one width; a weight that draws with the same
// file as another stores that weight's name instead of a copy.
// Run with: npm run gen:metrics (after a font file or the weight mapping in src/core/fonts.ts changes)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const { parse } = opentype;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Printable ASCII, Latin-1, and the symbols that appear in chart labels.
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x2010, 0x2027], [0x2030, 0x203a], [0x2190, 0x2199], [0x2460, 0x2469]];
const extra = [0x2212, 0x2264, 0x2265, 0x00d7, 0x25b2, 0x25bc, 0x25cf, 0x25cb, 0x2726, 0x2727, 0x20ac, 0x2122, 0x2248];
const codes = new Set(extra);
for (const [a, b] of ranges) for (let c = a; c <= b; c++) codes.add(c);
const chars = [...codes].sort((a, b) => a - b).map((c) => String.fromCodePoint(c));

const FACES = ['400', '500', '600', '700', '800', '400i'];

/** Same rule as weightFor() in src/core/fonts.ts. */
function weightFor(weights, face) {
  const want = face === '400i' ? 400 : Number(face);
  if (weights.includes(want)) return want;
  const lighter = weights.filter((w) => w < want).sort((a, b) => b - a);
  const heavier = weights.filter((w) => w > want).sort((a, b) => a - b);
  return want <= 500 ? (lighter[0] ?? heavier[0] ?? 400) : (heavier[0] ?? lighter[0] ?? 400);
}

/** A family served from an @fontsource package (latin subset, WOFF so opentype.js can read it). */
const fontsource = (family, pkg, weights) => ({
  family,
  slug: pkg,
  file: (face) => {
    const w = weightFor(weights, face);
    const style = face === '400i' ? 'italic' : 'normal';
    return join('node_modules/@fontsource', pkg, 'files', `${pkg}-latin-${w}-${style}.woff`);
  },
});

const FAMILIES = [
  {
    family: 'Inter',
    slug: 'inter',
    file: (face) => join('public/fonts/inter/ttf', { 400: 'Inter-Regular', 500: 'Inter-Medium', 600: 'Inter-SemiBold', 700: 'Inter-Bold', 800: 'Inter-ExtraBold', '400i': 'Inter-Italic' }[face] + '.ttf'),
  },
  {
    family: 'Aeonik',
    slug: 'aeonik',
    file: (face) => join('public/fonts/aeonik/ttf', { 400: 'Aeonik-Regular', 500: 'Aeonik-Medium', 600: 'Aeonik-Bold', 700: 'Aeonik-Bold', 800: 'Aeonik-Black', '400i': 'Aeonik-RegularItalic' }[face] + '.ttf'),
  },
  fontsource('Roboto', 'roboto', [400, 500, 600, 700, 800]),
  fontsource('Fira Sans', 'fira-sans', [400, 500, 600, 700, 800]),
  fontsource('Montserrat', 'montserrat', [400, 500, 600, 700, 800]),
  fontsource('IBM Plex Serif', 'ibm-plex-serif', [400, 500, 600, 700]),
  fontsource('PT Serif', 'pt-serif', [400, 700]),
  fontsource('JetBrains Mono', 'jetbrains-mono', [400, 500, 600, 700, 800]),
  fontsource('Cascadia Mono', 'cascadia-mono', [400, 500, 600, 700]),
];

function readFont(path) {
  const buf = readFileSync(join(root, path));
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

for (const fam of FAMILIES) {
  const out = { family: fam.family, unitsPerEm: 0 };
  const widths = {};
  const seen = new Map(); // file → the first face that used it
  for (const face of FACES) {
    const path = fam.file(face);
    if (seen.has(path)) {
      widths[face] = seen.get(path);
      continue;
    }
    seen.set(path, face);
    const font = readFont(path);
    if (face === '400') {
      out.unitsPerEm = font.unitsPerEm;
      if (fam.slug === 'inter') Object.assign(out, { ascender: font.ascender, descender: font.descender, xHeight: font.tables.os2.sxHeight, capHeight: font.tables.os2.sCapHeight, chars: chars.join('') });
    }
    const notdef = font.glyphs.get(0);
    widths[face] = chars.map((ch) => {
      const g = font.charToGlyph(ch);
      return g && g !== notdef ? Math.round(g.advanceWidth) : -1;
    });
  }
  const all = Object.values(widths).filter(Array.isArray).flat().filter((w) => w > 0);
  if (fam.slug !== 'inter' && all.every((w) => w === all[0])) out.mono = all[0];
  else out.widths = widths;
  const dest = join(root, `src/core/text/${fam.slug}-metrics.json`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(out));
  const missing = chars.filter((_, i) => Array.isArray(widths['400']) && widths['400'][i] < 0).length;
  console.log(`${fam.family}: ${out.mono ? `monospaced, ${out.mono} units` : `${Object.values(widths).filter(Array.isArray).length} width tables`}; unitsPerEm ${out.unitsPerEm}; ${missing} of ${chars.length} characters fall back to Inter`);
}
