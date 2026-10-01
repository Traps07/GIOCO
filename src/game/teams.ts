import type { Language } from '../i18n';
import {
  CONFEDERATION_META,
  CONFEDERATIONS,
  flagFromIso,
  RAW_NATIONS,
  type Confederation,
  type KitSource,
  type Tier,
} from './nations';

export type { Confederation, KitSource, Tier };
export { CONFEDERATION_META, CONFEDERATIONS };

export type KitPattern =
  | 'vertical'
  | 'horizontal'
  | 'sash'
  | 'checks'
  | 'cross'
  | 'center'
  | 'chevron'
  | 'pinstripe'
  | 'waves'
  | 'panels'
  | 'tonal'
  | 'solid'
  | 'halves'
  | 'hoops'
  | 'flag'
  | 'star'
  | 'gradient'
  | 'sleeves';

export const KIT_PATTERNS: KitPattern[] = [
  'vertical',
  'horizontal',
  'hoops',
  'halves',
  'sash',
  'checks',
  'cross',
  'center',
  'chevron',
  'pinstripe',
  'waves',
  'panels',
  'tonal',
  'solid',
  'flag',
  'star',
  'gradient',
  'sleeves',
];

export interface TeamKit {
  primary: string;
  secondary: string;
  accent: string;
  trim?: string;
  glow: string;
  pattern: KitPattern;
}

export interface NationalTeam {
  id: NationalTeamId;
  /** Sigla a tre lettere mostrata sulle maglie e nelle schede. */
  code: string;
  flag: string;
  names: Record<Language, string>;
  kit: TeamKit;
  /** DivisaAway usata quando i colori casalinghi collidono con quelli dell'avversaria. */
  awayKit: TeamKit;
  confederation: Confederation;
  tier: Tier;
  kitSource: KitSource;
  /** Coefficiente 20–99: semina del torneo e forza dell'IA. */
  strength: number;
}

export type NationalTeamId = string;

export type TeamSelection = [NationalTeamId, NationalTeamId];

const KNOWN_PATTERNS = new Set<string>(KIT_PATTERNS);

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return [128, 128, 128];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** Distanza percettiva semplificata fra due colori, 0 = identici. */
const colorDistance = (a: string, b: string) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
};

const CONFEDERATION_BONUS: Record<Confederation, number> = {
  uefa: 6,
  conmebol: 6,
  concacaf: 2,
  caf: 3,
  afc: 2,
  ofc: -4,
};

/** Intervallo del coefficiente: serve a trasformare le stelle in vantaggi reali. */
export const STRENGTH_MIN = 20;
export const STRENGTH_MAX = 99;

const patternFor = (value: string): KitPattern => (KNOWN_PATTERNS.has(value) ? (value as KitPattern) : 'solid');

/** DivisaAway "neutra": chiara se la maglia casa è scura e viceversa, con i colori della bandiera. */
const buildAwayKit = (id: string, kit: TeamKit): TeamKit => {
  const lightHome = luminance(kit.primary) > 0.62;
  const primary = lightHome ? '#15161B' : '#F3F5FA';
  const secondary = lightHome ? withAlpha(kit.accent, 1) : kit.accent;
  const variants: KitPattern[] = ['tonal', 'panels', 'sash', 'gradient', 'hoops', 'pinstripe'];
  const hash = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return {
    primary,
    secondary: luminance(secondary) > 0.85 || luminance(secondary) < 0.12 ? kit.secondary : secondary,
    accent: kit.primary,
    trim: lightHome ? '#F3F5FA' : '#15161B',
    glow: lightHome ? 'rgba(20,22,28,0.82)' : 'rgba(236,240,248,0.9)',
    pattern: variants[hash % variants.length],
  };
};

const buildTeam = (raw: (typeof RAW_NATIONS)[number]): NationalTeam => {
  const kit: TeamKit = {
    primary: raw.primary,
    secondary: raw.secondary,
    accent: raw.accent,
    trim: raw.trim,
    glow: withAlpha(raw.primary, luminance(raw.primary) > 0.62 ? 0.9 : 0.84),
    pattern: patternFor(raw.pattern),
  };
  const tier = Math.min(5, Math.max(1, raw.tier)) as Tier;
  return {
    id: raw.code,
    code: raw.code.toUpperCase(),
    flag: flagFromIso(raw.iso),
    names: raw.names,
    kit,
    awayKit: buildAwayKit(raw.code, kit),
    confederation: raw.conf,
    tier,
    kitSource: raw.kitSource,
    strength: Math.round(Math.min(STRENGTH_MAX, Math.max(STRENGTH_MIN, 20 + tier * 15 + CONFEDERATION_BONUS[raw.conf]))),
  };
};

const ALL_TEAMS: NationalTeam[] = RAW_NATIONS.map(buildTeam);

const byId = new Map<string, NationalTeam>();
for (const team of ALL_TEAMS) byId.set(team.id, team);

