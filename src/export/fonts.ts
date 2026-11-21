// Font files for the chart fonts: loaded by the app for the live preview (appFontFaceCss), embedded
// as base64 @font-face for video frames and offline HTML (an SVG drawn into a canvas can't see
// the page's web fonts), and parsed with opentype.js to turn text into outlines. Each font maps
// the six faces the charts use to its own files (see weightFor in src/core/fonts.ts); the
// packaged fonts use their Latin files, and other characters fall back to Inter.

import roboto400 from '@fontsource/roboto/files/roboto-latin-400-normal.woff2?url';
import roboto400W from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import roboto500 from '@fontsource/roboto/files/roboto-latin-500-normal.woff2?url';
import roboto500W from '@fontsource/roboto/files/roboto-latin-500-normal.woff?url';
import roboto600 from '@fontsource/roboto/files/roboto-latin-600-normal.woff2?url';
import roboto600W from '@fontsource/roboto/files/roboto-latin-600-normal.woff?url';
import roboto700 from '@fontsource/roboto/files/roboto-latin-700-normal.woff2?url';
import roboto700W from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import roboto800 from '@fontsource/roboto/files/roboto-latin-800-normal.woff2?url';
import roboto800W from '@fontsource/roboto/files/roboto-latin-800-normal.woff?url';
import roboto400i from '@fontsource/roboto/files/roboto-latin-400-italic.woff2?url';
import roboto400iW from '@fontsource/roboto/files/roboto-latin-400-italic.woff?url';
import firaSans400 from '@fontsource/fira-sans/files/fira-sans-latin-400-normal.woff2?url';
import firaSans400W from '@fontsource/fira-sans/files/fira-sans-latin-400-normal.woff?url';
import firaSans500 from '@fontsource/fira-sans/files/fira-sans-latin-500-normal.woff2?url';
import firaSans500W from '@fontsource/fira-sans/files/fira-sans-latin-500-normal.woff?url';
import firaSans600 from '@fontsource/fira-sans/files/fira-sans-latin-600-normal.woff2?url';
import firaSans600W from '@fontsource/fira-sans/files/fira-sans-latin-600-normal.woff?url';
import firaSans700 from '@fontsource/fira-sans/files/fira-sans-latin-700-normal.woff2?url';
import firaSans700W from '@fontsource/fira-sans/files/fira-sans-latin-700-normal.woff?url';
import firaSans800 from '@fontsource/fira-sans/files/fira-sans-latin-800-normal.woff2?url';
import firaSans800W from '@fontsource/fira-sans/files/fira-sans-latin-800-normal.woff?url';
import firaSans400i from '@fontsource/fira-sans/files/fira-sans-latin-400-italic.woff2?url';
import firaSans400iW from '@fontsource/fira-sans/files/fira-sans-latin-400-italic.woff?url';
import montserrat400 from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff2?url';
import montserrat400W from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff?url';
import montserrat500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2?url';
import montserrat500W from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff?url';
import montserrat600 from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2?url';
import montserrat600W from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff?url';
import montserrat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2?url';
import montserrat700W from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff?url';
import montserrat800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff2?url';
import montserrat800W from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff?url';
import montserrat400i from '@fontsource/montserrat/files/montserrat-latin-400-italic.woff2?url';
import montserrat400iW from '@fontsource/montserrat/files/montserrat-latin-400-italic.woff?url';
import plexSerif400 from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2?url';
import plexSerif400W from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff?url';
import plexSerif500 from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-normal.woff2?url';
import plexSerif500W from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-normal.woff?url';
import plexSerif600 from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-600-normal.woff2?url';
import plexSerif600W from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-600-normal.woff?url';
import plexSerif700 from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-normal.woff2?url';
import plexSerif700W from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-normal.woff?url';
import plexSerif400i from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff2?url';
import plexSerif400iW from '@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff?url';
import ptSerif400 from '@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff2?url';
import ptSerif400W from '@fontsource/pt-serif/files/pt-serif-latin-400-normal.woff?url';
import ptSerif700 from '@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff2?url';
import ptSerif700W from '@fontsource/pt-serif/files/pt-serif-latin-700-normal.woff?url';
import ptSerif400i from '@fontsource/pt-serif/files/pt-serif-latin-400-italic.woff2?url';
import ptSerif400iW from '@fontsource/pt-serif/files/pt-serif-latin-400-italic.woff?url';
import jetbrainsMono400 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import jetbrainsMono400W from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url';
import jetbrainsMono500 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';
import jetbrainsMono500W from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff?url';
import jetbrainsMono600 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2?url';
import jetbrainsMono600W from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff?url';
import jetbrainsMono700 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url';
import jetbrainsMono700W from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url';
import jetbrainsMono800 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff2?url';
import jetbrainsMono800W from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff?url';
import jetbrainsMono400i from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2?url';
import jetbrainsMono400iW from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff?url';
import cascadiaMono400 from '@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff2?url';
import cascadiaMono400W from '@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff?url';
import cascadiaMono500 from '@fontsource/cascadia-mono/files/cascadia-mono-latin-500-normal.woff2?url';
import cascadiaMono500W from '@fontsource/cascadia-mono/files/cascadia-mono-latin-500-normal.woff?url';
import cascadiaMono600 from '@fontsource/cascadia-mono/files/cascadia-mono-latin-600-normal.woff2?url';
import cascadiaMono600W from '@fontsource/cascadia-mono/files/cascadia-mono-latin-600-normal.woff?url';
import cascadiaMono700 from '@fontsource/cascadia-mono/files/cascadia-mono-latin-700-normal.woff2?url';
import cascadiaMono700W from '@fontsource/cascadia-mono/files/cascadia-mono-latin-700-normal.woff?url';
import cascadiaMono400i from '@fontsource/cascadia-mono/files/cascadia-mono-latin-400-italic.woff2?url';
import cascadiaMono400iW from '@fontsource/cascadia-mono/files/cascadia-mono-latin-400-italic.woff?url';
import { FACES, fontInfo, familyFromStack, type Face, type FamilyName } from '../core/fonts';
import { walk, type VNode } from '../core/vnode';

