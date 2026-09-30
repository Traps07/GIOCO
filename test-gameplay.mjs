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
assert.equal(engine.controlledIdx[0], carrier.idx, 'il controllo passa al portatore appena riceve la palla');
const teammateCarrier = engine.players[2];
engine.releaseBall(carrier);
engine.controlledIdx[0] = 0;
teammateCarrier.x = 340;
teammateCarrier.y = 300;
engine.ball.x = teammateCarrier.x;
engine.ball.y = teammateCarrier.y;
engine.contactBall(teammateCarrier, 1 / 60);
assert.equal(engine.controlledIdx[0], teammateCarrier.idx, 'il controllo passa al compagno AI che conquista il pallone');
engine.controlledIdx[0] = 1;
engine.switchQ[0] = true;
engine.phase = 'play';
engine.update(1 / 60);
assert.equal(engine.controlledIdx[0], teammateCarrier.idx, 'il controllo resta sul portatore anche dopo un cambio manuale');
engine.claimBall(carrier);
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
defender.tackleCd = 0;
engine.startTackle(defender);
assert.equal(defender.tackleCd, 1.3, 'il contrasto ha un cooldown più lungo per ridurne la frequenza');
defender.tackleT = 0;
carrier.vx = carrier.vy = defender.vx = defender.vy = 0;
defender.tackleT = 0.2;
defender.tackleResolved = false;
Math.random = () => 0.2;
engine.resolveTackles();
Math.random = originalRandom;
assert.equal(engine.ballCarrier, carrier, 'la probabilità ridotta rende fallibile il contrasto ravvicinato');

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
assert.equal(engine.getSnapshot().gamepadsConnected, 2, 'il motore rileva entrambi i controller connessi');
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
assert.equal(engine.getSnapshot().gamepadsConnected, 0, 'la legenda si aggiorna quando il controller viene scollegato');

// I difensori bot attendono di essere vicini prima di tentare il contrasto.
engine.startMatch('normal', 'match', 1, undefined, 3);
const rangeCarrier = engine.players[3];
const aiDefender = engine.players[0];
rangeCarrier.x = 650;
rangeCarrier.y = 350;
for (const teammate of engine.players.filter((player) => player.team === 0 && player !== aiDefender)) {
  teammate.x = 150;
  teammate.y = 100 + teammate.idx * 200;
}
aiDefender.x = rangeCarrier.x - 60;
aiDefender.y = rangeCarrier.y;
engine.claimBall(rangeCarrier);
const aiCfg = { speed: 252, shootRange: 385, shootErr: 0.1, passErr: 0.14, minHold: 0.5 };
engine.aiControl(aiDefender, 1 / 60, aiCfg);
assert.equal(aiDefender.tackleT, 0, 'l’IA non tenta il tackle da lontano');
aiDefender.x = rangeCarrier.x - 40;
engine.aiControl(aiDefender, 1 / 60, aiCfg);
assert.equal(aiDefender.tackleCd, 4, 'l’IA contrasta solo a distanza ravvicinata e rispetta il cooldown lungo');

// Il portatore bot dribbla con decisione verso la porta avversaria prima di passare.
engine.startMatch('normal', 'match', 1, undefined, 3);
const attackingCarrier = engine.players[3];
attackingCarrier.x = 700;
attackingCarrier.y = 350;
engine.claimBall(attackingCarrier);
attackingCarrier.holdT = 0.2;
engine.aiControl(attackingCarrier, 1 / 60, { speed: 252, shootRange: 385, shootErr: 0.1, passErr: 0.14, minHold: 0.5 });
assert.ok(attackingCarrier.tx < attackingCarrier.x - 100 && attackingCarrier.vx < 0, 'il portatore bot avanza verso la porta avversaria');

// Il tiro a giro è curvo: 95% gol e 5% parata con corner per il tiratore.
let curveGoals = 0;
const cornersBeforeCurve = events.filter((event) => event.type === 'corner').length;
for (let attempt = 0; attempt < 100; attempt++) {
  engine.startMatch('normal', 'match', 1, undefined, 3);
  engine.phase = 'play';
  const shooter = engine.players[0];
  for (const player of engine.players) if (player !== shooter) player.y = 20;
  engine.goalkeepers[1].y = 20;
  engine.claimBall(shooter);
  Math.random = () => attempt < 95 ? 0.94 : 0.96;
  engine.curveShot(shooter);
  const flight = engine.curveFlight;
  assert.ok(flight, 'il tiro a giro avvia una traiettoria curva');
  engine.updateBall(flight.duration, false);
  curveGoals += engine.score[0];
}
Math.random = originalRandom;
assert.equal(curveGoals, 95, 'esattamente 95 tiri su 100 entrano in rete se nessuno copre la traiettoria');
assert.equal(events.filter((event) => event.type === 'corner').length - cornersBeforeCurve, 5, 'le 5 parate sul tiro a giro danno corner');

