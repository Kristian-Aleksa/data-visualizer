// Export tabs: SVG (download / copy for Figma), MP4 (or WebM) video, and code.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { fontInfo } from '../core/fonts';
import { frameColors } from '../core/frame';
import type { Settings } from '../core/types';
import { componentName, customTag, embedSnippet, embedUrl, htmlPage, htmlSnippet, jsModuleExport, reactExport, type FontMode } from '../export/code';
import { exportSvg } from '../export/svg';
import { exportVideo, probeVideo, videoSupport, type VideoFormat, type VideoSupport } from '../export/video';
import { encodeState, settingsFile } from '../state/share';
import { ColorInput, NumberControl } from './controls';
import { download } from './DataPanel';
import { IconCopy, IconDownload, IconFile } from './icons';
import type { ChartModel } from './model';

export interface ExportHandle {
  /** run the primary action of the open tab (the E shortcut) */
  run(): void;
  copySvg(): void;
}

type Tab = 'svg' | 'video' | 'code';
type CodeTab = 'html' | 'react' | 'js' | 'embed' | 'json';
type FontKey = 'snippet' | 'page' | 'react' | 'js';
/** Font choices for code exports; a font Google Fonts doesn't serve (Aeonik) can only be embedded. */
const fontOptions = (family: string): { value: FontMode; label: string; disabled?: boolean }[] => [
  fontInfo(family).google
    ? { value: 'google', label: `Load ${family} from Google Fonts` }
    : { value: 'google', label: `Google Fonts (not available for ${family})`, disabled: true },
  { value: 'embed', label: 'Embed the font files (bigger, works offline)' },
  { value: 'none', label: 'Use the website’s own fonts' },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} aria-pressed={o.value === value} disabled={o.disabled} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

