import {
  CONFEDERATIONS,
  NATIONAL_TEAMS,
  getTeamStrength,
  type Confederation,
  type NationalTeamId,
  type Tier,
} from './teams';

export type CupFormat = 'cup' | 'groups' | 'league' | 'knockout';
export type SeedingMode = 'random' | 'pots' | 'serpentine';
export type MatchDecision = 'pending' | 'regular' | 'extra' | 'pens' | 'seed' | 'bye';
export type TournamentStageName = 'groups' | 'knockout' | 'complete';
export type EngineDecision = 'regular' | 'golden' | 'pens';

export interface TournamentConfig {
  /** `cup` = gironi + tabellone, `groups` = solo gironi, `league` = girone unico, `knockout` = tabellone secco. */
  format: CupFormat;
  /** Quante nazionali per girone (2–6). */
  groupSize: number;
  /** Quante squadre si qualificano per girone (1–3). */
  qualify: number;
  /** Finale per il 3°/4° posto fra le perse delle semifinali. */
  thirdPlace: boolean;
  /** Supplementari (golden goal) nei turni ad eliminazione diretta. */
  extraTime: boolean;
  /** Sequenza dei rigori quando la partita resta in parità. */
  penalties: boolean;
  /** Criterio del sorteggio dei gironi. */
  seeding: SeedingMode;
  /** 0 = vincono quasi sempre le più forti, 2 = massimo delle sorprese. */
  upsets: number;
  /** Numero di giornate della fase a gironi (0 = tutte quelle necessarie). */
  groupMatchdaysLimit?: number;
}

export const FORMAT_IDS: CupFormat[] = ['cup', 'groups', 'league', 'knockout'];
export const SEEDING_IDS: SeedingMode[] = ['pots', 'serpentine', 'random'];
export const GROUP_SIZES = [2, 3, 4, 5, 6] as const;
export const QUALIFY_OPTIONS = [1, 2, 3] as const;
export const PARTICIPANT_OPTIONS = [4, 8, 12, 16, 24, 32, 48, 64] as const;
export const UPSET_OPTIONS = [0, 1, 2] as const;

export const DEFAULT_TOURNAMENT_CONFIG: TournamentConfig = {
  format: 'cup',
  groupSize: 4,
  qualify: 2,
  thirdPlace: false,
  extraTime: true,
  penalties: true,
  seeding: 'pots',
  upsets: 1,
};

export interface TournamentMatch {
  id: string;
  kind: 'group' | 'ko' | 'third';
  /** Fase a gironi: indice della giornata. Tabellone: indice del turno (0 = primo). */
  round: number;
  groupId?: string;
  home: NationalTeamId;
  away: NationalTeamId;
  score: [number, number] | null;
  pens: [number, number] | null;
  winner: NationalTeamId | null;
  decidedBy: MatchDecision;
  isPlayer: boolean;
}

export interface TournamentGroup {
  id: string;
  teams: NationalTeamId[];
  /** Partite raggruppate per giornata. */
  matchdays: TournamentMatch[][];
}

export interface TournamentState {
  playerTeam: NationalTeamId;
  config: TournamentConfig;
  participants: NationalTeamId[];
  groups: TournamentGroup[];
  /** Turni ad eliminazione diretta, dal primo all'ultimo (l'ultimo è la finale). */
  knockout: TournamentMatch[][];
  thirdPlace: TournamentMatch | null;
  stage: TournamentStageName;
  matchday: number;
  koRound: number;
  /** Turni totali del tabellone (0 se assente). */
  bracketRounds: number;
  /** Posti disponibili nel tabellone, potenze di due. */
  bracketSize: number;
  activeMatchId: string | null;
  champion: NationalTeamId | null;
  runnerUp: NationalTeamId | null;
  eliminated: boolean;
}

