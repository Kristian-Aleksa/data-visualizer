// Spreadsheet-style data editor: edit cells, paste from Excel/Google Sheets (tab-separated),
// upload CSV/TSV/JSON with column mapping, download CSV, reset to the demo data.

import Papa from 'papaparse';
import { useMemo, useRef, useState } from 'react';
import type { ChartDef } from '../core/chart';
import type { Cell, ChartData, ColumnSpec, Issue, Row, TableSpec } from '../core/types';
import { IconDownload, IconPlus, IconReset, IconTrash, IconUpload } from './icons';

interface Props {
  def: ChartDef;
  data: ChartData;
  isDemo: boolean;
  issues: Issue[];
  onChange: (data: ChartData | undefined, coalesceKey?: string) => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const ROLE_WORDS: Record<string, string[]> = {
  label: ['label', 'name', 'category', 'plan', 'item', 'group', 'x'],
  value: ['value', 'count', 'amount', 'total', 'y', 'n', 'number', 'revenue', 'mrr'],
  source: ['source', 'from'],
  target: ['target', 'to'],
};

/** Best guess of which uploaded column feeds each chart column. */
function guessMapping(cols: ColumnSpec[], headers: string[], rows: Record<string, string>[]): Record<string, string> {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  const numeric = (h: string) => rows.slice(0, 20).filter((r) => r[h] !== undefined && r[h] !== '').every((r) => !Number.isNaN(parseFloat(String(r[h]).replace(/[,$%€£]/g, ''))));
  for (const c of cols) {
    const names = [c.key, c.label, ...(c.role ? ROLE_WORDS[c.role] ?? [c.role] : [])].map(norm);
    const hit = headers.find((h) => !used.has(h) && names.includes(norm(h)));
    if (hit) {
      out[c.key] = hit;
      used.add(hit);
    }
  }
  for (const c of cols) {
    if (out[c.key]) continue;
    const hit = headers.find((h) => !used.has(h) && (c.type === 'number' ? numeric(h) : !numeric(h))) ?? headers.find((h) => !used.has(h));
    if (hit) {
      out[c.key] = hit;
      used.add(hit);
    }
  }
  return out;
}

interface Pending {
  table: TableSpec;
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, string>;
}

function parseText(text: string): { headers: string[]; rows: Record<string, string>[] } | string {
  const trimmed = text.trim();
  if (!trimmed) return 'There’s nothing to import.';
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed);
      const arr: unknown = Array.isArray(j) ? j : Object.values(j).find(Array.isArray);
      if (!Array.isArray(arr) || !arr.length || typeof arr[0] !== 'object') return 'The JSON needs to be a list of rows, like [{"label":"A","value":1}].';
      const headers = [...new Set(arr.flatMap((r) => Object.keys(r as object)))];
      return { headers, rows: arr.map((r) => Object.fromEntries(headers.map((h) => [h, String((r as Record<string, unknown>)[h] ?? '')]))) };
    } catch {
      return 'That JSON couldn’t be read.';
    }
  }
  const res = Papa.parse<string[]>(trimmed, { skipEmptyLines: true });
  const grid = res.data.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!grid.length) return 'No rows found.';
  const first = grid[0];
  const looksLikeHeader = first.some((c) => Number.isNaN(parseFloat(String(c).replace(/[,$%€£]/g, '')))) && grid.length > 1 && grid[1].some((c) => !Number.isNaN(parseFloat(String(c).replace(/[,$%€£]/g, ''))));
  const headers = looksLikeHeader ? first.map((h, i) => String(h).trim() || `Column ${i + 1}`) : first.map((_, i) => `Column ${i + 1}`);
  const body = looksLikeHeader ? grid.slice(1) : grid;
  return { headers, rows: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()]))) };
}

