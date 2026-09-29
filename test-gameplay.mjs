// Test headless delle meccaniche di possesso, contrasti, tiri e corner.
import assert from 'node:assert/strict';
import { GameEngine } from './src/game/engine.js';

const noop = () => {};
const ctxStub = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'canvas') return canvasStub;
    if (prop === 'measureText') return () => ({ width: 10 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return noop;
  },
  set: () => true,
});
const canvasStub = {
  width: 1200,
  height: 700,
  style: {},
  getContext: () => ctxStub,
  addEventListener: noop,
  removeEventListener: noop,
  getBoundingClientRect: () => ({ width: 1200, height: 700, left: 0, top: 0 }),
};
const param = () => ({
  value: 0,
  setValueAtTime: noop,
  linearRampToValueAtTime: noop,
  exponentialRampToValueAtTime: noop,
  setTargetAtTime: noop,
});
globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  AudioContext: class {
    state = 'running';
    currentTime = 0;
    destination = {};
    sampleRate = 44100;
    createGain = () => ({ gain: param(), connect: noop });
    createOscillator = () => ({ frequency: param(), connect: noop, start: noop, stop: noop });
    createBiquadFilter = () => ({ frequency: param(), Q: param(), connect: noop });
    createBuffer = (_channels, length) => ({ getChannelData: () => new Float32Array(length) });
    createBufferSource = () => ({ connect: noop, start: noop, stop: noop });
  },
};
globalThis.document = { addEventListener: noop, removeEventListener: noop, createElement: () => canvasStub };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.performance = { now: () => 1000 };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
let mockGamepads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => mockGamepads } });

const engine = new GameEngine(canvasStub);
engine.setMuted(true);
engine.inputEnabled = true;
const events = [];
engine.on((event) => events.push(event));

// Il contatto dà possesso; i contrasti sono deliberatamente poco risolutivi.
engine.startMatch('normal', 'match', 2, undefined, 3);
const carrier = engine.players[0];
const defender = engine.players[3];
carrier.x = 300;
carrier.y = 300;
engine.ball.x = carrier.x;
engine.ball.y = carrier.y;
engine.contactBall(carrier, 1 / 60);
assert.equal(engine.ballCarrier, carrier, 'il giocatore mantiene il pallone al contatto');
defender.x = carrier.x + 35;
defender.y = carrier.y;
defender.tackleT = 0.2;
defender.tackleCd = 0.4;
const originalRandom = Math.random;
Math.random = () => 0;
engine.resolveTackles();
Math.random = originalRandom;
assert.equal(engine.ballCarrier, defender, 'un contrasto può comunque rubare il possesso');
engine.claimBall(carrier);
carrier.vx = carrier.vy = defender.vx = defender.vy = 0;
defender.x = carrier.x + 35;
defender.y = carrier.y;
defender.tackleT = 0.2;
defender.tackleResolved = false;
Math.random = () => 0.99;
engine.resolveTackles();
Math.random = originalRandom;
assert.equal(engine.ballCarrier, carrier, 'un contrasto fallito non strappa né fa rimbalzare via la palla');

// Due controller diversi (uno standard e uno generico) guidano P1 e P2.
const makeGamepad = (index, mapping = 'standard') => ({
  index, connected: true, mapping, axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
});
const button = (pressed = true) => ({ pressed, value: pressed ? 1 : 0 });
engine.startMatch('normal', 'match', 2, undefined, 3);
engine.phase = 'play';
const pad0 = makeGamepad(0);
const pad1 = makeGamepad(1, '');
pad0.axes[0] = 0.72;
pad0.axes[1] = -0.24;
pad1.axes[0] = -0.68;
pad1.axes[1] = 0.22;
pad0.buttons[0] = button(); // A / Cross: tiro
pad0.buttons[4] = button(); // LB / L1: potenza
pad0.buttons[7] = button(); // RT / R2: scatto tenuto
pad1.buttons[1] = button(); // B / Circle: passaggio
pad1.buttons[5] = button(); // RB / R1: contrasto
pad1.buttons[8] = button(); // Select: cambio
mockGamepads = [pad0, pad1];
engine.pollGamepads();
assert.ok(engine.inputDir(0).x > 0.6 && engine.inputDir(1).x < -0.6, 'stick analogici separati per P1 e P2');
assert.ok(engine.shootQ[0] && engine.powerQ[0] && engine.gamepadSprint[0], 'A, LB e RT sono mappati per P1');
assert.ok(engine.passQ[1] && engine.tackleQ[1] && engine.switchQ[1], 'i tasti del pad generico sono mappati per P2');
engine.clearInputQueues();
engine.pollGamepads();
assert.equal(engine.shootQ[0], false, 'un pulsante mantenuto non ripete il tiro a ogni frame');
pad0.buttons[9] = button();
engine.pollGamepads();
assert.equal(engine.paused, true, 'Start mette in pausa');
pad0.buttons[9] = button(false);
engine.pollGamepads();
pad0.buttons[9] = button();
engine.pollGamepads();
assert.equal(engine.paused, false, 'Start riprende la partita');
mockGamepads = [];
engine.pollGamepads();
assert.equal(engine.inputDir(0).len, 0, 'alla disconnessione gli assi vengono azzerati');