export interface TeamStanding {
  team: NationalTeamId;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface PoolOptions {
  confederations?: Confederation[];
  minTier?: Tier | 0;
  /** Esclude le squadre più forti: utile per i tornei delle nazioni minori. */
  maxTier?: Tier;
  exclude?: NationalTeamId[];
}

/** Preset pronti: ricalcano i formati dei grandi tornei FIFA e continentali. */
export interface TournamentPreset {
  id: string;
  confederations: Confederation[];
  minTier: Tier | 0;
  /** Torneo riservato alle federazioni minori: solo fasce 1–2. */
  onlySmall: boolean;
  count: number;
  config: Partial<TournamentConfig>;
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  { id: 'wc48', confederations: [], minTier: 0, onlySmall: false, count: 48, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: false, seeding: 'pots', upsets: 1 } },
  { id: 'wc32', confederations: [], minTier: 0, onlySmall: false, count: 32, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: true, seeding: 'pots', upsets: 1 } },
  { id: 'euro', confederations: ['uefa'], minTier: 0, onlySmall: false, count: 24, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: false, seeding: 'pots', upsets: 1 } },
  { id: 'america', confederations: ['conmebol'], minTier: 0, onlySmall: false, count: 10, config: { format: 'cup', groupSize: 5, qualify: 2, thirdPlace: false, seeding: 'serpentine', upsets: 1 } },
  { id: 'africa', confederations: ['caf'], minTier: 0, onlySmall: false, count: 24, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: true, seeding: 'pots', upsets: 2 } },
  { id: 'asia', confederations: ['afc'], minTier: 0, onlySmall: false, count: 24, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: false, seeding: 'pots', upsets: 2 } },
  { id: 'oceania', confederations: ['ofc'], minTier: 0, onlySmall: false, count: 8, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: true, seeding: 'random', upsets: 1 } },
  { id: 'micro', confederations: [], minTier: 0, onlySmall: true, count: 16, config: { format: 'cup', groupSize: 4, qualify: 2, thirdPlace: false, seeding: 'random', upsets: 2 } },
  { id: 'league', confederations: [], minTier: 4, onlySmall: false, count: 12, config: { format: 'league', thirdPlace: false, seeding: 'pots', upsets: 1 } },
  { id: 'sudden', confederations: [], minTier: 0, onlySmall: false, count: 16, config: { format: 'knockout', thirdPlace: false, seeding: 'pots', upsets: 1, extraTime: true, penalties: true } },
];

export const presetPoolOptions = (preset: TournamentPreset): PoolOptions => ({
  confederations: preset.confederations,
  minTier: preset.minTier,
  maxTier: preset.onlySmall ? 2 : undefined,
});

/** Partecipanti di un preset: il serbatoio è filtrato, la nazionale del giocatore entra sempre. */
export function presetParticipants(preset: TournamentPreset, playerTeam: NationalTeamId, random: Random = Math.random): NationalTeamId[] {
  const pool = poolCandidates(presetPoolOptions(preset)).map((team) => team.id);
  const wanted = Math.min(Math.max(4, preset.count), Math.max(4, pool.length));
  return drawParticipants(wanted, playerTeam, presetPoolOptions(preset), random);
}

export interface TournamentSetup {
  playerTeam: NationalTeamId;
  participants: NationalTeamId[];
  config: Partial<TournamentConfig>;
}

type Random = () => number;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const letterFor = (index: number) => String.fromCharCode(65 + (index % 26)) + (index >= 26 ? String(Math.floor(index / 26) + 1) : '');

export const nextPowerOfTwo = (value: number) => {
  let size = 2;
  while (size < value) size *= 2;
  return size;
};

const log2 = (value: number) => Math.round(Math.log2(Math.max(2, value)));

/**
 * Posizioni standard del tabellone: la prima testa di serie incontra l'ultima solo in finale,
 * le coppie consecutive sono gli accoppiamenti del primo turno.
 */
function bracketSeedOrder(rounds: number): number[] {
  let order = [1, 2];
  for (let round = 1; round < rounds; round++) {
    const size = order.length * 2;
    const next: number[] = [];
    for (const seed of order) next.push(seed, size + 1 - seed);
    order = next;
  }
  return order;
}

function poisson(lambda: number, random: Random, cap = 7): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= random();
  } while (p > limit && k < cap + 3);
  return Math.min(cap, Math.max(0, k - 1));
}