function download(name: string, content: string | Blob, type: string) {
  const url = URL.createObjectURL(typeof content === 'string' ? new Blob([content], { type }) : content);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataPanel({ def, data, isDemo, issues, onChange }: Props) {
  const tables = def.dataSchema.tables;
  const [active, setActive] = useState(0);
  const table = tables[Math.min(active, tables.length - 1)];
  const rows: Row[] = data[table.key] ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');

  const bad = useMemo(() => {
    const s = new Set<string>();
    for (const i of issues) if (i.table === table.key && i.row !== undefined && i.column) s.add(`${i.row}:${i.column}`);
    return s;
  }, [issues, table.key]);

  const setRows = (next: Row[], coalesce?: string) => onChange({ ...data, [table.key]: next }, coalesce);
  const setCell = (r: number, col: ColumnSpec, value: string) => {
    const next = rows.map((row, i) => (i === r ? { ...row, [col.key]: value } : row));
    setRows(next, `cell:${table.key}:${r}:${col.key}`);
  };

  /** Paste a block from a spreadsheet starting at (r, c). */
  const pasteBlock = (r0: number, c0: number, text: string) => {
    const grid = Papa.parse<string[]>(text.replace(/\r/g, '').replace(/\n$/, ''), { delimiter: '\t' }).data;
    const next = rows.map((x) => ({ ...x }));
    grid.forEach((line, dr) => {
      const r = r0 + dr;
      if (r >= table.maxRows) return;
      while (next.length <= r) next.push(Object.fromEntries(table.columns.map((c) => [c.key, ''])));
      line.forEach((v, dc) => {
        const col = table.columns[c0 + dc];
        if (col) next[r][col.key] = String(v).trim();
      });
    });
    setRows(next);
  };

  const startImport = (text: string) => {
    setError('');
    const parsed = parseText(text);
    if (typeof parsed === 'string') {
      setError(parsed);
      return;
    }
    setPending({ table, ...parsed, mapping: guessMapping(table.columns, parsed.headers, parsed.rows) });
  };

  const applyImport = () => {
    if (!pending) return;
    const next: Row[] = pending.rows.slice(0, pending.table.maxRows).map((r) =>
      Object.fromEntries(pending.table.columns.map((c) => [c.key, (pending.mapping[c.key] ? r[pending.mapping[c.key]] : '') as Cell])),
    );
    onChange({ ...data, [pending.table.key]: next });
    setPending(null);
    setPasteOpen(false);
    setPasteText('');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5_000_000) {
      setError('That file is over 5 MB. Please use a smaller file.');
      return;
    }
    startImport(await f.text());
  };

  const csv = () => Papa.unparse({ fields: table.columns.map((c) => c.key), data: rows.map((r) => table.columns.map((c) => r[c.key] ?? '')) });

  return (
    <div>
      {tables.length > 1 && (
        <div className="tabs" role="tablist">
          {tables.map((t, i) => (
            <button key={t.key} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {issues.length > 0 && (
        <div className={`notice ${issues.some((i) => i.fatal) ? 'err' : 'warn'}`} role="status">
          {issues.length === 1 ? issues[0].message : (
            <>
              {issues.length} things to check:
              <ul>
                {issues.slice(0, 5).map((i, k) => (
                  <li key={k}>{i.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {error && <div className="notice err" role="alert">{error}</div>}
      <div className="data-tools">
        <button className="btn small" onClick={() => setPasteOpen(true)} title="Paste rows copied from Excel or Google Sheets">
          Paste table…
        </button>
        <button className="btn small" onClick={() => fileRef.current?.click()}>
          <IconUpload /> Upload
        </button>
        <button className="btn small" onClick={() => download(`${def.id.toLowerCase()}-data.csv`, csv(), 'text/csv')}>
          <IconDownload /> CSV
        </button>
        <button className="btn small" onClick={() => onChange(undefined)} disabled={isDemo} title="Back to the demo data">
          <IconReset /> Demo data
        </button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json,text/csv,application/json" hidden onChange={(e) => onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      </div>
      <div className="grid-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>#</th>
              {table.columns.map((c) => (
                <th key={c.key} title={c.help}>
                  {c.label}
                  {c.type === 'number' ? ' · 123' : ''}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="rownum">{r + 1}</td>
                {table.columns.map((c, ci) => (
                  <td key={c.key} className={bad.has(`${r}:${c.key}`) ? 'bad' : undefined}>
                    <input
                      className={c.type === 'number' ? 'n' : undefined}
                      aria-label={`Row ${r + 1}, ${c.label}`}
                      value={row[c.key] === null || row[c.key] === undefined ? '' : String(row[c.key])}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text/plain');
                        if (/[\t\n]/.test(text.trim())) {
                          e.preventDefault();
                          pasteBlock(r, ci, text);
                        }
                      }}
                    />
                  </td>
                ))}
                <td className="del">
                  <button className="icon-btn" style={{ width: 24, height: 24 }} aria-label={`Delete row ${r + 1}`} onClick={() => setRows(rows.filter((_, i) => i !== r))}>
                    <IconTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-tools" style={{ paddingTop: 8 }}>
        <button className="btn small" disabled={rows.length >= table.maxRows} onClick={() => setRows([...rows, Object.fromEntries(table.columns.map((c) => [c.key, '']))])}>
          <IconPlus /> Add row
        </button>
        <span className="field-help" style={{ alignSelf: 'center' }}>
          {rows.length} of up to {table.maxRows} rows · tip: paste a block from a spreadsheet into any cell
        </span>
      </div>

      {pasteOpen && !pending && (
        <div className="dialog-backdrop" onClick={() => setPasteOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Paste a table" onClick={(e) => e.stopPropagation()}>
            <h2>Paste a table</h2>
            <p className="muted" style={{ margin: 0 }}>Copy cells in Excel or Google Sheets (with a header row if you have one) and paste them here. CSV and JSON work too.</p>
            <textarea className="textarea mono" style={{ minHeight: 180 }} autoFocus value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Plan\tMRR\nFREE\t38\nSTARTER\t27'} />
            {error && <div className="notice err" style={{ margin: 0 }}>{error}</div>}
            <div className="actions">
              <button className="btn" onClick={() => setPasteOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={() => startImport(pasteText)}>Next</button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="dialog-backdrop" onClick={() => setPending(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Match your columns" onClick={(e) => e.stopPropagation()}>
            <h2>Match your columns</h2>
            <p className="muted" style={{ margin: 0 }}>
              {pending.rows.length} row{pending.rows.length === 1 ? '' : 's'} found. Choose which of your columns feeds each part of the chart.
            </p>
            <div className="map-grid">
              {pending.table.columns.map((c) => (
                <label key={c.key} style={{ display: 'contents' }}>
                  <span style={{ fontWeight: 600 }}>
                    {c.label} <span className="muted">({c.type === 'number' ? 'number' : 'text'})</span>
                  </span>
                  <select className="select" value={pending.mapping[c.key] ?? ''} onChange={(e) => setPending({ ...pending, mapping: { ...pending.mapping, [c.key]: e.target.value } })}>
                    <option value="">(leave empty)</option>
                    {pending.headers.map((h) => (
                      <option key={h} value={h}>
                        {h} — e.g. {pending.rows[0]?.[h] || '…'}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {pending.rows.length > pending.table.maxRows && <div className="notice warn" style={{ margin: 0 }}>Only the first {pending.table.maxRows} rows will be used.</div>}
            <div className="actions">
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn primary" onClick={applyImport}>Use this data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { download };
