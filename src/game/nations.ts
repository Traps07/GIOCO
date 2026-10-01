import type { Language } from '../i18n';
import { AFRows } from './nations/africa';
import { ASRows } from './nations/asia';
import { NARows } from './nations/north-america';
import { OCRows } from './nations/oceania';
import { SARows } from './nations/south-america';
import { EURows } from './nations/europe';

/** Le sei confederazioni calcistiche mondiali. */
export type Confederation = 'uefa' | 'conmebol' | 'concacaf' | 'caf' | 'afc' | 'ofc';

export const CONFEDERATIONS: Confederation[] = ['uefa', 'conmebol', 'concacaf', 'caf', 'afc', 'ofc'];

export const CONFEDERATION_META: Record<
  Confederation,
  { code: string; colors: [string, string]; order: number }
> = {
  uefa: { code: 'UEFA', colors: ['#4aa3ff', '#1b4b8f'], order: 0 },
  conmebol: { code: 'CONMEBOL', colors: ['#37d9a0', '#0a7a4d'], order: 1 },
  concacaf: { code: 'CONCACAF', colors: ['#ffd166', '#c8862a'], order: 2 },
  caf: { code: 'CAF', colors: ['#ff8a5c', '#b8401b'], order: 3 },
  afc: { code: 'AFC', colors: ['#ff6b8b', '#a11d43'], order: 4 },
  ofc: { code: 'OFC', colors: ['#7be0ff', '#1c6f96'], order: 5 },
};

/** 1 = formazione di fascia minore (divisa ispirata alla bandiera), 5 = corazzata mondiale. */
export type Tier = 1 | 2 | 3 | 4 | 5;

export type KitSource = 'fifa' | 'flag';

/**
 * Una riga del database, campi separati da `|`:
 * code | iso/flag | tier | fonte-divisa | it | en | de | fr | es | ar | primary | secondary | accent | trim | pattern
 * `trim` vale `-` quando assente. Il campo ISO può contenere una bandiera letterale (es. 🏴󠁧󠁢󠁳󠁣󠁴󠁿).
 */
const parseRows = (table: string, conf: Confederation) =>
  table
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const f = line.split('|').map((field) => field.trim());
      if (f.length !== 15) {
        throw new Error(`Riga nazionale non valida in ${conf} (${f.length} campi): ${line}`);
      }
      const [code, iso, tier, kitSource, it, en, de, fr, es, ar, primary, secondary, accent, trim, pattern] = f;
      return {
        code,
        iso,
        conf,
        tier: Number(tier) as Tier,
        kitSource: kitSource === 'B' ? ('flag' as KitSource) : ('fifa' as KitSource),
        names: { it, en, de, fr, es, ar } as Record<Language, string>,
        primary,
        secondary,
        accent,
        trim: trim === '-' ? undefined : trim,
        pattern,
      };
    });

export interface RawNation {
  code: string;
  iso: string;
  conf: Confederation;
  tier: Tier;
  kitSource: KitSource;
  names: Record<Language, string>;
  primary: string;
  secondary: string;
  accent: string;
  trim?: string;
  pattern: string;
}

/**
 * 🇮🇹 → coppia di indicatori regionali; `GB-ENG` → bandiera "tag" della nazione costitutiva;
 * qualsiasi altro valore (es. 🏴󠁧󠁢󠁳󠁣󠁴󠁿) viene usato così com'è.
 */
export const flagFromIso = (iso: string) => {
  const value = iso.trim();
  if (/^[A-Za-z]{2}$/.test(value)) {
    return value
      .toUpperCase()
      .split('')
      .map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
      .join('');
  }
  const subdivision = /^([A-Za-z]{2})-([A-Za-z]{2,3})$/.exec(value.toUpperCase());
  if (subdivision) {
    const tag = (text: string) =>
      text.split('').map((ch) => String.fromCodePoint(127446 + ch.charCodeAt(0))).join('');
    return `\u{1F3F4}${tag(subdivision[1])}${tag(subdivision[2])}\u{1F1FF}`;
  }
  return value;
};

export const RAW_NATIONS: RawNation[] = [
  ...parseRows(EURows, 'uefa'),
  ...parseRows(SARows, 'conmebol'),
  ...parseRows(NARows, 'concacaf'),
  ...parseRows(AFRows, 'caf'),
  ...parseRows(ASRows, 'afc'),
  ...parseRows(OCRows, 'ofc'),
];
