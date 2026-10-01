// Smoke test della sola interfaccia: renderizza i componenti con stringhe vere
// per tutte e 6 le lingue e per entrambe le modalita', per intercettare prop
// mancanti o errori di render che i test del motore non vedono.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { STRINGS, LANGUAGES } from './src/i18n.js';
import { MenuScreen, EndScreen, TeamSelectScreen, TournamentSetupScreen, TournamentScreen } from './src/components/Menus.js';
import SettingsScreen from './src/components/SettingsScreen.js';
import { DEFAULT_KEY_BINDINGS } from './src/game/keyboard.js';
import { DEFAULT_TEAMS, NATIONAL_TEAMS, getNationalTeam } from './src/game/teams.js';
import { createTournament, drawParticipants, recordTournamentResult, getActiveTournamentMatch, DEFAULT_TOURNAMENT_CONFIG } from './src/game/tournament.js';
import { encodeTournamentSave, decodeTournamentSave } from './src/game/save.js';
import HUD from './src/components/HUD.js';

const snap = (over = {}) => ({
  phase: 'play',
  period: 'regular',
  score: [2, 1],
  shots: [4, 3],
  timeLeft: 42.4,
  matchDuration: 90,
  countdown: 0,
  lastGoalTeam: 0,
  winner: -2,
  muted: false,
  playerCount: 2,
  teamSize: 3,
  controlled: [1, 2],
  gamepadsConnected: 0,
  pens: null,
  ...over,
});

const pensSnap = snap({
  phase: 'pens',
  period: 'pens',
  timeLeft: 0,
  pens: {
    score: [3, 2],
    taken: [4, 4],
    turn: 1,
    stage: 'aim',
    stageT: 2.4,
    results: [['goal', 'save'], ['goal', 'miss']],
  },
});

