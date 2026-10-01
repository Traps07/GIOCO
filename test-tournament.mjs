// Test della modalità torneo personalizzata: struttura dei gironi, tabelloni,
// qualificazione, eliminazione e completamento automatico in ogni formato.
import assert from 'node:assert/strict';
import {
  createTournament,
  presetParticipants,
  TOURNAMENT_PRESETS,
  recordTournamentResult,
  getAllTournamentMatches,
  getActiveTournamentMatch,
  getGroupStandings,
  getGroupMatches,
  getPlayerRecord,
  drawParticipants,
  poolCandidates,
  summarizeConfig,
  DEFAULT_TOURNAMENT_CONFIG,
  FORMAT_IDS,
  SEEDING_IDS,
  nextPowerOfTwo,
} from './src/game/tournament.js';
import { NATIONAL_TEAMS, getTeamStrength } from './src/game/teams.js';
import {
  encodeTournamentSave,
  decodeTournamentSave,
  persistTournament,
  readTournamentSave,
  forgetTournament,
  TOURNAMENT_SAVE_KEY,
} from './src/game/save.js';

// PRNG deterministico (mulberry32) così i fallimenti sono riproducibili.
const makeRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

let checks = 0;
const check = (name, fn) => {
  try {
    fn();
    checks++;
  } catch (error) {
    console.error(`FAIL  ${name}\n      ${error.message}`);
    process.exitCode = 1;
  }
};

const nextPower = (n) => {
  let size = 2;
  while (size < n) size *= 2;
  return size;
};

function validateStructure(tournament, config, participants) {
  const all = getAllTournamentMatches(tournament);
  assert.ok(all.length > 0, 'nessuna partita generata');
  assert.equal(new Set(all.map((match) => match.id)).size, all.length, 'id delle partite duplicati');

  const ids = new Set(participants);
  for (const match of all) {
    assert.ok(ids.has(match.home), `squadra fuori dal roster: ${match.home}`);
    assert.ok(ids.has(match.away), `squadra fuori dal roster: ${match.away}`);
    if (match.decidedBy !== 'bye') assert.notEqual(match.home, match.away, 'una squadra incontra sé stessa');
  }

  // ogni squadra appare nel numero corretto di partite della fase a gironi
  if (tournament.groups.length > 0) {
    const grouped = tournament.groups.flatMap((group) => group.teams);
    assert.equal(new Set(grouped).size, grouped.length, 'squadra in più di un girone');
    if (config.format === 'cup' || config.format === 'groups') {
      assert.equal(grouped.length, participants.length, 'nazionali fuori dai gironi');
      const sizes = tournament.groups.map((group) => group.teams.length);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `gironi sbilanciati: ${sizes.join(',')}`);
      if (config.format !== 'league') {
        assert.ok(Math.max(...sizes) <= Math.max(2, config.groupSize) + 1, `girone troppo grande: ${Math.max(...sizes)}`);
      }
      for (const group of tournament.groups) {
        const fixtures = getGroupMatches(group);
        const pairs = new Set(fixtures.map((match) => [match.home, match.away].sort().join('~')));
        assert.equal(pairs.size, fixtures.length, `rivincite nello stesso girone (${group.id})`);
        for (const match of fixtures) assert.equal(match.kind, 'group');
      }
    }
  }

  // tabellone: potenze di due, vincitori coerenti, nessun girone ripetuto al primo turno
  for (const [index, round] of tournament.knockout.entries()) {
    assert.ok(round.length >= 1, `turno ${index} vuoto`);
    assert.equal(nextPowerOfTwo(round.length * 2), round.length * 2, `turno ${index} con numero di posti ${round.length * 2}`);
    for (const match of round) {
      assert.equal(match.kind, 'ko');
      assert.ok(match.id.startsWith(`ko-${index + 1}-`), `id turno errato: ${match.id}`);
    }
    if (index > 0) {
      const previous = tournament.knockout[index - 1].map((match) => match.winner);
      const present = round.flatMap((match) => [match.home, match.away]);
      for (const team of present) {
        assert.ok(previous.includes(team), `${team} in un turno senza aver vinto il precedente`);
      }
    }
  }
}

