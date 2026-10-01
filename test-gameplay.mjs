// Test headless delle meccaniche di possesso, contrasti, tiri e corner.
import assert from 'node:assert/strict';
import { DIFFICULTIES, DIFFS, GameEngine, SET_PIECE_GOAL_CHANCE, SURVIVAL_ROUND_DURATION } from './src/game/engine.js';
import { SURVIVAL_LADDER, survivalDifficulty, survivalOpponent } from './src/game/survival.js';
import { cloneKeyBindings } from './src/game/keyboard.js';

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
engine.releaseBall(); // pallone vagante, come da progetto: lo contende chi arriva prima
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
  engine.setPiece = null; // qui si misura il tiro a giro, non il calcio da fermo
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
engine.setPiece = null; // misura il muro, non il calcio da fermo
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
engine.setPiece = null; // misura la parata, non il calcio da fermo
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

// Anche il 5% salvato dà corner nel formato 1v1.
engine.startMatch('normal', 'match', 1, undefined, 1);
engine.phase = 'play';
const soloShooter = engine.players[0];
for (const player of engine.players) if (player !== soloShooter) player.y = 20;
engine.goalkeepers[1].y = 20;
engine.claimBall(soloShooter);
const cornersBeforeSoloCurve = events.filter((event) => event.type === 'corner').length;
Math.random = () => 0.96;
engine.curveShot(soloShooter);
engine.updateBall(engine.curveFlight.duration, false);
Math.random = originalRandom;
assert.equal(events.filter((event) => event.type === 'corner').length, cornersBeforeSoloCurve + 1, 'la parata sul giro assegna corner anche in 1v1');

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
const originalThroughPass = engine.throughBall;
let liveAiPasses = 0;
engine.pass = function (...args) {
  if (args[2] === false) liveAiPasses++;
  return originalPass.apply(this, args);
};
// il filtrante resta un passaggio automatico: va contato allo stesso modo
engine.throughBall = function (p, err, human) {
  if (!human) liveAiPasses++;
  return originalThroughPass.call(this, p, err, human);
};
const carrierStartX = liveCarrier.x;
const supportStartX = liveSupport.x;
for (let frame = 0; frame < 12; frame++) engine.update(1 / 60);
assert.ok(liveCarrier.x < carrierStartX - 5, 'l’avversario bot avanza davvero con il pallone');
assert.ok(liveSupport.x < supportStartX - 5, 'il compagno bot avanza davvero verso l’attacco');
for (let frame = 0; frame < 108; frame++) engine.update(1 / 60);
engine.pass = originalPass;
engine.throughBall = originalThroughPass;
assert.ok(liveAiPasses > 0, 'nel ciclo partita il portatore bot esegue passaggi automatici');

// Il passaggio umano segue la mira e preferisce il compagno indicato anche se è più lontano.
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
engine.setStick(0, 1, 0, true); // mira al compagno lontano in avanti
engine.pass(passer, 0, true);
engine.setStick(0, 0, 0, false);
assert.ok(engine.ball.vx > 0, 'il passaggio segue la mira verso il compagno più lontano');
assert.equal(engine.controlledIdx[0], fartherMate.idx, 'il controllo passa al compagno mirato');

// Se nessun compagno è nella direzione indicata, resta il ripiego sul più vicino.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const fallbackPasser = engine.players[0];
const fallbackNearest = engine.players[1];
const fallbackOther = engine.players[2];
fallbackPasser.x = 400;
fallbackPasser.y = 350;
fallbackNearest.x = 350;
fallbackNearest.y = 350;
fallbackOther.x = 400;
fallbackOther.y = 620;
engine.claimBall(fallbackPasser);
engine.setStick(0, 1, 0, true); // nessun compagno davanti
engine.pass(fallbackPasser, 0, true);
engine.setStick(0, 0, 0, false);
assert.ok(engine.ball.vx < 0, 'senza un compagno nella direzione indicata passa al più vicino');
assert.equal(engine.controlledIdx[0], fallbackNearest.idx, 'il controllo passa al compagno più vicino come ripiego');

// Prova end-to-end: il tasto C cerca il compagno indicato e lo seleziona per la ricezione.
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
assert.equal(engine.ballCarrier, null, 'il comando passaggio rilascia la palla con il compagno indicato');
assert.ok(engine.ball.vx > 0, 'il comando passa in avanti verso il compagno mirato');
assert.equal(engine.controlledIdx[0], liveFarther.idx, 'il ricevente lontano viene selezionato automaticamente');
for (let frame = 0; frame < 60 && engine.ballCarrier !== liveFarther; frame++) engine.update(1 / 60);
assert.equal(engine.ballCarrier, liveFarther, 'il ricevente mirato corre incontro al pallone e lo controlla');

