/**
 * Salvataggio automatico del torneo: permette di chiudere il gioco e ritrovare
 * il tabellone esattamente dove lo si era lasciato.
 *
 * Il formato su disco è JSON puro: ogni campo viene validato alla lettura, così
 * un salvataggio corrotto, vecchio o manomesso viene semplicemente ignorato.
 */
import type { Difficulty, MatchDuration, TeamSize } from './engine';
import { hasNationalTeam, type NationalTeamId } from './teams';
import {
  DEFAULT_TOURNAMENT_CONFIG,
  FORMAT_IDS,
  GROUP_SIZES,
  QUALIFY_OPTIONS,
  SEEDING_IDS,
  UPSET_OPTIONS,
  type CupFormat,
  type MatchDecision,
  type SeedingMode,
  type TournamentConfig,
  type TournamentGroup,
  type TournamentMatch,
  type TournamentStageName,
  type TournamentState,
} from './tournament';

export const TOURNAMENT_SAVE_KEY = 'street-soccer:tournament:v1';
export const SAVE_VERSION = 1;

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'extreme'];
const TEAM_SIZES: TeamSize[] = [1, 2, 3, 4, 5];
/** Durate riconosciute: allineate a quelle dell'engine. */
const DURATION_LIST: readonly MatchDuration[] = [60, 90, 120, 180];
const DECISIONS: MatchDecision[] = ['pending', 'regular', 'extra', 'pens', 'seed', 'bye'];
const STAGES: TournamentStageName[] = ['groups', 'knockout', 'complete'];

/** Impostazioni della singola partita ereditate dal torneo. */
export interface TournamentMatchSettings {
  teamSize: TeamSize;
  matchDuration: MatchDuration;
  difficulty: Difficulty;
}

export interface TournamentSave {
  version: number;
  savedAt: number;
  tournament: TournamentState;
  match: TournamentMatchSettings;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTeam = (value: unknown, roster: Set<string>): value is NationalTeamId =>
  typeof value === 'string' && roster.has(value) && hasNationalTeam(value);

const intIn = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

const scorePair = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [a, b] = value;
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 0 || b < 0 || a > 99 || b > 99) return null;
  return [a, b];
};

function sanitizeConfig(value: unknown): TournamentConfig | null {
  if (!isRecord(value)) return null;
  const format = FORMAT_IDS.includes(value.format as CupFormat) ? (value.format as CupFormat) : null;
  const seeding = SEEDING_IDS.includes(value.seeding as SeedingMode) ? (value.seeding as SeedingMode) : null;
  if (!format || !seeding) return null;
  const groupSize = GROUP_SIZES.includes(value.groupSize as (typeof GROUP_SIZES)[number])
    ? (value.groupSize as number)
    : null;
  const qualify = QUALIFY_OPTIONS.includes(value.qualify as (typeof QUALIFY_OPTIONS)[number])
    ? (value.qualify as number)
    : null;
  if (groupSize === null || qualify === null) return null;
  const limit = value.groupMatchdaysLimit === undefined ? 0 : intIn(value.groupMatchdaysLimit, 0, 40);
  if (limit === null) return null;
  const config: TournamentConfig = {
    format,
    groupSize,
    qualify,
    thirdPlace: typeof value.thirdPlace === 'boolean' ? value.thirdPlace : DEFAULT_TOURNAMENT_CONFIG.thirdPlace,
    extraTime: typeof value.extraTime === 'boolean' ? value.extraTime : DEFAULT_TOURNAMENT_CONFIG.extraTime,
    penalties: typeof value.penalties === 'boolean' ? value.penalties : DEFAULT_TOURNAMENT_CONFIG.penalties,
    seeding,
    upsets: UPSET_OPTIONS.includes(value.upsets as (typeof UPSET_OPTIONS)[number])
      ? (value.upsets as number)
      : DEFAULT_TOURNAMENT_CONFIG.upsets,
  };
  // la chiave resta assente quando non c'è un limite: il round-trip è esatto
  if (limit > 0) config.groupMatchdaysLimit = limit;
  return config;
}