function simulateScore(home: NationalTeamId, away: NationalTeamId, config: TournamentConfig, random: Random): [number, number] {
  const diff = (getTeamStrength(home) - getTeamStrength(away)) / 30;
  const chaos = clamp(config.upsets, 0, 2);
  const skill = 0.9 / (0.55 + chaos * 0.45);
  return [
    poisson(clamp(1.3 + diff * skill, 0.18, 3.6), random),
    poisson(clamp(1.15 - diff * skill, 0.15, 3.4), random),
  ];
}

function rollPenaltyScore(random: Random): [number, number] {
  const home = 3 + Math.floor(random() * 3);
  const awayOptions = [3, 4, 5].filter((score) => score !== home);
  const away = awayOptions[Math.min(awayOptions.length - 1, Math.floor(random() * awayOptions.length))];
  return [home, away];
}

/** Squadre del serbatoio in base a continenti e fascia di merito selezionati. */
export function poolCandidates(options: PoolOptions): typeof NATIONAL_TEAMS {
  const confederations = options.confederations?.length ? new Set<Confederation>(options.confederations) : null;
  const exclude = new Set(options.exclude ?? []);
  const minTier = options.minTier ?? 0;
  return NATIONAL_TEAMS.filter(
    (team) =>
      !exclude.has(team.id) &&
      (!confederations || confederations.has(team.confederation)) &&
      team.tier >= minTier &&
      (options.maxTier === undefined || team.tier <= options.maxTier),
  );
}

/** Sorteggio del numero di partecipanti richiesti (la nazionale del giocatore è sempre inclusa). */
export function drawParticipants(
  count: number,
  playerTeam: NationalTeamId,
  options: PoolOptions,
  random: Random = Math.random,
): NationalTeamId[] {
  const pool = poolCandidates({ ...options, exclude: [...(options.exclude ?? []), playerTeam] });
  const picked = shuffled(pool, random).map((team) => team.id).slice(0, Math.max(0, count - 1));
  const list = [...new Set([playerTeam, ...picked])];
  if (list.length < count) {
    for (const team of NATIONAL_TEAMS) {
      if (list.length >= count) break;
      if (!list.includes(team.id)) list.push(team.id);
    }
  }
  return list.slice(0, Math.max(4, Math.min(count, list.length)));
}

function createMatch(
  id: string,
  kind: TournamentMatch['kind'],
  round: number,
  home: NationalTeamId,
  away: NationalTeamId,
  playerTeam: NationalTeamId,
  groupId?: string,
): TournamentMatch {
  return {
    id,
    kind,
    round,
    groupId,
    home,
    away,
    score: null,
    pens: null,
    winner: null,
    decidedBy: 'pending',
    isPlayer: home === playerTeam || away === playerTeam,
  };
}

/** Calendario all'italiana (metodo del cerchio): restituisce le giornate. */
function roundRobin(teamIds: NationalTeamId[], prefix: string, playerTeam: NationalTeamId): TournamentMatch[][] {
  const ids: (NationalTeamId | null)[] = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, null];
  const count = ids.length;
  const half = count / 2;
  const rotation = ids.slice(1);
  const matchdays: TournamentMatch[][] = [];
  for (let day = 0; day < count - 1; day++) {
    const lineup = [ids[0], ...rotation];
    const matches: TournamentMatch[] = [];
    for (let pair = 0; pair < half; pair++) {
      const first = lineup[pair];
      const second = lineup[count - 1 - pair];
      if (!first || !second) continue;
      const [home, away] = (day + pair) % 2 === 0 ? [first, second] : [second, first];
      matches.push(createMatch(`${prefix}-d${day + 1}-m${pair + 1}`, 'group', day, home, away, playerTeam, prefix));
    }
    if (matches.length > 0) matchdays.push(matches);
    rotation.unshift(rotation.pop() as NationalTeamId);
  }
  return matchdays;
}

export const getGroupMatches = (group: TournamentGroup): TournamentMatch[] => group.matchdays.flat();