// Il tiro a giro viene murato da un giocatore piazzato sulla traiettoria.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const blockedShooter = engine.players[0];
for (const player of engine.players) if (player !== blockedShooter) player.y = 20;
engine.goalkeepers[1].y = 20;
engine.claimBall(blockedShooter);
Math.random = () => 0.94;
engine.curveShot(blockedShooter);
const blockedFlight = engine.curveFlight;
const blocker = engine.players[3];
const blockProgress = 0.5;
blocker.x = blockedFlight.startX + (blockedFlight.targetX - blockedFlight.startX) * blockProgress;
blocker.y = blockedFlight.startY + (blockedFlight.targetY - blockedFlight.startY) * blockProgress + blockedFlight.arc;
engine.updateBall(blockedFlight.duration * blockProgress, false);
Math.random = originalRandom;
assert.equal(engine.curveFlight, null, 'il difensore interrompe la traiettoria del tiro a giro');
assert.equal(engine.score[0], 0, 'il tiro murato non entra in rete');
assert.equal(engine.ball.lastTouch, blocker.team, 'la palla rimbalza sul giocatore che ha fatto muro');
assert.ok(Math.hypot(engine.ball.x - blocker.x, engine.ball.y - blocker.y) > 25, 'la palla viene respinta fuori dal corpo del difensore');

// Anche il portiere intercetta il tiro quando è sulla traiettoria.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const keeperShooter = engine.players[0];
for (const player of engine.players) if (player !== keeperShooter) player.y = 20;
engine.claimBall(keeperShooter);
Math.random = () => 0.94;
engine.curveShot(keeperShooter);
const keeperFlight = engine.curveFlight;
const coveringKeeper = engine.goalkeepers[1];
const keeperProgress = (coveringKeeper.x - keeperFlight.startX) / (keeperFlight.targetX - keeperFlight.startX);
coveringKeeper.y = keeperFlight.startY
  + (keeperFlight.targetY - keeperFlight.startY) * keeperProgress
  + keeperFlight.arc * Math.sin(Math.PI * keeperProgress);
engine.updateBall(keeperFlight.duration * keeperProgress, false);
Math.random = originalRandom;
assert.equal(engine.curveFlight, null, 'il portiere interrompe la traiettoria del tiro a giro');
assert.equal(engine.score[0], 0, 'il tiro coperto dal portiere non entra in rete');
assert.equal(engine.ball.lastTouch, coveringKeeper.team, 'la parata registra il portiere come ultimo tocco');
assert.ok(engine.ball.x < coveringKeeper.x, 'il portiere respinge la palla verso il campo');

// Il 5% salvato non dà corner nel formato 1v1.
engine.startMatch('normal', 'match', 1, undefined, 1);
engine.phase = 'play';
const soloShooter = engine.players[0];
engine.claimBall(soloShooter);
const cornersBeforeSoloCurve = events.filter((event) => event.type === 'corner').length;
Math.random = () => 0.96;
engine.curveShot(soloShooter);
engine.updateBall(engine.curveFlight.duration, false);
Math.random = originalRandom;
assert.equal(events.filter((event) => event.type === 'corner').length, cornersBeforeSoloCurve, 'la parata sul giro non dà corner in 1v1');

// I bot accompagnano il portatore e cercano compagni con passaggi in avanti.
engine.startMatch('normal', 'match', 1, undefined, 3);
const botCarrier = engine.players[3];
const support = engine.players[4];
const secondSupport = engine.players[5];
support.x = 420;
support.y = 250;
secondSupport.x = 430;
secondSupport.y = 450;
botCarrier.x = 1050;
botCarrier.y = 350;
botCarrier.faceX = -1;
botCarrier.faceY = 0;
support.x = 1010;
support.y = 250;
secondSupport.x = 1000;
secondSupport.y = 450;
for (const opponent of engine.players.filter((player) => player.team === 0)) { opponent.x = 220; opponent.y = 100 + opponent.idx * 180; }
engine.claimBall(botCarrier);
botCarrier.holdT = 0.65;
engine.aiControl(support, 1 / 60, { speed: 252, shootRange: 385, shootErr: 0.1, passErr: 0.14, minHold: 0.5 });
assert.ok(support.tx < botCarrier.x - 150 && support.vx < 0, 'il compagno AI corre in avanti per sostenere l’azione');
engine.aiControl(botCarrier, 1 / 60, { speed: 252, shootRange: 385, shootErr: 0.1, passErr: 0.14, minHold: 0.5 });
assert.equal(engine.ballCarrier, null, 'il portatore bot passa anche quando è nella propria metà campo');
assert.ok(engine.ball.vx < 0, 'il passaggio AI procede verso la porta avversaria');

