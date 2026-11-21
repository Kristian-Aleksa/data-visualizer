// Every font's letter widths, for the app (the gallery, editor, SVG and video exports). Code
// exports carry only the table for the font they use (see src/export/code.ts), so this file is
// kept out of the export runtime.

import type { FamilyName } from '../fonts';
import AEONIK from './aeonik-metrics.json';
import CASCADIA_MONO from './cascadia-mono-metrics.json';
import FIRA_SANS from './fira-sans-metrics.json';
import IBM_PLEX_SERIF from './ibm-plex-serif-metrics.json';
import JETBRAINS_MONO from './jetbrains-mono-metrics.json';
import MONTSERRAT from './montserrat-metrics.json';
import PT_SERIF from './pt-serif-metrics.json';
import ROBOTO from './roboto-metrics.json';
import { registerTextFont, type FontMetrics } from './metrics';

/** Widths for every font except Inter (which is built into the measurer). */
export const TEXT_METRICS: Partial<Record<FamilyName, FontMetrics>> = {
  Aeonik: AEONIK as FontMetrics,
  Roboto: ROBOTO as FontMetrics,
  'Fira Sans': FIRA_SANS as FontMetrics,
  Montserrat: MONTSERRAT as FontMetrics,
  'IBM Plex Serif': IBM_PLEX_SERIF as FontMetrics,
  'PT Serif': PT_SERIF as FontMetrics,
  'JetBrains Mono': JETBRAINS_MONO as FontMetrics,
  'Cascadia Mono': CASCADIA_MONO as FontMetrics,
};

/** Make every font's widths available for measuring. */
export function registerAllTextFonts(): void {
  for (const [family, m] of Object.entries(TEXT_METRICS)) if (m) registerTextFont(family, m);
}