const fileBase = (m: ChartModel) => `${m.def.id.toLowerCase()}-${m.def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const ExportPanel = forwardRef<ExportHandle, { model: ChartModel; progress: () => number; onOpenSettings: () => void }>(function ExportPanel({ model, progress, onOpenSettings }, ref) {
  const [tab, setTab] = useState<Tab>('svg');
  const [status, setStatus] = useState('');
  const sayTimer = useRef(0);
  const say = (s: string) => {
    setStatus(s);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setStatus(''), 4000);
  };

  // ── SVG
  const [svgFrame, setSvgFrame] = useState<'final' | 'current'>('final');
  const [svgBg, setSvgBg] = useState<'fill' | 'transparent'>('fill');
  const [svgText, setSvgText] = useState<'editable' | 'outlined'>('editable');
  const makeSvg = () => exportSvg(model.def, model.input, { frame: svgFrame, progress: progress(), background: svgBg, text: svgText });
  const downloadSvg = async () => {
    try {
      say('Preparing SVG…');
      download(`${fileBase(model)}.svg`, await makeSvg(), 'image/svg+xml');
      say('SVG downloaded.');
    } catch (e) {
      say(`Couldn’t make the SVG: ${(e as Error).message}`);
    }
  };
  const copySvg = async () => {
    try {
      const ok = await copyText(await makeSvg());
      say(ok ? 'SVG copied. In Figma, paste with Ctrl+V (or Cmd+V).' : 'Your browser blocked the clipboard. Use Download instead.');
    } catch (e) {
      say(`Couldn’t make the SVG: ${(e as Error).message}`);
    }
  };

  // ── Video
  const tl = model.scene.timeline;
  const [scale, setScale] = useState<1 | 2>(1);
  const [fps, setFps] = useState<30 | 60>(30);
  const [duration, setDuration] = useState<number>(0);
  const [hold, setHold] = useState<number>(tl.hold);
  const [loops, setLoops] = useState(1);
  const frameBg = frameColors(model.def, model.theme).bg;
  const [bg, setBg] = useState('');
  const [format, setFormat] = useState<VideoFormat>('mp4');
  const [support, setSupport] = useState<VideoSupport | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [result, setResult] = useState('');
  const abort = useRef<AbortController | null>(null);
  const W = model.scene.width * scale, H = model.scene.height * scale;
  useEffect(() => {
    if (tab !== 'video') return; // the encoder library loads only when this tab is opened
    let live = true;
    videoSupport(W, H).then((s) => {
      if (!live) return;
      setSupport(s);
      setFormat((f) => (f === 'mp4' && !s.mp4 && s.webm ? 'webm' : f));
    });
    return () => {
      live = false;
    };
  }, [W, H, tab]);
  const effDuration = duration > 0 ? duration : tl.duration;
  const runVideo = async () => {
    if (busy) return;
    setBusy(true);
    setPct(0);
    setResult('');
    abort.current = new AbortController();
    try {
      const res = await exportVideo(model.def, model.input, { scale, fps, duration: effDuration, hold, loops, background: bg || frameBg, format }, setPct, abort.current.signal);
      download(`${fileBase(model)}.${res.ext}`, res.blob, res.blob.type);
      const info = await probeVideo(res.blob).catch(() => null);
      setResult(
        info
          ? `Saved ${res.ext.toUpperCase()}: ${info.width}×${info.height}, ${info.duration.toFixed(2)} s, ${Math.round(info.fps)} fps (${(res.blob.size / 1e6).toFixed(1)} MB).`
          : `Saved ${res.ext.toUpperCase()} (${(res.blob.size / 1e6).toFixed(1)} MB).`,
      );
    } catch (e) {
      setResult((e as Error).name === 'AbortError' ? 'Export cancelled.' : `Video export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  // ── Code
  const [codeTab, setCodeTab] = useState<CodeTab>('html');
  const [htmlMode, setHtmlMode] = useState<'snippet' | 'page'>('snippet');
  const [reactLang, setReactLang] = useState<'tsx' | 'jsx'>('tsx');
  const [jsLang, setJsLang] = useState<'js' | 'ts'>('js');
  const [fonts, setFonts] = useState<Record<FontKey, FontMode>>({ snippet: 'google', page: 'embed', react: 'google', js: 'google' });
  const fontKey: FontKey | null = codeTab === 'html' ? htmlMode : codeTab === 'react' ? 'react' : codeTab === 'js' ? 'js' : null;
  const chartFont = fontInfo(model.settings.fontFamily).name;
  /** the font mode shown and used: a font Google Fonts doesn't serve is embedded instead */
  const fontFor = (k: FontKey): FontMode => (!fontInfo(chartFont).google && fonts[k] === 'google' ? 'embed' : fonts[k]);
  const [code, setCode] = useState('');
  const state = useMemo(() => encodeState(model.def.id, model.doc, model.palette), [model.def.id, model.doc, model.palette]);
  const codeInput = useMemo(() => ({ def: model.def, data: model.doc.data, settings: model.doc.settings as Settings, theme: model.theme }), [model]);
  useEffect(() => {
    if (tab !== 'code') return;
    let live = true;
    setCode('Generating…');
    const job =
      codeTab === 'html' ? (htmlMode === 'snippet' ? htmlSnippet(codeInput, fontFor('snippet')) : htmlPage(codeInput, fontFor('page')))
        : codeTab === 'react' ? reactExport(codeInput, fontFor('react'), reactLang)
          : codeTab === 'js' ? jsModuleExport(codeInput, fontFor('js'), jsLang)
            : codeTab === 'embed' ? Promise.resolve(embedSnippet(codeInput, location.origin, state))
              : Promise.resolve(settingsFile(model.def.id, model.def.name, model.doc, model.data, model.settings, model.palette));
    job.then((c) => live && setCode(c)).catch((e) => live && setCode(`// Couldn’t generate this export: ${(e as Error).message}`));
    return () => {
      live = false;
    };
  }, [tab, codeTab, htmlMode, reactLang, jsLang, fonts, codeInput, state, model]);
  const name = componentName(model.def);
  const jsFile = `${fileBase(model)}.${jsLang}`;
  const codeFile: [string, string] = {
    html: [htmlMode === 'snippet' ? `${fileBase(model)}-snippet.html` : `${fileBase(model)}.html`, 'text/html'],
    // octet-stream keeps the exact file name (Safari adds .txt to text/plain downloads)
    react: [`${name}.${reactLang}`, 'application/octet-stream'],
    js: [jsFile, jsLang === 'js' ? 'text/javascript' : 'application/octet-stream'],
    embed: [`${fileBase(model)}-embed.html`, 'text/html'],
    json: [`${fileBase(model)}.chart.json`, 'application/json'],
  }[codeTab] as [string, string];
  const howTo: Record<CodeTab, string> = {
    html:
      htmlMode === 'snippet'
        ? 'Paste into any web page, or into an HTML/code block in WordPress, Squarespace, Ghost, Wix or Webflow. It needs no other files and can be pasted more than once on a page.'
        : 'Save as an .html file. It opens by double-click and can be uploaded as a page of its own.',
    react: `Save as ${name}.${reactLang} in your app, then import ${name} and render <${name} />. Works in Next.js, Vite and Create React App; no extra packages needed.`,
    js: `Save as ${jsFile}. In HTML, load it with <script type="module" src="./${jsFile.replace(/\.ts$/, '.js')}"> and place <${customTag(model.def)}></${customTag(model.def)}>. In Vue, Svelte or Angular, import mountChart and call it on an element.`,
    embed: '',
    json: '',
  };

  useImperativeHandle(ref, () => ({
    run: () => {
      if (tab === 'svg') void downloadSvg();
      else if (tab === 'video') void runVideo();
      else void copyText(code).then((ok) => say(ok ? 'Code copied.' : 'Couldn’t copy. Use Download instead.'));
    },
    copySvg: () => void copySvg(),
  }));

  return (
    <div className="export">
      <div className="tabs" role="tablist" aria-label="Export format">
        {(['svg', 'video', 'code'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'svg' ? 'SVG' : t === 'video' ? 'MP4' : 'Code'}
          </button>
        ))}
      </div>

      {tab === 'svg' && (
        <div>
          <div className="opt-row">
            <span>Frame</span>
            <Seg label="Frame" value={svgFrame} onChange={setSvgFrame} options={[{ value: 'final', label: 'Final' }, { value: 'current', label: 'Scrubber position' }]} />
          </div>
          <div className="opt-row">
            <span>Background</span>
            <Seg label="Background" value={svgBg} onChange={setSvgBg} options={[{ value: 'fill', label: 'Filled' }, { value: 'transparent', label: 'Transparent' }]} />
          </div>
          <div className="opt-row">
            <span>Text</span>
            <Seg label="Text" value={svgText} onChange={setSvgText} options={[{ value: 'editable', label: 'Editable' }, { value: 'outlined', label: 'Outlined' }]} />
          </div>
          <div className="field-help" style={{ padding: '0 14px' }}>
            {svgText === 'editable' ? `Text stays editable in Figma and Illustrator (they need the ${chartFont} font installed).` : 'Text becomes shapes, so it looks identical everywhere but can’t be edited.'}
          </div>
          <div className="export-actions">
            <button className="btn primary" onClick={downloadSvg}>
              <IconDownload /> Download .svg
            </button>
            <button className="btn" onClick={copySvg} title="Copy SVG (C)">
              <IconCopy /> Copy SVG
            </button>
          </div>
        </div>
      )}

      {tab === 'video' && (
        <div>
          {support && !support.mp4 && !support.webm && (
            <div className="notice err">This browser can’t record video (it has no video encoder). Try a recent version of Chrome, Edge or Safari.</div>
          )}
          {support && !support.mp4 && support.webm && (
            <div className="notice warn">This browser can’t make MP4 (H.264) files, so videos are saved as WebM instead. WebM plays in browsers and most editing apps.</div>
          )}
          <div className="opt-row">
            <span>Format</span>
            <Seg
              label="Format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'mp4', label: 'MP4', disabled: !support?.mp4 },
                { value: 'webm', label: 'WebM', disabled: !support?.webm },
                { value: 'webm-alpha', label: 'Transparent', disabled: !support?.alpha },
              ]}
            />
          </div>
          <div className="opt-row">
            <span>Resolution</span>
            <Seg label="Resolution" value={scale} onChange={setScale} options={[{ value: 1, label: `1× ${model.scene.width}` }, { value: 2, label: `2× ${model.scene.width * 2}` }]} />
          </div>
          <div className="opt-row">
            <span>Frame rate</span>
            <Seg label="Frame rate" value={fps} onChange={setFps} options={[{ value: 30, label: '30 fps' }, { value: 60, label: '60 fps' }]} />
          </div>
          <NumberControl field={{ key: 'vd', label: 'Animation duration', group: 'animation', type: 'number', min: 0.2, max: 30, step: 0.1, unit: 's', default: +tl.duration.toFixed(2) }} value={+effDuration.toFixed(2)} settings={{}} data={{}} onChange={(v) => setDuration(v === undefined ? 0 : Number(v))} />
          <NumberControl field={{ key: 'vh', label: 'Hold at the end', group: 'animation', type: 'number', min: 0, max: 20, step: 0.1, unit: 's', default: tl.hold }} value={hold} settings={{}} data={{}} onChange={(v) => setHold(v === undefined ? tl.hold : Number(v))} />
          <NumberControl field={{ key: 'vl', label: 'Loops', group: 'animation', type: 'number', min: 1, max: 20, step: 1, default: 1 }} value={loops} settings={{}} data={{}} onChange={(v) => setLoops(v === undefined ? 1 : Number(v))} />
          {format !== 'webm-alpha' && (
            <div className="field">
              <div className="field-head">
                <label htmlFor="vbg">Background colour</label>
              </div>
              <ColorInput id="vbg" value={bg} fallback={frameBg} onChange={setBg} />
              <div className="field-help">MP4 has no transparency, so the video always has a solid background. For a see-through video, pick “Transparent” (WebM).</div>
            </div>
          )}
          <div className="field-help" style={{ padding: '2px 14px' }}>
            {(effDuration + hold) * loops > 0 ? `${((effDuration + hold) * loops).toFixed(1)} s · ${Math.round((effDuration + hold) * loops * fps)} frames` : ''}
          </div>
          {busy && (
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
              <i style={{ width: `${pct * 100}%` }} />
            </div>
          )}
          <div className="export-actions">
            <button className="btn primary" onClick={runVideo} disabled={busy || !support || (!support.mp4 && !support.webm)}>
              <IconDownload /> {busy ? `Recording ${Math.round(pct * 100)}%` : `Export ${format === 'mp4' ? 'MP4' : 'WebM'}`}
            </button>
            <button className="btn" onClick={() => abort.current?.abort()} disabled={!busy}>
              Cancel
            </button>
          </div>
          {result && <div className="status">{result}</div>}
        </div>
      )}

      {tab === 'code' && (
        <div>
          <div style={{ padding: '8px 14px 2px', overflowX: 'auto' }}>
            <Seg
              label="Code type"
              value={codeTab}
              onChange={setCodeTab}
              options={[{ value: 'html', label: 'HTML' }, { value: 'react', label: 'React' }, { value: 'js', label: 'JS' }, { value: 'embed', label: 'Embed' }, { value: 'json', label: 'Settings' }]}
            />
          </div>
          {codeTab === 'html' && (
            <div className="opt-row">
              <span>Use</span>
              <Seg label="HTML type" value={htmlMode} onChange={setHtmlMode} options={[{ value: 'snippet', label: 'Paste into a page' }, { value: 'page', label: 'Complete page' }]} />
            </div>
          )}
          {codeTab === 'react' && (
            <div className="opt-row">
              <span>File type</span>
              <Seg label="React file type" value={reactLang} onChange={setReactLang} options={[{ value: 'tsx', label: 'TypeScript .tsx' }, { value: 'jsx', label: 'JavaScript .jsx' }]} />
            </div>
          )}
          {codeTab === 'js' && (
            <div className="opt-row">
              <span>File type</span>
              <Seg label="Module file type" value={jsLang} onChange={setJsLang} options={[{ value: 'js', label: '.js' }, { value: 'ts', label: '.ts' }]} />
            </div>
          )}
          {fontKey && (
            <div className="field">
              <div className="field-head">
                <label htmlFor="code-fonts">Fonts</label>
              </div>
              <select id="code-fonts" className="select" value={fontFor(fontKey)} onChange={(e) => setFonts({ ...fonts, [fontKey]: e.target.value as FontMode })}>
                {fontOptions(chartFont).map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))}
              </select>
              <div className="field-help">
                {!fontInfo(chartFont).google
                  ? `${chartFont} isn’t on Google Fonts, so its files are embedded in the export.`
                  : 'Google Fonts is the lightest. Embed if your site must not load anything from other servers.'}
              </div>
            </div>
          )}
          {howTo[codeTab] && (
            <div className="notice info">
              {howTo[codeTab]}
              {codeTab === 'html' && htmlMode === 'snippet' && code.length > 50000 && (
                <>
                  <br />
                  This snippet is {code.length.toLocaleString('en-US')} characters. Some site builders limit code blocks (Webflow allows 50,000); if yours does, use the Embed tab instead.
                </>
              )}
            </div>
          )}
          {codeTab === 'embed' && (
            <div className="notice info">
              Paste this into Framer’s Embed component (HTML mode). In Notion or Super.so, add an /embed block and paste just the link: <span className="mono" style={{ wordBreak: 'break-all' }}>{embedUrl(location.origin, model.def.id, state).slice(0, 64)}…</span>
              <br />
              The embed loads from this website, so it only works while the site is online.
            </div>
          )}
          {codeTab === 'json' && (
            <div style={{ padding: '4px 14px' }}>
              <button className="btn small" onClick={onOpenSettings}>
                <IconFile /> Open settings file…
              </button>
            </div>
          )}
          <pre className="code-view" aria-label="Exported code">{code.length > 6000 ? `${code.slice(0, 6000)}\n… (${(code.length / 1024).toFixed(0)} KB in total — use Copy or Download)` : code}</pre>
          <div className="export-actions">
            <button className="btn primary" onClick={() => download(codeFile[0], code, codeFile[1])}>
              <IconDownload /> Download
            </button>
            <button className="btn" onClick={() => copyText(code).then((ok) => say(ok ? 'Copied.' : 'Couldn’t copy. Use Download instead.'))}>
              <IconCopy /> Copy
            </button>
          </div>
          {codeTab === 'embed' && (
            <div style={{ padding: '0 14px 6px' }}>
              <button className="btn small wide" onClick={() => copyText(embedUrl(location.origin, model.def.id, state)).then((ok) => say(ok ? 'Embed link copied.' : 'Couldn’t copy the link.'))}>
                Copy the link only (for Notion)
              </button>
            </div>
          )}
        </div>
      )}
      {status && <div className="status" role="status">{status}</div>}
    </div>
  );
});

export function ShortcutList() {
  const rows: [string, string][] = [
    ['R', 'Replay the animation'],
    ['Space', 'Play / pause'],
    ['E', 'Export (open tab)'],
    ['C', 'Copy SVG'],
    ['L', 'Copy share link'],
    ['[  ]', 'Previous / next chart'],
    ['1 – 4', 'Mono · Porcelain · Palm · Wire'],
    ['F', 'Fit to screen'],
    ['+  −', 'Zoom in / out'],
    ['I', 'Interactive preview on/off'],
    ['Ctrl Z', 'Undo (Cmd works too)'],
    ['Ctrl Shift Z', 'Redo (also Ctrl Y)'],
    ['?', 'Show these shortcuts'],
  ];
  return (
    <div className="shortcuts">
      {rows.map(([k, d]) => (
        <div key={k} style={{ display: 'contents' }}>
          <span>
            {k.split(/\s{2}|\s/).map((part, i) => (
              <kbd key={i} style={{ marginRight: 3 }}>
                {part}
              </kbd>
            ))}
          </span>
          <span>{d}</span>
        </div>
      ))}
    </div>
  );
}

export type { Settings };