// Il tiro a giro è curvo e viene convertito in gol nel 95% dei tentativi.
let curveGoals = 0;
for (let attempt = 0; attempt < 100; attempt++) {
  engine.startMatch('normal', 'match', 1, undefined, 3);
  engine.phase = 'play';
  const shooter = engine.players[0];
  engine.claimBall(shooter);
  Math.random = () => attempt < 95 ? 0.94 : 0.96;
  engine.curveShot(shooter);
  const flight = engine.curveFlight;
  assert.ok(flight, 'il tiro a giro avvia una traiettoria curva');
  engine.updateBall(flight.duration, false);
  curveGoals += engine.score[0];
}
Math.random = originalRandom;
assert.equal(curveGoals, 95, 'esattamente 95 tiri su 100 entrano in rete');

// Cross e tiro di potenza mantengono le traiettorie dedicate.
engine.startMatch('normal', 'match', 2, undefined, 3);
const skillPlayer = engine.players[0];
engine.claimBall(skillPlayer);
engine.cross(skillPlayer, 0, false);
assert.ok(engine.ball.vz > 0, 'il cross parte con traiettoria aerea');
engine.claimBall(skillPlayer);
engine.powerShot(skillPlayer);
assert.ok(Math.hypot(engine.ball.vx, engine.ball.vy) > 1400, 'il tiro di potenza è più veloce del tiro base');

// Joystick touch e controller non condividono gli assi tra i giocatori.
engine.setStick(0, 0.8, 0, true);
engine.setStick(1, -0.8, 0, true);
assert.equal(engine.inputDir(0).x, 0.8);
assert.equal(engine.inputDir(1).x, -0.8);

// Una parata che devia oltre la linea di fondo assegna corner, ma non nell'1v1.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const keeper = engine.goalkeepers[0];
keeper.y = 430;
engine.ball.x = 50;
engine.ball.y = 446;
engine.ball.vx = -800;
engine.ball.vy = 0;
engine.ball.z = 0;
engine.ball.vz = 0;
engine.ball.curve = 0;
Math.random = () => 0;
engine.contactGoalkeeper(keeper, false);
engine.updateBall(0.05, false);
Math.random = originalRandom;
assert.ok(events.some((event) => event.type === 'corner' && event.team === 1), 'la parata assegna il corner');

engine.startMatch('normal', 'match', 1, undefined, 1);
engine.phase = 'play';
engine.ball.x = -1;
engine.ball.y = 480;
engine.ball.vx = -10;
engine.ball.vy = 0;
engine.ball.z = 0;
engine.ball.vz = 0;
engine.ball.curve = 0;
engine.ball.lastTouch = 0;
engine.ball.lastTouchWasKeeper = true;
const before1v1 = events.filter((event) => event.type === 'corner').length;
engine.updateBall(0, false);
assert.equal(events.filter((event) => event.type === 'corner').length, before1v1, 'in 1v1 non si assegna il corner');
assert.ok(engine.ball.x >= 0, 'nel formato 1v1 la palla viene rimessa in gioco');

engine.dispose();
console.log('PASS: possesso, tackle più bilanciati, pad multipli, tiro a giro 95%, cross, potenza e corner.');