export type { Face, FamilyName } from '../core/fonts';

interface FaceFiles {
  /** for browsers (and embedding) */
  woff2: string;
  /** for opentype.js (TTF or WOFF; it can't read WOFF2) */
  outline: string;
}

const pkg = (woff2: string, woff: string): FaceFiles => ({ woff2, outline: woff });
const local = (dir: string, names: Record<Face, string>) =>
  Object.fromEntries(FACES.map((f) => [f, { woff2: `${dir}/${names[f]}.woff2`, outline: `${dir}/ttf/${names[f]}.ttf` }])) as Record<Face, FaceFiles>;

const FILES: Record<FamilyName, Record<Face, FaceFiles>> = {
  Inter: local('/fonts/inter', { '400': 'Inter-Regular', '500': 'Inter-Medium', '600': 'Inter-SemiBold', '700': 'Inter-Bold', '800': 'Inter-ExtraBold', '400i': 'Inter-Italic' }),
  // Aeonik has no semibold or extra bold: 600 uses Bold and 800 uses Black
  Aeonik: local('/fonts/aeonik', { '400': 'Aeonik-Regular', '500': 'Aeonik-Medium', '600': 'Aeonik-Bold', '700': 'Aeonik-Bold', '800': 'Aeonik-Black', '400i': 'Aeonik-RegularItalic' }),
  'Roboto': {
    '400': pkg(roboto400, roboto400W),
    '500': pkg(roboto500, roboto500W),
    '600': pkg(roboto600, roboto600W),
    '700': pkg(roboto700, roboto700W),
    '800': pkg(roboto800, roboto800W),
    '400i': pkg(roboto400i, roboto400iW),
  },
  'Fira Sans': {
    '400': pkg(firaSans400, firaSans400W),
    '500': pkg(firaSans500, firaSans500W),
    '600': pkg(firaSans600, firaSans600W),
    '700': pkg(firaSans700, firaSans700W),
    '800': pkg(firaSans800, firaSans800W),
    '400i': pkg(firaSans400i, firaSans400iW),
  },
  'Montserrat': {
    '400': pkg(montserrat400, montserrat400W),
    '500': pkg(montserrat500, montserrat500W),
    '600': pkg(montserrat600, montserrat600W),
    '700': pkg(montserrat700, montserrat700W),
    '800': pkg(montserrat800, montserrat800W),
    '400i': pkg(montserrat400i, montserrat400iW),
  },
  'IBM Plex Serif': {
    '400': pkg(plexSerif400, plexSerif400W),
    '500': pkg(plexSerif500, plexSerif500W),
    '600': pkg(plexSerif600, plexSerif600W),
    '700': pkg(plexSerif700, plexSerif700W),
    '800': pkg(plexSerif700, plexSerif700W),
    '400i': pkg(plexSerif400i, plexSerif400iW),
  },
  'PT Serif': {
    '400': pkg(ptSerif400, ptSerif400W),
    '500': pkg(ptSerif400, ptSerif400W),
    '600': pkg(ptSerif700, ptSerif700W),
    '700': pkg(ptSerif700, ptSerif700W),
    '800': pkg(ptSerif700, ptSerif700W),
    '400i': pkg(ptSerif400i, ptSerif400iW),
  },
  'JetBrains Mono': {
    '400': pkg(jetbrainsMono400, jetbrainsMono400W),
    '500': pkg(jetbrainsMono500, jetbrainsMono500W),
    '600': pkg(jetbrainsMono600, jetbrainsMono600W),
    '700': pkg(jetbrainsMono700, jetbrainsMono700W),
    '800': pkg(jetbrainsMono800, jetbrainsMono800W),
    '400i': pkg(jetbrainsMono400i, jetbrainsMono400iW),
  },
  'Cascadia Mono': {
    '400': pkg(cascadiaMono400, cascadiaMono400W),
    '500': pkg(cascadiaMono500, cascadiaMono500W),
    '600': pkg(cascadiaMono600, cascadiaMono600W),
    '700': pkg(cascadiaMono700, cascadiaMono700W),
    '800': pkg(cascadiaMono700, cascadiaMono700W),
    '400i': pkg(cascadiaMono400i, cascadiaMono400iW),
  },
};