// Dopo un passaggio il ricevente corre automaticamente verso il pallone, anche se lo stick punta altrove.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const receivePasser = engine.players[0];
const receivingMate = engine.players[1];
const receiveFartherMate = engine.players[2];
receivePasser.x = 500;
receivePasser.y = 350;
receivingMate.x = 650;
receivingMate.y = 350;
receivingMate.vx = 250; // inerzia in avanti prima del passaggio
receiveFartherMate.x = 250;
receiveFartherMate.y = 350;
engine.claimBall(receivePasser);
engine.setStick(0, 1, 0, true); // lo stick continuerebbe a spingere il ricevente in avanti
const receiverStartX = receivingMate.x;
engine.pass(receivePasser, 0, true);
for (let frame = 0; frame < 24 && engine.ballCarrier !== receivingMate; frame++) engine.update(1 / 60);
engine.setStick(0, 0, 0, false);
assert.equal(engine.ballCarrier, receivingMate, 'il compagno controllato corre incontro al passaggio e lo riceve automaticamente');
assert.ok(receivingMate.x < receiverStartX, 'il ricevente frena la corsa in avanti e va verso il pallone');

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

// Una parata che devia oltre la linea di fondo assegna corner anche nell'1v1.
engine.startMatch('normal', 'match', 1, undefined, 3);
engine.phase = 'play';
const keeper = engine.goalkeepers[0];
keeper.y = engine.fieldHeight / 2 + 120;
engine.ball.x = 50;
engine.ball.y = keeper.y + 16;
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
assert.equal(events.filter((event) => event.type === 'corner').length, before1v1 + 1, 'in 1v1 si assegna il corner');
assert.equal(engine.ballCarrier.team, 1, 'nel 1v1 il corner assegna il possesso al battitore');

// Al calcio d’inizio successivo al gol parte la squadra che lo ha subito.
engine.startMatch('normal', 'match', 2, undefined, 3);
engine.update(3.5);
assert.equal(engine.ballCarrier, null, 'il calcio d’inizio iniziale resta neutrale');
assert.equal(engine.getSnapshot().setPiece, null, 'in attesa del primo tocco non c\'è alcun vincolo');
assert.ok(Math.abs(engine.ball.x - engine.fieldWidth / 2) < 1, 'la palla viene posizionata al centro al calcio d’inizio');
assert.ok(Math.abs(engine.ball.y - engine.fieldHeight / 2) < 1, 'il pallone parte dal centro anche sul campo esteso');
engine.claimBall(engine.players[0]);
assert.equal(engine.getSnapshot().setPiece, 'kickoff', 'chi raccoglie il pallone neutro deve giocarlo');
engine.releaseBall();
engine.goal(0);
engine.update(3);
assert.equal(engine.phase, 'countdown', 'dopo la rete si prepara il calcio d’inizio');
assert.equal(engine.ballCarrier.team, 1, 'la squadra che ha subito ha il possesso già al calcio d’inizio');
engine.update(3.5);
assert.equal(engine.ballCarrier.team, 1, 'la squadra che ha subito mantiene il possesso all’avvio del gioco');
engine.goal(1);
engine.update(3);
assert.equal(engine.ballCarrier.team, 0, 'dopo il gol della squadra 1 riparte subito chi ha subito');
engine.update(3.5);
assert.equal(engine.ballCarrier.team, 0, 'la squadra 0 mantiene il pallone dopo il calcio d’inizio');

// I campi si allargano dal 3v3 in su, mentre 1v1 e 2v2 mantengono le dimensioni originali.
for (const teamSize of [1, 2, 3, 4, 5]) {
  engine.startMatch('normal', 'match', 1, undefined, teamSize);
  const expanded = teamSize >= 3;
  assert.equal(engine.fieldWidth, expanded ? 1380 : 1200, `${teamSize}v${teamSize}: larghezza del campo`);
  assert.equal(engine.fieldHeight, expanded ? 780 : 700, `${teamSize}v${teamSize}: altezza del campo`);
  assert.equal(engine.goalkeepers[1].x, engine.fieldWidth - 38, `${teamSize}v${teamSize}: portiere sul limite del campo`);
}