function sanitizeMatchSettings(value: unknown): TournamentMatchSettings {
  const fallback: TournamentMatchSettings = { teamSize: 3, matchDuration: 90, difficulty: 'normal' };
  if (!isRecord(value)) return fallback;
  return {
    teamSize: TEAM_SIZES.includes(value.teamSize as TeamSize) ? (value.teamSize as TeamSize) : fallback.teamSize,
    matchDuration: DURATION_LIST.includes(value.matchDuration as MatchDuration)
      ? (value.matchDuration as MatchDuration)
      : fallback.matchDuration,
    difficulty: DIFFICULTIES.includes(value.difficulty as Difficulty)
      ? (value.difficulty as Difficulty)
      : fallback.difficulty,
  };
}

function sanitizeMatch(value: unknown, roster: Set<string>, expectedKind: TournamentMatch['kind']): TournamentMatch | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id) return null;
  if (value.kind !== expectedKind) return null;
  if (!isTeam(value.home, roster) || !isTeam(value.away, roster)) return null;
  if (typeof value.round !== 'number' || !Number.isInteger(value.round) || value.round < 0) return null;
  if (expectedKind === 'group' && typeof value.groupId !== 'string') return null;
  if (!DECISIONS.includes(value.decidedBy as MatchDecision)) return null;
  if (typeof value.isPlayer !== 'boolean') return null;
  const pending = value.score === null;
  const score = pending ? ([null] as const)[0] : scorePair(value.score);
  if (!pending && !score) return null;
  if (value.pens !== null) {
    const pens = scorePair(value.pens);
    if (!pens) return null;
  }
  if (value.winner !== null && !isTeam(value.winner, roster)) return null;
  return {
    id: value.id,
    kind: expectedKind,
    round: value.round,
    ...(expectedKind === 'group' ? { groupId: value.groupId as string } : {}),
    home: value.home as NationalTeamId,
    away: value.away as NationalTeamId,
    score: score ?? null,
    pens: pending ? null : (scorePair(value.pens) ?? null),
    winner: value.winner as NationalTeamId | null,
    decidedBy: value.decidedBy as MatchDecision,
    isPlayer: value.isPlayer,
  };
}

function matchList(value: unknown, roster: Set<string>, kind: TournamentMatch['kind']): TournamentMatch[] | null {
  if (!Array.isArray(value)) return null;
  const list: TournamentMatch[] = [];
  for (const item of value) {
    const match = sanitizeMatch(item, roster, kind);
    if (!match) return null;
    list.push(match);
  }
  return list;
}

function sanitizeGroup(value: unknown, roster: Set<string>): TournamentGroup | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  if (!Array.isArray(value.teams) || value.teams.length < 2) return null;
  const teams: NationalTeamId[] = [];
  for (const item of value.teams) {
    if (!isTeam(item, roster)) return null;
    teams.push(item);
  }
  if (new Set(teams).size !== teams.length) return null;
  if (!Array.isArray(value.matchdays)) return null;
  const matchdays: TournamentMatch[][] = [];
  for (const day of value.matchdays) {
    const fixtures = matchList(day, roster, 'group');
    if (!fixtures) return null;
    for (const fixture of fixtures) {
      //groupId è il prefisso del calendario (gr-A per il girone A): deve almeno contenerne l'id
      if (typeof fixture.groupId !== 'string' || !fixture.groupId.includes(value.id)) return null;
      if (!teams.includes(fixture.home) || !teams.includes(fixture.away)) return null;
    }
    matchdays.push(fixtures);
  }
  return { id: value.id, teams, matchdays };
}