function playToEnd(tournament, random, config) {
  const participants = tournament.participants;
  let state = tournament;
  let guard = 0;
  const playerGames = [];
  while (guard++ < 400) {
    const fixture = getActiveTournamentMatch(state);
    if (!fixture) break;
    assert.ok(fixture.isPlayer, 'partita attiva che non riguarda il giocatore');
    const score = [Math.floor(random() * 3), Math.floor(random() * 3)];
    const winner = score[0] === score[1] ? null : score[0] > score[1] ? fixture.home : fixture.away;
    playerGames.push(fixture.id);
    const pens = fixture.kind !== 'group' && score[0] === score[1] && config.penalties ? [4, 3] : null;
    const next = recordTournamentResult(state, score, winner, pens, random);
    assert.notEqual(next, state, 'risultato non registrato: torneo bloccato');
    state = next;
  }
  assert.equal(state.stage, 'complete', `torneo non completato (${state.stage}, ${state.matchday}/${state.koRound})`);
  assert.ok(state.champion, 'nessun campione');
  assert.ok(participants.includes(state.champion), 'il campione non partecipava');
  const all = getAllTournamentMatches(state);
  assert.ok(all.every((match) => match.score !== null), 'ci sono ancora partite non giocate');
  assert.ok(playerGames.length >= 1, 'il giocatore non ha giocato nemmeno una partita');
  const record = getPlayerRecord(state);
  assert.equal(record.played, playerGames.length, 'bilancio del giocatore non coerente');
  return state;
}

const configs = [];
for (const format of FORMAT_IDS) {
  for (const [participants, groupSize, qualify] of [[4, 4, 2], [8, 4, 2], [12, 3, 2], [16, 4, 2], [24, 4, 2], [32, 4, 2], [48, 4, 1], [6, 3, 2], [13, 4, 2], [20, 6, 3]]) {
    for (const seeding of SEEDING_IDS) {
      configs.push({ format, groupSize, qualify, seeding, participants, thirdPlace: participants >= 8, extraTime: participants % 2 === 0, penalties: true, upsets: participants % 3 });
    }
  }
}

console.log(`Configurazioni da verificare: ${configs.length}`);

let simulated = 0;
for (let index = 0; index < configs.length; index++) {
  const config = configs[index];
  const random = makeRandom(1000 + index * 7919);
  const playerTeam = NATIONAL_TEAMS[Math.floor(random() * NATIONAL_TEAMS.length)].id;
  const participants = drawParticipants(config.participants, playerTeam, {}, random);
  const label = `${config.format} · ${participants.length} squadre · gironi da ${config.groupSize} · ${config.qualify} qualificate · ${config.seeding}`;
  check(label, () => {
    const tournament = createTournament({ playerTeam, participants, config }, random);
    assert.ok(tournament.participants.includes(playerTeam), 'la nazionale del giocatore è esclusa');
    validateStructure(tournament, config, tournament.participants);
    const finished = playToEnd(tournament, random, config);
    simulated++;
    // le semifinali perdenti generano la finalina solo se prevista
    if (config.thirdPlace && finished.bracketRounds >= 2) {
      const semis = finished.knockout[finished.knockout.length - 2] ?? [];
      if (semis.length === 2) assert.ok(finished.thirdPlace, 'manca la finale per il 3° posto');
    }
  });
}

check('formato lega: girone unico e campione dal ranking', () => {
  const random = makeRandom(4242);
  const participants = drawParticipants(6, 'ita', {}, random);
  const cup = createTournament({ playerTeam: 'ita', participants, config: { ...DEFAULT_TOURNAMENT_CONFIG, format: 'league' } }, random);
  assert.equal(cup.groups.length, 1, 'il girone unico deve essere uno');
  assert.equal(cup.groups[0].teams.length, 6);
  const days = cup.groups[0].matchdays.length;
  assert.ok(days >= 5, `giornate troppo poche: ${days}`);
  const done = playToEnd(cup, random, { ...DEFAULT_TOURNAMENT_CONFIG, format: 'league' });
  const standings = getGroupStandings(done.groups[0]);
  assert.equal(standings[0].team, done.champion, 'il campione non è primo in classifica');
});

