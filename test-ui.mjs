// Smoke test della sola interfaccia: renderizza i componenti con stringhe vere
// per tutte e 6 le lingue e per entrambe le modalita', per intercettare prop
// mancanti o errori di render che i test del motore non vedono.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { STRINGS, LANGUAGES } from './src/i18n.js';
import { MenuScreen, EndScreen } from './src/components/Menus.js';
import HUD from './src/components/HUD.js';

const snap = (over = {}) => ({
  phase: 'play',
  period: 'regular',
  score: [2, 1],
  shots: [4, 3],
  timeLeft: 42.4,
  countdown: 0,
  lastGoalTeam: 0,
  winner: -2,
  muted: false,
  controlled: [1, 2],
  opponent: 'human',
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

for (const { id } of LANGUAGES) {
  const t = STRINGS[id];

  check(`menu 1 giocatore (${id})`, () =>
    renderToStaticMarkup(
      h(MenuScreen, {
        difficulty: 'normal',
        setDifficulty: noop,
        mode: 'match',
        setMode: noop,
        opponent: 'ai',
        setOpponent: noop,
        lang: id,
        setLang: noop,
        onStart: noop,
        t,
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
        opponent: 'human',
        setOpponent: noop,
        lang: id,
        setLang: noop,
        onStart: noop,
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
        goalBanner: null,
        eventBanner: null,
        t,
      }),
    ),
  );

  check(`HUD 2 giocatori ai rigori (${id})`, () =>
    renderToStaticMarkup(
      h(HUD, {
        snap: pensSnap,
        muted: true,
        onToggleMute: noop,
        onPause: noop,
        goalBanner: null,
        eventBanner: null,
        t,
      }),
    ),
  );

  check(`schermata finale (${id})`, () =>
    renderToStaticMarkup(
      h(EndScreen, {
        winner: 0,
        score: [3, 2],
        shots: [7, 5],
        pens: null,
        decidedBy: 'regular',
        pensOnly: false,
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
    opponent: 'human', setOpponent: noop,
    lang: 'en', setLang: noop, onStart: noop, t: STRINGS.en,
  }),
);
const oneP = renderToStaticMarkup(
  h(MenuScreen, {
    difficulty: 'normal', setDifficulty: noop,
    mode: 'match', setMode: noop,
    opponent: 'ai', setOpponent: noop,
    lang: 'en', setLang: noop, onStart: noop, t: STRINGS.en,
  }),
);
const has = (html, s) => html.includes(s);
if (has(twoP, 'I J K L') && has(twoP, 'P2') && !has(oneP, 'I J K L') && !has(oneP, '>P2<')) {
  console.log('PASS  il menu 2P mostra i comandi di P2, quello 1P no');
} else {
  failures++;
  console.log('FAIL  il menu 2P mostra i comandi di P2, quello 1P no');
}
if (has(twoP, STRINGS.en.noDiff2p) && !has(oneP, STRINGS.en.noDiff2p)) {
  console.log('PASS  la difficoltà sparisce solo in 2P');
} else {
  failures++;
  console.log('FAIL  la difficoltà sparisce solo in 2P');
}

console.log(failures ? `\n${failures} fallimenti` : '\ninterfaccia: tutto renders senza errori');
if (failures) process.exit(1);
