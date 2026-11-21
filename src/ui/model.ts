// Everything the editor needs about one chart, derived from the store.

import { useMemo } from 'react';
import { getChart } from '../charts/registry';
import type { ChartDef } from '../core/chart';
import { buildScene, type Scene, type SceneInput } from '../core/scene';
import { sanitizeSettings } from '../core/settings';
import { resolveTheme, type CustomPalette, type Theme } from '../core/theme';
import type { ChartData, Settings } from '../core/types';
import { useStore, type Doc } from '../state/store';

const EMPTY: Doc = { settings: {} };

export interface ChartModel {
  def: ChartDef;
  doc: Doc;
  themeId: string;
  theme: Theme;
  palette?: CustomPalette;
  /** effective settings (defaults + overrides) */
  settings: Settings;
  data: ChartData;
  input: SceneInput;
  scene: Scene;
}

export function useChartModel(id: string | undefined): ChartModel | null {
  const def = getChart(id);
  const key = def?.id ?? '';
  const doc = useStore((s) => s.docs[key] ?? EMPTY);
  const galleryTheme = useStore((s) => s.galleryTheme);
  const palettes = useStore((s) => s.palettes);
  const themeId = doc.themeId ?? galleryTheme;
  return useMemo(() => {
    if (!def) return null;
    const theme = resolveTheme(themeId, palettes);
    const palette = themeId.startsWith('custom:') ? palettes.find((p) => `custom:${p.id}` === themeId) : undefined;
    const input: SceneInput = { data: doc.data, settings: doc.settings, theme };
    return {
      def,
      doc,
      themeId: theme.id,
      theme,
      palette,
      settings: sanitizeSettings(def.settingsSchema, doc.settings),
      data: doc.data ?? def.defaultData,
      input,
      scene: buildScene(def, input),
    };
  }, [def, doc, themeId, palettes]);
}