check('gironi-only: vince la miglior prima, nessuna partita a eliminazione', () => {
  const random = makeRandom(77);
  const participants = drawParticipants(12, 'fra', {}, random);
  const cup = createTournament({ playerTeam: 'fra', participants, config: { ...DEFAULT_TOURNAMENT_CONFIG, format: 'groups', groupSize: 4, qualify: 1 } }, random);
  assert.equal(cup.groups.length, 3, 'i gironi devono essere tre');
  const done = playToEnd(cup, random, { ...DEFAULT_TOURNAMENT_CONFIG, format: 'groups' });
  assert.equal(done.knockout.length, 0, 'non deve esserci tabellone');
  assert.ok(done.champion);
});

check('tabellone secco: size potenza di due e riposi gestiti', () => {
  const random = makeRandom(909);
  const participants = drawParticipants(10, 'eng', {}, random);
  const cup = createTournament({ playerTeam: 'eng', participants, config: { ...DEFAULT_TOURNAMENT_CONFIG, format: 'knockout' } }, random);
  assert.equal(cup.groups.length, 0, 'nessun girone nel tabellone secco');
  assert.equal(cup.bracketSize, nextPower(10), 'tabellone non in potenza di due');
  const byes = getAllTournamentMatches(cup).filter((match) => match.decidedBy === 'bye');
  assert.equal(byes.length, cup.bracketSize - 10, `riposi attesi ${cup.bracketSize - 10}, trovati ${byes.length}`);
  const done = playToEnd(cup, random, { ...DEFAULT_TOURNAMENT_CONFIG, format: 'knockout' });
  assert.ok(done.champion);
});

check('senza rigori e senza supplementari il tabellone si decide per coefficiente', () => {
  const random = makeRandom(31337);
  const participants = drawParticipants(8, 'esp', {}, random);
  const config = { ...DEFAULT_TOURNAMENT_CONFIG, extraTime: false, penalties: false, thirdPlace: false };
  let cup = createTournament({ playerTeam: 'esp', participants, config }, random);
  let guard = 0;
  while (getActiveTournamentMatch(cup) && guard++ < 60) {
    cup = recordTournamentResult(cup, [1, 1], null, null, random);
  }
  assert.equal(cup.stage, 'complete', 'il torneo deve chiudersi senza rigori');
  assert.ok(cup.champion, 'serve un campione anche senza rigori');
});

check('giornate ridotte: fase a gironi troncata', () => {
  const random = makeRandom(5150);
  const participants = drawParticipants(16, 'ger', {}, random);
  const config = { ...DEFAULT_TOURNAMENT_CONFIG, groupMatchdaysLimit: 1 };
  const cup = createTournament({ playerTeam: 'ger', participants, config }, random);
  const playerFixtures = getAllTournamentMatches(cup).filter((match) => match.isPlayer && match.score !== null);
  assert.ok(playerFixtures.length <= 1, 'giornate oltre il limite');
  const done = playToEnd(cup, random, config);
  assert.ok(done.champion);
});

check('serbatoi per continente e fascia di merito', () => {
  const uefa = poolCandidates({ confederations: ['uefa'] });
  assert.ok(uefa.length >= 50, `UEFA troppo piccola: ${uefa.length}`);
  assert.ok(uefa.every((team) => team.confederation === 'uefa'));
  const elite = poolCandidates({ minTier: 5 });
  assert.ok(elite.length > 0 && elite.every((team) => team.tier === 5));
  const list = drawParticipants(32, 'smr', { confederations: ['uefa'], minTier: 4 }, makeRandom(5));
  assert.equal(list.length, 32);
  assert.ok(list.includes('smr'));
  assert.ok(list.every((id) => NATIONAL_TEAMS.find((team) => team.id === id)?.confederation === 'uefa'));
});