export function faceOf(weight: unknown, italic: boolean): Face {
  if (italic) return '400i';
  const w = parseInt(String(weight ?? '400'), 10) || 400;
  if (w >= 750) return '800';
  if (w >= 650) return '700';
  if (w >= 550) return '600';
  if (w >= 450) return '500';
  return '400';
}

/** Which faces a tree uses (so exports embed only those). */
export function usedFaces(root: VNode): Set<Face> {
  const faces = new Set<Face>();
  walk(root, (n) => {
    if (n.tag === 'text') faces.add(faceOf(n.attrs['font-weight'], n.attrs['font-style'] === 'italic'));
  });
  return faces;
}

/** The font a chart's drawing is set in. */
export const familyOf = (root: VNode): FamilyName => familyFromStack(root.attrs['font-family']);

/** The weight a face is declared with in @font-face (italic is 400 italic). */
const cssWeight = (f: Face) => (f === '400i' ? 400 : Number(f));

/**
 * @font-face rules for every chart font except Inter (src/styles/fonts.css loads Inter, which
 * the app itself uses). Each of the six faces points at the file that draws it.
 */
export function appFontFaceCss(): string {
  const rules: string[] = [];
  for (const [family, faces] of Object.entries(FILES) as [FamilyName, Record<Face, FaceFiles>][]) {
    if (family === 'Inter') continue;
    for (const f of FACES) {
      rules.push(`@font-face{font-family:'${family}';font-style:${f === '400i' ? 'italic' : 'normal'};font-weight:${cssWeight(f)};font-display:swap;src:url('${faces[f].woff2}') format('woff2')}`);
    }
  }
  return rules.join('\n');
}

const bufCache = new Map<string, Promise<ArrayBuffer>>();
function fetchBuf(url: string): Promise<ArrayBuffer> {
  let p = bufCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Couldn’t load the font file ${url}`);
      return r.arrayBuffer();
    });
    p.catch(() => bufCache.delete(url));
    bufCache.set(url, p);
  }
  return p;
}

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** @font-face rules with the font files embedded, for the faces given. */
export async function fontFaceCss(family: FamilyName, faces: Iterable<Face>): Promise<string> {
  const files = FILES[fontInfo(family).name];
  const rules: string[] = [];
  for (const f of new Set(faces)) {
    const b64 = toBase64(await fetchBuf(files[f].woff2));
    rules.push(`@font-face{font-family:'${family}';font-style:${f === '400i' ? 'italic' : 'normal'};font-weight:${cssWeight(f)};src:url(data:font/woff2;base64,${b64}) format('woff2')}`);
  }
  return rules.join('');
}

const fontCache = new Map<string, Promise<import('opentype.js').Font>>();
/** Parsed font for outlining text. */
export function opentypeFont(family: FamilyName, f: Face) {
  const url = FILES[fontInfo(family).name][f].outline;
  let p = fontCache.get(url);
  if (!p) {
    p = Promise.all([import('opentype.js'), fetchBuf(url)]).then(([ot, buf]) => ot.parse(buf));
    p.catch(() => fontCache.delete(url));
    fontCache.set(url, p);
  }
  return p;
}
