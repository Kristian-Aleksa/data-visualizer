import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CATALOG, FAMILY_LABEL, KIND_LABEL } from '../charts/catalog';
import { CHARTS, getChart } from '../charts/registry';
import { APP_NAME } from '../config';
import type { ChartDef } from '../core/chart';
import { buildScene } from '../core/scene';
import { serialize } from '../core/serialize';
import { PRESETS, PRESET_ORDER, resolveTheme, type Theme } from '../core/theme';
import type { Family, Kind } from '../core/types';
import { useStore, type Doc } from '../state/store';
import { Swatch } from '../ui/ColourPanel';
import { IconMoon, IconSun } from '../ui/icons';

/** Live thumbnail, rendered only once it scrolls into view. */
const Thumb = memo(function Thumb({ def, doc, theme }: { def: ChartDef; doc: Doc | undefined; theme: Theme }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const markup = useMemo(() => {
    if (!visible) return '';
    try {
      const sc = buildScene(def, { data: doc?.data, settings: { ...(doc?.settings ?? {}), artboard: 'original' }, theme });
      return serialize(sc.root).replace(/^<svg([^>]*?) width="[^"]*" height="[^"]*"/, '<svg$1');
    } catch {
      return '';
    }
  }, [visible, def, doc, theme]);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: markup }} />;
});

const FAMILIES: Family[] = ['editorial', 'glance', 'basics', 'maps', 'networks', 'extras'];
const KINDS: Kind[] = ['bars', 'lines', 'part-to-whole', 'distribution', 'network', 'flow', 'map', 'heatmap', 'calendar'];

export default function Gallery() {
  const galleryTheme = useStore((s) => s.galleryTheme);
  const setGalleryTheme = useStore((s) => s.setGalleryTheme);
  const palettes = useStore((s) => s.palettes);
  const docs = useStore((s) => s.docs);
  const ui = useStore((s) => s.uiTheme);
  const setUi = useStore((s) => s.setUiTheme);
  const [q, setQ] = useState('');
  const [fam, setFam] = useState<Family | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const theme = useMemo(() => resolveTheme(galleryTheme, palettes), [galleryTheme, palettes]);

  useEffect(() => {
    document.title = `${APP_NAME} · customizable charts`;
  }, []);

  const items = CATALOG.filter((c) => {
    if (fam && c.family !== fam) return false;
    if (kind && !(getChart(c.id)?.kinds ?? c.kinds).includes(kind)) return false;
    if (q) {
      const hay = `${c.id} ${c.name} ${c.title} ${FAMILY_LABEL[c.family]}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  return (
    <div className="gallery">
      <header className="g-head">
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>{APP_NAME}</h1>
          <p>{CHARTS.length} chart designs, ready to customize and export as SVG, video or code.</p>
        </div>
        <button className="icon-btn" onClick={() => setUi(ui === 'system' ? 'light' : ui === 'light' ? 'dark' : 'system')} title={`App theme: ${ui}`} aria-label="Switch light or dark mode">
          {ui === 'dark' ? <IconMoon /> : <IconSun />}
        </button>
      </header>

      <div className="g-tools">
        <div className="g-row" role="group" aria-label="Palette">
          <span className="label">Palette</span>
          {PRESET_ORDER.map((id) => (
            <button key={id} className="chip" aria-pressed={galleryTheme === id} onClick={() => setGalleryTheme(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span className="pal" style={{ padding: 0, border: 0, background: 'none', width: 34 }}>
                <Swatch theme={PRESETS[id]} />
              </span>
              {PRESETS[id].name}
            </button>
          ))}
          {palettes.map((p) => (
            <button key={p.id} className="chip" aria-pressed={galleryTheme === `custom:${p.id}`} onClick={() => setGalleryTheme(`custom:${p.id}`)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="g-row" role="group" aria-label="Family">
          <span className="label">Family</span>
          <button className="chip" aria-pressed={fam === null} onClick={() => setFam(null)}>All</button>
          {FAMILIES.map((f) => (
            <button key={f} className="chip" aria-pressed={fam === f} onClick={() => setFam(fam === f ? null : f)}>{FAMILY_LABEL[f]}</button>
          ))}
        </div>
        <div className="g-row" role="group" aria-label="Kind">
          <span className="label">Kind</span>
          <button className="chip" aria-pressed={kind === null} onClick={() => setKind(null)}>All</button>
          {KINDS.map((k) => (
            <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <div className="g-row">
          <span className="label">Search</span>
          <input className="search" type="search" placeholder="Name, ID or title…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search charts" />
          <span className="muted" style={{ fontSize: 12 }}>{items.length} shown</span>
        </div>
      </div>

      <div className="g-grid">
        {items.map((c) => {
          const def = getChart(c.id);
          if (!def) return null;
          const doc = docs[def.id];
          const t = doc?.themeId ? resolveTheme(doc.themeId, palettes) : theme;
          return (
            <Link key={c.id} to={`/chart/${def.id.toLowerCase()}`} className="g-card">
              <div className="g-thumb" style={{ background: def.card.dark ? t.dark.cardBg : t.bg }}>
                <Thumb def={def} doc={doc} theme={t} />
              </div>
              <div className="g-meta">
                <span className="id">{def.id} · {FAMILY_LABEL[def.family]}</span>
                <span className="name">{def.name}</span>
                <span className="t">{String(doc?.settings.title ?? def.text.title)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <footer className="g-foot">
        <span>Everything runs in your browser; nothing is uploaded.</span>
      </footer>
    </div>
  );
}