check('semeiage: il sorteggio a vase separa le teste di serie', () => {
  const random = makeRandom(606);
  const participants = drawParticipants(16, 'ita', {}, random);
  const seeded = createTournament({ playerTeam: 'ita', participants, config: { ...DEFAULT_TOURNAMENT_CONFIG, seeding: 'pots' } }, random);
  const groupA = seeded.groups[0].teams;
  const strengths = groupA.map((id) => getTeamStrength(id));
  // con i vase ogni girone contiene una squadra per fascia: niente duplicati di rango estremo
  const elite = participants.filter((id) => getTeamStrength(id) >= 90);
  const inGroupA = groupA.filter((id) => elite.includes(id));
  assert.ok(inGroupA.length <= Math.max(1, elite.length / 4 + 1), `girone A con ${inGroupA.length} corazzate su ${elite.length}`);
  assert.ok(strengths.length === 4);
});

check('riepilogo configurazione coerente con lo stato reale', () => {
  for (const participants of [4, 8, 12, 16, 24, 32]) {
    for (const groupSize of [2, 3, 4, 5, 6]) {
      const summary = summarizeConfig({ ...DEFAULT_TOURNAMENT_CONFIG, groupSize }, participants);
      assert.ok(summary.groups >= 1, 'serve almeno un girone');
      assert.ok(summary.groupSize >= 2);
      assert.ok(summary.playerMatches >= 1);
      const random = makeRandom(participants * 31 + groupSize);
      const list = drawParticipants(participants, 'ita', {}, random);
      const cup = createTournament({ playerTeam: 'ita', participants: list, config: { ...DEFAULT_TOURNAMENT_CONFIG, groupSize } }, random);
      assert.equal(cup.groups.length, summary.groups, `gironi previsti ${summary.groups}, reali ${cup.groups.length} (${participants}/${groupSize})`);
    }
  }
});

// ogni preset dei grandi tornei deve produrre una struttura valida e finibile
for (const preset of TOURNAMENT_PRESETS) {
  const seed = 2026 + preset.id.length * 977;
  const random = makeRandom(seed);
  const config = { ...DEFAULT_TOURNAMENT_CONFIG, ...preset.config };
  check(`preset ${preset.id}`, () => {
    const participants = presetParticipants(preset, 'ita', random);
    const pool = poolCandidates({ confederations: preset.confederations, minTier: preset.minTier, maxTier: preset.onlySmall ? 2 : undefined });
    const byId = new Map(NATIONAL_TEAMS.map((team) => [team.id, team]));
    assert.ok(participants.length >= 4, 'preset senza abbastanza partecipanti');
    for (const id of participants) {
      const team = byId.get(id);
      assert.ok(team, `squadra inesistente: ${id}`);
      if (id === 'ita') continue;
      if (preset.confederations.length) assert.ok(preset.confederations.includes(team.confederation), `${id} fuori confederazione`);
      if (preset.minTier) assert.ok(team.tier >= preset.minTier, `${id} sotto la fascia minima`);
      if (preset.onlySmall) assert.ok(team.tier <= 2, `${id} non è una nazione minore`);
    }
    const tournament = createTournament({ playerTeam: 'ita', participants, config }, random);
    if (preset.count <= pool.length) {
      assert.equal(tournament.participants.length, Math.min(preset.count, pool.length + 1), 'numero di partecipanti diverso dal preset');
    }
    validateStructure(tournament, config, tournament.participants);
    const finished = playToEnd(tournament, random, config);
    if (config.format === 'cup') {
      assert.ok(finished.groups.length >= 2, 'un mondiale deve avere più gironi');
      assert.ok(finished.knockout.length >= 2, 'manca il tabellone finale');
    }
    simulated++;
  });
}


// ---- salvataggio automatico del torneo -----------------------------------
const fakeStore = (() => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
})();
globalThis.window = { localStorage: fakeStore };

const resumeSetup = () => {
  const random = makeRandom(31337);
  const participants = drawParticipants(16, 'bra', {}, random);
  const config = { ...DEFAULT_TOURNAMENT_CONFIG, format: 'cup', groupSize: 4, qualify: 2, thirdPlace: true };
  const cup0 = createTournament({ playerTeam: 'bra', participants, config }, random);
  const played = recordTournamentResult(cup0, [2, 0], 'bra', null, random);
  return { first: getActiveTournamentMatch(cup0).id, cup: played };
};

