// Share links and settings files: the whole chart state, compressed into the URL hash.

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { APP_NAME } from '../config';
import type { CustomPalette } from '../core/theme';
import type { ChartData, Settings } from '../core/types';
import type { Doc } from './store';

interface Shared {
  v: 1;
  id: string;
  s: Settings;
  d?: ChartData;
  t?: string;
  p?: CustomPalette;
}

export function encodeState(id: string, doc: Doc, palette?: CustomPalette): string {
  const payload: Shared = { v: 1, id, s: doc.settings };
  if (doc.data) payload.d = doc.data;
  if (doc.themeId) payload.t = doc.themeId;
  if (palette) payload.p = palette;
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export interface Decoded {
  id: string;
  doc: Doc;
  palette?: CustomPalette;
}

function fromShared(x: Partial<Shared>): Decoded | null {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string') return null;
  return {
    id: x.id,
    doc: { settings: x.s && typeof x.s === 'object' ? x.s : {}, data: x.d && typeof x.d === 'object' ? x.d : undefined, themeId: typeof x.t === 'string' ? x.t : undefined },
    palette: x.p && typeof x.p === 'object' && Array.isArray(x.p.series) ? x.p : undefined,
  };
}

export function decodeState(hash: string): Decoded | null {
  const m = /[#&]s=([^&]+)/.exec(hash);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    return json ? fromShared(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

/** Settings JSON export (also loadable via "Open settings file"). */
export function settingsFile(id: string, name: string, doc: Doc, data: ChartData, settings: Settings, palette?: CustomPalette): string {
  return JSON.stringify(
    {
      app: APP_NAME,
      version: 1,
      chart: id,
      chartName: name,
      theme: doc.themeId ?? null,
      palette: palette ?? null,
      data,
      settings,
    },
    null,
    2,
  );
}

export function parseSettingsFile(text: string): Decoded | { error: string } {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t valid JSON.' };
  }
  if (!j || typeof j.chart !== 'string') return { error: `That file isn’t a ${APP_NAME} settings file (no chart ID inside).` };
  const d = fromShared({ v: 1, id: j.chart, s: j.settings as Settings, d: j.data as ChartData, t: (j.theme as string) ?? undefined, p: (j.palette as CustomPalette) ?? undefined });
  return d ?? { error: 'That settings file couldn’t be read.' };
}
