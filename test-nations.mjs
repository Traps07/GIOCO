// Verifica del database delle nazioni: copertura mondiale, divise, trasferte e ricerca.
import assert from 'node:assert/strict';
import {
  NATIONAL_TEAMS,
  TEAM_COUNT,
  TEAMS_BY_CONFEDERATION,
  getNationalTeam,
  resolveKits,
  filterTeams,
  getTeamStrength,
  getTeamQuality,
  CONFEDERATIONS,
  DEFAULT_TEAMS,
} from './src/game/teams.js';
import { LANGUAGES } from './src/i18n.js';

let failures = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures++;
    console.log(`FAIL  ${name} — ${error.message}`);
  }
};

const HEX = /^#[0-9a-f]{6}$/i;
const PATTERNS = new Set([
  'vertical', 'horizontal', 'sash', 'checks', 'cross', 'center', 'chevron', 'pinstripe', 'waves', 'panels', 'tonal',
  'solid', 'halves', 'hoops', 'flag', 'star', 'gradient', 'sleeves',
]);

check('copertura mondiale: oltre 210 nazionali', () => {
  assert.ok(TEAM_COUNT > 210, `solo ${TEAM_COUNT} nazionali`);
  assert.equal(TEAM_COUNT, NATIONAL_TEAMS.length);
});

check('tutte e sei le confederazioni sono popolate', () => {
  for (const [confederation, teams] of Object.entries(TEAMS_BY_CONFEDERATION)) {
    assert.ok(teams.length >= 10, `${confederation} ha solo ${teams.length} squadre`);
  }
  const total = Object.values(TEAMS_BY_CONFEDERATION).reduce((sum, teams) => sum + teams.length, 0);
  assert.equal(total, TEAM_COUNT, 'qualche nazionale non è assegnata a un continente');
});

check(`id, codici e bandiere sono unici`, () => {
  const ids = new Set(NATIONAL_TEAMS.map((team) => team.id));
  const codes = new Set(NATIONAL_TEAMS.map((team) => team.code));
  assert.equal(ids.size, TEAM_COUNT);
  assert.equal(codes.size, TEAM_COUNT, 'sigle a tre lettere duplicate');
  for (const team of NATIONAL_TEAMS) {
    assert.match(team.id, /^[a-z]{3,5}$/, `id non valido: ${team.id}`);
    assert.equal(team.code, team.id.toUpperCase());
    assert.ok(team.flag.length >= 2 && team.flag !== team.code, `bandiera mancante per ${team.id}`);
  }
});

check('nomi presenti in tutte le sei lingue', () => {
  for (const team of NATIONAL_TEAMS) {
    for (const { id } of LANGUAGES) {
      const name = team.names[id];
      assert.ok(typeof name === 'string' && name.trim().length > 1, `${team.id} senza nome in ${id}`);
    }
  }
});

