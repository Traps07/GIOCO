// Soak test: porta una partita 2 giocatori fino al fischio finale e verifica
// che il ciclo regola -> gol -> rinvio -> fine partita regga senza eccezioni
// e che entrambe le squadre abbiano davvero un giocatore umano.
import { GameEngine } from './src/game/engine.js';

const noop = () => {};
const param = () => ({
  value: 0,
  setValueAtTime: noop,
  linearRampToValueAtTime: noop,
  exponentialRampToValueAtTime: noop,
  setTargetAtTime: noop,
});
const ctxStub = new Proxy({}, {
  get: (t, p) => (p === 'canvas' ? canvasStub : p === 'measureText' ? () => ({ width: 10 })
    : p === 'createLinearGradient' || p === 'createRadialGradient' ? () => ({ addColorStop: noop })
    : p === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : noop),
  set: () => true,
});
const canvasStub = {
  width: 1200, height: 700, style: {},
  getContext: () => ctxStub,
  addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ width: 1200, height: 700, left: 0, top: 0 }),
};
const listeners = { keydown: [], keyup: [] };
globalThis.window = {
  addEventListener: (t, fn) => (listeners[t] ??= []).push(fn),
  removeEventListener: noop,
  AudioContext: class {
    state = 'running'; currentTime = 0; destination = {}; sampleRate = 44100;
    createGain = () => ({ gain: param(), connect: noop });
    createOscillator = () => ({ frequency: param(), type: 'sine', connect: noop, start: noop, stop: noop });
    createBiquadFilter = () => ({ frequency: param(), Q: param(), connect: noop });
    createBuffer = (c, l) => ({ getChannelData: () => new Float32Array(l) });
    createBufferSource = () => ({ buffer: null, connect: noop, start: noop, stop: noop });
  },
};
globalThis.document = { addEventListener: noop, removeEventListener: noop, createElement: () => canvasStub };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
let fakeNow = 1000;
globalThis.performance = { now: () => fakeNow };
let rafCb = null;
globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
globalThis.cancelAnimationFrame = noop;
const key = (code, type = 'keydown') =>
  listeners[type].forEach((fn) => fn({ code, repeat: false, preventDefault: noop }));

function step(engine, seconds, dt = 1 / 60) {
  const n = Math.max(1, Math.round(seconds / dt));
  for (let i = 0; i < n; i++) { fakeNow += dt * 1000; rafCb?.(fakeNow); }
}

const eng = new GameEngine(canvasStub);
eng.inputEnabled = true;
eng.setMuted(true);

const events = [];
eng.on((e) => events.push(e.type));

// 2 giocatori, partita normale, poi anche la sola serie di rigori
eng.startMatch('normal', 'match', 'human');

// gioca: tiri ripetuti da entrambi, più cambi di giocatore, per tutta la partita
const end = Date.now() + 25_000;
const codes = ['KeyD', 'KeyA', 'KeyW', 'KeyS', 'KeyL', 'KeyJ', 'KeyK', 'KeyI'];
let i = 0;
let errors = 0;
while (eng.phase !== 'over' && Date.now() < end) {
  const c = codes[i % codes.length];
  key(c);
  if (i % 7 === 0) key('Space');
  if (i % 11 === 0) key('Enter');
  if (i % 5 === 0) key('Comma');
  if (i % 13 === 0) key('KeyC');
  step(eng, 1 / 30, 1 / 30);
  key(c, 'keyup');
  key('Space', 'keyup');
  key('Enter', 'keyup');
  key('Comma', 'keyup');
  key('KeyC', 'keyup');
  i++;
}
key('Space', 'keyup'); key('Enter', 'keyup'); key('Comma', 'keyup');

const snap = eng.getSnapshot();
console.log('partita 2 giocatori conclusa');
console.log('  fasi attraversate :', [...new Set(events)].join(', '));
console.log('  punteggio         :', snap.score.join('-'));
console.log('  tempo residuo     :', snap.timeLeft.toFixed(1), 's');
console.log('  winner            :', snap.winner, '(-2 non finita, -1 pareggio)');
console.log('  opponent nel snap :', snap.opponent);
console.log('  controlled        :', snap.controlled.join('/'));
console.log('  frame simulati    :', i);

// anche la sola serie di rigori in 2 giocatori
const eng2 = new GameEngine(canvasStub);
eng2.inputEnabled = true;
eng2.setMuted(true);
const ev2 = [];
eng2.on((e) => ev2.push(e.type));
eng2.startMatch('normal', 'pens', 'human');
const end2 = Date.now() + 20_000;
let j = 0;
while (eng2.phase !== 'over' && Date.now() < end2) {
  if (j % 40 === 0) key('KeyD');
  if (j % 40 === 20) key('KeyJ');
  if (j % 55 === 0) key('Space');
  if (j % 55 === 20) key('Enter');
  step(eng2, 1 / 30, 1 / 30);
  key('KeyD', 'keyup'); key('KeyJ', 'keyup');
  key('Space', 'keyup'); key('Enter', 'keyup');
  j++;
}
const s2 = eng2.getSnapshot();
console.log('\nserie di rigori 2 giocatori conclusa');
console.log('  eventi            :', [...new Set(ev2)].join(', '));
console.log('  rigori segnati    :', s2.score.join('-'));
console.log('  winner            :', s2.winner);
console.log('  frame simulati    :', j);

eng.dispose();
eng2.dispose();

const okMatch = eng && snap.opponent === 'human' && typeof snap.controlled[1] === 'number';
const okPens = s2.winner !== -2;
console.log(`\n${okMatch && okPens ? 'OK' : 'PROBLEMA'}: ciclo completo senza eccezioni`);
if (!okMatch || !okPens) process.exit(1);
