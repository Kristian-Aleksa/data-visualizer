// Chrome-free view for <iframe> embeds: /embed/:id#s=<state>. Interactive, animated, responsive.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { getChart } from '../charts/registry';
import { resolveTheme, themeFromPalette } from '../core/theme';
import { Player } from '../runtime/player';
import { decodeState } from '../state/share';

export default function Embed() {
  const { id } = useParams();
  const def = getChart(id);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const state = useMemo(() => decodeState(hash), [hash]);
  const input = useMemo(() => {
    const doc = state?.doc ?? { settings: {} };
    const theme = state?.palette && doc.themeId?.startsWith('custom:') ? themeFromPalette(state.palette) : resolveTheme(doc.themeId ?? 'mono', []);
    return { data: doc.data, settings: doc.settings, theme };
  }, [state]);

  useEffect(() => {
    if (!def || !svgRef.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = new Player(svgRef.current, def, input, { interactive: true, autoplay: !reduced });
    svgRef.current.removeAttribute('width');
    svgRef.current.removeAttribute('height');
    return () => p.destroy();
  }, [def, input]);

  if (!def) return <p style={{ padding: 16, font: '13px Inter, sans-serif' }}>This chart isn’t available.</p>;
  return (
    <div className="embed">
      <svg ref={svgRef} role="img" aria-label={String(input.settings.title ?? def.text.title)} />
    </div>
  );
}
