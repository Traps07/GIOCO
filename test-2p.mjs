// Banco di prova headless: esercita l'input a due giocatori sul motore reale,
// con canvas/finestra/audio finti e il ciclo di frame pilotato a mano.
// Verifica che P1 e P2 siano davvero indipendenti e che in 1 giocatore
// P2 non abbia alcun comando.
import { GameEngine } from './src/game/engine.js';

const noop = () => {};

// ---------- stub del DOM ----------
const ctxStub = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'canvas') return canvasStub;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return noop;
    },
    set: () => true,
  },
);
const canvasStub = {
  width: 1200,
  height: 700,
  style: {},
  getContext: () => ctxStub,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ width: 1200, height: 700, left: 0, top: 0 }),
};

const listeners = { keydown: [], keyup: [] };
const param = () => ({
  value: 0,
  setValueAtTime: noop,
  linearRampToValueAtTime: noop,
  exponentialRampToValueAtTime: noop,
  setTargetAtTime: noop,
});
globalThis.window = {
  addEventListener: (t, fn) => (listeners[t] ??= []).push(fn),
  removeEventListener: noop,
  AudioContext: class {
    state = 'running';
    currentTime = 0;
    destination = {};
    createGain = () => ({ gain: param(), connect: noop });
    createOscillator = () => ({ frequency: param(), type: 'sine', connect: noop, start: noop, stop: noop });
    createBiquadFilter = () => ({ frequency: param(), Q: param(), connect: noop });
    sampleRate = 44100;
    createBuffer = (ch, len) => ({ getChannelData: () => new Float32Array(len) });
    createBufferSource = () => ({ buffer: null, connect: noop, start: noop, stop: noop });
  },
};
globalThis.document = { addEventListener: noop, removeEventListener: noop, createElement: () => canvasStub };
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};

let fakeNow = 1000;
globalThis.performance = { now: () => fakeNow };

let rafCb = null;
globalThis.requestAnimationFrame = (cb) => {
  rafCb = cb;
  return 1;
};
globalThis.cancelAnimationFrame = noop;

const key = (code, type = 'keydown') =>
  listeners[type].forEach((fn) => fn({ code, repeat: false, preventDefault: noop }));

// pilota il vero ciclo di frame del motore
function step(engine, seconds, dt = 1 / 60) {
  const n = Math.max(1, Math.round(seconds / dt));
  for (let i = 0; i < n; i++) {
    fakeNow += dt * 1000;
    rafCb?.(fakeNow);
  }
}

const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
};

const eng = new GameEngine(canvasStub);
eng.inputEnabled = true;
eng.setMuted(true);

const team = (e, t, i) => e.players[t * 3 + i];
const pos = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });

// =====================================================================
console.log('\n--- 2 GIOCATORI: P1 e P2 si muovono indipendenti ---');
eng.startMatch('normal', 'match', 'human');
step(eng, 4); // supera il countdown
check('partita in 2 giocatori entra in play', eng.phase === 'play', `phase=${eng.phase}`);

const p1before = pos(team(eng, 0, eng.controlledIdx[0]));
const p2before = pos(team(eng, 1, eng.controlledIdx[1]));

// P1 spinge a destra, P2 spinge a sinistra
key('KeyD');
key('KeyJ');
step(eng, 0.5);
const p1after = pos(team(eng, 0, eng.controlledIdx[0]));
const p2after = pos(team(eng, 1, eng.controlledIdx[1]));
key('KeyD', 'keyup');
key('KeyJ', 'keyup');

check('P1 (WASD) si muove a destra', p1after.x > p1before.x + 20, `${p1before.x} -> ${p1after.x}`);
check('P2 (IJKL) si muove a sinistra', p2after.x < p2before.x - 20, `${p2before.x} -> ${p2after.x}`);

// i due non devono condividere lo stesso giocatore
check(
  'P1 e P2 controllano giocatori diversi',
  team(eng, 0, eng.controlledIdx[0]) !== team(eng, 1, eng.controlledIdx[1]) &&
    team(eng, 0, eng.controlledIdx[0]).team === 0 &&
    team(eng, 1, eng.controlledIdx[1]).team === 1,
  `P1=sq${team(eng, 0, eng.controlledIdx[0]).team} P2=sq${team(eng, 1, eng.controlledIdx[1]).team}`,
);

// scatto: Shift sinistro solo P1, Shift destro solo P2
const sprintIdx = eng.controlledIdx[0];
const p1x0 = team(eng, 0, sprintIdx).x;
key('ShiftLeft');
key('KeyD');
step(eng, 0.4);
const p1sprint = team(eng, 0, sprintIdx).x - p1x0;
key('ShiftLeft', 'keyup');
key('KeyD', 'keyup');
check('Shift sinistro dà lo scatto a P1', p1sprint > 40, `dx=${Math.round(p1sprint)}`);