// Verifica anche la decisione AI dentro il normale ciclo di aggiornamento.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const liveCarrier = engine.players[3];
const liveSupport = engine.players[4];
const liveSecondSupport = engine.players[5];
liveCarrier.x = 1050;
liveCarrier.y = 350;
liveCarrier.faceX = -1;
liveCarrier.faceY = 0;
liveSupport.x = 1010;
liveSupport.y = 250;
liveSecondSupport.x = 1000;
liveSecondSupport.y = 450;
for (const opponent of engine.players.filter((player) => player.team === 0)) {
  opponent.x = 220;
  opponent.y = 100 + opponent.idx * 180;
}
engine.claimBall(liveCarrier);
const originalPass = engine.pass;
let liveAiPasses = 0;
engine.pass = function (...args) {
  if (args[2] === false) liveAiPasses++;
  return originalPass.apply(this, args);
};
const carrierStartX = liveCarrier.x;
const supportStartX = liveSupport.x;
for (let frame = 0; frame < 12; frame++) engine.update(1 / 60);
assert.ok(liveCarrier.x < carrierStartX - 5, 'l’avversario bot avanza davvero con il pallone');
assert.ok(liveSupport.x < supportStartX - 5, 'il compagno bot avanza davvero verso l’attacco');
for (let frame = 0; frame < 108; frame++) engine.update(1 / 60);
engine.pass = originalPass;
assert.ok(liveAiPasses > 0, 'nel ciclo partita il portatore bot esegue passaggi automatici');

// Il passaggio umano sceglie il compagno più vicino anche se lo stick punta altrove.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const passer = engine.players[0];
const nearestMate = engine.players[1];
const fartherMate = engine.players[2];
passer.x = 400;
passer.y = 350;
passer.faceX = 1;
passer.faceY = 0;
nearestMate.x = 350;
nearestMate.y = 350;
fartherMate.x = 700;
fartherMate.y = 350;
engine.claimBall(passer);
engine.setStick(0, 1, 0, true); // mira in avanti, lontano dal compagno più vicino
engine.pass(passer, 0, true);
engine.setStick(0, 0, 0, false);
assert.ok(engine.ball.vx < 0, 'il passaggio va verso il compagno più vicino, non verso la mira');
assert.equal(engine.controlledIdx[0], nearestMate.idx, 'il controllo passa al ricevente più vicino');

// Prova end-to-end: il tasto passa in qualunque direzione sia orientato il giocatore.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const livePasser = engine.players[0];
const liveNearest = engine.players[1];
const liveFarther = engine.players[2];
livePasser.x = 400;
livePasser.y = 350;
liveNearest.x = 350;
liveNearest.y = 350;
liveFarther.x = 700;
liveFarther.y = 350;
engine.claimBall(livePasser);
engine.setStick(0, 1, 0, true);
engine.onKeyDown({ code: 'KeyC', repeat: false, preventDefault: noop });
engine.update(1 / 60);
engine.setStick(0, 0, 0, false);
assert.equal(engine.ballCarrier, null, 'il comando passaggio rilascia sempre la palla con un compagno disponibile');
assert.ok(engine.ball.vx < 0, 'il comando passa verso il compagno vicino anche puntando dalla parte opposta');
engine.update(1 / 60);
assert.equal(engine.ballCarrier, liveNearest, 'il passaggio all’indietro supera il giocatore che ha calciato e raggiunge il ricevente');

// Dopo un passaggio il ricevente corre automaticamente verso il pallone, anche se lo stick punta altrove.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const receivePasser = engine.players[0];
const receivingMate = engine.players[1];
const receiveFartherMate = engine.players[2];
receivePasser.x = 500;
receivePasser.y = 350;
receivingMate.x = 420;
receivingMate.y = 350;
receiveFartherMate.x = 850;
receiveFartherMate.y = 350;
engine.claimBall(receivePasser);
engine.setStick(0, -1, 0, true); // direzione opposta al pallone in arrivo
const receiverStartX = receivingMate.x;
engine.pass(receivePasser, 0, true);
for (let frame = 0; frame < 8 && engine.ballCarrier !== receivingMate; frame++) engine.update(1 / 60);
engine.setStick(0, 0, 0, false);
assert.equal(engine.ballCarrier, receivingMate, 'il compagno controllato corre incontro al passaggio e lo riceve automaticamente');
assert.ok(receivingMate.x > receiverStartX, 'il ricevente segue la palla anche con lo stick puntato dalla parte opposta');

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
console.log('PASS: possesso, ricezione automatica, tackle bilanciati, tiro a giro murabile, cross, potenza e corner.');