check('divise: colori esadecimali, pattern conosciuti e glow derivato', () => {
  for (const team of NATIONAL_TEAMS) {
    for (const key of ['primary', 'secondary', 'accent']) {
      assert.ok(HEX.test(team.kit[key]), `${team.id}.${key} = ${team.kit[key]}`);
    }
    if (team.kit.trim) assert.ok(HEX.test(team.kit.trim), `${team.id}.trim`);
    assert.ok(PATTERNS.has(team.kit.pattern), `${team.id} pattern ${team.kit.pattern}`);
    assert.match(team.kit.glow, /^rgba\(/, `${team.id} glow`);
    assert.ok(team.tier >= 1 && team.tier <= 5, `${team.id} tier ${team.tier}`);
    assert.ok(['fifa', 'flag'].includes(team.kitSource), `${team.id} fonte divisa`);
    assert.ok(team.strength >= 20 && team.strength <= 99, `${team.id} coefficiente ${team.strength}`);
  }
});

check('divisa da trasferta sempre disponibile e contrastante', () => {
  for (const team of NATIONAL_TEAMS) {
    assert.ok(HEX.test(team.awayKit.primary), `${team.id} away`);
    assert.notEqual(team.awayKit.primary, team.kit.primary, `${team.id} trasferta identica alla casa`);
  }
});

check(`scontro di colori: l'ospite passa alla trasferta`, () => {
  const Uruguay = getNationalTeam('uru');
  const Argentina = getNationalTeam('arg');
  const [homeKit, awayKit] = resolveKits('uru', 'arg');
  assert.equal(homeKit, Uruguay.kit, 'la squadra di casa mantiene la divisa casalinga');
  const close = (a, b) => {
    const hex = (c) => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
    const [r1, g1, b1] = hex(a);
    const [r2, g2, b2] = hex(b);
    return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
  };
  assert.ok(close(homeKit.primary, awayKit.primary) > 60, `${Argentina.id} e ${Uruguay.id} giocano con colori troppo simili`);
});

check('coefficiente: le corazzate valgono più delle squadre dilettantistiche', () => {
  const brazil = getNationalTeam('bra');
  const sanMarino = getNationalTeam('smr');
  assert.ok(brazil.tier === 5 && sanMarino.tier === 1);
  assert.ok(getTeamStrength('bra') - getTeamStrength('smr') > 40, 'divario di coefficiente troppo piccolo');
  const ordered = [...NATIONAL_TEAMS].sort((a, b) => getTeamStrength(b.id) - getTeamStrength(a.id));
  assert.ok(ordered[0].tier >= 4, 'la prima per coefficiente non è di fascia alta');
  assert.ok(getTeamStrength('bra') > getTeamStrength('bol'), 'il Brasile non vale più della Bolivia');
  // le fasce sono ordinate in modo assoluto: una squadra di fascia superiore è sempre più forte
  for (let tier = 1; tier < 5; tier++) {
    const lower = NATIONAL_TEAMS.filter((team) => team.tier === tier).map((team) => team.strength);
    const higher = NATIONAL_TEAMS.filter((team) => team.tier === tier + 1).map((team) => team.strength);
    assert.ok(lower.length && higher.length, `fascia ${tier} o ${tier + 1} vuota`);
    assert.ok(Math.min(...higher) > Math.max(...lower), `fascia ${tier + 1} non nettamente sopra la ${tier}`);
  }
  for (const conf of CONFEDERATIONS) {
    const list = NATIONAL_TEAMS.filter((team) => team.confederation === conf);
    const byTier = new Map();
    for (const team of list) byTier.set(team.tier, Math.max(byTier.get(team.tier) ?? 0, team.strength));
    const tiers = [...byTier.keys()].sort((a, b) => a - b);
    for (let i = 1; i < tiers.length; i++) {
      assert.ok(byTier.get(tiers[i]) > byTier.get(tiers[i - 1]), `${conf}: fascia ${tiers[i]} non più forte della ${tiers[i - 1]}`);
    }
  }
});

check('il coefficiente normalizzato resta nell intervallo e guida le statistiche', () => {
  for (const team of NATIONAL_TEAMS) {
    const q = getTeamQuality(team.id);
    assert.ok(q >= 0 && q <= 1, `${team.id} qualità fuori range: ${q}`);
    assert.equal(q, (team.strength - 20) / (99 - 20), `${team.id} qualità non coerente col coefficiente`);
  }
  assert.ok(getTeamQuality('bra') > 0.95, 'il Brasile dovrebbe essere vicino a 1');
  assert.ok(getTeamQuality('smr') < 0.35, 'San Marino dovrebbe essere vicina a 0');
  assert.ok(getTeamQuality('ita') >= getTeamQuality('smr'), 'ordine di qualità invertito');
});

check('le squadre senza divisa professionistica usano i colori della bandiera', () => {
  const flagKits = NATIONAL_TEAMS.filter((team) => team.kitSource === 'flag');
  const tier1 = NATIONAL_TEAMS.filter((team) => team.tier === 1);
  const small = NATIONAL_TEAMS.filter((team) => team.tier <= 2);
  assert.ok(flagKits.length >= 100, `troppo poche divise da bandiera: ${flagKits.length}`);
  assert.ok(tier1.filter((team) => team.kitSource === 'flag').length / tier1.length > 0.9, 'le fasce più basse non usano la bandiera');
  assert.ok(small.filter((team) => team.kitSource === 'flag').length / small.length > 0.65, 'troppe squadre dilettantistiche con divise FIFA inventate');
  for (const team of flagKits) {
    // una divisa da bandiera usa motivi ricavabili dal drappo (bande, croci, stelle, strisce)
    assert.ok(
      ['flag', 'vertical', 'horizontal', 'hoops', 'solid', 'center', 'cross', 'star', 'checks', 'halves', 'sash', 'waves', 'pinstripe', 'chevron'].includes(team.kit.pattern),
      `${team.id} pattern insolito per una divisa da bandiera`,
    );
  }
});

check('ricerca per nome, codice e continente in ogni lingua', () => {
  assert.equal(filterTeams({ query: 'ita' }, 'en')[0].id, 'ita', 'il codice esatto dovrebbe essere il primo risultato');
  assert.ok(filterTeams({ query: 'ita' }, 'en').length < 12, 'la ricerca è troppo permissiva');
  assert.equal(filterTeams({ query: 'Italia' }, 'it')[0].id, 'ita');
  assert.equal(filterTeams({ query: 'Deutschland' }, 'de')[0].id, 'ger');
  assert.ok(filterTeams({ query: 'البرازيل' }, 'ar').some((team) => team.id === 'bra'), 'ricerca araba inefficace');
  assert.ok(filterTeams({ query: 'Ivory' }, 'en').some((team) => team.id === 'civ'), 'nomi alternativi non indicizzati');
  assert.ok(filterTeams({ confederation: 'ofc' }, 'en').length >= 10, 'filtro oceania vuoto');
  assert.ok(filterTeams({ minTier: 5 }, 'en').every((team) => team.tier >= 5));
  assert.ok(filterTeams({ query: 'zzzz' }, 'en').length === 0);
});

check('compatibilità all indietro: gli id delle 12 nazionali originali funzionano', () => {
  const legacy = ['italy', 'france', 'england', 'spain', 'germany', 'portugal', 'netherlands', 'brazil', 'argentina', 'croatia', 'japan', 'morocco'];
  for (const id of legacy) {
    const team = getNationalTeam(id);
    assert.notEqual(team.id, NATIONAL_TEAMS[0].id, `id storico ${id} non risolto`);
    assert.ok(team.id !== id, `${id} dovrebbe essere un alias`);
  }
  assert.deepEqual(DEFAULT_TEAMS, ['ita', 'fra']);
});

check('le nazioni più piccole hanno comunque una divisa riconoscibile', () => {
  const tiny = NATIONAL_TEAMS.filter((team) => team.tier === 1);
  assert.ok(tiny.length > 40, `troppo poche squadre di fascia 1: ${tiny.length}`);
  for (const team of tiny) {
    assert.ok(team.kit.pattern, team.id);
    assert.notEqual(team.kit.primary, team.kit.secondary, `${team.id} divisa monocroma`);
  }
});

console.log(failures ? `\n${failures} fallimenti nel database nazioni` : `\nOK: ${TEAM_COUNT} nazioni, divise e ricerca verificate`);
if (failures) process.exit(1);
