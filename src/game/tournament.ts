import { NATIONAL_TEAMS, type NationalTeamId } from './teams';

export type GroupId = 'A' | 'B' | 'C' | 'D';
export type TournamentStage = 'groups' | 'quarterfinals' | 'semifinals' | 'final' | 'complete';
export type TournamentRound = 'group' | 'quarterfinal' | 'semifinal' | 'final';

export interface TournamentMatch {
  id: string;
  round: TournamentRound;
  groupId?: GroupId;
  home: NationalTeamId;
  away: NationalTeamId;
  score: [number, number] | null;
  pens: [number, number] | null;
  winner: NationalTeamId | null;
}

export interface TournamentGroup {
  id: GroupId;
  teams: NationalTeamId[];
  matches: TournamentMatch[];
}

export interface TournamentState {
  playerTeam: NationalTeamId;
  groups: TournamentGroup[];
  quarterfinals: TournamentMatch[];
  semifinals: TournamentMatch[];
  final: TournamentMatch | null;
  stage: TournamentStage;
  activeMatchId: string | null;
  champion: NationalTeamId | null;
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

const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D'];
const GROUP_FIXTURES: [number, number][] = [[0, 1], [0, 2], [1, 2]];

type Random = () => number;

function shuffled<T>(items: T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function rollGoals(random: Random): number {
  const roll = random();
  if (roll < 0.34) return 0;
  if (roll < 0.68) return 1;
  if (roll < 0.88) return 2;
  if (roll < 0.97) return 3;
  return 4;
}

function rollPenaltyScore(random: Random): [number, number] {
  const home = 3 + Math.floor(random() * 3);
  const awayOptions = [3, 4, 5].filter((score) => score !== home);
  const away = awayOptions[Math.min(awayOptions.length - 1, Math.floor(random() * awayOptions.length))];
  return [home, away];
}

function createMatch(
  id: string,
  round: TournamentRound,
  home: NationalTeamId,
  away: NationalTeamId,
  groupId?: GroupId,
): TournamentMatch {
  return { id, round, groupId, home, away, score: null, pens: null, winner: null };
}

function simulateMatch(match: TournamentMatch, random: Random, knockout: boolean): TournamentMatch {
  const score: [number, number] = [rollGoals(random), rollGoals(random)];
  let pens: [number, number] | null = null;
  let winner: NationalTeamId | null = score[0] === score[1]
    ? null
    : score[0] > score[1]
      ? match.home
      : match.away;

  if (knockout && winner === null) {
    pens = rollPenaltyScore(random);
    winner = pens[0] > pens[1] ? match.home : match.away;
  }

  return { ...match, score, pens, winner };
}

function allMatches(tournament: TournamentState): TournamentMatch[] {
  return [
    ...tournament.groups.flatMap((group) => group.matches),
    ...tournament.quarterfinals,
    ...tournament.semifinals,
    ...(tournament.final ? [tournament.final] : []),
  ];
}

export function getTournamentMatch(tournament: TournamentState, matchId: string): TournamentMatch | null {
  return allMatches(tournament).find((match) => match.id === matchId) ?? null;
}

export function getActiveTournamentMatch(tournament: TournamentState): TournamentMatch | null {
  return tournament.activeMatchId ? getTournamentMatch(tournament, tournament.activeMatchId) : null;
}

export function getGroupStandings(group: TournamentGroup): TeamStanding[] {
  const standings = new Map<NationalTeamId, TeamStanding>();
  for (const team of group.teams) {
    standings.set(team, { team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  }

  for (const match of group.matches) {
    if (!match.score) continue;
    const home = standings.get(match.home)!;
    const away = standings.get(match.away)!;
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

  return [...standings.values()].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor ||
    group.teams.indexOf(a.team) - group.teams.indexOf(b.team),
  );
}

function getWinners(matches: TournamentMatch[]): NationalTeamId[] {
  return matches.map((match) => match.winner!).filter(Boolean);
}

function getGroupStageWinners(groups: TournamentGroup[]): [NationalTeamId, NationalTeamId, NationalTeamId, NationalTeamId] {
  const qualifiers = groups.map((group) => getGroupStandings(group).slice(0, 2).map((standing) => standing.team));
  return [qualifiers[0][0], qualifiers[1][0], qualifiers[2][0], qualifiers[3][0]];
}

function getGroupRunnersUp(groups: TournamentGroup[]): [NationalTeamId, NationalTeamId, NationalTeamId, NationalTeamId] {
  const qualifiers = groups.map((group) => getGroupStandings(group).slice(0, 2).map((standing) => standing.team));
  return [qualifiers[0][1], qualifiers[1][1], qualifiers[2][1], qualifiers[3][1]];
}

function makeQuarterfinals(tournament: TournamentState, random: Random): TournamentMatch[] {
  const winners = getGroupStageWinners(tournament.groups);
  const runners = getGroupRunnersUp(tournament.groups);
  const pairings: [NationalTeamId, NationalTeamId][] = [
    [winners[0], runners[1]],
    [winners[1], runners[0]],
    [winners[2], runners[3]],
    [winners[3], runners[2]],
  ];
  return pairings.map(([home, away], index) => {
    const match = createMatch(`qf-${index + 1}`, 'quarterfinal', home, away);
    return home === tournament.playerTeam || away === tournament.playerTeam
      ? match
      : simulateMatch(match, random, true);
  });
}

function makeSemifinals(quarterfinals: TournamentMatch[], playerTeam: NationalTeamId, keepPlayer: boolean, random: Random): TournamentMatch[] {
  const winners = getWinners(quarterfinals);
  const pairings: [NationalTeamId, NationalTeamId][] = [
    [winners[0], winners[1]],
    [winners[2], winners[3]],
  ];
  return pairings.map(([home, away], index) => {
    const match = createMatch(`sf-${index + 1}`, 'semifinal', home, away);
    return keepPlayer && (home === playerTeam || away === playerTeam)
      ? match
      : simulateMatch(match, random, true);
  });
}

function makeFinal(semifinals: TournamentMatch[], playerTeam: NationalTeamId, keepPlayer: boolean, random: Random): TournamentMatch {
  const winners = getWinners(semifinals);
  const match = createMatch('final', 'final', winners[0], winners[1]);
  return keepPlayer && (match.home === playerTeam || match.away === playerTeam)
    ? match
    : simulateMatch(match, random, true);
}

function completeAfterElimination(
  tournament: TournamentState,
  fromRound: 'quarterfinal' | 'semifinal',
  random: Random,
): TournamentState {
  let semifinals = tournament.semifinals;
  let final = tournament.final;

  if (fromRound === 'quarterfinal') {
    semifinals = makeSemifinals(tournament.quarterfinals, tournament.playerTeam, false, random);
  }
  if (fromRound === 'quarterfinal' || fromRound === 'semifinal') {
    final = makeFinal(semifinals, tournament.playerTeam, false, random);
  }

  return {
    ...tournament,
    semifinals,
    final,
    stage: 'complete',
    activeMatchId: null,
    champion: final?.winner ?? null,
    eliminated: true,
  };
}

function beginKnockouts(tournament: TournamentState, random: Random): TournamentState {
  const quarterfinals = makeQuarterfinals(tournament, random);
  const playerQualified = quarterfinals.some((match) =>
    match.home === tournament.playerTeam || match.away === tournament.playerTeam,
  );
  const next = { ...tournament, quarterfinals, stage: 'quarterfinals' as const };

  if (!playerQualified) return completeAfterElimination(next, 'quarterfinal', random);

  const active = quarterfinals.find((match) =>
    match.score === null && (match.home === tournament.playerTeam || match.away === tournament.playerTeam),
  );
  if (!active) return completeAfterElimination(next, 'quarterfinal', random);
  return { ...next, activeMatchId: active.id };
}

export function createTournament(playerTeam: NationalTeamId, random: Random = Math.random): TournamentState {
  const drawnTeams = shuffled(NATIONAL_TEAMS.map((team) => team.id), random);
  const groups = GROUP_IDS.map((id, groupIndex): TournamentGroup => {
    const teams = drawnTeams.slice(groupIndex * 3, groupIndex * 3 + 3);
    const matches = GROUP_FIXTURES.map(([homeIndex, awayIndex], fixtureIndex) => {
      const home = teams[homeIndex];
      const away = teams[awayIndex];
      const match = createMatch(`group-${id}-${fixtureIndex + 1}`, 'group', home, away, id);
      return home === playerTeam || away === playerTeam
        ? match
        : simulateMatch(match, random, false);
    });
    return { id, teams, matches };
  });

  const activeMatch = groups
    .flatMap((group) => group.matches)
    .find((match) => match.score === null && (match.home === playerTeam || match.away === playerTeam));

  return {
    playerTeam,
    groups,
    quarterfinals: [],
    semifinals: [],
    final: null,
    stage: 'groups',
    activeMatchId: activeMatch?.id ?? null,
    champion: null,
    eliminated: false,
  };
}

function recordMatchResult(
  match: TournamentMatch,
  score: [number, number],
  winner: NationalTeamId | null,
  pens: [number, number] | null,
  random: Random,
): TournamentMatch {
  let resolvedWinner = winner;
  let resolvedPens = pens;

  if (match.round !== 'group' && resolvedWinner === null) {
    if (score[0] !== score[1]) {
      resolvedWinner = score[0] > score[1] ? match.home : match.away;
    } else {
      resolvedPens ??= rollPenaltyScore(random);
      resolvedWinner = resolvedPens[0] > resolvedPens[1] ? match.home : match.away;
    }
  }

  return { ...match, score: [...score], pens: resolvedPens, winner: resolvedWinner };
}

export function recordTournamentResult(
  tournament: TournamentState,
  score: [number, number],
  winner: NationalTeamId | null,
  pens: [number, number] | null = null,
  random: Random = Math.random,
): TournamentState {
  const active = getActiveTournamentMatch(tournament);
  if (!active || active.score !== null) return tournament;

  const recorded = recordMatchResult(active, score, winner, pens, random);
  let next: TournamentState;
  if (active.round === 'group') {
    const groups = tournament.groups.map((group) =>
      group.id === active.groupId
        ? { ...group, matches: group.matches.map((match) => match.id === active.id ? recorded : match) }
        : group,
    );
    const nextPlayerMatch = groups
      .flatMap((group) => group.matches)
      .find((match) => match.score === null && (match.home === tournament.playerTeam || match.away === tournament.playerTeam));

    next = { ...tournament, groups, activeMatchId: nextPlayerMatch?.id ?? null };
    return nextPlayerMatch ? next : beginKnockouts(next, random);
  }

  if (active.round === 'quarterfinal') {
    const quarterfinals = tournament.quarterfinals.map((match) => match.id === active.id ? recorded : match);
    next = { ...tournament, quarterfinals };
    if (recorded.winner !== tournament.playerTeam) return completeAfterElimination(next, 'quarterfinal', random);
    const semifinals = makeSemifinals(quarterfinals, tournament.playerTeam, true, random);
    const current = semifinals.find((match) => match.score === null);
    return { ...next, semifinals, stage: 'semifinals', activeMatchId: current?.id ?? null };
  }

  if (active.round === 'semifinal') {
    const semifinals = tournament.semifinals.map((match) => match.id === active.id ? recorded : match);
    next = { ...tournament, semifinals };
    if (recorded.winner !== tournament.playerTeam) return completeAfterElimination(next, 'semifinal', random);
    const final = makeFinal(semifinals, tournament.playerTeam, true, random);
    return { ...next, final, stage: 'final', activeMatchId: final.score === null ? final.id : null };
  }

  const final = recorded;
  return {
    ...tournament,
    final,
    stage: 'complete',
    activeMatchId: null,
    champion: final.winner,
    eliminated: final.winner !== tournament.playerTeam,
  };
}