export function getGroupStandings(group: TournamentGroup): TeamStanding[] {
  const standings = new Map<NationalTeamId, TeamStanding>();
  for (const team of group.teams) {
    standings.set(team, { team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  }
  for (const match of getGroupMatches(group)) {
    if (!match.score) continue;
    const home = standings.get(match.home);
    const away = standings.get(match.away);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += match.score[0];
    home.goalsAgainst += match.score[1];
    away.goalsFor += match.score[1];
    away.goalsAgainst += match.score[0];
    if (match.winner === null) {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    } else if (match.winner === match.home) {
      home.wins++;
      away.losses++;
      home.points += 3;
    } else {
      away.wins++;
      home.losses++;
      away.points += 3;
    }
  }
  const rows = [...standings.values()];
  rows.sort((a, b) => {
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    return (
      b.points - a.points ||
      diffB - diffA ||
      b.goalsFor - a.goalsFor ||
      a.goalsAgainst - b.goalsAgainst ||
      getTeamStrength(b.team) - getTeamStrength(a.team) ||
      a.team.localeCompare(b.team)
    );
  });
  return rows;
}

/** Ordina le qualificate di un dato posto fra tutti i gironi (per le teste di serie). */
function rankAcrossGroups(groups: TournamentGroup[], place: number): NationalTeamId[] {
  const rows = groups.flatMap((group) => {
    const standing = getGroupStandings(group)[place];
    if (!standing) return [];
    return [{
      team: standing.team,
      points: standing.points,
      goalDiff: standing.goalsFor - standing.goalsAgainst,
      goalsFor: standing.goalsFor,
      groupIndex: group.id,
    }];
  });
  rows.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.groupIndex.localeCompare(b.groupIndex),
  );
  return rows.map((row) => row.team);
}

const groupIdOf = (groups: TournamentGroup[], team: NationalTeamId) =>
  groups.find((group) => group.teams.includes(team))?.id ?? '';

function qualifiedSeeds(groups: TournamentGroup[], qualify: number): NationalTeamId[] {
  const seeds: NationalTeamId[] = [];
  for (let place = 0; place < Math.max(1, qualify); place++) {
    for (const team of rankAcrossGroups(groups, place)) {
      if (!seeds.includes(team)) seeds.push(team);
    }
  }
  return seeds;
}

const winnersOf = (matches: TournamentMatch[]): NationalTeamId[] =>
  matches.map((match) => match.winner).filter((team): team is NationalTeamId => Boolean(team));

interface BracketContext {
  playerTeam: NationalTeamId;
  groups: TournamentGroup[];
}

/** Costruisce un turno del tabellone a partire dalle teste di serie, con i riposi. */
function buildBracket(seeds: NationalTeamId[], bracketSize: number, roundIndex: number, context: BracketContext): TournamentMatch[] {
  const order = bracketSeedOrder(log2(bracketSize));
  const slots: (NationalTeamId | null)[] = new Array(bracketSize).fill(null);
  seeds.forEach((team, index) => {
    const position = order[index];
    if (position >= 1 && position <= bracketSize) slots[position - 1] = team;
  });

  const matches: TournamentMatch[] = [];
  for (let pair = 0; pair < bracketSize / 2; pair++) {
    const home = slots[pair * 2];
    const away = slots[pair * 2 + 1];
    const id = `ko-${roundIndex + 1}-m${pair + 1}`;
    if (home && !away) {
      matches.push({ ...createMatch(id, 'ko', roundIndex, home, home, context.playerTeam), score: [0, 0], winner: home, decidedBy: 'bye' });
      continue;
    }
    if (!home && away) {
      matches.push({ ...createMatch(id, 'ko', roundIndex, away, away, context.playerTeam), score: [0, 0], winner: away, decidedBy: 'bye' });
      continue;
    }
    if (!home || !away) {
      matches.push({ ...createMatch(id, 'ko', roundIndex, home ?? away ?? seeds[0] ?? 'ita', away ?? home ?? seeds[0] ?? 'ita', context.playerTeam), score: [0, 0], winner: home ?? away, decidedBy: 'bye' });
      continue;
    }
    matches.push(createMatch(id, 'ko', roundIndex, home, away, context.playerTeam));
  }

  // Al primo turno due squadre dello stesso girone non dovrebbero ripetersi subito.
  if (roundIndex === 0 && context.groups.length > 1) {
    const clash = (match: TournamentMatch) =>
      match.score === null && groupIdOf(context.groups, match.home) === groupIdOf(context.groups, match.away);
    for (let index = 0; index < matches.length; index++) {
      if (!clash(matches[index])) continue;
      for (let swap = index + 1; swap < matches.length; swap++) {
        if (matches[swap].score !== null) continue;
        const candidate = matches[swap].away;
        const current = matches[index].away;
        matches[index] = { ...matches[index], away: candidate };
        matches[swap] = { ...matches[swap], away: current };
        if (clash(matches[index])) {
          matches[index] = { ...matches[index], away: current };
          matches[swap] = { ...matches[swap], away: candidate };
        } else {
          break;
        }
      }
    }
  }
  return matches;
}

function decideKnockout(
  match: TournamentMatch,
  score: [number, number],
  winner: NationalTeamId | null,
  pens: [number, number] | null,
  config: TournamentConfig,
  random: Random,
  engineDecision?: EngineDecision,
): Pick<TournamentMatch, 'score' | 'pens' | 'winner' | 'decidedBy'> {
  const autoWinner = winner ?? (score[0] === score[1] ? null : score[0] > score[1] ? match.home : match.away);
  if (autoWinner) {
    const decidedBy: MatchDecision =
      engineDecision === 'pens' || pens ? 'pens' : engineDecision === 'golden' ? 'extra' : 'regular';
    return { score, pens, winner: autoWinner, decidedBy };
  }
  if (config.penalties) {
    const resolved = pens ?? rollPenaltyScore(random);
    return { score, pens: resolved, winner: resolved[0] > resolved[1] ? match.home : match.away, decidedBy: 'pens' };
  }
  const better = getTeamStrength(match.home) >= getTeamStrength(match.away) ? match.home : match.away;
  const upset = random() < clamp(config.upsets, 0, 2) * 0.3;
  const chosen = upset ? (better === match.home ? match.away : match.home) : better;
  return { score, pens: null, winner: chosen, decidedBy: 'seed' };
}

function simulateKnockout(match: TournamentMatch, config: TournamentConfig, random: Random): TournamentMatch {
  if (match.score !== null) return match;
  const score = simulateScore(match.home, match.away, config, random);
  return { ...match, ...decideKnockout(match, score, null, null, config, random) };
}

function simulateGroupMatch(match: TournamentMatch, config: TournamentConfig, random: Random): TournamentMatch {
  const score = simulateScore(match.home, match.away, config, random);
  return { ...match, score, winner: score[0] === score[1] ? null : score[0] > score[1] ? match.home : match.away, decidedBy: 'regular' };
}

function applyResults(state: TournamentState, updated: TournamentMatch[]): TournamentState {
  if (updated.length === 0) return state;
  const map = new Map(updated.map((match) => [match.id, match]));
  const substitute = (match: TournamentMatch) => map.get(match.id) ?? match;
  return {
    ...state,
    groups: state.groups.map((group) => ({
      ...group,
      matchdays: group.matchdays.map((day) => day.map(substitute)),
    })),
    knockout: state.knockout.map((round) => round.map(substitute)),
    thirdPlace: state.thirdPlace ? (map.get(state.thirdPlace.id) ?? state.thirdPlace) : null,
  };
}

function finish(state: TournamentState, champion: NationalTeamId | null, runnerUp: NationalTeamId | null): TournamentState {
  return {
    ...state,
    stage: 'complete',
    activeMatchId: null,
    champion,
    runnerUp,
    eliminated: champion !== state.playerTeam,
  };
}

function finishWithStandings(state: TournamentState): TournamentState {
  const [champion, runnerUp] = state.groups.length ? rankAcrossGroups(state.groups, 0).concat(rankAcrossGroups(state.groups, 1)) : [null, null];
  return finish(state, champion ?? null, runnerUp ?? null);
}

function openBracket(state: TournamentState, seeds: NationalTeamId[]): TournamentState {
  const bracketSize = Math.max(2, nextPowerOfTwo(seeds.length));
  const bracketRounds = log2(bracketSize);
  const first = buildBracket(seeds, bracketSize, 0, { playerTeam: state.playerTeam, groups: state.groups });
  return {
    ...state,
    stage: 'knockout',
    koRound: 0,
    bracketSize,
    bracketRounds,
    knockout: [first],
    thirdPlace: null,
  };
}

const matchdayOf = (group: TournamentGroup, day: number) => group.matchdays[day] ?? [];

/** Fa avanzare il torneo finché non trova la prossima partita del giocatore. */
function progress(input: TournamentState, random: Random): TournamentState {
  let state = input;
  const config = state.config;

  for (let guard = 0; guard < 500; guard++) {
    if (state.stage === 'groups') {
      const fixtures = state.groups.flatMap((group) => matchdayOf(group, state.matchday));
      const pending = fixtures.filter((match) => match.score === null);

      if (pending.length === 0) {
        const nextDay = state.matchday + 1;
        const hasMore = state.groups.some((group) => (group.matchdays[nextDay]?.length ?? 0) > 0);
        state = { ...state, matchday: nextDay };
        if (hasMore) continue;
        if (config.format === 'cup') {
          const seeds = qualifiedSeeds(state.groups, config.qualify);
          if (seeds.length < 2) return finishWithStandings(state);
          state = openBracket(state, seeds);
          continue;
        }
        return finishWithStandings(state);
      }

      const playerMatch = pending.find((match) => match.isPlayer);
      const simulated = pending
        .filter((match) => match.id !== playerMatch?.id)
        .map((match) => simulateGroupMatch(match, config, random));
      state = applyResults(state, simulated);
      if (!playerMatch) continue;
      return { ...state, activeMatchId: playerMatch.id };
    }

    if (state.stage === 'knockout') {
      const round = state.knockout[state.koRound] ?? [];
      const pending = round.filter((match) => match.score === null);

      // finale per il 3°/4° posto: appena le semifinali sono chiuse
      if (config.thirdPlace && !state.thirdPlace && state.koRound >= state.bracketRounds - 2) {
        const semifinals = state.knockout[Math.max(0, state.bracketRounds - 2)] ?? [];
        const ready = semifinals.length >= 2 && semifinals.every((match) => match.score !== null);
        if (ready) {
          const losers = semifinals
            .filter((match) => match.winner && match.decidedBy !== 'bye')
            .map((match) => (match.winner === match.home ? match.away : match.home));
          if (losers.length >= 2) {
            state = {
              ...state,
              thirdPlace: createMatch('third-place', 'third', state.koRound, losers[0], losers[1], state.playerTeam),
            };
          }
        }
      }

      if (state.thirdPlace && state.thirdPlace.score === null) {
        if (state.thirdPlace.isPlayer) return { ...state, activeMatchId: state.thirdPlace.id };
        state = applyResults(state, [simulateKnockout(state.thirdPlace, config, random)]);
      }

      if (pending.length === 0) {
        const isLast = state.koRound >= state.bracketRounds - 1;
        if (isLast) {
          const final = round[round.length - 1];
          const champion = final?.winner ?? null;
          const runnerUp = final ? (final.winner === final.home ? final.away : final.home) : null;
          return finish(state, champion, runnerUp);
        }
        const winners = winnersOf(round);
        if (winners.length < 2) return finishWithStandings(state);
        const nextRound = buildBracket(winners, Math.max(2, winners.length), state.koRound + 1, {
          playerTeam: state.playerTeam,
          groups: state.groups,
        });
        const knockout = state.knockout.slice();
        knockout[state.koRound + 1] = nextRound;
        state = { ...state, koRound: state.koRound + 1, knockout };
        continue;
      }

      const playerMatch = pending.find((match) => match.isPlayer);
      const simulated = pending
        .filter((match) => match.id !== playerMatch?.id)
        .map((match) => simulateKnockout(match, config, random));
      state = applyResults(state, simulated);

      if (!playerMatch) continue;
      return { ...state, activeMatchId: playerMatch.id };
    }

    return state;
  }
  return state;
}

/** Numero di giornate della fase a gironi. */
export const totalGroupMatchdays = (tournament: TournamentState) =>
  tournament.groups.reduce((max, group) => Math.max(max, group.matchdays.length), 0);

export const getAllTournamentMatches = (tournament: TournamentState): TournamentMatch[] => [
  ...tournament.groups.flatMap((group) => getGroupMatches(group)),
  ...tournament.knockout.flat(),
  ...(tournament.thirdPlace ? [tournament.thirdPlace] : []),
];

export const getTournamentMatch = (tournament: TournamentState, matchId: string): TournamentMatch | null =>
  getAllTournamentMatches(tournament).find((match) => match.id === matchId) ?? null;

export const getActiveTournamentMatch = (tournament: TournamentState): TournamentMatch | null =>
  tournament.activeMatchId ? getTournamentMatch(tournament, tournament.activeMatchId) : null;

export function createTournament(setup: TournamentSetup, random: Random = Math.random): TournamentState {
  const config: TournamentConfig = { ...DEFAULT_TOURNAMENT_CONFIG, ...setup.config };
  const player = NATIONAL_TEAMS.some((team) => team.id === setup.playerTeam) ? setup.playerTeam : NATIONAL_TEAMS[0].id;
  const unique = [...new Set(setup.participants.filter(Boolean))];
  const withPlayer = unique.includes(player) ? unique : [player, ...unique];
  const participants = withPlayer.length >= 4 ? withPlayer : drawParticipants(Math.max(4, withPlayer.length), player, {}, random);

  const singleGroup = config.format === 'league';
  const noGroups = config.format === 'knockout';
  const groupSize = singleGroup || noGroups ? participants.length : clamp(Math.round(config.groupSize), 2, 6);
  const groupCount = singleGroup ? 1 : noGroups ? 0 : Math.max(1, Math.ceil(participants.length / groupSize));

  const seeded =
    config.seeding === 'random' ? shuffled(participants, random) : [...participants].sort((a, b) => getTeamStrength(b) - getTeamStrength(a) || a.localeCompare(b));

  const buckets: NationalTeamId[][] = Array.from({ length: groupCount }, () => [] as NationalTeamId[]);
  if (groupCount > 1 && config.seeding === 'pots') {
    const pots: NationalTeamId[][] = [];
    for (let index = 0; index < seeded.length; index += groupCount) pots.push(seeded.slice(index, index + groupCount));
    pots.forEach((pot, potIndex) => {
      const row = potIndex % 2 === 0 ? [...pot] : [...pot].reverse();
      row.forEach((team, groupIndex) => buckets[groupIndex].push(team));
    });
  } else if (groupCount > 1 && config.seeding === 'serpentine') {
    seeded.forEach((team, index) => {
      const row = Math.floor(index / groupCount);
      const slot = row % 2 === 0 ? index % groupCount : groupCount - 1 - (index % groupCount);
      buckets[slot].push(team);
    });
  } else if (groupCount > 0) {
    seeded.forEach((team, index) => buckets[index % groupCount].push(team));
  }

  const dayLimit = config.groupMatchdaysLimit && config.groupMatchdaysLimit > 0 ? Math.round(config.groupMatchdaysLimit) : 0;
  const groups: TournamentGroup[] = buckets
    .filter((teams) => teams.length > 0)
    .map((teams, index) => {
      const id = letterFor(index);
      const calendar = roundRobin(teams, `gr-${id}`, player);
      return { id, teams, matchdays: dayLimit > 0 ? calendar.slice(0, dayLimit) : calendar };
    });

  const state: TournamentState = {
    playerTeam: player,
    config,
    participants: [...new Set(participants)],
    groups,
    knockout: [],
    thirdPlace: null,
    stage: noGroups ? 'knockout' : 'groups',
    matchday: 0,
    koRound: 0,
    bracketRounds: 0,
    bracketSize: 0,
    activeMatchId: null,
    champion: null,
    runnerUp: null,
    eliminated: false,
  };

  if (noGroups) {
    const seeds = [...state.participants];
    const ordered =
      config.seeding === 'random'
        ? shuffled(seeds, random)
        : seeds.sort((a, b) => getTeamStrength(b) - getTeamStrength(a) || a.localeCompare(b));
    return progress(openBracket(state, ordered), random);
  }
  return progress(state, random);
}

export function recordTournamentResult(
  tournament: TournamentState,
  score: [number, number],
  winner: NationalTeamId | null,
  pens: [number, number] | null = null,
  random: Random = Math.random,
  engineDecision?: EngineDecision,
): TournamentState {
  const active = getActiveTournamentMatch(tournament);
  if (!active || active.score !== null) return tournament;

  const resolved =
    active.kind === 'group'
      ? {
          score,
          pens: null,
          winner: score[0] === score[1] ? null : score[0] > score[1] ? active.home : active.away,
          decidedBy: 'regular' as MatchDecision,
        }
      : decideKnockout(active, score, winner, pens, tournament.config, random, engineDecision);

  const recorded: TournamentMatch = { ...active, ...resolved };
  const next = applyResults({ ...tournament, activeMatchId: null }, [recorded]);
  return progress(next, random);
}

// ------------------------------------------------------- helpers per la UI

export interface TournamentSummary {
  groups: number;
  groupSize: number;
  bracketSize: number;
  bracketRounds: number;
  groupMatchdays: number;
  playerMatches: number;
  totalMatches: number;
}

export function summarizeConfig(config: TournamentConfig, participants: number): TournamentSummary {
  const format = config.format;
  const singleGroup = format === 'league';
  const noGroups = format === 'knockout';
  const groupSize = singleGroup || noGroups ? participants : clamp(Math.round(config.groupSize), 2, 6);
  const groups = singleGroup ? 1 : noGroups ? 0 : Math.max(1, Math.ceil(participants / groupSize));
  const qualifiers = groups * clamp(Math.round(config.qualify), 1, 3);
  const bracketSize = format === 'cup' && qualifiers >= 2 ? nextPowerOfTwo(qualifiers) : 0;
  const bracketRounds = bracketSize >= 2 ? log2(bracketSize) : 0;
  const perGroupDays = singleGroup
    ? Math.max(0, participants - 1)
    : groupSize % 2 === 0
      ? groupSize - 1
      : groupSize;
  const groupMatchdays = noGroups ? 0 : perGroupDays;
  const limited =
    config.groupMatchdaysLimit && config.groupMatchdaysLimit > 0
      ? Math.min(groupMatchdays, config.groupMatchdaysLimit)
      : groupMatchdays;
  const groupMatches = noGroups ? 0 : groups * Math.round((groupSize * (groupSize - 1)) / 2);
  const knockoutMatches = bracketSize >= 2 && (format === 'cup' || format === 'knockout')
    ? Math.max(1, format === 'knockout' ? participants : qualifiers) - 1 + (config.thirdPlace ? 1 : 0)
    : 0;
  const guaranteed = (noGroups ? 0 : limited) + (format === 'cup' || format === 'knockout' ? 1 : 0);
  return {
    groups,
    groupSize,
    bracketSize,
    bracketRounds,
    groupMatchdays: limited,
    playerMatches: guaranteed,
    totalMatches: groupMatches + knockoutMatches,
  };
}

export type RoundKey = 'final' | 'semifinals' | 'quarterfinals' | 'eighthfinals' | 'round32' | 'round64' | 'other';

/** Nome del turno di tabellone in base al numero di squadre coinvolte. */
export function roundKeyForSize(size: number): RoundKey {
  if (size <= 2) return 'final';
  if (size <= 4) return 'semifinals';
  if (size <= 8) return 'quarterfinals';
  if (size <= 16) return 'eighthfinals';
  if (size <= 32) return 'round32';
  if (size <= 64) return 'round64';
  return 'other';
}

export interface PlayerRecord {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function getPlayerRecord(tournament: TournamentState): PlayerRecord {
  const record: PlayerRecord = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const match of getAllTournamentMatches(tournament)) {
    if (match.score === null) continue;
    if (match.home !== tournament.playerTeam && match.away !== tournament.playerTeam) continue;
    if (match.decidedBy === 'bye') continue;
    const isHome = match.home === tournament.playerTeam;
    const own = isHome ? match.score[0] : match.score[1];
    const against = isHome ? match.score[1] : match.score[0];
    record.played++;
    record.goalsFor += own;
    record.goalsAgainst += against;
    if (match.winner === null) record.draws++;
    else if (match.winner === tournament.playerTeam) record.wins++;
    else record.losses++;
  }
  return record;
}

/** Turni del tabellone con il numero di squadre in campo, per l'intestazione. */
export function knockoutRoundSizes(tournament: TournamentState): number[] {
  return tournament.knockout.map((round) => Math.max(2, round.length * 2));
}

export const confederations = () => CONFEDERATIONS;