// Le preferenze durata e tastiera si applicano all’avvio della partita.
engine.setMatchDuration(60);
engine.startMatch('normal', 'match', 1, undefined, 3);
assert.equal(engine.getSnapshot().matchDuration, 60, 'la durata scelta viene salvata nello snapshot');
assert.equal(engine.getSnapshot().timeLeft, 60, 'la partita parte con la durata selezionata');
const customKeys = cloneKeyBindings();
engine.gamepadAxes[0] = { x: 0, y: 0 };
engine.setStick(0, 0, 0, false);
customKeys.p1.right = 'KeyL';
customKeys.p1.pass = 'KeyZ';
engine.setKeyBindings(customKeys);
engine.phase = 'play';
engine.onKeyDown({ code: 'KeyL', repeat: false, preventDefault: noop });
assert.equal(engine.inputDir(0).x, 1, 'il movimento usa la rimappatura personalizzata');
engine.onKeyDown({ code: 'KeyZ', repeat: false, preventDefault: noop });
assert.equal(engine.passQ[0], true, 'il passaggio usa il tasto personalizzato');
engine.onKeyUp({ code: 'KeyL' });
engine.onKeyUp({ code: 'KeyZ' });

// ---- passaggio filtrante ---------------------------------------------------
engine.startMatch('normal', 'match', 1, ['bra', 'bol'], 3);
engine.phase = 'play';
const tbCarrier = engine.players[1];
const tbMate = engine.players[2];
const tbDef = engine.players[3];
const tbOther = engine.players[4];
const setupThrough = () => {
  engine.controlledIdx[0] = tbCarrier.idx;
  tbCarrier.x = 500; tbCarrier.y = 350; tbCarrier.vx = 0; tbCarrier.vy = 0; tbCarrier.kickCd = 0;
  tbMate.x = 700; tbMate.y = 300; tbMate.vx = 0; tbMate.vy = 0; tbMate.throughRun = 0;
  tbDef.x = 200; tbDef.y = 350; tbDef.vx = 0; tbDef.vy = 0;
  tbOther.x = 260; tbOther.y = 460; tbOther.vx = 0; tbOther.vy = 0;
  engine.ball.x = tbCarrier.x;
  engine.ball.y = tbCarrier.y;
  engine.ball.vx = 0; engine.ball.vy = 0;
  engine.claimBall(tbCarrier);
  engine.controlledIdx[0] = tbCarrier.idx;
  engine.setStick(0, 1, 0, true);
};