check('salvataggio: round-trip identico e riprendibile', () => {
  const { first, cup } = resumeSetup();
  const restored = decodeTournamentSave(encodeTournamentSave(cup, { teamSize: 4, matchDuration: 120, difficulty: 'hard' }));
  assert.ok(restored, 'il salvataggio valido è stato scartato');
  assert.deepEqual(restored.tournament, cup, 'stato del torneo alterato dal salvataggio');
  assert.deepEqual(restored.match, { teamSize: 4, matchDuration: 120, difficulty: 'hard' });
  assert.equal(getActiveTournamentMatch(restored.tournament).id, getActiveTournamentMatch(cup).id, 'partita da giocare diversa');
  assert.notEqual(getActiveTournamentMatch(restored.tournament).id, first, 'la partita giocata non risulta conclusa');
});

check('salvataggio: JSON corrotto o manomesso viene ignorato', () => {
  const { cup } = resumeSetup();
  const base = JSON.parse(encodeTournamentSave(cup, { teamSize: 3, matchDuration: 90, difficulty: 'normal' }));
  const mutate = (fn) => {
    const clone = structuredClone(base);
    fn(clone);
    return decodeTournamentSave(JSON.stringify(clone));
  };
  assert.equal(decodeTournamentSave('non-è-json'), null, 'JSON invalido accettato');
  assert.equal(decodeTournamentSave(null), null);
  assert.equal(decodeTournamentSave('{}'), null, 'oggetto vuoto accettato');
  assert.equal(decodeTournamentSave(JSON.stringify({ ...base, version: 99 })), null, 'versione sconosciuta accettata');
  assert.equal(mutate((c) => { c.tournament.config.format = 'rotaiente'; }), null, 'formato inventato accettato');
  assert.equal(mutate((c) => { c.tournament.config.groupSize = 17; }), null, 'gironi da 17 accettati');
  assert.equal(mutate((c) => { c.tournament.participants[0] = 'xxx'; }), null, 'nazionale inesistente accettata');
  assert.equal(mutate((c) => { c.tournament.playerTeam = 'neverland'; }), null, 'squadra del giocatore inesistente accettata');
  assert.equal(mutate((c) => { c.tournament.groups[0].matchdays[0][0].home = 'zzz'; }), null, 'partita con squadra fuori roster accettata');
  assert.equal(mutate((c) => { c.tournament.stage = 'pazza'; }), null, 'fase sconosciuta accettata');
  assert.equal(mutate((c) => { c.tournament.matchday = 12.5; }), null, 'giornata non intera accettata');
  assert.equal(mutate((c) => { c.tournament.groups[0].matchdays[0][0].score = [500, -3]; }), null, 'risultato assurdo accettato');
  assert.ok(decodeTournamentSave(JSON.stringify(base)), 'salvataggio integro scartato per errore');
  const soft = mutate((c) => { c.match.teamSize = 9; c.match.matchDuration = 7; });
  assert.ok(soft, 'il salvataggio doveva restare valido');
  assert.equal(soft.match.teamSize, 3, 'teamSize non riportato al default');
  assert.equal(soft.match.matchDuration, 90, 'durata non riportata al default');
});

check('salvataggio: localStorage scritto, riletto e cancellato', () => {
  const { cup } = resumeSetup();
  const saved = persistTournament(cup, { teamSize: 2, matchDuration: 60, difficulty: 'easy' });
  assert.ok(fakeStore.getItem(TOURNAMENT_SAVE_KEY), 'nessuna scrittura su localStorage');
  const read = readTournamentSave();
  assert.deepEqual(read.tournament, saved.tournament, 'rilettura diversa dalla scrittura');
  assert.equal(read.match.difficulty, 'easy');
  forgetTournament();
  assert.equal(fakeStore.getItem(TOURNAMENT_SAVE_KEY), null, 'salvataggio non rimosso');
  assert.equal(readTournamentSave(), null);
});

check('tutti i tornei terminano e assegnano un campione', () => {
  assert.ok(simulated >= configs.length - 10, `solo ${simulated} simulazioni completate su ${configs.length}`);
});

console.log(`Tornei simulati fino alla fine: ${simulated} / ${configs.length + TOURNAMENT_PRESETS.length}`);
if (process.exitCode) {
  console.error('TORNEO: test falliti');
} else {
  console.log(`OK: torneo verificato (${checks} gruppi di asserzioni)`);
}
