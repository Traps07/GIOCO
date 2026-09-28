import type { Language } from '../i18n';

export type KitPattern = 'vertical' | 'horizontal' | 'sash' | 'checks' | 'cross' | 'center';

export interface TeamKit {
  primary: string;
  secondary: string;
  accent: string;
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

export const NATIONAL_TEAMS: readonly NationalTeam[] = [
  {
    id: 'italy',
    flag: '🇮🇹',
    names: { it: 'Italia', en: 'Italy', de: 'Italien', fr: 'Italie', es: 'Italia', ar: 'إيطاليا' },
    kit: { primary: '#1261A8', secondary: '#F8FAFC', accent: '#159357', glow: 'rgba(18,97,168,0.78)', pattern: 'vertical' },
  },
  {
    id: 'france',
    flag: '🇫🇷',
    names: { it: 'Francia', en: 'France', de: 'Frankreich', fr: 'France', es: 'Francia', ar: 'فرنسا' },
    kit: { primary: '#182C50', secondary: '#F8FAFC', accent: '#E23D4B', glow: 'rgba(24,44,80,0.8)', pattern: 'horizontal' },
  },
  {
    id: 'england',
    flag: '🇬🇧',
    names: { it: 'Inghilterra', en: 'England', de: 'England', fr: 'Angleterre', es: 'Inglaterra', ar: 'إنجلترا' },
    kit: { primary: '#F5F7FA', secondary: '#15325B', accent: '#C92A3B', glow: 'rgba(210,225,244,0.9)', pattern: 'cross' },
  },
  {
    id: 'spain',
    flag: '🇪🇸',
    names: { it: 'Spagna', en: 'Spain', de: 'Spanien', fr: 'Espagne', es: 'España', ar: 'إسبانيا' },
    kit: { primary: '#C92735', secondary: '#F5C744', accent: '#8E1B2A', glow: 'rgba(201,39,53,0.8)', pattern: 'horizontal' },
  },
  {
    id: 'germany',
    flag: '🇩🇪',
    names: { it: 'Germania', en: 'Germany', de: 'Deutschland', fr: 'Allemagne', es: 'Alemania', ar: 'ألمانيا' },
    kit: { primary: '#F4F3EE', secondary: '#151515', accent: '#D52D3C', glow: 'rgba(235,235,225,0.9)', pattern: 'sash' },
  },
  {
    id: 'portugal',
    flag: '🇵🇹',
    names: { it: 'Portogallo', en: 'Portugal', de: 'Portugal', fr: 'Portugal', es: 'Portugal', ar: 'البرتغال' },
    kit: { primary: '#B91836', secondary: '#087A4A', accent: '#F2C94C', glow: 'rgba(185,24,54,0.8)', pattern: 'sash' },
  },
  {
    id: 'netherlands',
    flag: '🇳🇱',
    names: { it: 'Paesi Bassi', en: 'Netherlands', de: 'Niederlande', fr: 'Pays-Bas', es: 'Países Bajos', ar: 'هولندا' },
    kit: { primary: '#EF7628', secondary: '#16385F', accent: '#F7F7F5', glow: 'rgba(239,118,40,0.8)', pattern: 'horizontal' },
  },
  {
    id: 'brazil',
    flag: '🇧🇷',
    names: { it: 'Brasile', en: 'Brazil', de: 'Brasilien', fr: 'Brésil', es: 'Brasil', ar: 'البرازيل' },
    kit: { primary: '#F5D52D', secondary: '#13884D', accent: '#1D5C9C', glow: 'rgba(245,213,45,0.85)', pattern: 'cross' },
  },
  {
    id: 'argentina',
    flag: '🇦🇷',
    names: { it: 'Argentina', en: 'Argentina', de: 'Argentinien', fr: 'Argentine', es: 'Argentina', ar: 'الأرجنتين' },
    kit: { primary: '#73C9E8', secondary: '#F9FBFC', accent: '#244987', glow: 'rgba(115,201,232,0.82)', pattern: 'vertical' },
  },
  {
    id: 'croatia',
    flag: '🇭🇷',
    names: { it: 'Croazia', en: 'Croatia', de: 'Kroatien', fr: 'Croatie', es: 'Croacia', ar: 'كرواتيا' },
    kit: { primary: '#F5F6F8', secondary: '#D3263D', accent: '#174A82', glow: 'rgba(230,235,245,0.9)', pattern: 'checks' },
  },
  {
    id: 'japan',
    flag: '🇯🇵',
    names: { it: 'Giappone', en: 'Japan', de: 'Japan', fr: 'Japon', es: 'Japón', ar: 'اليابان' },
    kit: { primary: '#F5F6F8', secondary: '#173761', accent: '#BC1831', glow: 'rgba(225,232,242,0.9)', pattern: 'center' },
  },
  {
    id: 'morocco',
    flag: '🇲🇦',
    names: { it: 'Marocco', en: 'Morocco', de: 'Marokko', fr: 'Maroc', es: 'Marruecos', ar: 'المغرب' },
    kit: { primary: '#C52B3B', secondary: '#087A4A', accent: '#F4C647', glow: 'rgba(197,43,59,0.8)', pattern: 'horizontal' },
  },
];

export const getNationalTeam = (id: NationalTeamId) =>
  NATIONAL_TEAMS.find((team) => team.id === id) ?? NATIONAL_TEAMS[0];

export const getTeamName = (id: NationalTeamId, language: Language) =>
  getNationalTeam(id).names[language];