setupThrough();
engine.throughQ[0] = true;
engine.update(1 / 60);
assert.equal(engine.ballCarrier, null, 'il filtrante deve liberare il pallone');
assert.equal(engine.passReceiver, tbMate, 'il filtrante non cerca il compagno avanti');
assert.ok(tbMate.throughRun > 0, 'il ricevente non attacca la profondità');
assert.equal(engine.controlledIdx[0], tbMate.idx, 'il controllo passa a chi attacca la profondità');
assert.equal(engine.ball.z, 0, 'il filtrante deve restare rasoterra');
assert.equal(engine.ball.vz, 0, 'il filtrante non deve alzarsi');
assert.ok(engine.ball.vx > 300, `il filtrante deve viaggiare in avanti (${Math.round(engine.ball.vx)})`);
const flight = Math.hypot(engine.ball.vx, engine.ball.vy);
setupThrough();
engine.passQ[0] = true;
engine.update(1 / 60);
const passFlight = Math.hypot(engine.ball.vx, engine.ball.vy);
assert.ok(flight > passFlight + 40, `il filtrante deve essere più secco del passaggio (${Math.round(flight)} vs ${Math.round(passFlight)})`);
// il pallone arriva davanti al ricevente, non fra i piedi dei difensori
setupThrough();
engine.throughQ[0] = true;
engine.update(1 / 60);
{
  const t = Math.abs(engine.ball.vx) > 1 ? (tbMate.x - engine.ball.x) / engine.ball.vx : 0;
  const arriveX = engine.ball.x + engine.ball.vx * (t + 0.28);
  assert.ok(arriveX > tbMate.x + 40, `il filtrante deve morire nello spazio: arrivo a ${Math.round(arriveX)} su ${tbMate.x}`);
}
// traiettoria completamente otturata: meglio un passaggio sicuro
setupThrough();
tbDef.x = (tbCarrier.x + tbMate.x) / 2;
tbDef.y = (tbCarrier.y + tbMate.y) / 2;
tbOther.x = tbDef.x + 4;
tbOther.y = tbDef.y - 4;
tbMate.throughRun = 0;
engine.throughQ[0] = true;
engine.update(1 / 60);
assert.equal(tbMate.throughRun, 0, 'senza corridoio il filtrante non deve essere forzato');
assert.ok(engine.passReceiver === tbMate || engine.ballCarrier !== tbCarrier, 'il ripiego sul passaggio non funziona');
// i tasti predefiniti attivano la nuova azione
engine.setKeyBindings(cloneKeyBindings());
engine.inputEnabled = true;
engine.paused = false;
engine.phase = 'play';
engine.onKeyDown({ code: 'KeyB', repeat: false, preventDefault: noop });
assert.equal(engine.throughQ[0], true, 'B deve armare il filtrante per P1');
engine.onKeyUp({ code: 'KeyB' });
engine.startMatch('normal', 'match', 2, ['bra', 'bol'], 3);
engine.phase = 'play';
engine.onKeyDown({ code: 'KeyP', repeat: false, preventDefault: noop });
assert.equal(engine.throughQ[1], true, 'P deve armare il filtrante per P2');
engine.onKeyUp({ code: 'KeyP' });
// anche l'IA lo usa, e solo fuori dalla demo (PRNG seminato: niente test ballerini)
const seededRandom = (() => {
  let a = 20261001;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const realMathRandom = Math.random;
Math.random = seededRandom;
let throughCalls = 0;
const realThrough = engine.throughBall.bind(engine);
engine.throughBall = (p, err, human) => {
  throughCalls += 1;
  return realThrough(p, err, human);
};
engine.startMatch('hard', 'match', 1, ['bra', 'bol'], 3);
engine.phase = 'play';
for (let i = 0; i < 1500; i++) engine.update(1 / 60);
assert.ok(throughCalls > 0, "l'IA non tenta mai un filtrante a difficoltà alta");
const aiCalls = throughCalls;
throughCalls = 0;
engine.startDemo();
for (let i = 0; i < 900; i++) engine.update(1 / 60);
assert.equal(throughCalls, 0, 'la demo di sottofondo non deve usare i filtranti');
assert.ok(aiCalls > 0, 'contatore IA azzerato troppo presto');
engine.throughBall = realThrough;
Math.random = realMathRandom;


// Numeri di maglia: 10 al giocatore guidato, poi 9, 11, 7, 8 secondo la formazione.
const SHIRTS = [10, 9, 11, 7, 8];
for (const teamSize of [1, 2, 3, 4, 5]) {
  for (const playerCount of [1, 2]) {
    engine.startMatch('normal', 'match', playerCount, ['bra', 'bol'], teamSize);
    for (const team of [0, 1]) {
      const nums = [];
      for (let idx = 0; idx < teamSize; idx++) nums.push(engine.players[team * teamSize + idx].number);
      assert.deepEqual(
        [...nums].sort((a, b) => a - b),
        [...SHIRTS.slice(0, teamSize)].sort((a, b) => a - b),
        `${teamSize}v${teamSize} P${playerCount}: numeri ${nums.join(',')} squadra ${team}`,
      );
      assert.equal(new Set(nums).size, teamSize, `${teamSize}v${teamSize}: numeri duplicati in squadra ${team}`);
      if (team === 0 || playerCount === 2) {
        assert.equal(nums[engine.controlledIdx[team]], 10, `${teamSize}v${teamSize} P${playerCount}: il 10 non va al giocatore guidato`);
      } else {
        assert.deepEqual(nums, SHIRTS.slice(0, teamSize), `${teamSize}v${teamSize}: sequenza CPU non in ordine`);
      }
    }
  }
}

// Le stelle contano: velocità, potenza, imprecisioni, contrasti e portiere dipendono dal coefficiente.
engine.setTeams(['bra', 'smr']);
const scaleChecks = [
  ['speedScale', 'gt'],
  ['powerScale', 'gt'],
  ['keeperScale', 'gt'],
  ['flawScale', 'lt'],
];
for (const [method, direction] of scaleChecks) {
  const strong = engine[method](0);
  const weak = engine[method](1);
  if (direction === 'gt') assert.ok(strong > weak, `${method}: Brasile non avvantaggiato (${strong} vs ${weak})`);
  else assert.ok(strong < weak, `${method}: San Marino non più imprecisa (${strong} vs ${weak})`);
  assert.ok(strong > 0.75 && strong < 1.35, `${method}: moltiplicatore fuori scala (${strong})`);
}
assert.ok(engine.gripRatio(0, 1) > 1, 'il Brasile deve rubare più facilmente il pallone');
assert.ok(engine.gripRatio(1, 0) < 1, 'San Marino non dovrebbe reggere il contrasto');
const BASE_CFG = { speed: 250, shootRange: 380, shootErr: 0.1, passErr: 0.14, minHold: 0.5 };
const strongCfg = engine.scaledCfg(BASE_CFG, 0);
const weakCfg = engine.scaledCfg(BASE_CFG, 1);
assert.ok(strongCfg.speed > weakCfg.speed * 1.12, 'differenza di velocità IA troppo bassa');
assert.ok(strongCfg.shootRange > weakCfg.shootRange, 'gittata IA non legata al coefficiente');
assert.ok(strongCfg.shootErr < weakCfg.shootErr && strongCfg.passErr < weakCfg.passErr, 'imprecisioni IA non legate al coefficiente');
assert.ok(strongCfg.minHold < weakCfg.minHold, 'la squadra forte non è più rapida nelle decisioni');
// nessuna nazionale deve risultare ingiocabile o sovrumana
engine.setTeams(['smr', 'bra']);
assert.ok(engine.speedScale(0) > 0.9, 'la nazionale più debole è ferma');
assert.ok(engine.speedScale(1) < 1.1, 'la nazionale più forte vola');


// ============ DIFFICOLTÀ ESTREMA ============
assert.deepEqual(DIFFICULTIES, ['easy', 'normal', 'hard', 'extreme'], 'ordine delle difficoltà');
assert.deepEqual(Object.keys(DIFFS), DIFFICULTIES, 'manca una riga nella tabella DIFFS');
for (let i = 1; i < DIFFICULTIES.length; i++) {
  const softer = DIFFS[DIFFICULTIES[i - 1]];
  const harsher = DIFFS[DIFFICULTIES[i]];
  const tag = DIFFICULTIES[i];
  assert.ok(harsher.speed > softer.speed, `IA non più veloce a ${tag}`);
  assert.ok(harsher.shootRange > softer.shootRange, `IA non più lunga nel tiro a ${tag}`);
  assert.ok(harsher.shootErr < softer.shootErr, `IA non più precisa nel tiro a ${tag}`);
  assert.ok(harsher.passErr < softer.passErr, `IA non più precisa nei passaggi a ${tag}`);
  assert.ok(harsher.minHold < softer.minHold, `IA non più rapida a decidere a ${tag}`);
}
assert.ok(DIFFS.extreme.speed > DIFFS.hard.speed * 1.09, 'ESTREMA è solo un ritocco di DIFFICILE');
assert.ok(DIFFS.extreme.shootErr < DIFFS.hard.shootErr * 0.65, 'ESTREMA sbaglia ancora troppo');
assert.ok(DIFFS.extreme.minHold < DIFFS.hard.minHold * 0.6, 'ESTREMA decide ancora lentamente');

// una partita intera a ESTREMA deve restare stabile
engine.startMatch('extreme', 'match', 1, ['bra', 'fra'], 3);
assert.equal(engine.diff, 'extreme', 'il motore non ha ricevuto ESTREMA');
for (let frame = 0; frame < 600; frame++) engine.update(1 / 60);
for (const p of engine.players) {
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy), 'giocatore impazzito a ESTREMA');
}
assert.ok(Number.isFinite(engine.getSnapshot().timeLeft), 'orologio impazzito a ESTREMA');

