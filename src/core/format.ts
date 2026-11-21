// Number formatting shared by labels, tooltips and captions. Locale-independent on purpose,
// so a chart renders identically on every machine.

import type { Settings } from './types';

export interface NumberFormat {
  prefix: string;
  suffix: string;
  /** -1 = automatic (whole numbers stay whole, others get up to 2 decimals) */
  decimals: number;
  thousands: boolean;
  compact: boolean;
  percent: boolean;
}

export function numberFormatFrom(s: Settings): NumberFormat {
  const dec = String(s.numDecimals ?? 'auto');
  return {
    prefix: String(s.numPrefix ?? ''),
    suffix: String(s.numSuffix ?? ''),
    decimals: dec === 'auto' ? -1 : parseInt(dec, 10),
    thousands: s.numThousands !== false,
    compact: s.numCompact === true,
    percent: s.numPercent === true,
  };
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fixed(v: number, decimals: number): string {
  if (decimals >= 0) return v.toFixed(decimals);
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
}

export function formatNumber(v: number, f: NumberFormat): string {
  if (!Number.isFinite(v)) return '–';
  const neg = v < 0;
  let a = Math.abs(v);
  let unit = '';
  if (f.compact) {
    for (const [div, u] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']] as const) {
      if (a >= div) {
        a /= div;
        unit = u;
        break;
      }
    }
  }
  let s = fixed(a, f.compact && f.decimals < 0 && unit ? 1 : f.decimals);
  if (f.compact && f.decimals < 0 && unit) s = s.replace(/\.0$/, '');
  if (f.thousands) {
    const [i, d] = s.split('.');
    s = group(i) + (d !== undefined ? '.' + d : '');
  }
  return (neg ? '−' : '') + f.prefix + s + unit + (f.percent ? '%' : '') + f.suffix;
}

const ORDINAL = ['', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH'];
/** 5 → "FIFTH", for captions such as "DOT MARKS EVERY FIFTH". */
export function ordinalWord(n: number): string {
  return ORDINAL[n] ?? `${n}TH`;
}