// cambio giocatore indipendente
const c0 = eng.controlledIdx[0];
const c1 = eng.controlledIdx[1];
key('KeyQ'); // P1 switcha
step(eng, 0.1);
key('Comma'); // P2 switcha
step(eng, 0.1);
check('cambio giocatore indipendente per squadra', eng.controlledIdx[0] !== c0 && eng.controlledIdx[1] !== c1,
  `P1 ${c0}->${eng.controlledIdx[0]}, P2 ${c1}->${eng.controlledIdx[1]}`);

// =====================================================================
console.log('\n--- 1 GIOCATORE: P2 non deve avere comando ---');
eng.startMatch('normal', 'match', 'ai');
step(eng, 4);
check('partita 1 giocatore in play', eng.phase === 'play', `phase=${eng.phase}`);

const solo = team(eng, 0, eng.controlledIdx[0]);
const b0 = { x: solo.x, y: solo.y };
key('KeyJ'); // tasto di P2: non deve muovere nessuno
key('KeyK');
key('KeyL');
key('KeyI');
step(eng, 0.5);
const b1 = { x: solo.x, y: solo.y };
key('KeyJ', 'keyup');
key('KeyK', 'keyup');
key('KeyL', 'keyup');
key('KeyI', 'keyup');
check('i tasti di P2 sono inerti in 1 giocatore', Math.abs(b1.x - b0.x) < 1 && Math.abs(b1.y - b0.y) < 1,
  `spostamento=${Math.round(Math.hypot(b1.x - b0.x, b1.y - b0.y))}px`);

// la squadra ROSSA resta IA anche se qualcuno preme i tasti di P2
check('snapshot dichiara opponent=ai', eng.getSnapshot().opponent === 'ai');

// =====================================================================
console.log('\n--- RIGORI: in 2 giocatori ciascuno para il proprio turno ---');
eng.startMatch('normal', 'pens', 'human');
step(eng, 0.2);
check('serie di rigori avviata in 2 giocatori', eng.pens !== null && eng.phase === 'pens', `phase=${eng.phase}`);

const pens0 = eng.pens;
pens0.turn = 0;
pens0.stage = 'aim';
pens0.stageT = 5;
const aim0 = { x: pens0.aimX, y: pens0.aimY };
key('KeyD'); // P1 mira a destra
step(eng, 0.3);
const aimMoved = pens0.aimX > aim0.x;
key('KeyD', 'keyup');
check('P1 può mirare quando tocca a lui', aimMoved, `aimX ${aim0.x.toFixed(2)} -> ${pens0.aimX.toFixed(2)}`);

// ora tocca a P2 (che para): deve muovere il guantone con IJKL
pens0.turn = 1;
pens0.stage = 'aim';
pens0.stageT = 5;
const glove0 = { x: pens0.gloveX, y: pens0.gloveY };
key('KeyJ'); // P2 muove il guantone a sinistra
step(eng, 0.3);
const gloveMoved = pens0.gloveX < glove0.x - 0.1;
key('KeyJ', 'keyup');
check('P2 può muovere il guantone quando tocca a lui', gloveMoved,
  `gloveX ${glove0.x.toFixed(2)} -> ${pens0.gloveX.toFixed(2)}`);

// in 1 giocatore P2 non deve poter parare: il guantone resta fermo
eng.startMatch('normal', 'pens', 'ai');
step(eng, 0.2);
const ps1 = eng.pens;
ps1.turn = 1;
ps1.stage = 'aim';
ps1.stageT = 5;
const g0 = { x: ps1.gloveX, y: ps1.gloveY };
key('KeyJ'); // tasto di P2
step(eng, 0.3);
const p2Inert = Math.abs(ps1.gloveX - g0.x) < 0.01;
check('in 1 giocatore i tasti P2 non muovono il guantone', p2Inert,
  `gloveX ${g0.x.toFixed(2)} -> ${ps1.gloveX.toFixed(2)}`);
key('KeyJ', 'keyup');

// ...ma l'unico umano (P1) deve poter parare con i tasti suoi
key('KeyA');
step(eng, 0.3);
check('in 1 giocatore P1 para con i propri tasti', ps1.gloveX < g0.x - 0.1,
  `gloveX ${g0.x.toFixed(2)} -> ${ps1.gloveX.toFixed(2)}`);
key('KeyA', 'keyup');

eng.dispose();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verifiche superate`);
if (failed.length) {
  console.log('FALLITE:', failed.map((f) => f.name).join(' | '));
  process.exit(1);
}
