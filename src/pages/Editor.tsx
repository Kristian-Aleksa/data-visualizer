import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CHARTS, getChart } from '../charts/registry';
import { APP_NAME } from '../config';
import { frameColors } from '../core/frame';
import { PRESET_ORDER } from '../core/theme';
import type { Primitive } from '../core/types';
import { decodeState, encodeState, parseSettingsFile } from '../state/share';
import { useStore } from '../state/store';
import { ColourPanel } from '../ui/ColourPanel';
import { SchemaFields, Section } from '../ui/controls';
import { DataPanel } from '../ui/DataPanel';
import { ExportPanel, ShortcutList, type ExportHandle } from '../ui/ExportPanel';
import { IconFile, IconLink, IconMoon, IconNext, IconPrev, IconRedo, IconReset, IconSun, IconUndo } from '../ui/icons';
import { useChartModel } from '../ui/model';
import { Preview, type PreviewHandle } from '../ui/Preview';

/** Shortcuts never fire while the person is typing. */
function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['range', 'checkbox', 'radio', 'button', 'color'].includes(type);
  }
  return false;
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const model = useChartModel(id);
  const store = useStore();
  const previewRef = useRef<PreviewHandle>(null);
  const exportRef = useRef<ExportHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'inputs' | 'preview' | 'output'>('preview');
  const [toast, setToast] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const toastTimer = useRef(0);
  const say = useCallback((s: string) => {
    setToast(s);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  }, []);

  const chartId = model?.def.id ?? '';
  const hist = useStore((s) => s.hist[chartId]);

  // Open a shared link (#s=…) once.
  useEffect(() => {
    if (!chartId) return;
    const dec = decodeState(location.hash);
    if (!dec) return;
    if (dec.id.toUpperCase() === chartId) {
      if (dec.palette) useStore.getState().savePalette(dec.palette);
      useStore.getState().replaceDoc(chartId, dec.doc);
      say('Loaded the shared chart. Undo (Ctrl+Z) goes back to your version.');
    }
    history.replaceState(null, '', location.pathname);
  }, [chartId, say]);

  useEffect(() => {
    if (model) document.title = `${model.def.id} ${model.def.name} · ${APP_NAME}`;
  }, [model]);

  const ids = CHARTS.map((c) => c.id);
  const idx = ids.indexOf(chartId);
  const go = useCallback((d: number) => navigate(`/chart/${ids[(idx + d + ids.length) % ids.length].toLowerCase()}`), [navigate, ids, idx]);

  const shareLink = useCallback(() => {
    if (!model) return;
    const url = `${location.origin}/chart/${chartId.toLowerCase()}#s=${encodeState(chartId, model.doc, model.palette)}`;
    navigator.clipboard.writeText(url).then(() => say('Share link copied. Anyone with the link sees this exact chart.'), () => say('Couldn’t copy. Your browser blocked the clipboard.'));
  }, [model, chartId, say]);

  const openSettings = async (f: File | undefined) => {
    if (!f) return;
    const r = parseSettingsFile(await f.text());
    if ('error' in r) {
      say(r.error);
      return;
    }
    const target = getChart(r.id);
    if (!target) {
      say(`That file is for chart ${r.id}, which isn’t available yet.`);
      return;
    }
    if (r.palette) store.savePalette(r.palette);
    store.replaceDoc(target.id, r.doc);
    if (target.id !== chartId) navigate(`/chart/${target.id.toLowerCase()}`);
    say(`Loaded settings for ${target.id} ${target.name}.`);
  };

  // keyboard shortcuts
  useEffect(() => {
    if (!chartId) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key;
      if (mod && k.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo(chartId);
        else useStore.getState().undo(chartId);
        return;
      }
      if (mod && k.toLowerCase() === 'y') {
        e.preventDefault();
        useStore.getState().redo(chartId);
        return;
      }
      if (mod || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if ((k === ' ' || k === 'Enter') && (tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A')) return;
      const p = previewRef.current;
      switch (k) {
        case 'r': case 'R': p?.replay(); break;
        case ' ': e.preventDefault(); p?.togglePlay(); break;
        case 'e': case 'E': exportRef.current?.run(); break;
        case 'c': case 'C': exportRef.current?.copySvg(); break;
        case 'l': case 'L': shareLink(); break;
        case '[': go(-1); break;
        case ']': go(1); break;
        case '1': case '2': case '3': case '4': useStore.getState().setTheme(chartId, PRESET_ORDER[Number(k) - 1]); break;
        case 'f': case 'F': p?.fit(); break;
        case '+': case '=': p?.zoom(1); break;
        case '-': case '_': p?.zoom(-1); break;
        case 'i': case 'I': p?.toggleInteractive(); break;
        case '?': setShowKeys((v) => !v); break;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartId, go, shareLink]);

  if (!model) {
    return (
      <div className="gallery">
        <h1>Chart not found</h1>
        <p className="muted">There’s no chart with that ID.</p>
        <Link className="btn" to="/">Back to the gallery</Link>
      </div>
    );
  }

  const { def, settings, scene } = model;
  const onChange = (key: string, v: Primitive | undefined) => {
    if (key === 'artboard' && v === 'custom') {
      store.setSettings(chartId, { artboard: 'custom', width: scene.width, height: scene.height });
      return;
    }
    store.setSetting(chartId, key, v === undefined || v === def.defaultSettings[key] ? undefined : v, key);
  };
  const fields = (group: string) => def.settingsSchema.filter((f) => f.group === group);
  const ui = store.uiTheme;

  return (
    <div className="editor" data-tab={tab}>
      <header className="topbar">
        <Link to="/" className="brand" title="Back to the gallery">{APP_NAME}</Link>
        <span className="sep" />
        <button className="icon-btn" onClick={() => go(-1)} title="Previous chart ([)" aria-label="Previous chart"><IconPrev /></button>
        <div className="title">
          <h1>{def.name}</h1>
          <span className="mono muted hide-narrow">{def.id}</span>
        </div>
        <button className="icon-btn" onClick={() => go(1)} title="Next chart (])" aria-label="Next chart"><IconNext /></button>
        <span className="spacer" />
        {toast && <span className="status hide-narrow" role="status" style={{ padding: 0 }}>{toast}</span>}
        <button className="icon-btn" onClick={() => store.undo(chartId)} disabled={!hist?.past.length} title="Undo (Ctrl+Z)" aria-label="Undo"><IconUndo /></button>
        <button className="icon-btn" onClick={() => store.redo(chartId)} disabled={!hist?.future.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><IconRedo /></button>
        <button className="icon-btn" onClick={() => store.reset(chartId)} title="Reset to defaults" aria-label="Reset to defaults"><IconReset /></button>
        <span className="sep hide-narrow" />
        <button className="btn small hide-narrow" onClick={shareLink} title="Copy share link (L)"><IconLink /> Share link</button>
        <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Open settings file" aria-label="Open settings file"><IconFile /></button>
        <button className="icon-btn" onClick={() => store.setUiTheme(ui === 'system' ? 'light' : ui === 'light' ? 'dark' : 'system')} title={`App theme: ${ui}`} aria-label="Switch light or dark mode">
          {ui === 'dark' ? <IconMoon /> : <IconSun />}
        </button>
        <button className="icon-btn" onClick={() => setShowKeys((v) => !v)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts"><span style={{ fontWeight: 700 }}>?</span></button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => openSettings(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      </header>

      <nav className="panel-tabs" role="tablist" aria-label="Editor panels">
        {(['inputs', 'preview', 'output'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'inputs' ? 'Inputs' : t === 'preview' ? 'Preview' : 'Output'}
          </button>
        ))}
      </nav>

      <aside className="panel left" aria-label="Inputs">
        <Section title="Data" count={`${scene.data[def.dataSchema.tables[0].key]?.length ?? 0} rows`}>
          <DataPanel def={def} data={model.data} isDemo={!model.doc.data} issues={scene.issues} onChange={(d, k) => store.setData(chartId, d, k)} />
        </Section>
        <Section title="Text">
          <SchemaFields fields={fields('text')} settings={settings} data={model.data} theme={model.theme} onChange={onChange} />
        </Section>
        <Section title="Colour" count={model.theme.name}>
          <ColourPanel def={def} themeId={model.themeId} theme={model.theme} onPick={(t) => store.setTheme(chartId, t)} />
        </Section>
        <Section title="Chart options">
          <SchemaFields
            fields={fields('options')}
            settings={settings}
            data={model.data}
            onChange={onChange}
            onAction={(f) => {
              const r = f.run(model.data, settings);
              if (r.data) store.setData(chartId, r.data);
              if (r.settings) store.setSettings(chartId, r.settings);
            }}
          />
        </Section>
        <Section title="Interactivity">
          <SchemaFields fields={fields('interactivity')} settings={settings} data={model.data} onChange={onChange} />
          <div className="field-help" style={{ padding: '2px 14px 6px' }}>Applies to the interactive preview, the embed and the HTML/React exports.</div>
        </Section>
        <Section title="Animation" count={`${scene.timeline.duration.toFixed(2)} s`}>
          <SchemaFields fields={fields('animation')} settings={settings} data={model.data} onChange={onChange} />
        </Section>
      </aside>

      <main className="stage-host" aria-label="Preview">
        <Preview
          ref={previewRef}
          def={def}
          input={model.input}
          width={scene.width}
          height={scene.height}
          issues={scene.issues}
          fatal={scene.fatal}
          onDataChange={(d) => {
            store.setData(chartId, d, 'drag');
            say('Positions saved. Undo (Ctrl+Z) puts them back.');
          }}
        />
      </main>

      <aside className="panel right" aria-label="Output">
        <Section title="Artboard" count={`${scene.width} × ${scene.height}`}>
          <SchemaFields fields={fields('artboard')} settings={settings} data={model.data} onChange={onChange} fallbacks={{ bgColor: frameColors(def, model.theme).bg }} />
        </Section>
        <Section title="Export">
          <ExportPanel ref={exportRef} model={model} progress={() => previewRef.current?.progress() ?? 1} onOpenSettings={() => fileRef.current?.click()} />
        </Section>
        <Section title="Keyboard shortcuts" open={showKeys}>
          <ShortcutList />
        </Section>
      </aside>

      {showKeys && (
        <div className="dialog-backdrop" onClick={() => setShowKeys(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)' }}>
            <h2>Keyboard shortcuts</h2>
            <p className="muted" style={{ margin: 0 }}>Single keys, no Cmd needed. Shortcuts pause while you type in a box.</p>
            <ShortcutList />
            <div className="actions">
              <button className="btn" onClick={() => setShowKeys(false)} autoFocus>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
