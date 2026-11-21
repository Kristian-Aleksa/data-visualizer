// App state: one document per chart (only what differs from the defaults), undo/redo history,
// saved custom palettes, and UI preferences. Autosaved to localStorage (failures are ignored,
// e.g. in private browsing).

import { create } from 'zustand';
import { PRESET_ORDER, type CustomPalette } from '../core/theme';
import type { ChartData, Primitive, Settings } from '../core/types';

export interface Doc {
  /** undefined = the chart's demo data */
  data?: ChartData;
  /** only values that differ from the defaults */
  settings: Settings;
  /** undefined = follow the gallery palette */
  themeId?: string;
}

interface History {
  past: Doc[];
  future: Doc[];
  lastKey?: string;
  lastAt?: number;
}

export type UiTheme = 'system' | 'light' | 'dark';

interface State {
  docs: Record<string, Doc>;
  hist: Record<string, History>;
  palettes: CustomPalette[];
  galleryTheme: string;
  uiTheme: UiTheme;
  doc(id: string): Doc;
  /** coalesceKey: repeated edits of the same control within a moment become one undo step */
  setSetting(id: string, key: string, value: Primitive | undefined, coalesceKey?: string): void;
  setSettings(id: string, patch: Settings): void;
  setData(id: string, data: ChartData | undefined, coalesceKey?: string): void;
  setTheme(id: string, themeId: string | undefined): void;
  replaceDoc(id: string, doc: Doc): void;
  reset(id: string): void;
  undo(id: string): void;
  redo(id: string): void;
  savePalette(p: CustomPalette): void;
  deletePalette(paletteId: string): void;
  setGalleryTheme(themeId: string): void;
  setUiTheme(t: UiTheme): void;
}

const PREFIX = 'cs:v1:';
const EMPTY: Doc = { settings: {} };
const MAX_HISTORY = 120;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep working without autosave */
  }
}

function loadDocs(): Record<string, Doc> {
  const out: Record<string, Doc> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX + 'doc:')) continue;
      const d = read<Doc | null>(k.slice(PREFIX.length), null);
      if (d && typeof d === 'object' && d.settings) out[k.slice((PREFIX + 'doc:').length)] = d;
    }
  } catch {
    /* ignore */
  }
  return out;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function persistDoc(id: string, d: Doc | undefined) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => write(`doc:${id}`, d && (d.data || d.themeId || Object.keys(d.settings).length) ? d : undefined), 250));
}

export const useStore = create<State>((set, get) => {
  const commit = (id: string, next: Doc, coalesceKey?: string) => {
    const s = get();
    const prev = s.docs[id] ?? EMPTY;
    const h = s.hist[id] ?? { past: [], future: [] };
    const now = Date.now();
    const merge = coalesceKey !== undefined && h.lastKey === coalesceKey && now - (h.lastAt ?? 0) < 900;
    const past = merge ? h.past : [...h.past, prev].slice(-MAX_HISTORY);
    set({ docs: { ...s.docs, [id]: next }, hist: { ...s.hist, [id]: { past, future: [], lastKey: coalesceKey, lastAt: now } } });
    persistDoc(id, next);
  };

  return {
    docs: loadDocs(),
    hist: {},
    palettes: read<CustomPalette[]>('palettes', []),
    galleryTheme: read<string>('galleryTheme', 'mono'),
    uiTheme: read<UiTheme>('uiTheme', 'system'),
    doc: (id) => get().docs[id] ?? EMPTY,
    setSetting(id, key, value, coalesceKey) {
      const d = get().doc(id);
      const settings = { ...d.settings };
      if (value === undefined) delete settings[key];
      else settings[key] = value;
      commit(id, { ...d, settings }, coalesceKey ?? key);
    },
    setSettings(id, patch) {
      const d = get().doc(id);
      commit(id, { ...d, settings: { ...d.settings, ...patch } });
    },
    setData(id, data, coalesceKey) {
      commit(id, { ...get().doc(id), data }, coalesceKey);
    },
    setTheme(id, themeId) {
      commit(id, { ...get().doc(id), themeId });
    },
    replaceDoc(id, doc) {
      commit(id, { data: doc.data, settings: { ...doc.settings }, themeId: doc.themeId });
    },
    reset(id) {
      commit(id, { settings: {} });
    },
    undo(id) {
      const s = get();
      const h = s.hist[id];
      if (!h?.past.length) return;
      const prev = h.past[h.past.length - 1];
      const cur = s.docs[id] ?? EMPTY;
      set({ docs: { ...s.docs, [id]: prev }, hist: { ...s.hist, [id]: { past: h.past.slice(0, -1), future: [cur, ...h.future] } } });
      persistDoc(id, prev);
    },
    redo(id) {
      const s = get();
      const h = s.hist[id];
      if (!h?.future.length) return;
      const next = h.future[0];
      const cur = s.docs[id] ?? EMPTY;
      set({ docs: { ...s.docs, [id]: next }, hist: { ...s.hist, [id]: { past: [...h.past, cur], future: h.future.slice(1) } } });
      persistDoc(id, next);
    },
    savePalette(p) {
      const list = get().palettes;
      const palettes = list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
      set({ palettes });
      write('palettes', palettes);
    },
    deletePalette(paletteId) {
      const palettes = get().palettes.filter((x) => x.id !== paletteId);
      set({ palettes });
      write('palettes', palettes);
      if (get().galleryTheme === `custom:${paletteId}`) get().setGalleryTheme('mono');
    },
    setGalleryTheme(themeId) {
      set({ galleryTheme: themeId });
      write('galleryTheme', themeId);
    },
    setUiTheme(t) {
      set({ uiTheme: t });
      write('uiTheme', t);
    },
  };
});

export const PRESET_IDS = PRESET_ORDER;

export function canUndo(id: string): boolean {
  return (useStore.getState().hist[id]?.past.length ?? 0) > 0;
}