/** Ricostruisce e valida un salvataggio; restituisce `null` se non è affidabile. */
export function decodeTournamentSave(raw: unknown): TournamentSave | null {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION || !isRecord(data.tournament)) return null;
  if (typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt)) return null;
  const state = data.tournament;

  const config = sanitizeConfig(state.config);
  if (!config) return null;

  if (!Array.isArray(state.participants) || state.participants.length < 4) return null;
  const roster = new Set<string>();
  const participants: NationalTeamId[] = [];
  for (const item of state.participants) {
    if (typeof item !== 'string' || !hasNationalTeam(item) || roster.has(item)) return null;
    roster.add(item);
    participants.push(item);
  }
  if (participants.length > 64) return null;
  if (!isTeam(state.playerTeam, roster)) return null;

  if (!Array.isArray(state.groups)) return null;
  const groups: TournamentGroup[] = [];
  const seen = new Set<string>();
  for (const item of state.groups) {
    const group = sanitizeGroup(item, roster);
    if (!group || seen.has(group.id)) return null;
    seen.add(group.id);
    groups.push(group);
  }
  const grouped = groups.flatMap((group) => group.teams);
  if (config.format !== 'league' && config.format !== 'knockout' && new Set(grouped).size !== participants.length) {
    return null;
  }
  if (config.format === 'league' && !(groups.length === 1 && groups[0].teams.length === participants.length)) {
    return null;
  }

  if (!Array.isArray(state.knockout)) return null;
  const knockout: TournamentMatch[][] = [];
  for (const round of state.knockout) {
    const matches = matchList(round, roster, 'ko');
    if (!matches) return null;
    knockout.push(matches);
  }
  let thirdPlace: TournamentMatch | null = null;
  if (state.thirdPlace !== null) {
    thirdPlace = sanitizeMatch(state.thirdPlace, roster, 'third');
    if (!thirdPlace) return null;
  }

  const stage = STAGES.includes(state.stage as TournamentStageName) ? (state.stage as TournamentStageName) : null;
  if (!stage) return null;
  const matchday = intIn(state.matchday, 0, 40);
  const koRound = intIn(state.koRound, 0, 20);
  const bracketRounds = intIn(state.bracketRounds, 0, 20);
  const bracketSize = intIn(state.bracketSize, 0, 128);
  if (matchday === null || koRound === null || bracketRounds === null || bracketSize === null) return null;
  if (state.activeMatchId !== null && typeof state.activeMatchId !== 'string') return null;
  for (const key of ['champion', 'runnerUp'] as const) {
    const value = state[key];
    if (value !== null && !isTeam(value, roster)) return null;
  }
  if (typeof state.eliminated !== 'boolean') return null;

  const tournament: TournamentState = {
    playerTeam: state.playerTeam as NationalTeamId,
    config,
    participants,
    groups,
    knockout,
    thirdPlace,
    stage,
    matchday,
    koRound,
    bracketRounds,
    bracketSize,
    activeMatchId: (state.activeMatchId as string | null) ?? null,
    champion: (state.champion as NationalTeamId | null) ?? null,
    runnerUp: (state.runnerUp as NationalTeamId | null) ?? null,
    eliminated: state.eliminated,
  };
  return { version: SAVE_VERSION, savedAt: data.savedAt, tournament, match: sanitizeMatchSettings(data.match) };
}

export function encodeTournamentSave(
  tournament: TournamentState,
  match: TournamentMatchSettings,
  savedAt = Date.now(),
): string {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, tournament, match });
}

const storage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

export function makeTournamentSave(
  tournament: TournamentState,
  match: TournamentMatchSettings,
  savedAt = Date.now(),
): TournamentSave {
  return { version: SAVE_VERSION, savedAt, tournament, match };
}

/** Scrive il torneo su disco e restituisce l'oggetto da tenere in memoria. */
export function persistTournament(tournament: TournamentState, match: TournamentMatchSettings): TournamentSave {
  const save = makeTournamentSave(tournament, match);
  const area = storage();
  if (area) {
    try {
      area.setItem(TOURNAMENT_SAVE_KEY, JSON.stringify(save));
    } catch {
      /* quota o navigazione anonima: il torneo resta solo in memoria */
    }
  }
  return save;
}

export function readTournamentSave(): TournamentSave | null {
  const area = storage();
  if (!area) return null;
  try {
    return decodeTournamentSave(area.getItem(TOURNAMENT_SAVE_KEY));
  } catch {
    return null;
  }
}

/** Chiave del record di round superati in sopravvivenza. */
export const SURVIVAL_BEST_KEY = 'ss3v3-survival-best';

/** Record di round superati di fila in modalità sopravvivenza. */
export function readSurvivalBest(): number {
  const area = storage();
  if (!area) return 0;
  try {
    const value = Number.parseInt(area.getItem(SURVIVAL_BEST_KEY) ?? '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Aggiorna il record, se migliore di quello salvato. */
export function writeSurvivalBest(rounds: number): void {
  const area = storage();
  if (!area) return;
  try {
    if (rounds > readSurvivalBest()) area.setItem(SURVIVAL_BEST_KEY, String(Math.round(rounds)));
  } catch {
    /* quota o navigazione anonima */
  }
}

export function forgetTournament(): void {
  const area = storage();
  if (!area) return;
  try {
    area.removeItem(TOURNAMENT_SAVE_KEY);
  } catch {
    /* nulla da fare */
  }
}