// ============ SOPRAVVIVENZA: scala dei round ============
assert.equal(survivalDifficulty(1, 'normal'), 'normal');
assert.equal(survivalDifficulty(2, 'normal'), 'normal');
assert.equal(survivalDifficulty(3, 'normal'), 'hard');
assert.equal(survivalDifficulty(5, 'normal'), 'extreme');
assert.equal(survivalDifficulty(1, 'easy'), 'easy');
assert.equal(survivalDifficulty(7, 'easy'), 'extreme');
assert.equal(survivalDifficulty(9, 'hard'), 'extreme');
assert.equal(survivalDifficulty(400, 'extreme'), 'extreme', 'la difficoltà esce dalla scala');
for (let round = 1; round <= 60; round++) {
  assert.ok(DIFFICULTIES.includes(survivalDifficulty(round, 'normal')), `difficoltà inventata al round ${round}`);
}

const strengthOf = (id) => SURVIVAL_LADDER.find((team) => team.id === id).strength;
assert.ok(
  strengthOf(survivalOpponent(1, 'ita')) <= SURVIVAL_LADDER[3].strength,
  'il round 1 non parte dalla nazionale più debole',
);
let previousStrength = -1;
const seenOpponents = new Set();
for (let round = 1; round <= 45; round++) {
  const id = survivalOpponent(round, 'ita');
  assert.notEqual(id, 'ita', `il round ${round} ripropone la squadra del giocatore`);
  const value = strengthOf(id);
  assert.ok(value >= previousStrength - 1e-9, `la scala avversari retrocede al round ${round}`);
  previousStrength = value;
  seenOpponents.add(id);
}
assert.ok(seenOpponents.size > 40, `avversari troppo ripetuti nei primi 45 round (${seenOpponents.size})`);
// le prime 20 della scala (con la squadra del giocatore esclusa) sono l'elite
const eliteFloor = SURVIVAL_LADDER[SURVIVAL_LADDER.length - 21].strength;
let last = null;
for (let round = 46; round <= 70; round++) {
  const id = survivalOpponent(round, 'ita');
  assert.ok(strengthOf(id) >= eliteFloor, `fuori dalla elite al round ${round}`);
  assert.notEqual(id, last, `avversario ripetuto due volte di fila al round ${round}`);
  last = id;
}

