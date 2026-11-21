// Data validation and cleaning. Bad input always becomes a friendly message, never a crash:
// rows with unusable values are skipped (and reported), and charts only ever see clean rows.

import type { Cell, ChartData, ColumnSpec, DataSchema, Issue, Row, TableSpec } from './types';

/** "1,234", "$38", "12%", " 7 " → number. Returns null when it isn't a number. */
export function toNumber(v: Cell | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[\s,_$€£¥%]/g, '').replace(/^[−–]/, '-');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function quote(v: Cell | undefined): string {
  const s = String(v ?? '');
  return s.length > 24 ? `“${s.slice(0, 22)}…”` : `“${s}”`;
}

function cleanCell(col: ColumnSpec, v: Cell | undefined, rowNo: number, table: TableSpec, issues: Issue[]): { ok: boolean; value: Cell } {
  const where = table.label ? `${table.label}, row ${rowNo}` : `Row ${rowNo}`;
  if (col.type === 'number') {
    const empty = v === null || v === undefined || String(v).trim() === '';
    if (empty) {
      if (col.required !== false) {
        issues.push({ table: table.key, row: rowNo - 1, column: col.key, message: `${where}: “${col.label}” is empty.` });
        return { ok: false, value: null };
      }
      return { ok: true, value: null };
    }
    const n = toNumber(v);
    if (n === null) {
      issues.push({ table: table.key, row: rowNo - 1, column: col.key, message: `${where}: “${col.label}” should be a number, not ${quote(v)}.` });
      return { ok: false, value: null };
    }
    if (col.min !== undefined && n < col.min) {
      issues.push({ table: table.key, row: rowNo - 1, column: col.key, message: `${where}: “${col.label}” can't be below ${col.min}.` });
      return { ok: false, value: null };
    }
    if (col.max !== undefined && n > col.max) {
      issues.push({ table: table.key, row: rowNo - 1, column: col.key, message: `${where}: “${col.label}” can't be above ${col.max}.` });
      return { ok: false, value: null };
    }
    return { ok: true, value: col.integer ? Math.round(n) : n };
  }
  const s = v === null || v === undefined ? '' : String(v).trim();
  if (!s && col.required !== false) {
    issues.push({ table: table.key, row: rowNo - 1, column: col.key, message: `${where}: “${col.label}” is empty.` });
    return { ok: false, value: '' };
  }
  return { ok: true, value: s };
}

export interface Validated {
  data: ChartData;
  issues: Issue[];
  /** true when the chart can't be drawn at all (e.g. too few rows) */
  fatal: boolean;
}

export function validateData(schema: DataSchema, input: ChartData | undefined): Validated {
  const issues: Issue[] = [];
  const data: ChartData = {};
  let fatal = false;
  for (const table of schema.tables) {
    const rows = Array.isArray(input?.[table.key]) ? input![table.key] : [];
    const clean: Row[] = [];
    rows.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      const allEmpty = table.columns.every((c) => row[c.key] === null || row[c.key] === undefined || String(row[c.key]).trim() === '');
      if (allEmpty) return; // blank lines are simply ignored
      const out: Row = {};
      let ok = true;
      for (const col of table.columns) {
        const r = cleanCell(col, row[col.key], i + 1, table, issues);
        out[col.key] = r.value;
        ok = ok && r.ok;
      }
      if (ok) clean.push(out);
    });
    const name = schema.tables.length > 1 ? ` in “${table.label}”` : '';
    if (clean.length < table.minRows) {
      fatal = true;
      issues.unshift({
        table: table.key,
        fatal: true,
        message: `This chart needs at least ${table.minRows} complete row${table.minRows === 1 ? '' : 's'}${name}${rows.length ? ` (${clean.length} usable so far)` : ''}.`,
      });
    }
    if (clean.length > table.maxRows) {
      issues.push({ table: table.key, message: `This chart shows up to ${table.maxRows} rows${name}; the extra ${clean.length - table.maxRows} are left out.` });
      clean.length = table.maxRows;
    }
    data[table.key] = clean;
  }
  return { data, issues, fatal };
}