/** Id storici della versione a 12 nazionali, per non rompere salvataggi e link. */
const LEGACY_IDS: Record<string, NationalTeamId> = {
  italy: 'ita',
  france: 'fra',
  england: 'eng',
  spain: 'esp',
  germany: 'ger',
  portugal: 'por',
  netherlands: 'ned',
  brazil: 'bra',
  argentina: 'arg',
  croatia: 'cro',
  japan: 'jpn',
  morocco: 'mar',
};

const resolveId = (id: NationalTeamId) => (byId.has(id) ? id : (LEGACY_IDS[id] ?? id));

/** Tutte le nazionali del mondo, raggruppate per continente e in ordine alfabetico. */
export const NATIONAL_TEAMS: readonly NationalTeam[] = ALL_TEAMS.slice().sort((a, b) => {
  const conf = CONFEDERATION_META[a.confederation].order - CONFEDERATION_META[b.confederation].order;
  return conf || a.names.en.localeCompare(b.names.en);
});

export const TEAM_COUNT = NATIONAL_TEAMS.length;

export const TEAMS_BY_CONFEDERATION: Record<Confederation, NationalTeam[]> = CONFEDERATIONS.reduce(
  (accumulator, confederation) => {
    accumulator[confederation] = NATIONAL_TEAMS.filter((team) => team.confederation === confederation);
    return accumulator;
  },
  {} as Record<Confederation, NationalTeam[]>,
);

export const DEFAULT_TEAMS: TeamSelection = ['ita', 'fra'];

export const getNationalTeam = (id: NationalTeamId): NationalTeam =>
  byId.get(resolveId(id)) ?? NATIONAL_TEAMS[0];

export const hasNationalTeam = (id: NationalTeamId) => byId.has(resolveId(id));

export const getTeamName = (id: NationalTeamId, language: Language) => getNationalTeam(id).names[language];

export const getTeamKit = (id: NationalTeamId) => getNationalTeam(id).kit;

export const getTeamTier = (id: NationalTeamId) => getNationalTeam(id).tier;

export const getTeamStrength = (id: NationalTeamId) => getNationalTeam(id).strength;

/** Coefficiente normalizzato 0–1: 0 = nazionale minore, 1 = corazzata da 5 stelle. */
export const getTeamQuality = (id: NationalTeamId): number => {
  const { strength } = getNationalTeam(id);
  return Math.max(0, Math.min(1, (strength - STRENGTH_MIN) / (STRENGTH_MAX - STRENGTH_MIN)));
};

/**
 * Restituisce le due divise effettive della partita: se i colori casalinghi sono troppo
 * simili, la squadra ospite passa alla divisa da trasferta ispirata alla bandiera.
 */
export const resolveKits = (home: NationalTeamId, away: NationalTeamId): [TeamKit, TeamKit] => {
  const homeTeam = getNationalTeam(home);
  const awayTeam = getNationalTeam(away);
  const clash =
    colorDistance(homeTeam.kit.primary, awayTeam.kit.primary) < 88 ||
    colorDistance(homeTeam.kit.primary, awayTeam.kit.secondary) < 46;
  return [homeTeam.kit, clash ? awayTeam.awayKit : awayTeam.kit];
};

export interface TeamFilter {
  query?: string;
  confederation?: Confederation | 'all';
  minTier?: Tier | 0;
  ids?: readonly NationalTeamId[];
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');

/** Ricerca per nome (in ogni lingua), codice o confederazione. */
export const filterTeams = (
  filter: TeamFilter,
  language: Language,
  pool: readonly NationalTeam[] = NATIONAL_TEAMS,
): NationalTeam[] => {
  const query = filter.query ? normalize(filter.query) : '';
  const confederation = filter.confederation && filter.confederation !== 'all' ? filter.confederation : null;
  const allowed = filter.ids ? new Set(filter.ids.map(resolveId)) : null;
  const relevance = (team: NationalTeam) => {
    if (!query) return 0;
    const code = normalize(team.code);
    const local = normalize(team.names[language]);
    if (code === query || local === query) return 0;
    if (local.startsWith(query) || code.startsWith(query)) return 1;
    if (normalize(team.names.en).startsWith(query)) return 2;
    if (local.includes(query) || normalize(team.names.en).includes(query)) return 3;
    return 4;
  };
  const rows = pool.filter((team) => {
    if (confederation && team.confederation !== confederation) return false;
    if (filter.minTier && team.tier < filter.minTier) return false;
    if (allowed && !allowed.has(team.id)) return false;
    if (!query) return true;
    if (normalize(team.code).includes(query)) return true;
    if (normalize(team.names[language]).includes(query)) return true;
    if (normalize(team.names.en).includes(query)) return true;
    if (normalize(CONFEDERATION_META[team.confederation].code).includes(query)) return true;
    return Object.values(team.names).some((name) => normalize(name).includes(query));
  });
  if (!query) return rows;
  return rows
    .map((team, index) => ({ team, index, score: relevance(team) }))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.team.names[language].localeCompare(b.team.names[language]) ||
        a.index - b.index,
    )
    .map((entry) => entry.team);
};

export { withAlpha as kitGlow, luminance as kitLuminance };