// ============ SOPRAVVIVENZA: regole del round ============
engine.setSurvivalRound(0);
engine.startMatch('normal', 'survival', 1, ['bra', 'smr'], 3);
const survivalSnap = engine.getSnapshot();
assert.equal(survivalSnap.matchDuration, SURVIVAL_ROUND_DURATION, 'round non da 60 secondi');
assert.ok(survivalSnap.timeLeft <= SURVIVAL_ROUND_DURATION, 'il round parte con più tempo del previsto');
assert.equal(survivalSnap.survivalRound, 0, 'il round non deve salire da solo');
engine.setSurvivalRound(3);
assert.equal(engine.getSnapshot().survivalRound, 3, "l'HUD non può leggere il round");
assert.equal(engine.survivalActive, true, 'sopravvivenza non attiva');
engine.setSurvivalRound(0);
assert.equal(engine.survivalActive, false, 'sopravvivenza non spenta');

// la CPU cresce a ogni round superato, il giocatore no
engine.setSurvivalRound(1);
const keeperBase = engine.keeperScale(1);
const playerKeeperBase = engine.keeperScale(0);
const cpuBase = engine.scaledCfg(DIFFS.normal, 1);
const playerBase = engine.scaledCfg(DIFFS.normal, 0);
engine.setSurvivalRound(9);
const keeperUp = engine.keeperScale(1);
const cpuUp = engine.scaledCfg(DIFFS.normal, 1);
assert.ok(keeperUp > keeperBase, 'il portiere avversario non cresce nei round alti');
assert.equal(engine.keeperScale(0), playerKeeperBase, 'la squadra del giocatore non deve beneficiare del round');
assert.ok(cpuUp.speed > cpuBase.speed, 'la CPU non accelera nei round alti');
assert.ok(cpuUp.shootErr < cpuBase.shootErr, 'la CPU non diventa più precisa nei round alti');
assert.equal(engine.scaledCfg(DIFFS.normal, 0).speed, playerBase.speed, 'il ramp tocca anche il giocatore');
assert.ok(keeperUp / keeperBase <= 1.31, `ramp troppo pesante (${keeperUp / keeperBase})`);
engine.setSurvivalRound(0);

const ends = [];
engine.on((event) => {
  if (event.type === 'end') ends.push(event);
});
const closeRound = () => {
  engine.phase = 'goal';
  engine.goalT = 0.01;
  for (let frame = 0; frame < 10; frame++) engine.update(1 / 60);
  return engine.getSnapshot();
};

// chi subisce un gol chiude la serie: il round non prosegue
engine.setSurvivalRound(3);
engine.startMatch('normal', 'survival', 1, ['bra', 'smr'], 3);
engine.setSurvivalRound(3);
engine.goal(1);
let snapEnd = closeRound();
assert.equal(snapEnd.phase, 'over', 'il gol subìto non chiude il round');
assert.equal(snapEnd.winner, 1, 'vittoria assegnata al posto della sconfitta');
assert.equal(ends[ends.length - 1].decidedBy, 'survival', "l'esito non è classificato come sopravvivenza");

// il gol del vantaggio chiude subito anche senza scadere il tempo
const before = ends.length;
engine.startMatch('normal', 'survival', 1, ['bra', 'smr'], 3);
engine.goal(0);
snapEnd = closeRound();
assert.equal(snapEnd.phase, 'over', 'il gol segnato non chiude il round');
assert.equal(snapEnd.winner, 0, 'round non considerato superato');
assert.equal(snapEnd.timeLeft > 0, false, 'il round è andato oltre la morte subita');
assert.equal(ends.length, before + 1, 'evento di fine round duplicato');

