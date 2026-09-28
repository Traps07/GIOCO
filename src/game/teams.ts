import type { Language } from '../i18n';

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
  | 'tonal';

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
  flag: string;
  names: Record<Language, string>;
  kit: TeamKit;
}

export type NationalTeamId =
  | 'italy'
  | 'france'
  | 'england'
  | 'spain'
  | 'germany'
  | 'portugal'
  | 'netherlands'
  | 'brazil'
  | 'argentina'
  | 'croatia'
  | 'japan'
  | 'morocco';

export type TeamSelection = [NationalTeamId, NationalTeamId];

export const DEFAULT_TEAMS: TeamSelection = ['italy', 'france'];

// Tavolozze e motivi reinterpretano in modo stilizzato le divise casalinghe del ciclo Mondiale 2026:
// colori nazionali riconoscibili e dettagli ispirati, senza riprodurre stemmi o grafiche ufficiali.
export const NATIONAL_TEAMS: readonly NationalTeam[] = [
  {
    id: 'italy',
    flag: '🇮🇹',
    names: { it: 'Italia', en: 'Italy', de: 'Italien', fr: 'Italie', es: 'Italia', ar: 'إيطاليا' },
    kit: { primary: '#145A96', secondary: '#DCE8F3', accent: '#D7B56D', glow: 'rgba(20,90,150,0.82)', pattern: 'chevron' },
  },
  {
    id: 'france',
    flag: '🇫🇷',
    names: { it: 'Francia', en: 'France', de: 'Frankreich', fr: 'France', es: 'Francia', ar: 'فرنسا' },
    kit: { primary: '#17294F', secondary: '#52658B', accent: '#F0F2F6', glow: 'rgba(23,41,79,0.84)', pattern: 'tonal' },
  },
  {
    id: 'england',
    flag: '🇬🇧',
    names: { it: 'Inghilterra', en: 'England', de: 'England', fr: 'Angleterre', es: 'Inglaterra', ar: 'إنجلترا' },
    kit: { primary: '#F7F8FA', secondary: '#D5DCE6', accent: '#C92C3D', glow: 'rgba(218,228,241,0.92)', pattern: 'tonal' },
  },
  {
    id: 'spain',
    flag: '🇪🇸',
    names: { it: 'Spagna', en: 'Spain', de: 'Spanien', fr: 'Espagne', es: 'España', ar: 'إسبانيا' },
    kit: { primary: '#B91F34', secondary: '#E9BC43', accent: '#1C3154', glow: 'rgba(185,31,52,0.84)', pattern: 'pinstripe' },
  },
  {
    id: 'germany',
    flag: '🇩🇪',
    names: { it: 'Germania', en: 'Germany', de: 'Deutschland', fr: 'Allemagne', es: 'Alemania', ar: 'ألمانيا' },
    kit: { primary: '#F5F5F1', secondary: '#191919', accent: '#D7B33F', trim: '#D3263D', glow: 'rgba(232,232,222,0.92)', pattern: 'chevron' },
  },
  {
    id: 'portugal',
    flag: '🇵🇹',
    names: { it: 'Portogallo', en: 'Portugal', de: 'Portugal', fr: 'Portugal', es: 'Portugal', ar: 'البرتغال' },
    kit: { primary: '#B81736', secondary: '#08784B', accent: '#E9C348', glow: 'rgba(184,23,54,0.84)', pattern: 'waves' },
  },
  {
    id: 'netherlands',
    flag: '🇳🇱',
    names: { it: 'Paesi Bassi', en: 'Netherlands', de: 'Niederlande', fr: 'Pays-Bas', es: 'Países Bajos', ar: 'هولندا' },
    kit: { primary: '#EF741F', secondary: '#17191E', accent: '#F4F1E9', glow: 'rgba(239,116,31,0.84)', pattern: 'panels' },
  },
  {
    id: 'brazil',
    flag: '🇧🇷',
    names: { it: 'Brasile', en: 'Brazil', de: 'Brasilien', fr: 'Brésil', es: 'Brasil', ar: 'البرازيل' },
    kit: { primary: '#F4D21C', secondary: '#12834A', accent: '#2054A2', glow: 'rgba(244,210,28,0.86)', pattern: 'tonal' },
  },
  {
    id: 'argentina',
    flag: '🇦🇷',
    names: { it: 'Argentina', en: 'Argentina', de: 'Argentinien', fr: 'Argentine', es: 'Argentina', ar: 'الأرجنتين' },
    kit: { primary: '#71C3E2', secondary: '#F7FAFC', accent: '#D4B45B', trim: '#315487', glow: 'rgba(113,195,226,0.84)', pattern: 'vertical' },
  },
  {
    id: 'croatia',
    flag: '🇭🇷',
    names: { it: 'Croazia', en: 'Croatia', de: 'Kroatien', fr: 'Croatie', es: 'Croacia', ar: 'كرواتيا' },
    kit: { primary: '#F8F7F2', secondary: '#D3263D', accent: '#174A82', glow: 'rgba(230,235,245,0.92)', pattern: 'checks' },
  },
  {
    id: 'japan',
    flag: '🇯🇵',
    names: { it: 'Giappone', en: 'Japan', de: 'Japan', fr: 'Japon', es: 'Japón', ar: 'اليابان' },
    kit: { primary: '#162E62', secondary: '#75AED8', accent: '#F4F7FC', glow: 'rgba(22,46,98,0.86)', pattern: 'waves' },
  },
  {
    id: 'morocco',
    flag: '🇲🇦',
    names: { it: 'Marocco', en: 'Morocco', de: 'Marokko', fr: 'Maroc', es: 'Marruecos', ar: 'المغرب' },
    kit: { primary: '#C1263A', secondary: '#08794B', accent: '#DDBB53', glow: 'rgba(193,38,58,0.84)', pattern: 'panels' },
  },
];

export const getNationalTeam = (id: NationalTeamId) =>
  NATIONAL_TEAMS.find((team) => team.id === id) ?? NATIONAL_TEAMS[0];

export const getTeamName = (id: NationalTeamId, language: Language) =>
  getNationalTeam(id).names[language];
