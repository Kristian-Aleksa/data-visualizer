// Colour section: the four presets, saved custom palettes, and the custom palette editor.
// Shows only the colour controls the chart actually uses (its paletteNeeds).

import { useState } from 'react';
import type { ChartDef } from '../core/chart';
import { contrast, isColor } from '../core/color';
import { PRESETS, PRESET_ORDER, paletteFromTheme, themeFromPalette, type CustomPalette, type Theme } from '../core/theme';
import { useStore } from '../state/store';
import { ColorInput } from './controls';
import { IconPlus, IconTrash } from './icons';

export function Swatch({ theme }: { theme: Theme }) {
  const cols = [theme.bg, theme.text, ...theme.cat4.slice(0, 3), theme.hero];
  return (
    <span className="sw" aria-hidden="true">
      {cols.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

function ContrastWarnings({ theme, dark }: { theme: Theme; dark: boolean }) {
  const checks: [string, number][] = [['Text on the background', contrast(theme.text, theme.bg)]];
  if (dark) checks.push(['Text on the dark card', contrast(theme.dark.text, theme.dark.cardBg)]);
  const low = checks.filter(([, r]) => r < 4.5);
  if (!low.length) return null;
  return (
    <div className="notice warn" role="status">
      {low.map(([what, r]) => (
        <div key={what}>
          {what} has a contrast of {r.toFixed(1)}:1, below the WCAG AA minimum of 4.5:1. It may be hard to read.
        </div>
      ))}
    </div>
  );
}

export function ColourPanel({ def, themeId, theme, onPick }: { def: ChartDef; themeId: string; theme: Theme; onPick: (id: string) => void }) {
  const palettes = useStore((s) => s.palettes);
  const savePalette = useStore((s) => s.savePalette);
  const deletePalette = useStore((s) => s.deletePalette);
  const [hexText, setHexText] = useState('');
  const current = themeId.startsWith('custom:') ? palettes.find((p) => `custom:${p.id}` === themeId) : undefined;
  const needs = new Set(def.paletteNeeds);

  const createFrom = () => {
    const id = Math.random().toString(36).slice(2, 9);
    const p = paletteFromTheme(theme, id, `My palette ${palettes.length + 1}`);
    savePalette(p);
    onPick(`custom:${id}`);
  };
  const update = (patch: Partial<CustomPalette>) => current && savePalette({ ...current, ...patch });
  const applyHex = () => {
    const codes = (hexText.match(/#?[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map((c) => (c.startsWith('#') ? c : `#${c}`).toUpperCase());
    if (codes.length) update({ series: codes.slice(0, 8) });
    setHexText('');
  };

  return (
    <div>
      <div className="palettes" role="group" aria-label="Palettes">
        {PRESET_ORDER.map((id, i) => (
          <button key={id} className="pal" aria-pressed={themeId === id} onClick={() => onPick(id)} title={`${PRESETS[id].name} (key ${i + 1})`}>
            <Swatch theme={PRESETS[id]} />
            <span>
              {PRESETS[id].name} <small>{i + 1}</small>
            </span>
          </button>
        ))}
        {palettes.map((p) => {
          const t = themeFromPalette(p);
          return (
            <button key={p.id} className="pal" aria-pressed={themeId === `custom:${p.id}`} onClick={() => onPick(`custom:${p.id}`)}>
              <Swatch theme={t} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
      <div style={{ padding: '0 14px 6px' }}>
        <button className="btn small wide" onClick={createFrom}>
          <IconPlus /> {current ? 'Duplicate this palette' : `Customize ${theme.name}`}
        </button>
      </div>
      <ContrastWarnings theme={theme} dark={!!def.card.dark} />
      {current && (
        <div>
          <div className="subhead">Custom palette</div>
          <div className="field">
            <div className="field-head">
              <label htmlFor="pal-name">Name</label>
            </div>
            <input id="pal-name" className="input" value={current.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="field">
            <div className="field-head">
              <label htmlFor="pal-bg">Background (paper)</label>
            </div>
            <ColorInput id="pal-bg" value={current.bg} fallback="#F0EFEB" onChange={(v) => isColor(v) && update({ bg: v })} />
          </div>
          <div className="field">
            <div className="field-head">
              <label htmlFor="pal-ink">Text (ink)</label>
            </div>
            <ColorInput id="pal-ink" value={current.ink} fallback="#1C1C1A" onChange={(v) => isColor(v) && update({ ink: v })} />
          </div>
          <div className="field">
            <div className="field-head">
              <label htmlFor="pal-grid">Gridlines</label>
            </div>
            <ColorInput id="pal-grid" value={current.grid} fallback="Automatic (from text)" onChange={(v) => update({ grid: v })} />
          </div>
          <div className="field">
            <div className="field-head">
              <label>{needs.has('categorical') ? 'Series colours' : 'Data colours'}</label>
            </div>
            <div className="series-list">
              {current.series.map((c, i) => (
                <div key={i} className="color-row">
                  <div style={{ flex: 1 }}>
                    <ColorInput value={c} fallback="#000000" onChange={(v) => isColor(v) && update({ series: current.series.map((x, k) => (k === i ? v : x)) })} />
                  </div>
                  <button className="icon-btn" aria-label={`Remove colour ${i + 1}`} disabled={current.series.length <= 1} onClick={() => update({ series: current.series.filter((_, k) => k !== i) })}>
                    <IconTrash />
                  </button>
                </div>
              ))}
              <button className="btn small" disabled={current.series.length >= 8} onClick={() => update({ series: [...current.series, current.series[current.series.length - 1] ?? '#888888'] })}>
                <IconPlus /> Add colour
              </button>
            </div>
            <div className="field-help">
              {needs.has('categorical') ? 'One colour per category, in order.' : 'The first colour draws the data; lighter and darker steps are made from it.'}
            </div>
          </div>
          <div className="field">
            <div className="field-head">
              <label htmlFor="pal-hex">Paste hex codes (brand colours)</label>
            </div>
            <div className="color-row">
              <input id="pal-hex" className="input mono" value={hexText} placeholder="#0B3D91, #F2A900, …" onChange={(e) => setHexText(e.target.value)} />
              <button className="btn small" onClick={applyHex} disabled={!hexText.trim()}>
                Use
              </button>
            </div>
          </div>
          {needs.has('highlight') && (
            <div className="field">
              <div className="field-head">
                <label htmlFor="pal-hl">Highlight colour</label>
              </div>
              <ColorInput id="pal-hl" value={current.highlight} fallback="Same as the first data colour" onChange={(v) => update({ highlight: v })} />
            </div>
          )}
          {def.card.dark && (
            <div className="field">
              <div className="field-head">
                <label htmlFor="pal-dark">Dark card background</label>
              </div>
              <ColorInput id="pal-dark" value={current.darkBg} fallback="Automatic" onChange={(v) => update({ darkBg: v })} />
            </div>
          )}
          <div className="switch-row">
            <label htmlFor="pal-boost">Thicken hairlines (recommended for colour)</label>
            <input id="pal-boost" type="checkbox" role="switch" className="switch" checked={current.inkBoost} onChange={(e) => update({ inkBoost: e.target.checked })} />
          </div>
          {needs.has('highlight') && (
            <div className="switch-row">
              <label htmlFor="pal-hero">Highlight one element (like Wire)</label>
              <input id="pal-hero" type="checkbox" role="switch" className="switch" checked={current.heroMode} onChange={(e) => update({ heroMode: e.target.checked })} />
            </div>
          )}
          <div style={{ padding: '6px 14px' }}>
            <button
              className="btn small"
              onClick={() => {
                deletePalette(current.id);
                onPick('mono');
              }}
            >
              <IconTrash /> Delete this palette
            </button>
          </div>
          <div className="field-help" style={{ padding: '0 14px' }}>Custom palettes are saved in this browser and can be used on every chart.</div>
        </div>
      )}
    </div>
  );
}