// a tempo scaduto senza gol si sopravvive: niente supplementari, niente rigori
engine.startMatch('normal', 'survival', 1, ['bra', 'smr'], 3);
engine.phase = 'play';
engine.score = [0, 0];
engine.lastWholeSec = 99;
engine.timeLeft = 0;
engine.update(1 / 60);
snapEnd = engine.getSnapshot();
assert.equal(snapEnd.period, 'regular', 'la sopravvivenza è andata ai supplementari');
assert.equal(snapEnd.phase, 'over', 'il round non è terminato');
assert.equal(snapEnd.winner, -1, 'il pareggio non è sopravvivenza');
assert.equal(snapEnd.pens, null, 'rigori inventati in sopravvivenza');

// regressione: la partita lampo normale va ancora ai supplementari sul pareggio
engine.startMatch('normal', 'match', 1, ['bra', 'smr'], 3);
engine.phase = 'play';
engine.score = [1, 1];
engine.lastWholeSec = 99;
engine.timeLeft = 0;
engine.update(1 / 60);
assert.equal(engine.getSnapshot().period, 'extra', 'la partita normale non fa più i supplementari');

// ============ CALCI DA FERMO: angolo e inizio obbligano a servire un compagno ============
const GOAL_HALF = 100;
/** Arma (o disarma) un calcio da fermo sul giocatore indicato e ne misura il tiro. */
const setPieceShot = (e, shooter, armed, roll) => {
  const real = Math.random;
  Math.random = () => roll;
  e.setPiece = null;
  e.setPiecePending = 0;
  shooter.x = 700;
  shooter.y = 390;
  shooter.faceX = 1;
  shooter.faceY = 0;
  e.claimBall(shooter);
  if (armed) e.setPiece = { kind: 'corner', team: shooter.team, taker: shooter, t: 0 };
  e.shoot(shooter, 0.02);
  const wide = Math.abs(e.ball.vy * ((e.fieldWidth - e.ball.x) / e.ball.vx)) > GOAL_HALF;
  Math.random = real;
  return wide;
};
// in 1v1 nessuno può passare: il vincolo non esiste
engine.setStick(0, 0, 0, false);
engine.startMatch('normal', 'match', 2, ['bra', 'fra'], 1);
engine.phase = 'play';
assert.equal(engine.setPiece, null, 'il 1v1 non deve avere vincoli sul calcio da fermo');
assert.equal(engine.getSnapshot().setPiece, null, 'lo snapshot 1v1 segnala un vincolo');
engine.awardCorner(0, true, 60);
assert.equal(engine.setPiece, null, 'il corner 1v1 non deve obbligare il passaggio');

// 3v3: il calcio d'inizio successivo a una rete arma il vincolo
engine.startMatch('normal', 'match', 2, ['bra', 'fra'], 3);
engine.goal(0);
for (let frame = 0; frame < 210; frame++) engine.update(1 / 60);
assert.equal(engine.phase, 'countdown', "manca il countdown del calcio d'inizio");
assert.equal(engine.getSnapshot().setPiece, 'kickoff', "il calcio d'inizio non obbliga a giocare il pallone");
const taker = engine.ballCarrier;
assert.equal(taker.team, 1, "non batte il calcio d'inizio la squadra che ha subito");
engine.phase = 'play';

// il pallone resta sul punto: chi calcia non può trascinarlo via
const parkX = engine.ball.x;
const parkY = engine.ball.y;
taker.x = parkX - 90;
taker.y = parkY + 60;
engine.placeBallAtCarrier(taker);
assert.equal(engine.ball.x, parkX, 'il pallone si è spostato dal punto del calcio d\'inizio');
assert.equal(engine.ball.y, parkY, 'il pallone si è spostato in altezza');
taker.vx = 420;
taker.vy = 0;
engine.integratePlayer(taker, 1 / 60);
assert.ok(Math.hypot(taker.vx, taker.vy) <= 110, 'il battitore scatta via col pallone');
engine.setStick(1, -1, 0.4, true);
for (let frame = 0; frame < 8; frame++) engine.update(1 / 60);
assert.equal(engine.ball.x, parkX, 'il pallone segue il battitore durante i passi di rincorsa');
engine.setStick(1, 0, 0, false);
engine.setPiece = { kind: 'kickoff', team: taker.team, taker, t: 0 };