let failures = 0;
const check = (name, fn) => {
  try {
    const html = fn();
    if (typeof html !== 'string' || html.length === 0) throw new Error('render vuoto');
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name}  — ${e.message}`);
  }
};

const noop = () => {};
const mulberry = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};


/** Costruisce un salvataggio di torneo realistico, eventualmente già concluso. */
const buildSave = (finished) => {
  const rnd = mulberry(finished ? 4242 : 1234);
  const participants = drawParticipants(8, 'ita', {}, rnd);
  const config = { ...DEFAULT_TOURNAMENT_CONFIG, format: 'cup', groupSize: 4, qualify: 2 };
  let cup = createTournament({ playerTeam: 'ita', participants, config }, rnd);
  let guard = 0;
  while (guard++ < 400) {
    const fixture = getActiveTournamentMatch(cup);
    if (!fixture) break;
    const win = finished || rnd() > 0.5 ? [3, 1] : [1, 1];
    const winner = win[0] === win[1] ? null : fixture.home;
    cup = recordTournamentResult(cup, win, winner, null, rnd);
    if (!finished) break;
  }
  const save = decodeTournamentSave(
    encodeTournamentSave(cup, { teamSize: 3, matchDuration: 90, difficulty: 'normal' }),
  );
  if (!save) throw new Error('salvataggio di esempio non valido');
  return save;
};
const savedOngoing = buildSave(false);
const savedFinished = buildSave(true);

for (const { id } of LANGUAGES) {
  const t = STRINGS[id];

  check(`menu 1 giocatore (${id})`, () =>
    renderToStaticMarkup(
      h(MenuScreen, {
        difficulty: 'normal',
        setDifficulty: noop,
        mode: 'match',
        setMode: noop,
        playerCount: 1,
        setPlayerCount: noop,
        teamSize: 3,
        setTeamSize: noop,
        matchDuration: 90,
        teams: [...DEFAULT_TEAMS],
        lang: id,
        keyBindings: DEFAULT_KEY_BINDINGS,
        onStart: noop,
        onTournament: noop,
        onSettings: noop,
        t,
      }),
    ),
  );

  const menuWithSave = (resume) => (props = {}) =>
    renderToStaticMarkup(
      h(MenuScreen, {
        difficulty: 'normal',
        setDifficulty: noop,
        mode: 'match',
        setMode: noop,
        playerCount: 1,
        setPlayerCount: noop,
        teamSize: 3,
        setTeamSize: noop,
        matchDuration: 90,
        teams: [...DEFAULT_TEAMS],
        lang: id,
        keyBindings: DEFAULT_KEY_BINDINGS,
        onStart: noop,
        onTournament: noop,
        onSettings: noop,
        resume,
        onResume: noop,
        onDiscardResume: noop,
        t,
        ...props,
      }),
    );

  check(`menu con torneo salvato (${id})`, () => {
    const html = menuWithSave(savedOngoing)();
    if (!html.includes(t.menuResumeTitle)) throw new Error('manca lintestazione di ripresa');
    if (!html.includes(t.menuResumeButton)) throw new Error('manca il pulsante RIPRENDI');
    if (!html.includes(t.menuResumeDiscard)) throw new Error('manca il pulsante di eliminazione');
    return html;
  });

  check(`menu con torneo concluso (${id})`, () => {
    const html = menuWithSave(savedFinished)();
    if (!html.includes(t.menuResumeFinished)) throw new Error('manca letichetta di torneo concluso');
    if (!html.includes(t.menuResumeView)) throw new Error('manca il pulsante per vedere il tabellone');
    return html;
  });

  check(`menu senza salvataggi (${id})`, () => {
    const html = menuWithSave(null)();
    if (html.includes(t.menuResumeTitle)) throw new Error('la card di ripresa non dovrebbe comparire');
    return html;
  });

  check(`settings (${id})`, () =>
    renderToStaticMarkup(
      h(SettingsScreen, {
        lang: id, setLang: noop, muted: false, onToggleMute: noop,
        matchDuration: 90, setMatchDuration: noop, keyBindings: DEFAULT_KEY_BINDINGS,
        onChangeKeyBinding: noop, onChangePauseKey: noop, onResetKeyBindings: noop,
        onBack: noop, t,
      }),
    ),
  );

  check(`menu 2 giocatori (${id})`, () =>
    renderToStaticMarkup(
      h(MenuScreen, {
        difficulty: 'normal',
        setDifficulty: noop,
        mode: 'match',
        setMode: noop,
        playerCount: 2,
        setPlayerCount: noop,
        teamSize: 3,
        setTeamSize: noop,
        matchDuration: 90,
        teams: [...DEFAULT_TEAMS],
        lang: id,
        keyBindings: DEFAULT_KEY_BINDINGS,
        onStart: noop,
        onTournament: noop,
        onSettings: noop,
        t,
      }),
    ),
  );

  check(`HUD 2 giocatori in partita (${id})`, () =>
    renderToStaticMarkup(
      h(HUD, {
        snap: snap(),
        muted: false,
        onToggleMute: noop,
        onPause: noop,
        playerCount: 2,
        teams: [...DEFAULT_TEAMS],
        keyBindings: DEFAULT_KEY_BINDINGS,
        lang: id,
        goalBanner: null,
        eventBanner: null,
        t,
      }),
    ),
  );

  check(`legenda controller visibile e ad alto contrasto (${id})`, () => {
    const html = renderToStaticMarkup(
      h(HUD, {
        snap: snap(),
        muted: false,
        onToggleMute: noop,
        onPause: noop,
        playerCount: 2,
        teams: [...DEFAULT_TEAMS],
        keyBindings: DEFAULT_KEY_BINDINGS,
        lang: id,
        goalBanner: null,
        eventBanner: null,
        t,
      }),
    );
    const commandPlacements = html.split(t.gamepadControls).length - 1;
    if (commandPlacements < 2 || !html.includes('md:hidden') || !html.includes('border-sky-200/55')) {
      throw new Error('comandi assenti, non responsive o non leggibili');
    }
    return html;
  });

  check(`HUD 2 giocatori ai rigori (${id})`, () =>
    renderToStaticMarkup(
      h(HUD, {
        snap: pensSnap,
        muted: true,
        onToggleMute: noop,
        onPause: noop,
        playerCount: 2,
        teams: [...DEFAULT_TEAMS],
        keyBindings: DEFAULT_KEY_BINDINGS,
        lang: id,
        goalBanner: null,
        eventBanner: null,
        t,
      }),
    ),
  );

  check(`scelta nazionale mondiale (${id})`, () => {
    const html = renderToStaticMarkup(
      h(TeamSelectScreen, {
        playerCount: 1, teamSize: 3, mode: 'match', teams: ['ita', 'bra'], lang: id,
        onChooseTeam: noop, onBack: noop, onStart: noop, t,
      }),
    );
    if (!html.includes(getNationalTeam('ita').names[id])) throw new Error('manca il nome della nazionale');
    if (!html.includes('UEFA') || !html.includes('CONMEBOL')) throw new Error('mancano i filtri continentali');
    return html;
  });

  check(`costruzione torneo (${id})`, () =>
    renderToStaticMarkup(
      h(TournamentSetupScreen, {
        teamSize: 3, matchDuration: 90, difficulty: 'normal', initialTeam: 'ita', lang: id,
        onBack: noop, onStart: noop, t,
      }),
    ),
  );

  check(`costruzione torneo - lega 24 squadre (${id})`, () =>
    renderToStaticMarkup(
      h(TournamentSetupScreen, {
        teamSize: 2, matchDuration: 60, difficulty: 'hard', initialTeam: 'arg', lang: id,
        onBack: noop, onStart: noop, t,
      }),
    ),
  );

  for (const [name, config, participants] of [
    ['coppa 16', { ...DEFAULT_TOURNAMENT_CONFIG, format: 'cup', groupSize: 4, qualify: 2, thirdPlace: true }, 16],
    ['lega 10', { ...DEFAULT_TOURNAMENT_CONFIG, format: 'league' }, 10],
    ['tabellone 12', { ...DEFAULT_TOURNAMENT_CONFIG, format: 'knockout', thirdPlace: true }, 12],
  ]) {
    check(`schermo torneo — ${name} (${id})`, () => {
      const list = drawParticipants(participants, 'ita', {}, mulberry(11));
      const cup = createTournament({ playerTeam: 'ita', participants: list, config }, mulberry(12));
      const html = renderToStaticMarkup(
        h(TournamentScreen, {
          tournament: cup, lang: id, onPlayNext: noop, onNewTournament: noop, onMenu: noop, t,
        }),
      );
      if (!html.includes(getNationalTeam(cup.participants[0]).flag)) throw new Error('manca la bandiera di una partecipante');
      return html;
    });
  }

  check(`schermata finale (${id})`, () =>
    renderToStaticMarkup(
      h(EndScreen, {
        winner: 0,
        score: [3, 2],
        shots: [7, 5],
        pens: null,
        decidedBy: 'regular',
        pensOnly: false,
        playerCount: 2,
        teams: [...DEFAULT_TEAMS],
        lang: id,
        onRematch: noop,
        onMenu: noop,
        t,
      }),
    ),
  );
}

// controllo che il menu 2P mostri davvero la riga dei comandi di P2
const twoP = renderToStaticMarkup(
  h(MenuScreen, {
    difficulty: 'normal', setDifficulty: noop,
    mode: 'match', setMode: noop,
    playerCount: 2, setPlayerCount: noop,
    teamSize: 3, setTeamSize: noop, matchDuration: 90, teams: [...DEFAULT_TEAMS],
    lang: 'en', keyBindings: DEFAULT_KEY_BINDINGS, onStart: noop, onTournament: noop, onSettings: noop, t: STRINGS.en,
  }),
);
const oneP = renderToStaticMarkup(
  h(MenuScreen, {
    difficulty: 'normal', setDifficulty: noop,
    mode: 'match', setMode: noop,
    playerCount: 1, setPlayerCount: noop,
    teamSize: 3, setTeamSize: noop, matchDuration: 90, teams: [...DEFAULT_TEAMS],
    lang: 'en', keyBindings: DEFAULT_KEY_BINDINGS, onStart: noop, onTournament: noop, onSettings: noop, t: STRINGS.en,
  }),
);
const has = (html, s) => html.includes(s);
if (has(twoP, '↑ ← ↓ →') && has(twoP, 'P2') && !has(oneP, '↑ ← ↓ →') && !has(oneP, 'P2 ·')) {
  console.log('PASS  il menu 2P mostra i comandi di P2, quello 1P no');
} else {
  failures++;
  console.log('FAIL  il menu 2P mostra i comandi di P2, quello 1P no');
}
if (has(twoP, STRINGS.en.diffNormal) && has(oneP, STRINGS.en.diffNormal)) {
  console.log('PASS  la difficoltà resta disponibile per i compagni IA');
} else {
  failures++;
  console.log('FAIL  la difficoltà resta disponibile per i compagni IA');
}
if (!has(oneP, STRINGS.en.language) && has(oneP, STRINGS.en.settingsButton)) {
  console.log('PASS  la scelta della lingua è stata spostata nelle impostazioni');
} else {
  failures++;
  console.log('FAIL  la scelta della lingua è stata spostata nelle impostazioni');
}
if (has(twoP, STRINGS.en.gamepadHint) && has(oneP, STRINGS.en.gamepadHint)) {
  console.log('PASS  la legenda controller è visibile nelle modalità 1P e 2P');
} else {
  failures++;
  console.log('FAIL  la legenda controller è visibile nelle modalità 1P e 2P');
}

// il selettore deve elencare tutte le nazionali del mondo in ogni lingua
const allNames = new Set(NATIONAL_TEAMS.map((team) => team.names.en));
if (NATIONAL_TEAMS.length > 200 && allNames.size === NATIONAL_TEAMS.length) {
  console.log(`PASS  ${NATIONAL_TEAMS.length} nazioni mondiali selectable, nomi unici`);
} else {
  failures++;
  console.log(`FAIL  nazioni mondiali: ${NATIONAL_TEAMS.length}, nomi unici ${allNames.size}`);
}

console.log(failures ? `\n${failures} fallimenti` : '\ninterfaccia: tutto renderizza senza errori');
if (failures) process.exit(1);