// un passaggio normale scioglie il vincolo
engine.pass(taker, 0.05, false);
engine.update(1 / 60);
assert.equal(engine.setPiece, null, 'il passaggio non ha liberato il calcio da fermo');
assert.ok(Math.hypot(engine.ball.vx, engine.ball.vy) > 100, 'il pallone non è partito');

// il tiro diretto è concesso ma la mira viene deviata fuori quando non è la volta buona
engine.startMatch('normal', 'match', 2, ['bra', 'fra'], 3);
engine.phase = 'play';
const shooter = engine.players[0];
engine.setPiece = null; // qui si misura solo la mira del tiro
engine.setPiece = null;
// roll sfavorevole (0.9 >= 3%): fuori misura; roll favorevole: porta inquadrata
assert.equal(setPieceShot(engine, shooter, true, 0.9), true, 'il tiro diretto da calcio da fermo non è stato deviato');
assert.equal(setPieceShot(engine, shooter, true, 0), false, 'il 3% di tiro diretto non può inquadrare la porta');
assert.equal(setPieceShot(engine, shooter, false, 0.9), false, 'fuori dai calci da fermo il tiro viene punito');
assert.ok(SET_PIECE_GOAL_CHANCE > 0 && SET_PIECE_GOAL_CHANCE < 0.06, 'la percentuale di gol diretto non è 3%');

// quante volte entra davvero: 300 tentativi con PRNG seminato
let onTarget = 0;
let setPieceSeed = 24601;
const setPieceRandom = () => {
  setPieceSeed = (setPieceSeed * 1664525 + 1013904223) % 4294967296;
  return setPieceSeed / 4294967296;
};
engine.startMatch('normal', 'match', 2, ['bra', 'fra'], 3);
engine.phase = 'play';
const seededShooter = engine.players[0];
engine.setPiece = null;
engine.setPiece = null;
Math.random = setPieceRandom;
for (let shot = 0; shot < 300; shot++) if (!setPieceShot(engine, seededShooter, true, setPieceRandom())) onTarget++;
assert.ok(onTarget / 300 < 0.09, `troppi tiri diretti inquadrati da calcio da fermo (${onTarget}/300)`);
let freeOnTarget = 0;
setPieceSeed = 24601;
for (let shot = 0; shot < 300; shot++) if (!setPieceShot(engine, seededShooter, false, setPieceRandom())) freeOnTarget++;
assert.ok(freeOnTarget > onTarget * 4, `il vincolo non cambia nulla: ${onTarget} vs ${freeOnTarget}`);
assert.ok(freeOnTarget > 200, `fuori dal vincolo troppi tiri fuori misura (${freeOnTarget})`);

// il corner arma lo stesso vincolo e lo perde solo chi ruba il pallone
engine.startMatch('normal', 'match', 1, ['bra', 'fra'], 3);
engine.phase = 'play';
engine.awardCorner(0, true, 40);
assert.equal(engine.getSnapshot().setPiece, 'corner', 'l\'angolo non obbliga il cross o il passaggio');
assert.equal(engine.controlledIdx[0], engine.setPiece.taker.idx, 'il giocatore guidato non è il battitore');
const rival = engine.players.find((p) => p.team === 1);
engine.claimBall(rival);
engine.update(1 / 60);
assert.equal(engine.setPiece, null, 'il vincolo deve cadere quando il pallone cambia proprietario');

// la grazia scade: dopo 6 secondi di gioco il pallone torna vivo
engine.awardCorner(0, true, 40);
assert.equal(engine.setPiece.kind, 'corner');
engine.setPiece.t = 6.1;
engine.update(1 / 60);
assert.equal(engine.setPiece, null, 'il vincolo non scade mai');

// la demo non deve restare impallata sui calci da fermo
engine.startDemo();
for (let frame = 0; frame < 900; frame++) engine.update(1 / 60);
assert.equal(engine.setPiece, null, 'la demo si blocca su un calcio da fermo');
engine.startMatch('normal', 'match', 1, ['bra', 'fra'], 3);

// la demo non eredita la morte subita
engine.startDemo();
assert.equal(engine.survivalActive, false, 'la demo è rimasta in sopravvivenza');
engine.startMatch('normal', 'match', 1, ['ita', 'fra'], 3);
engine.goal(0);
snapEnd = closeRound();
assert.equal(snapEnd.phase, 'countdown', 'un gol a tempo pieno non deve chiudere la partita');
engine.update(1 / 60);

engine.dispose();
console.log('PASS: passaggi, filtrante, impostazioni tastiera/durata, tiro a giro, corner 1v1, campi, kickoff e calci da fermo verificati.');
