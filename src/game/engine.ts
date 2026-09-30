import { SFX } from './sound';
import { DEFAULT_TEAMS, getNationalTeam, type TeamKit, type TeamSelection } from './teams';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'match' | 'pens';
export type PlayerCount = 1 | 2;
export type TeamSize = 1 | 2 | 3 | 4 | 5;
export type Phase = 'demo' | 'countdown' | 'play' | 'goal' | 'pens' | 'over';
export type Period = 'regular' | 'extra' | 'pens';
export type PenKickResult = 'goal' | 'save' | 'miss' | 'post';
export type PenStage = 'intro' | 'aim' | 'kick' | 'resolve';
export type DecidedBy = 'regular' | 'golden' | 'pens';

export interface PensSnap {
  score: [number, number];
  taken: [number, number];
  turn: number; // 0 = squadra di casa, 1 = squadra ospite
  stage: PenStage;
  stageT: number;
  results: [Exclude<PenKickResult, 'post'>[], Exclude<PenKickResult, 'post'>[]];
}

export interface Snapshot {
  phase: Phase;
  period: Period;
  score: [number, number];
  shots: [number, number];
  timeLeft: number;
  countdown: number;
  lastGoalTeam: number;
  winner: number; // -2 = non finita, -1 = pareggio
  muted: boolean;
  playerCount: PlayerCount;
  teamSize: TeamSize;
  controlled: [number, number];
  gamepadsConnected: number;
  pens: PensSnap | null;
}

export type EngineEvent =
  | { type: 'goal'; team: number; score: [number, number] }
  | { type: 'corner'; team: number }
  | { type: 'extratime' }
  | { type: 'pensstart' }
  | { type: 'penResult'; result: PenKickResult; team: number }
  | { type: 'end'; winner: number; score: [number, number]; pens: [number, number] | null; decidedBy: DecidedBy }
  | { type: 'pause' }
  | { type: 'resume' };

const W = 1200;
const H = 700;
const GOAL_HALF = 100;
const GOAL_DEPTH = 32;
const P_R = 17;
const B_R = 9;
const MATCH_TIME = 90;
const EXTRA_TIME = 30;
const PEN_ROUNDS = 5;
const GK_R = 23;
const GK_X = 38;
const GK_SPEED = 300;
const BALL_GRAVITY = 980;
const BALL_CARRY_OFFSET = P_R + B_R + 2;
const TACKLE_RANGE = P_R * 2 + 16;

const FORMATIONS: Record<TeamSize, { x: number; y: number }[]> = {
  1: [{ x: 360, y: 350 }],
  2: [
    { x: 250, y: 270 },
    { x: 390, y: 430 },
  ],
  3: [
    { x: 205, y: 350 },
    { x: 380, y: 250 },
    { x: 380, y: 450 },
  ],
  4: [
    { x: 175, y: 350 },
    { x: 315, y: 230 },
    { x: 315, y: 470 },
    { x: 475, y: 350 },
  ],
  5: [
    { x: 150, y: 350 },
    { x: 275, y: 220 },
    { x: 275, y: 480 },
    { x: 435, y: 260 },
    { x: 435, y: 440 },
  ],
};

function formationFor(team: number, idx: number, teamSize: TeamSize) {
  const position = FORMATIONS[teamSize][idx];
  return { x: team === 0 ? position.x : W - position.x, y: position.y };
}

interface DiffCfg {
  speed: number;
  shootRange: number;
  shootErr: number;
  passErr: number;
  minHold: number;
}

const DIFFS: Record<Difficulty, DiffCfg> = {
  easy: { speed: 218, shootRange: 300, shootErr: 0.17, passErr: 0.24, minHold: 0.85 },
  normal: { speed: 252, shootRange: 385, shootErr: 0.1, passErr: 0.14, minHold: 0.5 },
  hard: { speed: 284, shootRange: 450, shootErr: 0.055, passErr: 0.08, minHold: 0.3 },
};

const DEMO_CFG: DiffCfg = { speed: 195, shootRange: 340, shootErr: 0.14, passErr: 0.2, minHold: 0.7 };

const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  faceX = 1;
  faceY = 0;
  tx = 0;
  ty = 0;
  hasBall = false;
  kickCd = 0;
  holdT = 0;
  tackleCd = 0;
  tackleT = 0;
  tackleResolved = false;
  number: number;
  constructor(public team: number, public idx: number, public teamSize: TeamSize) {
    const f = formationFor(team, idx, teamSize);
    this.x = f.x;
    this.y = f.y;
    this.tx = f.x;
    this.ty = f.y;
    this.number = team === 0 ? [4, 7, 10, 8, 11][idx] : [4, 9, 11, 7, 10][idx];
    this.faceX = team === 0 ? 1 : -1;
  }
  reset() {
    const f = formationFor(this.team, this.idx, this.teamSize);
    this.x = f.x;
    this.y = f.y;
    this.vx = 0;
    this.vy = 0;
    this.hasBall = false;
    this.holdT = 0;
    this.kickCd = 0;
    this.tackleCd = 0;
    this.tackleT = 0;
    this.tackleResolved = false;
    this.faceX = this.team === 0 ? 1 : -1;
    this.faceY = 0;
  }
}

class FixedGoalkeeper {
  readonly x: number;
  y = H / 2;
  vy = 0;

  constructor(public team: number) {
    this.x = team === 0 ? GK_X : W - GK_X;
  }

  reset() {
    this.y = H / 2;
    this.vy = 0;
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
  grav: number;
}

interface PensState {
  score: [number, number];
  taken: [number, number];
  turn: number; // 0 = TIRA il giocatore (vista da dietro la palla), 1 = PARA il giocatore (vista dalla porta)
  stage: PenStage;
  stageT: number;
  aimX: number; // mira in coordinate porta normalizzate: gx ∈ [-1,1], gy ∈ [0,1]
  aimY: number;
  aimT: number; // da quanto si sta mirando (cresce il wobble)
  gloveX: number;
  gloveY: number;
  diveT: number;
  diveDx: number;
  diveDy: number;
  kickT: number;
  kickDur: number;
  resolveDur: number;
  toX: number; // destinazione palla (coordinate porta)
  toY: number;
  outX: number; // direzione di uscita dopo parata/palo
  outY: number;
  aiDiveX: number; // tuffo del portiere IA quando tira il giocatore
  aiDiveY: number;
  outcomeDone: boolean;
  result: PenKickResult | null;
  results: [Exclude<PenKickResult, 'post'>[], Exclude<PenKickResult, 'post'>[]];
}

interface FPParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FPLayout {
  horizon: number;
  gw: number;
  gh: number;
  cx: number;
  top: number;
  bottom: number;
}

interface CurveFlight {
  team: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  duration: number;
  elapsed: number;
  arc: number;
  scores: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastT = 0;
  private paused = false;
  private disposed = false;
  inputEnabled = false;

  phase: Phase = 'demo';
  private players: Player[] = [];
  private goalkeepers: FixedGoalkeeper[] = [new FixedGoalkeeper(0), new FixedGoalkeeper(1)];
  private playerCount: PlayerCount = 1;
  private teamSize: TeamSize = 3;
  private selectedTeams: TeamSelection = [...DEFAULT_TEAMS];
  private controlledIdx: [number, number] = [1, 1];
  private ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, z: 0, vz: 0, curve: 0, lastTouch: -1, lastTouchWasKeeper: false };
  private ballCarrier: Player | null = null;
  private recentKicker: Player | null = null;
  private kickerGrace = 0;
  private curveFlight: CurveFlight | null = null;
  private trail: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private score: [number, number] = [0, 0];
  private shots: [number, number] = [0, 0];
  private timeLeft = MATCH_TIME;
  private countdown = 0;
  private countdownShown = -1;
  private goalT = 0;
  private lastGoalTeam = -1;
  private goalSide: -1 | 1 = 1;
  private winner = -2;
  private period: Period = 'regular';
  private allowDraw = false;
  private pens: PensState | null = null;
  private fpFx: FPParticle[] = [];
  private fpTrail: { x: number; y: number; r: number }[] = [];
  private diff: Difficulty = 'normal';
  private shake = 0;
  private time = 0;
  private lastWholeSec = -1;
  private goalFlash = 0;

  private keys = new Set<string>();
  private sticks: [{ x: number; y: number; active: boolean }, { x: number; y: number; active: boolean }] = [
    { x: 0, y: 0, active: false },
    { x: 0, y: 0, active: false },
  ];
  private gamepadAxes: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private gamepadSprint: [boolean, boolean] = [false, false];
  private gamepadsConnected = 0;
  private gamepadButtonState = new Map<number, boolean[]>();
  private shootQ: [boolean, boolean] = [false, false];
  private passQ: [boolean, boolean] = [false, false];
  private switchQ: [boolean, boolean] = [false, false];
  private crossQ: [boolean, boolean] = [false, false];
  private curveQ: [boolean, boolean] = [false, false];
  private powerQ: [boolean, boolean] = [false, false];
  private tackleQ: [boolean, boolean] = [false, false];

  private sfx = new SFX();
  private demo = true;
  private listener: ((e: EngineEvent) => void) | null = null;

  private vw = 1;
  private vh = 1;
  private dpr = 1;
  private bgCanvas: HTMLCanvasElement | null = null;
  private resizeObs: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;

    this.configurePlayers(this.teamSize);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    this.startDemo();
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  on(fn: (e: EngineEvent) => void) {
    this.listener = fn;
  }

  private emit(e: EngineEvent) {
    this.listener?.(e);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.resizeObs.disconnect();
  }

  // ---------- input ----------
  private onKeyDown = (e: KeyboardEvent) => {
    const preventCodes = [
      'Space',
      'Tab',
      'Enter',
      'NumpadEnter',
      'Slash',
      'Numpad0',
      'Period',
      'NumpadDecimal',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ];
    if (e.repeat) {
      if (preventCodes.includes(e.code)) e.preventDefault();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.phase === 'play' || this.phase === 'countdown' || this.phase === 'goal' || this.phase === 'pens') {
        if (this.paused) {
          this.setPaused(false);
          this.emit({ type: 'resume' });
        } else {
          this.setPaused(true);
          this.emit({ type: 'pause' });
        }
      }
      return;
    }
    if (!this.inputEnabled || this.paused) return;
    if (preventCodes.includes(e.code)) e.preventDefault();
    this.keys.add(e.code);

    const localMatch = this.playerCount === 2;
    if (e.code === 'Space') this.shootQ[0] = true;
    if (localMatch && (e.code === 'Enter' || e.code === 'NumpadEnter')) this.shootQ[1] = true;

    if (e.code === 'KeyC' || e.code === 'KeyJ' || e.code === 'KeyX') this.passQ[0] = true;
    if (localMatch && (e.code === 'Slash' || e.code === 'Numpad0')) this.passQ[1] = true;

    if (e.code === 'KeyV') this.crossQ[0] = true;
    if (localMatch && e.code === 'KeyM') this.crossQ[1] = true;
    if (e.code === 'KeyF') this.curveQ[0] = true;
    if (localMatch && e.code === 'KeyU') this.curveQ[1] = true;
    if (e.code === 'KeyR') this.powerQ[0] = true;
    if (localMatch && e.code === 'KeyO') this.powerQ[1] = true;
    if (e.code === 'KeyE') this.tackleQ[0] = true;
    if (localMatch && e.code === 'KeyI') this.tackleQ[1] = true;

    if (e.code === 'KeyQ' || e.code === 'Tab') this.switchQ[0] = true;
    if (localMatch && (e.code === 'Period' || e.code === 'NumpadDecimal')) this.switchQ[1] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private togglePauseFromGamepad() {
    if (!['play', 'countdown', 'goal', 'pens'].includes(this.phase)) return;
    this.setPaused(!this.paused);
    this.emit({ type: this.paused ? 'pause' : 'resume' });
  }

  private pollGamepads() {
    let pads: Gamepad[] = [];
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        pads = Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => Boolean(pad?.connected));
      }
    } catch {
      // Alcuni browser bloccano Gamepad API finché l'utente non interagisce con la pagina.
    }

    this.gamepadsConnected = pads.length;
    this.gamepadAxes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    this.gamepadSprint = [false, false];
    const currentButtonState = new Map<number, boolean[]>();
    pads.sort((a, b) => a.index - b.index).slice(0, this.playerCount).forEach((pad, slot) => {
      const buttons = Array.from(pad.buttons, (button) => Boolean(button && (button.pressed || button.value >= 0.5)));
      const previous = this.gamepadButtonState.get(pad.index) ?? [];
      const pressed = (index: number) => buttons[index] ?? false;
      const justPressed = (index: number) => pressed(index) && !previous[index];
      currentButtonState.set(pad.index, buttons);

      let x = pad.axes[0] ?? 0;
      let y = pad.axes[1] ?? 0;
      if (Math.abs(x) < 0.18) x = 0;
      if (Math.abs(y) < 0.18) y = 0;
      x += (pressed(15) ? 1 : 0) - (pressed(14) ? 1 : 0);
      y += (pressed(13) ? 1 : 0) - (pressed(12) ? 1 : 0);
      this.gamepadAxes[slot as 0 | 1] = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };

      if (!this.inputEnabled) return;
      if (justPressed(9) && ['play', 'countdown', 'goal', 'pens'].includes(this.phase)) {
        this.togglePauseFromGamepad();
        return;
      }
      if (this.paused) return;

      this.gamepadSprint[slot as 0 | 1] = pressed(7);
      if (this.phase === 'play') {
        if (justPressed(0)) this.shootQ[slot as 0 | 1] = true; // A / Cross
        if (justPressed(1)) this.passQ[slot as 0 | 1] = true; // B / Circle
        if (justPressed(2)) this.crossQ[slot as 0 | 1] = true; // X / Square
        if (justPressed(3)) this.curveQ[slot as 0 | 1] = true; // Y / Triangle
        if (justPressed(4)) this.powerQ[slot as 0 | 1] = true; // LB / L1
        if (justPressed(5)) this.tackleQ[slot as 0 | 1] = true; // RB / R1
        if (justPressed(6) || justPressed(8)) this.switchQ[slot as 0 | 1] = true; // LT / Select
      } else if (this.phase === 'pens' && justPressed(0)) {
        this.shootQ[slot as 0 | 1] = true;
      }
    });
    this.gamepadButtonState = currentButtonState;
  }

  setStick(x: number, y: number, active: boolean): void;
  setStick(slot: number, x: number, y: number, active: boolean): void;
  setStick(a: number, b: number, c: number | boolean, d?: boolean) {
    const slot = d === undefined ? 0 : clamp(Math.trunc(a), 0, 1);
    const x = d === undefined ? a : b;
    const y = d === undefined ? b : (c as number);
    const active = d === undefined ? (c as boolean) : d;
    this.sticks[slot as 0 | 1] = { x, y, active };
  }

  touchShoot(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.shootQ[slot] = true;
  }
  touchPass(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.passQ[slot] = true;
  }
  touchSwitch(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.switchQ[slot] = true;
  }
  touchCross(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.crossQ[slot] = true;
  }
  touchCurve(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.curveQ[slot] = true;
  }
  touchPower(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.powerQ[slot] = true;
  }
  touchTackle(slot: 0 | 1 = 0) {
    if (this.inputEnabled && !this.paused) this.tackleQ[slot] = true;
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.keys.clear();
      this.sticks = [{ x: 0, y: 0, active: false }, { x: 0, y: 0, active: false }];
      this.clearInputQueues();
    }
  }

  private clearInputQueues() {
    this.shootQ = [false, false];
    this.passQ = [false, false];
    this.switchQ = [false, false];
    this.crossQ = [false, false];
    this.curveQ = [false, false];
    this.powerQ = [false, false];
    this.tackleQ = [false, false];
  }
  setMuted(m: boolean) {
    this.sfx.setMuted(m);
  }
  unlockAudio() {
    this.sfx.ensure();
  }
  get muted() {
    return this.sfx.muted;
  }

  private teamKit(team: number): TeamKit {
    return getNationalTeam(this.selectedTeams[team]).kit;
  }

  setTeams(teams: TeamSelection) {
    this.selectedTeams = [...teams];
  }

  setDemoTeamSize(teamSize: TeamSize) {
    if (this.phase !== 'demo' || this.teamSize === teamSize) return;
    this.configurePlayers(teamSize);
    this.players.forEach((p) => p.reset());
    this.goalkeepers.forEach((keeper) => keeper.reset());
    this.newBall();
  }

  private configurePlayers(teamSize: TeamSize) {
    this.releaseBall();
    this.teamSize = teamSize;
    this.players = [];
    for (let team = 0; team < 2; team++) {
      for (let idx = 0; idx < teamSize; idx++) this.players.push(new Player(team, idx, teamSize));
    }
    this.resetControlledPlayers();
  }

  private resetControlledPlayers() {
    const initialPlayer = Math.min(1, this.teamSize - 1);
    this.controlledIdx = [initialPlayer, initialPlayer];
  }

  // ---------- flusso partita ----------
  startDemo() {
    this.phase = 'demo';
    this.demo = true;
    this.playerCount = 1;
    this.resetControlledPlayers();
    this.keys.clear();
    this.clearInputQueues();
    this.score = [0, 0];
    this.shots = [0, 0];
    this.timeLeft = MATCH_TIME;
    this.winner = -2;
    this.period = 'regular';
    this.allowDraw = false;
    this.pens = null;
    this.fpFx = [];
    this.fpTrail = [];
    this.players.forEach((p) => p.reset());
    this.goalkeepers.forEach((keeper) => keeper.reset());
    this.newBall();
  }

  startMatch(
    diff: Difficulty,
    mode: GameMode | 'group' = 'match',
    playerCount: PlayerCount = 1,
    teams: TeamSelection = DEFAULT_TEAMS,
    teamSize: TeamSize = 3,
  ) {
    this.configurePlayers(teamSize);
    this.diff = diff;
    this.playerCount = playerCount;
    this.selectedTeams = [...teams];
    this.demo = false;
    this.keys.clear();
    this.clearInputQueues();
    this.sfx.ensure();
    this.score = [0, 0];
    this.shots = [0, 0];
    this.timeLeft = MATCH_TIME;
    this.winner = -2;
    this.lastGoalTeam = -1;
    this.resetControlledPlayers();
    this.period = 'regular';
    this.allowDraw = mode === 'group';
    this.pens = null;
    this.fpFx = [];
    this.fpTrail = [];
    if (mode === 'pens') {
      // modalità "solo rigori": dritti alla serie dal dischetto
      this.startPens();
    } else {
      this.kickoff();
    }
  }

  private kickoff() {
    this.players.forEach((p) => p.reset());
    this.goalkeepers.forEach((keeper) => keeper.reset());
    this.newBall();
    this.resetControlledPlayers();
    this.countdown = 3.4;
    this.countdownShown = 4;
    this.phase = 'countdown';
    this.keys.clear();
    this.clearInputQueues();
  }

  private newBall() {
    this.releaseBall();
    this.ball.x = W / 2;
    this.ball.y = H / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = -1;
    this.ball.lastTouchWasKeeper = false;
    this.trail = [];
  }

  private releaseBall(player?: Player) {
    if (player && this.ballCarrier !== player) return;
    this.curveFlight = null;
    this.recentKicker = null;
    this.kickerGrace = 0;
    if (this.ballCarrier) {
      this.ballCarrier.hasBall = false;
      this.ballCarrier.holdT = 0;
    }
    this.ballCarrier = null;
  }

  private placeBallAtCarrier(player: Player) {
    const fx = player.faceX || (player.team === 0 ? 1 : -1);
    const fy = player.faceY;
    this.ball.x = clamp(player.x + fx * BALL_CARRY_OFFSET, B_R, W - B_R);
    this.ball.y = clamp(player.y + fy * BALL_CARRY_OFFSET, B_R, H - B_R);
    this.ball.vx = player.vx + fx * 38;
    this.ball.vy = player.vy + fy * 38;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
  }

  private claimBall(player: Player) {
    if (this.ballCarrier === player) return;
    this.releaseBall();
    this.ballCarrier = player;
    if (player.team === 0 || this.playerCount === 2) this.controlledIdx[player.team] = player.idx;
    player.hasBall = true;
    player.holdT = 0;
    player.kickCd = 0;
    player.tackleT = 0;
    player.tackleResolved = false;
    this.ball.lastTouch = player.team;
    this.ball.lastTouchWasKeeper = false;
    this.placeBallAtCarrier(player);
  }

  private startTackle(player: Player, automated = false) {
    if (player.tackleCd > 0 || !this.ballCarrier || this.ballCarrier.team === player.team) return;
    player.tackleCd = automated ? 4 : 1.3;
    player.tackleT = automated ? 0.16 : 0.18;
    player.tackleResolved = false;
    const dx = this.ballCarrier.x - player.x;
    const dy = this.ballCarrier.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    player.faceX = dx / d;
    player.faceY = dy / d;
    const lunge = automated ? 85 : 120;
    player.vx += (dx / d) * lunge;
    player.vy += (dy / d) * lunge;
  }

  private resolveTackles() {
    const carrier = this.ballCarrier;
    if (!carrier) return;
    for (const tackler of this.players) {
      if (tackler.team === carrier.team || tackler.tackleT <= 0 || tackler.tackleResolved) continue;
      const d = dist(tackler.x, tackler.y, carrier.x, carrier.y);
      if (d > TACKLE_RANGE) continue;
      tackler.tackleResolved = true;
      const nx = (carrier.x - tackler.x) / (d || 1);
      const ny = (carrier.y - tackler.y) / (d || 1);
      const closing = (tackler.vx - carrier.vx) * nx + (tackler.vy - carrier.vy) * ny;
      const success = clamp(0.1 + closing / 5000, 0.06, 0.24);
      if (Math.random() < success) {
        this.claimBall(tackler);
        tackler.vx += nx * 55;
        tackler.vy += ny * 55;
        this.sfx.block();
        this.shake = Math.min(this.shake + 2.5, 8);
        this.spawnKick(this.ball.x, this.ball.y, nx, ny, this.teamKit(tackler.team).primary);
      } else {
        // Un contrasto fallito rallenta appena l'azione, ma non fa perdere il possesso.
        carrier.vx += nx * 38;
        carrier.vy += ny * 38;
        tackler.vx -= nx * 24;
        tackler.vy -= ny * 24;
        this.placeBallAtCarrier(carrier);
        this.sfx.block();
        this.shake = Math.min(this.shake + 1, 8);
      }
      return;
    }
  }

  private goal(team: number) {
    this.releaseBall();
    this.ball.curve = 0;
    this.score[team]++;
    this.lastGoalTeam = team;
    this.phase = 'goal';
    this.goalT = team === 0 ? 2.6 : 2.2;
    this.goalFlash = 1;
    this.goalSide = team === 0 ? 1 : -1;
    this.shake = 16;
    this.sfx.goal();
    const gx = team === 0 ? W : 0;
    this.spawnConfetti(gx, H / 2, team === 0 ? -1 : 1, 130, team);
    this.emit({ type: 'goal', team, score: [...this.score] });
    if (this.demo) this.goalT = 1.6;
  }

  private endMatch(penScore?: [number, number]) {
    let decidedBy: DecidedBy = 'regular';
    if (penScore) {
      decidedBy = 'pens';
      this.winner = penScore[0] > penScore[1] ? 0 : 1;
    } else if (this.period === 'extra') {
      decidedBy = 'golden';
      this.winner = this.score[0] > this.score[1] ? 0 : 1;
    } else {
      this.winner = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    }
    this.phase = 'over';
    this.timeLeft = 0;
    this.pens = null;
    this.sfx.whistle(true);
    if (this.winner >= 0) setTimeout(() => this.sfx.cheer(), 400);
    this.emit({
      type: 'end',
      winner: this.winner,
      score: [...this.score],
      pens: penScore ?? null,
      decidedBy,
    });
  }

  // ---------- supplementari & rigori ----------
  private startExtraTime() {
    this.period = 'extra';
    this.timeLeft = EXTRA_TIME;
    this.lastWholeSec = -1;
    this.sfx.whistle(true);
    this.emit({ type: 'extratime' });
    this.kickoff();
  }

  private startPens() {
    this.period = 'pens';
    this.phase = 'pens';
    this.timeLeft = 0;
    this.pens = {
      score: [0, 0],
      taken: [0, 0],
      turn: 0,
      stage: 'intro',
      stageT: 2.0,
      aimX: 0,
      aimY: 0.5,
      aimT: 0,
      gloveX: 0,
      gloveY: 0.45,
      diveT: 0,
      diveDx: 0,
      diveDy: 1,
      kickT: 0,
      kickDur: 0.62,
      resolveDur: 1.2,
      toX: 0,
      toY: 0.5,
      outX: 0,
      outY: 0.5,
      aiDiveX: 0,
      aiDiveY: 0.5,
      outcomeDone: false,
      result: null,
      results: [[], []],
    };
    this.fpFx = [];
    this.fpTrail = [];
    this.players.forEach((p) => p.reset());
    this.goalkeepers.forEach((keeper) => keeper.reset());
    this.newBall();
    this.keys.clear();
    this.clearInputQueues();
    this.sfx.whistle(true);
    this.emit({ type: 'pensstart' });
  }

  private penSetupKick() {
    const ps = this.pens!;
    ps.aimX = 0;
    ps.aimY = 0.5;
    ps.aimT = 0;
    ps.gloveX = 0;
    ps.gloveY = 0.45;
    ps.diveT = 0;
    ps.diveDx = 0;
    ps.diveDy = 1;
    ps.kickT = 0;
    ps.toX = 0;
    ps.toY = 0.5;
    ps.outX = 0;
    ps.outY = 0.5;
    ps.aiDiveX = 0;
    ps.aiDiveY = 0.5;
    ps.result = null;
    ps.outcomeDone = false;
    this.fpTrail = [];
  }

  private penShooterIsHuman() {
    return this.playerCount === 2 || this.pens?.turn === 0;
  }

  private penKeeperIsHuman() {
    return this.playerCount === 2 || this.pens?.turn === 1;
  }

  // imprecisione della mira: cresce se temporeggi
  private penWobble(ps: PensState) {
    const mul = this.diff === 'easy' ? 0.85 : this.diff === 'hard' ? 1.15 : 1;
    return Math.min(0.26, 0.05 + ps.aimT * 0.024) * mul;
  }

  private penRelease() {
    const ps = this.pens!;
    if (ps.stage !== 'aim') return;
    ps.stage = 'kick';
    ps.kickT = 0;
    ps.outcomeDone = false;
    this.fpTrail = [];

    if (this.penShooterIsHuman()) {
      // tiro umano: mira con imprecisione crescente se si aspetta troppo
      const w = this.penWobble(ps);
      ps.toX = clamp(ps.aimX + (Math.random() * 2 - 1) * w, -1.25, 1.25);
      ps.toY = clamp(ps.aimY + (Math.random() * 2 - 1) * w * 0.8, 0.02, 1.15);
      ps.kickDur = 0.62;

      if (!this.penKeeperIsHuman()) {
        // Il portiere IA sceglie dove tuffarsi (a volte legge la mira).
        const readChance = this.diff === 'easy' ? 0.2 : this.diff === 'normal' ? 0.32 : 0.45;
        if (Math.random() < readChance) {
          ps.aiDiveX = clamp(ps.toX + (Math.random() - 0.5) * 0.34, -1, 1);
          ps.aiDiveY = clamp(ps.toY + (Math.random() - 0.5) * 0.3, 0.1, 0.95);
        } else {
          const side = Math.random() < 0.5 ? -1 : 1;
          ps.aiDiveX = side * (0.45 + Math.random() * 0.5);
          ps.aiDiveY = Math.random() < 0.55 ? 0.25 + Math.random() * 0.25 : 0.68 + Math.random() * 0.3;
        }
      }
    } else {
      // Rigore dell'IA: angolo segreto, ma la postura in rincorsa suggerisce il lato.
      const side = Math.random() < 0.5 ? -1 : 1;
      ps.toX = side * (0.35 + Math.random() * 0.6);
      ps.toY = 0.16 + Math.random() * 0.76;
      const errChance = this.diff === 'easy' ? 0.16 : this.diff === 'normal' ? 0.1 : 0.06;
      if (Math.random() < errChance) {
        if (Math.random() < 0.5) ps.toX = side * (1.08 + Math.random() * 0.15);
        else ps.toY = 1.04 + Math.random() * 0.1;
      }
      ps.kickDur = this.diff === 'easy' ? 0.74 : this.diff === 'normal' ? 0.64 : 0.56;
    }
    this.sfx.kick(1);
    this.shake = Math.min(this.shake + 4, 10);
  }

  private penEvaluate(): PenKickResult {
    const ps = this.pens!;
    // geometria del tiro: fuori o legno
    if (Math.abs(ps.toX) > 1.04 || ps.toY > 1.02) return 'miss';
    if (Math.abs(ps.toX) > 0.95 || ps.toY > 0.93) return 'post';
    if (!this.penKeeperIsHuman()) {
      // Portiere IA: posizione raggiunta all'impatto.
      const prog = clamp((ps.kickT - 0.03) / 0.4, 0, 1);
      const kx = ps.aiDiveX * prog;
      const ky = 0.45 + (ps.aiDiveY - 0.45) * prog;
      return dist(kx, ky, ps.toX, ps.toY) < 0.44 ? 'save' : 'goal';
    }
    // Il guantone del portiere umano.
    const r = ps.diveT > 0 ? 0.5 : 0.32;
    return dist(ps.gloveX, ps.gloveY, ps.toX, ps.toY) <= r ? 'save' : 'goal';
  }

  private penRegister(result: PenKickResult) {
    const ps = this.pens!;
    ps.result = result;
    ps.results[ps.turn].push(result === 'post' ? 'miss' : result);
    if (result === 'goal') ps.score[ps.turn]++;
    ps.taken[ps.turn]++;

    // traiettoria di uscita della palla dopo l'impatto
    if (result === 'save') {
      const keeperX = this.penKeeperIsHuman() ? ps.gloveX : ps.aiDiveX;
      const keeperY = this.penKeeperIsHuman() ? ps.gloveY : ps.aiDiveY;
      const dx = ps.toX - keeperX;
      const dy = ps.toY - keeperY;
      ps.outX = clamp(ps.toX + dx * 1.6 + (Math.random() - 0.5) * 0.4, -1.4, 1.4);
      ps.outY = clamp(ps.toY + dy * 1.2 + 0.25, 0.05, 1.2);
    } else if (result === 'post') {
      ps.outX = clamp(-ps.toX * 0.5, -0.8, 0.8);
      ps.outY = 0.3 + Math.random() * 0.35;
    } else if (result === 'miss') {
      ps.outX = clamp(ps.toX * 1.5, -1.6, 1.6);
      ps.outY = clamp(ps.toY * 1.3, 0, 1.5);
    } else {
      ps.outX = ps.toX * 0.78;
      ps.outY = clamp(ps.toY * 0.9, 0, 0.95);
    }
    ps.stage = 'resolve';
    ps.resolveDur = result === 'goal' ? 1.5 : 1.25;
    ps.stageT = ps.resolveDur;

    // effetti particellari nel punto d'impatto
    const attack = this.penShooterIsHuman();
    const L = attack ? this.fpLayoutA(this.vw, this.vh) : this.fpLayoutD(this.vw, this.vh);
    const pt = this.fpMap(L, ps.toX, ps.toY);
    if (result === 'goal') {
      this.sfx.goal();
      this.shake = 12;
      const scoringKit = this.teamKit(ps.turn);
      this.fpBurst(pt.x, pt.y, [scoringKit.primary, scoringKit.secondary, scoringKit.accent, '#fbbf24', '#ffffff'], 70);
    } else if (result === 'save') {
      this.sfx.block();
      this.shake = Math.min(this.shake + 6, 12);
      const goalkeeperKit = this.teamKit(1 - ps.turn);
      this.fpBurst(pt.x, pt.y, [goalkeeperKit.primary, goalkeeperKit.secondary, '#ffffff'], 30);
    } else if (result === 'post') {
      this.sfx.block();
      this.shake = Math.min(this.shake + 7, 12);
      this.fpBurst(pt.x, pt.y, ['#fbbf24', '#ffffff', '#fde68a'], 24);
    } else {
      this.sfx.whistle(false);
    }
    this.emit({ type: 'penResult', result, team: ps.turn });
  }

  private penDecided(): boolean {
    const ps = this.pens!;
    const [homeScore, awayScore] = ps.score;
    const [homeTaken, awayTaken] = ps.taken;
    if (homeTaken < PEN_ROUNDS || awayTaken < PEN_ROUNDS) {
      const homeLeft = Math.max(0, PEN_ROUNDS - homeTaken);
      const awayLeft = Math.max(0, PEN_ROUNDS - awayTaken);
      return homeScore > awayScore + awayLeft || awayScore > homeScore + homeLeft;
    }
    // morte subita: a parità di tiri effettuati, chi è avanti vince
    return homeTaken === awayTaken && homeScore !== awayScore;
  }

  private penAdvance() {
    const ps = this.pens!;
    if (this.penDecided()) {
      this.endMatch([...ps.score]);
      return;
    }
    ps.turn = 1 - ps.turn;
    ps.stage = 'intro';
    ps.stageT = 1.35;
    this.penSetupKick();
  }

  private updatePens(dt: number) {
    const ps = this.pens!;
    ps.stageT -= dt;
    this.updateFpFx(dt);

    const shooterTeam = ps.turn;
    const keeperTeam = 1 - shooterTeam;
    const humanShooter = this.penShooterIsHuman();
    const humanKeeper = this.penKeeperIsHuman();
    const neutralDir = { x: 0, y: 0, len: 0 };
    const shooterDir = humanShooter ? this.inputDir(shooterTeam) : neutralDir;
    const keeperDir = humanKeeper ? this.inputDir(keeperTeam) : neutralDir;

    // In locale si possono preparare insieme: uno mira e l'altro muove il guantone.
    if (humanKeeper && ps.stage !== 'resolve') {
      const gx = keeperDir.x;
      const gy = -keeperDir.y;
      if (this.shootQ[keeperTeam] && ps.diveT <= 0 && (Math.abs(gx) > 0.15 || Math.abs(gy) > 0.15)) {
        ps.diveT = 0.38;
        ps.diveDx = gx;
        ps.diveDy = gy;
        this.sfx.swap();
      }
      if (ps.diveT > 0) {
        ps.diveT -= dt;
        ps.gloveX += ps.diveDx * 3.2 * dt;
        ps.gloveY += ps.diveDy * 3.2 * dt;
      } else {
        ps.gloveX += gx * 1.9 * dt;
        ps.gloveY += gy * 1.9 * dt;
      }
      ps.gloveX = clamp(ps.gloveX, -1.1, 1.1);
      ps.gloveY = clamp(ps.gloveY, 0.05, 1.1);
    }

    if (ps.stage === 'intro') {
      if (ps.stageT <= 0) {
        ps.stage = 'aim';
        ps.aimT = 0;
        ps.stageT = humanShooter
          ? 8 // tempo massimo per mirare
          : (this.diff === 'hard' ? 1.0 : this.diff === 'normal' ? 1.3 : 1.6) + Math.random() * 0.4;
        if (humanShooter) this.sfx.whistle(false);
      }
      return;
    }

    if (ps.stage === 'aim') {
      if (humanShooter) {
        ps.aimT += dt;
        ps.aimX = clamp(ps.aimX + shooterDir.x * 1.5 * dt, -0.96, 0.96);
        ps.aimY = clamp(ps.aimY - shooterDir.y * 1.35 * dt, 0.05, 0.96);
        if (this.shootQ[shooterTeam]) {
          this.penRelease();
          return;
        }
      }
      if (ps.stageT <= 0) this.penRelease(); // scaduto il tempo / l'IA calcia
      return;
    }

    if (ps.stage === 'kick') {
      ps.kickT += dt;
      if (!ps.outcomeDone && ps.kickT >= ps.kickDur * 0.86) {
        ps.outcomeDone = true;
        this.penRegister(this.penEvaluate());
      }
      return;
    }

    if (ps.stage === 'resolve' && ps.stageT <= 0) this.penAdvance();
  }

  // ---------- update ----------
  private frame = (t: number) => {
    if (this.disposed) return;
    const dt = clamp((t - this.lastT) / 1000, 0, 0.033);
    this.lastT = t;
    this.pollGamepads();
    if (!this.paused) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 40 - this.shake * 4 * dt);
    this.goalFlash = Math.max(0, this.goalFlash - dt * 1.6);
    this.kickerGrace = Math.max(0, this.kickerGrace - dt);
    if (this.kickerGrace === 0) this.recentKicker = null;
    this.updateParticles(dt);
    this.players.forEach((p) => {
      p.kickCd = Math.max(0, p.kickCd - dt);
      p.tackleCd = Math.max(0, p.tackleCd - dt);
      p.tackleT = Math.max(0, p.tackleT - dt);
    });

    if (this.phase === 'countdown') {
      this.clearInputQueues();
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this.countdownShown && c > 0) {
        this.countdownShown = c;
        this.sfx.count(false);
      }
      if (this.countdown <= 0) {
        this.phase = 'play';
        this.sfx.whistle(false);
      }
      return;
    }

    if (this.phase === 'goal') {
      this.clearInputQueues();
      this.goalT -= dt;
      // palla che si assesta in rete
      this.ball.vx *= Math.exp(-4 * dt);
      this.ball.vy *= Math.exp(-4 * dt);
      this.ball.x = clamp(this.ball.x + this.ball.vx * dt, -GOAL_DEPTH + 7, W + GOAL_DEPTH - 7);
      this.ball.y = clamp(this.ball.y + this.ball.vy * dt, H / 2 - GOAL_HALF + 8, H / 2 + GOAL_HALF - 8);
      if (this.goalT <= 0) {
        if (this.demo) {
          this.players.forEach((p) => p.reset());
          this.goalkeepers.forEach((keeper) => keeper.reset());
          this.newBall();
          this.phase = 'demo';
        } else if (this.period === 'extra') {
          this.endMatch(); // golden goal: chi segna nei supplementari vince
        } else {
          this.kickoff();
        }
      }
      return;
    }

    if (this.phase === 'over') return;

    if (this.phase === 'pens') {
      this.updatePens(dt);
      this.clearInputQueues();
      return;
    }

    if (this.phase === 'play') {
      this.timeLeft -= dt;
      const whole = Math.ceil(this.timeLeft);
      if (whole !== this.lastWholeSec) {
        this.lastWholeSec = whole;
        if (whole <= 5 && whole > 0) this.sfx.count(false);
        if (whole <= 0) {
          if (this.period === 'regular' && this.score[0] === this.score[1] && !this.allowDraw) {
            this.startExtraTime();
          } else if (this.period === 'extra') {
            this.startPens();
          } else {
            this.endMatch();
          }
          return;
        }
      }
    }

    const isDemo = this.phase === 'demo';

    // La squadra umana segue sempre il compagno che ha appena conquistato il pallone.
    if (this.ballCarrier && (this.ballCarrier.team === 0 || this.playerCount === 2)) {
      this.controlledIdx[this.ballCarrier.team] = this.ballCarrier.idx;
    }

    // ---------- controlli e possesso ----------
    for (const p of this.players) {
      p.hasBall = this.ballCarrier === p;
      const hasHumanTeam = p.team === 0 || this.playerCount === 2;
      const isHuman = !isDemo && hasHumanTeam && p.idx === this.controlledIdx[p.team];
      if (isHuman && this.phase === 'play') {
        this.humanControl(p, dt);
      } else {
        const cfg = isDemo
          ? DEMO_CFG
          : this.playerCount === 2
            ? DIFFS[this.diff]
            : p.team === 1
              ? DIFFS[this.diff]
              : { ...DIFFS.normal, speed: 262 };
        this.aiControl(p, dt, cfg);
      }
      this.integratePlayer(p, dt);
    }

    this.separatePlayers();
    this.resolveTackles();
    this.updateGoalkeepers(dt);
    this.updateBall(dt, isDemo);
    if (!this.ballCarrier && (this.phase === 'play' || isDemo)) {
      for (const p of this.players) {
        this.contactBall(p, dt);
        if (this.ballCarrier) break;
      }
    }
    if (this.ballCarrier && (this.phase === 'play' || isDemo)) {
      this.ballCarrier.hasBall = true;
      this.ballCarrier.holdT += dt;
      this.placeBallAtCarrier(this.ballCarrier);
    }

    // trail palla
    const bs = Math.hypot(this.ball.vx, this.ball.vy);
    if (bs > 210) {
      this.trail.push({ x: this.ball.x, y: this.ball.y });
      if (this.trail.length > 14) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }

    // Elaborazione degli input: ogni persona gestisce una squadra e può cambiare giocatore.
    if (this.phase === 'play' && !isDemo) {
      const teams = this.playerCount === 2 ? [0, 1] : [0];
      for (const team of teams) {
        if (this.switchQ[team] && this.teamSize > 1 && this.ballCarrier?.team !== team) {
          this.controlledIdx[team] = (this.controlledIdx[team] + 1) % this.teamSize;
          this.sfx.swap();
        }
      }
      for (const team of teams) {
        const me = this.getControlled(team);
        if (this.tackleQ[team]) this.startTackle(me);
        if (this.ballCarrier !== me || me.kickCd > 0) continue;
        if (this.powerQ[team]) this.powerShot(me);
        else if (this.curveQ[team]) this.curveShot(me);
        else if (this.crossQ[team]) this.cross(me, 0.04, true);
        else if (this.shootQ[team]) this.shoot(me, 0.05);
        else if (this.passQ[team]) this.pass(me, 0.05, true);
      }
    }
    this.clearInputQueues();
  }

  private getControlled(team = 0) {
    return this.players[team * this.teamSize + this.controlledIdx[team]];
  }

  private inputDir(team = 0) {
    let x = 0;
    let y = 0;
    if (team === 0) {
      if (this.keys.has('KeyW')) y -= 1;
      if (this.keys.has('KeyS')) y += 1;
      if (this.keys.has('KeyA')) x -= 1;
      if (this.keys.has('KeyD')) x += 1;
      if (this.playerCount === 1) {
        if (this.keys.has('ArrowUp')) y -= 1;
        if (this.keys.has('ArrowDown')) y += 1;
        if (this.keys.has('ArrowLeft')) x -= 1;
        if (this.keys.has('ArrowRight')) x += 1;
      }
    } else if (this.playerCount === 2) {
      if (this.keys.has('ArrowUp')) y -= 1;
      if (this.keys.has('ArrowDown')) y += 1;
      if (this.keys.has('ArrowLeft')) x -= 1;
      if (this.keys.has('ArrowRight')) x += 1;
    }
    const slot = team as 0 | 1;
    const stick = this.sticks[slot];
    if (stick.active && (Math.abs(stick.x) > 0.12 || Math.abs(stick.y) > 0.12)) {
      x = stick.x;
      y = stick.y;
    } else {
      const gamepad = this.gamepadAxes[slot];
      if (Math.abs(gamepad.x) > 0.12 || Math.abs(gamepad.y) > 0.12) {
        x = gamepad.x;
        y = gamepad.y;
      }
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y, len: Math.min(1, l) };
  }

  private humanControl(p: Player, dt: number) {
    const dir = this.inputDir(p.team);
    const sprint = this.gamepadSprint[p.team as 0 | 1] || (this.playerCount === 2
      ? this.keys.has(p.team === 0 ? 'ShiftLeft' : 'ShiftRight')
      : this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const maxS = (sprint ? 352 : 296) * (dir.len || 0);
    const dvx = dir.x * maxS - p.vx;
    const dvy = dir.y * maxS - p.vy;
    const accel = 1900 * dt;
    const dl = Math.hypot(dvx, dvy);
    if (dl > 0) {
      const k = Math.min(1, accel / dl);
      p.vx += dvx * k;
      p.vy += dvy * k;
    }
    if (dir.len > 0.15) {
      p.faceX = dir.x / (dir.len || 1);
      p.faceY = dir.y / (dir.len || 1);
    } else {
      const d = dist(p.x, p.y, this.ball.x, this.ball.y);
      if (d > 1) {
        p.faceX = (this.ball.x - p.x) / d;
        p.faceY = (this.ball.y - p.y) / d;
      }
    }
  }

  private ownGoalX(team: number) {
    return team === 0 ? 0 : W;
  }
  private oppGoalX(team: number) {
    return team === 0 ? W : 0;
  }

  private aiControl(p: Player, dt: number, cfg: DiffCfg) {
    const ball = this.ball;
    const ownX = this.ownGoalX(p.team);
    const oppX = this.oppGoalX(p.team);
    const opps = this.players.filter((q) => q.team !== p.team);
    const form = formationFor(p.team, p.idx, this.teamSize);
    const carrier = this.ballCarrier;
    const meHas = carrier === p;
    let tx = p.tx;
    let ty = p.ty;
    let maxS = cfg.speed;

    // Il giocatore più vicino pressa il portatore o attacca il pallone libero.
    const field = this.players.filter((q) => q.team === p.team);
    const targetX = carrier?.x ?? ball.x;
    const targetY = carrier?.y ?? ball.y;
    const chaser = [...field].sort(
      (a, b) => dist(a.x, a.y, targetX, targetY) - dist(b.x, b.y, targetX, targetY),
    )[0];

    if (meHas) {
      const dGoal = dist(p.x, p.y, oppX, H / 2);
      const pressure = Math.min(...opps.map((o) => dist(o.x, o.y, p.x, p.y)));
      const dOwn = dist(p.x, p.y, ownX, H / 2);

      const aiActionHold = Math.min(cfg.minHold, 0.42);
      if (p.kickCd <= 0 && p.holdT > aiActionHold) {
        const passDistance = Math.max(250, cfg.shootRange * 0.72);
        if (this.teamSize > 1 && Math.abs(p.y - H / 2) > 145 && dGoal < 700 && pressure > 65 && p.holdT > 0.35) {
          this.aiCross(p, cfg);
        } else if (this.teamSize > 1 && dGoal > passDistance) {
          // Passare è la prima scelta anche nella propria metà: non spazzare via palloni innocui.
          this.aiPass(p, cfg);
        } else if (dOwn < 240) {
          if (this.teamSize === 1 && (pressure < 140 || p.holdT > 1.3)) this.clear(p);
        } else if (dGoal < cfg.shootRange) {
          if (Math.abs(p.y - H / 2) > 115 && pressure > 90) this.aiCurveShot(p);
          else this.aiShoot(p, cfg);
        } else if (pressure < 130 || p.holdT > 0.9) {
          this.aiPass(p, cfg);
        }
      }

      const gy = H / 2 + Math.sin(this.time * 1.3 + p.idx * 2.1) * 90;
      const dx = oppX - p.x;
      const dy = gy - p.y;
      const dl = Math.hypot(dx, dy) || 1;
      let sideX = 0;
      let sideY = 0;
      if (pressure < 130) {
        const op = opps.reduce((a, b) =>
          dist(a.x, a.y, p.x, p.y) < dist(b.x, b.y, p.x, p.y) ? a : b,
        );
        sideX = -(op.y - p.y) * 0.5;
        sideY = (op.x - p.x) * 0.5;
      }
      const advance = 190 + clamp((520 - dGoal) * 0.14, 0, 110);
      tx = p.x + (dx / dl) * advance + sideX;
      ty = p.y + (dy / dl) * 105 + sideY;
      maxS = cfg.speed * 1.24;
    } else if (carrier && carrier.team === p.team) {
      const direction = p.team === 0 ? 1 : -1;
      const lane = Math.sign(form.y - H / 2) || (p.idx % 2 === 0 ? -1 : 1);
      const forwardRun = p.idx % 2 === 0 ? 220 : 290;
      const supportX = carrier.x + direction * forwardRun;
      const supportY = carrier.y + lane * (p.idx % 2 === 0 ? 145 : 205);
      tx = clamp(supportX, 70, W - 70);
      ty = clamp(supportY, 70, H - 70);
      maxS = cfg.speed * 1.3;
    } else if (carrier && carrier.team !== p.team) {
      if (p === chaser) {
        const lead = 0.12;
        tx = carrier.x + carrier.vx * lead;
        ty = carrier.y + carrier.vy * lead;
        maxS = cfg.speed * 1.12;
        if (dist(p.x, p.y, carrier.x, carrier.y) < TACKLE_RANGE - 8 && p.tackleCd <= 0) {
          this.startTackle(p, true);
        }
      } else {
        const dx = carrier.x - ownX;
        const dy = carrier.y - H / 2;
        const wob = Math.sign(form.y - H / 2) * 115;
        tx = ownX + dx * 0.38;
        ty = H / 2 + dy * 0.5 + wob * 0.42;
        tx = p.team === 0 ? clamp(tx, 90, W * 0.62) : clamp(tx, W * 0.38, W - 90);
        ty = clamp(ty, 70, H - 70);
      }
    } else if (!carrier && p === chaser) {
      tx = ball.x + ball.vx * 0.18;
      ty = ball.y + ball.vy * 0.18;
      maxS = cfg.speed * 1.06;
    } else if (!carrier && ball.lastTouch !== p.team) {
      const dx = ball.x - ownX;
      const dy = ball.y - H / 2;
      const wob = Math.sign(form.y - H / 2) * 120;
      tx = ownX + dx * 0.38;
      ty = H / 2 + dy * 0.55 + wob * 0.4;
      tx = p.team === 0 ? clamp(tx, 90, W * 0.62) : clamp(tx, W * 0.38, W - 90);
      ty = clamp(ty, 70, H - 70);
    } else {
      const dir = p.team === 0 ? 1 : -1;
      const spread = Math.sign(form.y - H / 2);
      const adv = clamp(p.team === 0 ? targetX - form.x : form.x - targetX, 0, 260);
      tx = form.x + dir * (60 + adv * 0.5);
      ty = clamp(targetY + spread * 190, 90, H - 90);
      const teammateCarrier = carrier?.team === p.team && carrier !== p ? carrier : null;
      if (teammateCarrier && dist(tx, ty, teammateCarrier.x, teammateCarrier.y) < 150) {
        const supportSide = spread || (teammateCarrier.y < H / 2 ? 1 : -1);
        ty = teammateCarrier.y + supportSide * 220;
      }
      ty = clamp(ty, 80, H - 80);
    }

    p.tx = tx;
    p.ty = ty;

    // movimento
    const dxt = tx - p.x;
    const dyt = ty - p.y;
    const dtg = Math.hypot(dxt, dyt);
    let dvx = 0;
    let dvy = 0;
    if (dtg > 6) {
      const want = maxS * clamp(dtg / 90, 0.35, 1);
      dvx = (dxt / dtg) * want - p.vx;
      dvy = (dyt / dtg) * want - p.vy;
      p.faceX = dxt / dtg;
      p.faceY = dyt / dtg;
    } else {
      dvx = -p.vx;
      dvy = -p.vy;
    }
    const accel = 1700 * dt;
    const dl = Math.hypot(dvx, dvy);
    if (dl > 0) {
      const k = Math.min(1, accel / dl);
      p.vx += dvx * k;
      p.vy += dvy * k;
    }
  }

  private updateGoalkeepers(dt: number) {
    if (dt <= 0) return;

    for (const keeper of this.goalkeepers) {
      const ballComing = keeper.team === 0 ? this.ball.vx < -80 : this.ball.vx > 80;
      const crossingTime = ballComing ? (keeper.x - this.ball.x) / this.ball.vx : -1;
      let targetY = H / 2 + (this.ball.y - H / 2) * 0.18;

      if (crossingTime >= 0 && crossingTime < 1.1) {
        // Anticipa il tiro solo quando arriva verso la porta, lasciando un breve tempo di reazione.
        const leadTime = Math.max(0, crossingTime - 0.1);
        targetY = this.ball.y + this.ball.vy * leadTime;
      }

      targetY = clamp(targetY, H / 2 - GOAL_HALF + GK_R * 0.55, H / 2 + GOAL_HALF - GK_R * 0.55);
      const step = clamp(targetY - keeper.y, -GK_SPEED * dt, GK_SPEED * dt);
      keeper.y += step;
      keeper.vy = step / dt;
    }
  }

  private integratePlayer(p: Player, dt: number) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-0.4 * dt);
    p.vy *= Math.exp(-0.4 * dt);
    p.x = clamp(p.x, P_R, W - P_R);
    p.y = clamp(p.y, P_R, H - P_R);
  }

  private separatePlayers() {
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = P_R * 2 + 2;
        if (d < min && d > 0.01) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          // piccolo scambio di momento
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const imp = (rvx * nx + rvy * ny) * 0.28;
          a.vx += nx * imp;
          a.vy += ny * imp;
          b.vx -= nx * imp;
          b.vy -= ny * imp;
        }
      }
    }
    for (const p of this.players) {
      p.x = clamp(p.x, P_R, W - P_R);
      p.y = clamp(p.y, P_R, H - P_R);
    }
  }

  private contactBall(p: Player, _dt: number) {
    if (this.ballCarrier || this.ball.z > 24 || this.curveFlight) return;
    if (p === this.recentKicker && this.kickerGrace > 0) return;
    const dx = this.ball.x - p.x;
    const dy = this.ball.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < P_R + B_R + 7) {
      // Un contatto controllabile diventa possesso: il pallone non rimbalza più via.
      this.claimBall(p);
      this.sfx.pass();
    }
  }

  private contactGoalkeeper(keeper: FixedGoalkeeper, isDemo: boolean) {
    const ball = this.ball;
    if (ball.z > 26) return;
    const dx = ball.x - keeper.x;
    const dy = ball.y - keeper.y;
    const d = Math.hypot(dx, dy);
    const min = GK_R + B_R;
    if (d >= min) return;

    if (this.ballCarrier) this.releaseBall(this.ballCarrier);

    const faceX = keeper.team === 0 ? 1 : -1;
    const incoming = keeper.team === 0 ? ball.vx < -20 : ball.vx > 20;
    const impact = clamp(dy / GK_R, -1, 1);
    let nx = d > 0.01 ? dx / d : faceX;
    let ny = d > 0.01 ? dy / d : 0;

    if (incoming) {
      const cornerDeflection = !isDemo && this.teamSize > 1 && Math.abs(impact) > 0.68 && Math.random() < 0.48;
      if (cornerDeflection) {
        // Una parata laterale può deviare il pallone oltre la linea di fondo.
        nx = -faceX;
        ny = Math.sign(impact || 1);
        ball.x = keeper.x - faceX * (min + 0.5);
        ball.y = keeper.y + dy;
        ball.vx = -faceX * Math.max(190, Math.abs(ball.vx) * 0.2);
        ball.vy = Math.sign(impact || 1) * Math.max(520, Math.abs(ball.vy) * 0.72);
      } else {
        // La parata ordinaria respinge il pallone verso il campo.
        nx = faceX;
        ny = impact * 0.45;
        ball.x = keeper.x + faceX * (min + 0.5);
        ball.y = keeper.y + dy;
        ball.vx = faceX * Math.max(190, Math.abs(ball.vx) * 0.58);
        ball.vy = ball.vy * 0.38 + keeper.vy * 0.35 + impact * 180;
      }
    } else {
      ball.x = keeper.x + nx * (min + 0.5);
      ball.y = keeper.y + ny * (min + 0.5);
      const relativeVx = ball.vx;
      const relativeVy = ball.vy - keeper.vy;
      const approach = relativeVx * nx + relativeVy * ny;
      if (approach < 0) {
        ball.vx -= nx * approach * 1.65;
        ball.vy = keeper.vy + relativeVy - ny * approach * 1.65;
      }
    }

    ball.z = 0;
    ball.vz = 0;
    ball.curve = 0;
    ball.lastTouch = keeper.team;
    ball.lastTouchWasKeeper = true;
    if (!isDemo) this.sfx.block();
    this.shake = Math.min(this.shake + 2.5, 10);
    this.spawnKick(ball.x, ball.y, nx, ny, this.teamKit(keeper.team).primary);
  }

  private awardCorner(team: number, leftEnd: boolean, y: number) {
    const top = y < H / 2;
    const taker = this.players
      .filter((p) => p.team === team)
      .reduce((best, p) => {
        const cornerX = leftEnd ? 0 : W;
        const cornerY = top ? 0 : H;
        return dist(p.x, p.y, cornerX, cornerY) < dist(best.x, best.y, cornerX, cornerY) ? p : best;
      });

    this.releaseBall();
    taker.x = team === 0 ? W - 48 : 48;
    taker.y = top ? 48 : H - 48;
    taker.vx = 0;
    taker.vy = 0;
    taker.faceX = team === 0 ? 1 : -1;
    taker.faceY = top ? 0.5 : -0.5;
    this.controlledIdx[team] = taker.idx;
    this.claimBall(taker);
    this.ball.lastTouch = team;
    this.ball.lastTouchWasKeeper = false;
    this.emit({ type: 'corner', team });
  }

  private updateCurveFlight(dt: number) {
    const flight = this.curveFlight;
    if (!flight) return;
    flight.elapsed = Math.min(flight.duration, flight.elapsed + dt);
    const progress = clamp(flight.elapsed / flight.duration, 0, 1);
    const previousX = this.ball.x;
    const previousY = this.ball.y;
    const sweep = Math.sin(Math.PI * progress);
    this.ball.x = flight.startX + (flight.targetX - flight.startX) * progress;
    this.ball.y = clamp(
      flight.startY + (flight.targetY - flight.startY) * progress + flight.arc * sweep,
      B_R,
      H - B_R,
    );
    this.ball.z = sweep * 7;
    this.ball.vx = dt > 0 ? (this.ball.x - previousX) / dt : 0;
    this.ball.vy = dt > 0 ? (this.ball.y - previousY) / dt : 0;
    this.ball.vz = 0;

    if (progress < 1) return;
    this.curveFlight = null;
    this.ball.x = flight.targetX;
    this.ball.y = flight.targetY;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    if (flight.scores) {
      this.goal(flight.team);
      return;
    }

    // Il 5% restante è una parata reale; nei formati maggiori diventa corner per chi ha tirato.
    const keeper = this.goalkeepers[1 - flight.team];
    const faceX = keeper.team === 0 ? 1 : -1;
    const impactSide = Math.sign(flight.targetY - H / 2) || 1;
    this.ball.x = keeper.x + faceX * (GK_R + B_R - 9);
    this.ball.y = clamp(keeper.y + impactSide * GK_R * 0.78, B_R, H - B_R);
    this.ball.vx = -faceX * 820;
    this.ball.vy = impactSide * 180;
    this.ball.lastTouch = flight.team;
    this.ball.lastTouchWasKeeper = false;
    this.contactGoalkeeper(keeper, false);
    if (this.teamSize > 1) this.awardCorner(flight.team, flight.team === 1, this.ball.y);
  }

  private updateBall(dt: number, isDemo: boolean) {
    if (this.curveFlight && !isDemo) {
      this.updateCurveFlight(dt);
      return;
    }
    const ball = this.ball;
    const carriedAtStart = this.ballCarrier !== null;
    if (this.ballCarrier) {
      this.placeBallAtCarrier(this.ballCarrier);
    } else {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (ball.curve && speed > 1) {
        const nx = -ball.vy / speed;
        const ny = ball.vx / speed;
        ball.vx += nx * ball.curve * dt;
        ball.vy += ny * ball.curve * dt;
        ball.curve *= Math.exp(-3.6 * dt);
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.z > 0 || ball.vz > 0) {
        ball.z += ball.vz * dt;
        ball.vz -= BALL_GRAVITY * dt;
        if (ball.z <= 0) {
          ball.z = 0;
          ball.vz = 0;
        }
      }
      const drag = Math.exp(-(ball.z > 0 || ball.vz > 0 ? 0.08 : 0.5) * dt);
      ball.vx *= drag;
      ball.vy *= drag;
      if (Math.hypot(ball.vx, ball.vy) < 6) {
        ball.vx = 0;
        ball.vy = 0;
      }

      // pareti laterali
      if (ball.y < B_R) {
        ball.y = B_R;
        ball.vy = Math.abs(ball.vy) * 0.62;
      } else if (ball.y > H - B_R) {
        ball.y = H - B_R;
        ball.vy = -Math.abs(ball.vy) * 0.62;
      }
    }

    for (const keeper of this.goalkeepers) this.contactGoalkeeper(keeper, isDemo);
    if (this.ballCarrier) {
      this.placeBallAtCarrier(this.ballCarrier);
      return;
    }
    // Se il portiere ha fermato un portatore, la respinta parte dal punto del contatto.
    if (carriedAtStart) {
      ball.z = 0;
      ball.vz = 0;
    }

    const inMouth = Math.abs(ball.y - H / 2) < GOAL_HALF - 4;

    // Gol o calcio d'angolo dopo una deviazione del portiere.
    if (inMouth) {
      if (ball.x < 0) {
        this.goal(1);
        return;
      }
      if (ball.x > W) {
        this.goal(0);
        return;
      }
    } else if (ball.x < 0 || ball.x > W) {
      const defendingTeam = ball.x < 0 ? 0 : 1;
      if (
        !isDemo &&
        this.teamSize > 1 &&
        ball.lastTouchWasKeeper &&
        ball.lastTouch === defendingTeam
      ) {
        this.awardCorner(1 - defendingTeam, ball.x < 0, ball.y);
        return;
      }
      if (ball.x < B_R) {
        ball.x = B_R;
        ball.vx = Math.abs(ball.vx) * 0.62;
      } else {
        ball.x = W - B_R;
        ball.vx = -Math.abs(ball.vx) * 0.62;
      }
    }

    // dentro la porta (prima del gol vero e proprio)
    if (Math.abs(ball.y - H / 2) < GOAL_HALF) {
      if (ball.x < -GOAL_DEPTH + B_R) {
        ball.x = -GOAL_DEPTH + B_R;
        ball.vx = Math.abs(ball.vx) * 0.5;
      } else if (ball.x > W + GOAL_DEPTH - B_R) {
        ball.x = W + GOAL_DEPTH - B_R;
        ball.vx = -Math.abs(ball.vx) * 0.5;
      }
    }

    // pali
    const posts = [
      { x: 0, y: H / 2 - GOAL_HALF },
      { x: 0, y: H / 2 + GOAL_HALF },
      { x: W, y: H / 2 - GOAL_HALF },
      { x: W, y: H / 2 + GOAL_HALF },
    ];
    for (const post of posts) {
      const dx = ball.x - post.x;
      const dy = ball.y - post.y;
      const d = Math.hypot(dx, dy);
      if (d < B_R + 5 && d > 0.01) {
        const nx = dx / d;
        const ny = dy / d;
        ball.x = post.x + nx * (B_R + 5.5);
        ball.y = post.y + ny * (B_R + 5.5);
        const vdot = ball.vx * nx + ball.vy * ny;
        if (vdot < 0) {
          ball.vx -= 1.75 * vdot * nx;
          ball.vy -= 1.75 * vdot * ny;
          if (!isDemo) this.sfx.block();
          this.shake = Math.min(this.shake + 2, 10);
        }
      }
    }
  }

  // ---------- calci e passaggi ----------
  private shootAim(p: Player, spread: number) {
    const dir = this.inputDir(p.team);
    const aimY = H / 2 + (dir.len > 0.2 ? dir.y * 80 : (Math.random() - 0.5) * 130) + (Math.random() - 0.5) * spread * 300;
    const dx = this.oppGoalX(p.team) - this.ball.x;
    const dy = aimY - this.ball.y;
    const dl = Math.hypot(dx, dy) || 1;
    return { x: dx / dl, y: dy / dl };
  }

  private shoot(p: Player, errRange: number) {
    if (this.ballCarrier !== p) return;
    const dir = this.shootAim(p, errRange);
    const power = 820 + Math.random() * 60;
    this.releaseBall(p);
    this.ball.vx = dir.x * power + p.vx * 0.25;
    this.ball.vy = dir.y * power + p.vy * 0.25;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    p.kickCd = 0.3;
    this.shots[p.team]++;
    this.shake = Math.min(this.shake + 5, 14);
    this.sfx.kick(1);
    this.spawnKick(this.ball.x, this.ball.y, dir.x, dir.y, this.teamKit(p.team).primary);
  }

  private powerShot(p: Player) {
    if (this.ballCarrier !== p) return;
    const dir = this.shootAim(p, 0.015);
    const power = 1460;
    this.releaseBall(p);
    this.ball.vx = dir.x * power + p.vx * 0.35;
    this.ball.vy = dir.y * power + p.vy * 0.35;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    p.kickCd = 0.42;
    this.shots[p.team]++;
    this.shake = Math.min(this.shake + 8, 16);
    this.sfx.kick(1.65);
    this.spawnKick(this.ball.x, this.ball.y, dir.x, dir.y, this.teamKit(p.team).accent);
  }

  private curveShot(p: Player) {
    if (this.ballCarrier !== p) return;
    const steer = this.inputDir(p.team);
    const defaultOffset = p.y < H / 2 ? GOAL_HALF * 0.52 : -GOAL_HALF * 0.52;
    const targetOffset = steer.len > 0.2
      ? clamp(steer.y, -1, 1) * (GOAL_HALF - B_R - 10)
      : defaultOffset;
    const scores = Math.random() < 0.95;
    const direction = p.team === 0 ? 1 : -1;
    const goalX = this.oppGoalX(p.team);
    const keeper = this.goalkeepers[1 - p.team];
    const keeperFaceX = keeper.team === 0 ? 1 : -1;
    const targetY = scores
      ? H / 2 + targetOffset
      : clamp(keeper.y + Math.sign(targetOffset || 1) * GK_R * 0.78, B_R, H - B_R);
    const targetX = scores
      ? goalX + direction * (GOAL_DEPTH + 6)
      : keeper.x + keeperFaceX * (GK_R + B_R - 9);
    const startX = this.ball.x;
    const startY = this.ball.y;
    const duration = clamp(Math.abs(targetX - startX) / 1460, 0.38, 1.25);
    const arc = (p.y < H / 2 ? 1 : -1) * 72;

    this.releaseBall(p);
    this.ball.vx = (targetX - startX) / duration;
    this.ball.vy = (targetY - startY) / duration;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    this.curveFlight = { team: p.team, startX, startY, targetX, targetY, duration, elapsed: 0, arc, scores };
    p.kickCd = 0.38;
    this.shots[p.team]++;
    this.shake = Math.min(this.shake + 7, 16);
    this.sfx.kick(1.5);
    this.spawnKick(this.ball.x, this.ball.y, direction, 0, this.teamKit(p.team).accent);
  }

  private pass(p: Player, errRange: number, humanSwitch: boolean) {
    if (this.ballCarrier !== p) return;
    const mates = this.players.filter((q) => q.team === p.team && q !== p);
    if (mates.length === 0) {
      this.clear(p);
      return;
    }
    // Il passaggio trova da solo il compagno più vicino: non serve mirare con lo stick.
    const best = mates.reduce((closest, candidate) => {
      const candidateDistance = (candidate.x - p.x) ** 2 + (candidate.y - p.y) ** 2;
      const closestDistance = (closest.x - p.x) ** 2 + (closest.y - p.y) ** 2;
      return candidateDistance < closestDistance ? candidate : closest;
    });
    const d = dist(p.x, p.y, best.x, best.y);
    const power = clamp(420 + d * 0.66, 430, 760);
    const lead = humanSwitch ? 0 : (d / power) * 0.72;
    const noiseX = humanSwitch ? 0 : (Math.random() - 0.5) * errRange * 220;
    const noiseY = humanSwitch ? 0 : (Math.random() - 0.5) * errRange * 220;
    const tx = best.x + best.vx * lead + noiseX;
    const ty = best.y + best.vy * lead + noiseY;
    const fromPlayerX = tx - p.x;
    const fromPlayerY = ty - p.y;
    const playerToTarget = Math.hypot(fromPlayerX, fromPlayerY) || 1;
    const dirX = fromPlayerX / playerToTarget;
    const dirY = fromPlayerY / playerToTarget;

    this.releaseBall(p);
    // Avvia il pallone dal lato del passaggio, mai attraverso il corpo del calciatore.
    const launchOffset = P_R + B_R + 14;
    this.ball.x = clamp(p.x + dirX * launchOffset, B_R, W - B_R);
    this.ball.y = clamp(p.y + dirY * launchOffset, B_R, H - B_R);
    const dx = tx - this.ball.x;
    const dy = ty - this.ball.y;
    const dl = Math.hypot(dx, dy) || 1;
    this.ball.vx = (dx / dl) * power;
    this.ball.vy = (dy / dl) * power;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    this.recentKicker = p;
    this.kickerGrace = 0.14;
    p.kickCd = 0.25;
    this.sfx.pass();
    this.spawnKick(this.ball.x, this.ball.y, dx / dl, dy / dl, '#ffffff');
    if (humanSwitch) {
      this.controlledIdx[p.team] = best.idx;
      this.sfx.swap();
    }
  }

  private cross(p: Player, errRange: number, humanSwitch: boolean) {
    if (this.ballCarrier !== p) return;
    const dir = this.inputDir(p.team);
    const towardGoal = p.team === 0 ? 1 : -1;
    const mates = this.players.filter((q) => q.team === p.team && q !== p);
    const boxX = this.oppGoalX(p.team) - towardGoal * 145;
    let targetY = dir.len > 0.2
      ? H / 2 + dir.y * 185
      : p.y < H / 2
        ? H / 2 + 95
        : H / 2 - 95;
    let targetX = boxX;

    if (mates.length > 0) {
      const receiver = mates.reduce((best, mate) => {
        const boxDistance = dist(mate.x, mate.y, boxX, targetY);
        const openness = Math.min(...this.players.filter((q) => q.team !== p.team).map((q) => dist(q.x, q.y, mate.x, mate.y)));
        const bestDistance = dist(best.x, best.y, boxX, targetY);
        const bestOpen = Math.min(...this.players.filter((q) => q.team !== p.team).map((q) => dist(q.x, q.y, best.x, best.y)));
        return boxDistance - openness * 0.16 < bestDistance - bestOpen * 0.16 ? mate : best;
      });
      targetX = clamp(receiver.x + receiver.vx * 0.2, p.team === 0 ? W - 300 : 160, p.team === 0 ? W - 80 : 300);
      targetY = clamp(receiver.y + receiver.vy * 0.2, H / 2 - 210, H / 2 + 210);
      if (dir.len > 0.2) targetY = clamp(targetY + dir.y * 45, H / 2 - 220, H / 2 + 220);
      if (humanSwitch) this.controlledIdx[p.team] = receiver.idx;
    }

    targetY += (Math.random() - 0.5) * errRange * 180;
    const dx = targetX - this.ball.x;
    const dy = targetY - this.ball.y;
    const d = Math.hypot(dx, dy) || 1;
    const flight = clamp(d / 700, 0.58, 1.05);
    this.releaseBall(p);
    this.ball.vx = dx / flight;
    this.ball.vy = dy / flight;
    this.ball.z = 0;
    this.ball.vz = BALL_GRAVITY * flight * 0.5;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    p.kickCd = 0.28;
    this.sfx.kick(1.15);
    this.spawnKick(this.ball.x, this.ball.y, dx / d, dy / d, '#d8f4ff');
    if (humanSwitch && mates.length > 0) this.sfx.swap();
  }

  private aiShoot(p: Player, cfg: DiffCfg) {
    this.shoot.call(this, p, cfg.shootErr);
  }

  private aiPass(p: Player, cfg: DiffCfg) {
    this.pass.call(this, p, Math.min(cfg.passErr, 0.06), false);
  }

  private aiCross(p: Player, cfg: DiffCfg) {
    this.cross.call(this, p, cfg.passErr * 0.7, false);
  }

  private aiCurveShot(p: Player) {
    this.curveShot.call(this, p);
  }

  private clear(p: Player) {
    const oppX = this.oppGoalX(p.team);
    const side = Math.random() > 0.5 ? 0.22 : 0.78;
    const dx = oppX - p.x;
    const dy = H * side - p.y;
    const dl = Math.hypot(dx, dy) || 1;
    this.releaseBall(p);
    this.ball.vx = (dx / dl) * 680;
    this.ball.vy = (dy / dl) * 680;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.curve = 0;
    this.ball.lastTouch = p.team;
    this.ball.lastTouchWasKeeper = false;
    p.kickCd = 0.35;
    this.sfx.kick(0.8);
    this.spawnKick(this.ball.x, this.ball.y, dx / dl, dy / dl, this.teamKit(p.team).primary);
  }

  // ---------- particelle ----------
  private spawnKick(x: number, y: number, dx: number, dy: number, color: string) {
    for (let i = 0; i < 10; i++) {
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.1;
      const s = 120 + Math.random() * 240;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.28 + Math.random() * 0.18,
        maxLife: 0.45,
        size: 2 + Math.random() * 2.5,
        color,
        drag: 4,
        grav: 0,
      });
    }
  }

  private spawnConfetti(x: number, y: number, dirX: number, n: number, team: number) {
    const kit = this.teamKit(team);
    const colors = [kit.primary, kit.secondary, kit.accent, '#fbbf24', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 420;
      this.particles.push({
        x: x + dirX * 6,
        y: y + (Math.random() - 0.5) * GOAL_HALF * 1.6,
        vx: Math.cos(a) * s * 0.6 + dirX * (60 + Math.random() * 180),
        vy: Math.sin(a) * s * 0.8 - 120,
        life: 1.1 + Math.random() * 1.1,
        maxLife: 2.2,
        size: 2.5 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        drag: 1.4,
        grav: 340,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // ---------- rendering ----------
  // ---------- rigori in prima persona ----------
  private fpLayoutA(vw: number, vh: number): FPLayout {
    const horizon = vh * 0.4;
    const gw = Math.min(vw * 0.64, 660);
    const gh = gw / 3.05;
    const cx = vw / 2;
    const bottom = horizon + gh * 0.24;
    return { horizon, gw, gh, cx, top: bottom - gh, bottom };
  }

  private fpLayoutD(vw: number, vh: number): FPLayout {
    const horizon = vh * 0.26;
    const gw = Math.min(vw * 0.88, 940);
    const gh = vh * 0.62;
    const cx = vw / 2;
    const bottom = vh * 0.94;
    return { horizon, gw, gh, cx, top: bottom - gh, bottom };
  }

  private fpMap(L: FPLayout, gx: number, gy: number) {
    return { x: L.cx + (gx * L.gw) / 2, y: L.bottom - gy * L.gh };
  }

  private fpBall(ps: PensState, vw: number, vh: number) {
    const attack = this.penShooterIsHuman();
    const L = attack ? this.fpLayoutA(vw, vh) : this.fpLayoutD(vw, vh);
    const end = this.fpMap(L, ps.toX, ps.toY);
    const start = attack
      ? { x: L.cx, y: vh * 0.86, r: Math.min(30, L.gw * 0.05) }
      : { x: L.cx + 10, y: vh * 0.405, r: Math.max(6, vh * 0.013) };
    if (ps.stage === 'intro' || ps.stage === 'aim') {
      return { x: start.x, y: start.y, r: start.r, alpha: 1, inNet: false };
    }
    const t = clamp(ps.kickT / ps.kickDur, 0, 1);
    const far = attack ? Math.max(8, L.gh * 0.085) : Math.min(54, L.gh * 0.16);
    const bezier = (a: number, b: number, c: number, e: number) =>
      (1 - e) * (1 - e) * a + 2 * (1 - e) * e * b + e * e * c;
    const cxz = (start.x + end.x) / 2;
    const cyz = Math.min(start.y, end.y) - vh * (attack ? 0.05 : 0.03);
    const outPt = this.fpMap(L, ps.outX, ps.outY);
    const goalIn = ps.result === 'goal';

    if (ps.stage === 'resolve') {
      const t2 = clamp((1 - ps.stageT / ps.resolveDur) * 1.35, 0, 1);
      const inT = clamp(t + t2, 0, 1);
      const outT = clamp(t2 - (1 - t), 0, 1);
      if (outT <= 0) {
        const bx = bezier(start.x, cxz, end.x, inT);
        const by = bezier(start.y, cyz, end.y, inT);
        const rr = attack ? start.r + (far - start.r) * inT : start.r + (far - start.r) * Math.pow(inT, 0.9);
        return { x: bx, y: by, r: rr, alpha: 1, inNet: false };
      }
      const c2x = (end.x + outPt.x) / 2;
      const c2y = Math.min(end.y, outPt.y) - vh * 0.045;
      const bx = bezier(end.x, c2x, outPt.x, outT);
      const by = bezier(end.y, c2y, outPt.y, outT);
      const shrink = goalIn ? (attack ? 0.5 : 0.35) : attack ? 0.35 : 0.6;
      const rr = far * (1 - outT * shrink);
      const alpha = goalIn ? 1 : Math.max(0, 1 - outT * outT);
      return { x: bx, y: by, r: rr, alpha, inNet: goalIn || attack };
    }
    const e = t;
    const bx = bezier(start.x, cxz, end.x, e);
    const by = bezier(start.y, cyz, end.y, e);
    const rr = attack ? start.r + (far - start.r) * e : start.r + (far - start.r) * Math.pow(e, 0.9);
    return { x: bx, y: by, r: rr, alpha: 1, inNet: false };
  }

  private renderPensFP(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const ps = this.pens!;
    ctx.save();
    const shx = (Math.random() - 0.5) * this.shake;
    const shy = (Math.random() - 0.5) * this.shake;
    ctx.translate(shx, shy);
    if (this.penShooterIsHuman()) this.drawFPAttack(ctx, vw, vh, ps);
    else this.drawFPDefend(ctx, vw, vh, ps);
    this.drawFpFx(ctx);
    ctx.restore();
  }

  private drawPitchFP(ctx: CanvasRenderingContext2D, vw: number, vh: number, horizon: number, topY: number, topHalfW: number) {
    // orizzonte luminoso (fari dello stadio)
    ctx.fillStyle = 'rgba(160,210,255,0.10)';
    ctx.fillRect(0, horizon - 2, vw, 4);
    // campo in prospettiva
    const cx = vw / 2;
    const botHalfW = vw * 0.62;
    const g = ctx.createLinearGradient(0, topY, 0, vh);
    g.addColorStop(0, '#0d4d33');
    g.addColorStop(1, '#09331f');
    ctx.beginPath();
    ctx.moveTo(cx - topHalfW, topY);
    ctx.lineTo(cx + topHalfW, topY);
    ctx.lineTo(cx + botHalfW, vh);
    ctx.lineTo(cx - botHalfW, vh);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    // strisce tosaerba prospettiche
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      if (i % 2 !== 0) continue;
      const t0 = Math.pow(i / bands, 1.75);
      const t1 = Math.pow((i + 1) / bands, 1.75);
      const y0 = topY + (vh - topY) * t0;
      const y1 = topY + (vh - topY) * t1;
      const w0 = topHalfW + (botHalfW - topHalfW) * t0;
      const w1 = topHalfW + (botHalfW - topHalfW) * t1;
      ctx.beginPath();
      ctx.moveTo(cx - w0, y0);
      ctx.lineTo(cx + w0, y0);
      ctx.lineTo(cx + w1, y1);
      ctx.lineTo(cx - w1, y1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fill();
    }
  }

  private drawGoalBackFP(ctx: CanvasRenderingContext2D, L: FPLayout) {
    const { cx, gw, gh, top, bottom } = L;
    const bh = gw * 0.44; // mezza larghezza del fondo rete
    const bt = top - gh * 0.1; // traversa posteriore
    const bb = bottom - gh * 0.2; // fondo rete
    ctx.save();
    // struttura posteriore
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - gw / 2, top); ctx.lineTo(cx - bh, bt);
    ctx.moveTo(cx + gw / 2, top); ctx.lineTo(cx + bh, bt);
    ctx.moveTo(cx - bh, bt); ctx.lineTo(cx - bh, bb);
    ctx.moveTo(cx + bh, bt); ctx.lineTo(cx + bh, bb);
    ctx.moveTo(cx - bh, bt); ctx.lineTo(cx + bh, bt);
    ctx.moveTo(cx - gw / 2, bottom); ctx.lineTo(cx - bh, bb);
    ctx.moveTo(cx + gw / 2, bottom); ctx.lineTo(cx + bh, bb);
    ctx.stroke();
    // griglia del fondo
    ctx.strokeStyle = 'rgba(220,240,255,0.13)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = bt + ((bb - bt) * i) / 5;
      ctx.beginPath(); ctx.moveTo(cx - bh, y); ctx.lineTo(cx + bh, y); ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const x = cx - bh + ((bh * 2) * i) / 10;
      ctx.beginPath(); ctx.moveTo(x, bt); ctx.lineTo(x, bb); ctx.stroke();
    }
    // drappeggio rete tra telaio e fondo
    ctx.strokeStyle = 'rgba(220,240,255,0.09)';
    for (let i = 0; i <= 8; i++) {
      const xf = cx - gw / 2 + (gw * i) / 8;
      const xb = cx + ((xf - cx) * bh) / (gw / 2);
      ctx.beginPath(); ctx.moveTo(xf, top); ctx.lineTo(xb, bt); ctx.stroke();
    }
    ctx.restore();
  }

  private drawGoalFrontFP(ctx: CanvasRenderingContext2D, L: FPLayout) {
    const { cx, gw, top, bottom } = L;
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, gw * 0.011);
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx - gw / 2, bottom + 3);
    ctx.lineTo(cx - gw / 2, top);
    ctx.lineTo(cx + gw / 2, top);
    ctx.lineTo(cx + gw / 2, bottom + 3);
    ctx.stroke();
    ctx.restore();
  }

  private drawFigure(
    ctx: CanvasRenderingContext2D,
    hipX: number,
    hipY: number,
    h: number,
    color: string,
    lean: number,
    run: number,
    reach: { x: number; y: number } | null = null,
  ) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(lean);
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    const sw = run ? Math.sin(run) * h * 0.13 : 0;
    // gambe
    ctx.strokeStyle = color;
    ctx.lineWidth = h * 0.085;
    ctx.beginPath(); ctx.moveTo(-h * 0.09, 0); ctx.lineTo(-h * 0.11 + sw, h * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h * 0.09, 0); ctx.lineTo(h * 0.11 - sw, h * 0.5); ctx.stroke();
    // scarpe
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1526';
    ctx.beginPath(); ctx.ellipse(-h * 0.11 + sw, h * 0.5, h * 0.07, h * 0.032, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(h * 0.11 - sw, h * 0.5, h * 0.07, h * 0.032, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 12;
    // torso
    ctx.lineWidth = h * 0.21;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.34); ctx.lineTo(0, 0); ctx.stroke();
    // braccia
    const shx = h * 0.13;
    const shy = -h * 0.31;
    ctx.lineWidth = h * 0.06;
    if (reach) {
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(reach.x + h * 0.05, reach.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-shx, shy); ctx.lineTo(reach.x - h * 0.05, reach.y); ctx.stroke();
      // guanti
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(reach.x + h * 0.05, reach.y, h * 0.072, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(reach.x - h * 0.05, reach.y, h * 0.072, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 12;
    } else {
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(shx + h * 0.04 + sw * 0.6, -h * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-shx, shy); ctx.lineTo(-shx - h * 0.04 - sw * 0.6, -h * 0.02); ctx.stroke();
    }
    // testa
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -h * 0.45, h * 0.115, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawFPBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = r * 0.6;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(15,23,42,0.4)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    const spin = this.time * 9;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + spin;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFPTrail(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.fpTrail.length; i++) {
      const t = i / this.fpTrail.length;
      const p = this.fpTrail[i];
      ctx.fillStyle = `rgba(226,240,255,${t * 0.14})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.35 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFPAttack(ctx: CanvasRenderingContext2D, vw: number, vh: number, ps: PensState) {
    const L = this.fpLayoutA(vw, vh);
    this.drawPitchFP(ctx, vw, vh, L.horizon, L.bottom - L.gh * 0.16, L.gw * 0.78);
    this.drawGoalBackFP(ctx, L);

    // Portiere IA oppure secondo giocatore, con guantone nella posizione scelta.
    const humanKeeper = this.penKeeperIsHuman();
    const diveX = humanKeeper ? ps.gloveX : ps.aiDiveX;
    const diveY = humanKeeper ? ps.gloveY : ps.aiDiveY;
    const prog = humanKeeper
      ? ps.stage === 'kick' || ps.stage === 'resolve' ? 1 : 0.55
      : ps.stage === 'kick' || ps.stage === 'resolve'
        ? 1 - Math.pow(1 - clamp(ps.kickT / 0.42, 0, 1), 3)
        : 0;
    const kh = L.gh * 0.98;
    const tgt = this.fpMap(L, diveX, diveY);
    const hipX0 = L.cx;
    const hipY0 = L.bottom - kh * 0.52;
    const hipX = hipX0 + (tgt.x - hipX0) * 0.82 * prog;
    const hipY = hipY0 + (tgt.y - hipY0 - L.gh * 0.08) * 0.82 * prog + (prog === 0 ? Math.sin(this.time * 2.2) * 2 : 0);
    const lean = (diveX !== 0 ? Math.sign(diveX) : 0) * prog * 0.7;
    // ombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(hipX * (1 - prog * 0.5) + L.cx * prog * 0.5, L.bottom + 4, 26 + prog * 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // punto di presa (mani) nello spazio locale della figura
    const rdx = tgt.x - hipX;
    const rdy = tgt.y - hipY;
    const rl = Math.hypot(rdx, rdy) || 1;
    const rmax = kh * 0.52;
    const reach = { x: (rdx / rl) * Math.min(rl, rmax), y: (rdy / rl) * Math.min(rl, rmax) };
    this.drawFigure(ctx, hipX, hipY, kh, this.teamKit(1 - ps.turn).primary, lean, 0, reach);

    // palla
    const b = this.fpBall(ps, vw, vh);
    // scia
    if (ps.stage === 'kick' || ps.stage === 'resolve') {
      this.fpTrail.push({ x: b.x, y: b.y, r: b.r });
      if (this.fpTrail.length > 9) this.fpTrail.shift();
    }
    this.drawFPTrail(ctx);

    // dischetto e scarpa (primo piano, solo fermo palla)
    if (ps.stage === 'intro' || ps.stage === 'aim') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(L.cx, vh * 0.86 + b.r * 0.7, b.r * 1.5, b.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    this.drawFPBall(ctx, b.x, b.y, b.r, b.alpha);

    // scarpa che colpisce all'inizio del calcio
    if (ps.stage === 'kick' && ps.kickT < 0.15) {
      const fp = ps.kickT / 0.15;
      ctx.save();
      ctx.translate(L.cx + (1 - fp) * 130 + 18, vh * 0.86 + (1 - fp) * 40 - 4);
      ctx.rotate(-0.6 + fp * 0.5);
      ctx.fillStyle = '#101c2e';
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-14, -26, 44, 26, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-14, -2, 44, 5);
      ctx.restore();
    }

    // mirino
    if (ps.stage === 'aim') {
      const wob = this.penWobble(ps);
      const nx = (Math.sin(this.time * 11.3) + Math.sin(this.time * 5.1 + 1.7)) / 2;
      const ny = (Math.sin(this.time * 9.7 + 0.6) + Math.sin(this.time * 4.3)) / 2;
      const aimPt = this.fpMap(
        L,
        clamp(ps.aimX + nx * wob, -1.25, 1.25),
        clamp(ps.aimY + ny * wob, 0, 1.15),
      );
      // anello di dispersione
      ctx.strokeStyle = 'rgba(251,191,36,0.28)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(aimPt.x, aimPt.y, Math.max(8, (wob * L.gw) / 2), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // croce del mirino
      const pulse = 1 + Math.sin(this.time * 7) * 0.08;
      ctx.strokeStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(251,191,36,0.9)';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(aimPt.x, aimPt.y, 11 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(aimPt.x - 18 * pulse, aimPt.y); ctx.lineTo(aimPt.x - 7, aimPt.y);
      ctx.moveTo(aimPt.x + 7, aimPt.y); ctx.lineTo(aimPt.x + 18 * pulse, aimPt.y);
      ctx.moveTo(aimPt.x, aimPt.y - 18 * pulse); ctx.lineTo(aimPt.x, aimPt.y - 7);
      ctx.moveTo(aimPt.x, aimPt.y + 7); ctx.lineTo(aimPt.x, aimPt.y + 18 * pulse);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    this.drawGoalFrontFP(ctx, L);
  }

  private drawFPDefend(ctx: CanvasRenderingContext2D, vw: number, vh: number, ps: PensState) {
    const L = this.fpLayoutD(vw, vh);
    this.drawPitchFP(ctx, vw, vh, L.horizon, L.horizon + 6, vw * 0.34);

    // cornice della nostra porta (siamo davanti alla linea)
    const half = L.gw / 2 + 24;
    const frameTop = L.top - 26;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(L.cx - half, vh);
    ctx.lineTo(L.cx - half, frameTop);
    ctx.lineTo(L.cx + half, frameTop);
    ctx.lineTo(L.cx + half, vh);
    ctx.stroke();
    // rete laterale accennata
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(220,240,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.moveTo(L.cx - half + t * 30, frameTop);
      ctx.lineTo(L.cx - half + t * 90, vh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L.cx + half - t * 30, frameTop);
      ctx.lineTo(L.cx + half - t * 90, vh);
      ctx.stroke();
    }
    ctx.restore();

    // rigorista IA: la postura in rincorsa suggerisce il lato del tiro
    const kh2 = vh * 0.145;
    const goalkeeperKit = this.teamKit(1 - ps.turn);
    const kFeet = vh * 0.415;
    const leanP =
      ps.stage === 'aim'
        ? clamp(1 - ps.stageT / 0.35, 0, 1)
        : ps.stage === 'intro'
          ? 0
          : 1;
    const leanK = (ps.toX !== 0 || ps.stage === 'kick' || ps.stage === 'resolve' ? Math.sign(ps.toX || 1) : 0) * leanP * 0.24;
    const run = ps.stage === 'aim' || ps.stage === 'intro' ? this.time * 16 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(L.cx, kFeet + 4, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    this.drawFigure(ctx, L.cx, kFeet - kh2 * 0.5, kh2, this.teamKit(ps.turn).primary, leanK, leanP > 0.15 ? run : 0, null);

    // palla
    const b = this.fpBall(ps, vw, vh);
    if (ps.stage === 'kick' || ps.stage === 'resolve') {
      this.fpTrail.push({ x: b.x, y: b.y, r: b.r });
      if (this.fpTrail.length > 9) this.fpTrail.shift();
    }
    this.drawFPTrail(ctx);
    this.drawFPBall(ctx, b.x, b.y, b.r, b.alpha);

    // guantone del giocatore
    const g = this.fpMap(L, ps.gloveX, ps.gloveY);
    const gr = Math.min(34, vh * 0.048);
    // scia del tuffo
    if (ps.diveT > 0) {
      ctx.save();
      const sx = ps.diveDx * (L.gw / 2);
      const sy = -ps.diveDy * L.gh;
      const sl = Math.hypot(sx, sy) || 1;
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.16 / i;
        ctx.fillStyle = goalkeeperKit.primary;
        ctx.beginPath();
        ctx.ellipse(g.x - (sx / sl) * i * 16, g.y - (sy / sl) * i * 16, gr * 0.9, gr * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();
    const divePulse = ps.diveT > 0 ? 1.18 : 1;
    ctx.translate(g.x, g.y);
    ctx.rotate(ps.diveDx * 0.3 * (ps.diveT > 0 ? 1 : 0));
    ctx.scale(divePulse, divePulse);
    ctx.shadowColor = goalkeeperKit.glow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.ellipse(0, 0, gr, gr * 0.74, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = goalkeeperKit.primary;
    ctx.beginPath(); ctx.ellipse(0, gr * 0.52, gr * 0.62, gr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(3,16,36,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, gr, gr * 0.74, 0, 0, Math.PI * 2); ctx.stroke();
    // dita accennate
    ctx.strokeStyle = 'rgba(3,16,36,0.3)';
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gr * 0.4, -gr * 0.5);
      ctx.lineTo(i * gr * 0.42, -gr * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  private updateFpFx(dt: number) {
    for (let i = this.fpFx.length - 1; i >= 0; i--) {
      const p = this.fpFx[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.fpFx.splice(i, 1);
        continue;
      }
      p.vy += 480 * dt;
      const d = Math.exp(-1.4 * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private fpBurst(x: number, y: number, colors: string[], n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 380;
      this.fpFx.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 140,
        life: 0.7 + Math.random() * 0.9,
        maxLife: 1.6,
        size: 2 + Math.random() * 3.5,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  private drawFpFx(ctx: CanvasRenderingContext2D) {
    if (this.fpFx.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.fpFx) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.vw = Math.max(1, rect.width);
    this.vh = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.vw * this.dpr);
    this.canvas.height = Math.round(this.vh * this.dpr);
    this.buildBackground();
  }

  private buildBackground() {
    const c = document.createElement('canvas');
    c.width = Math.round(this.vw * this.dpr);
    c.height = Math.round(this.vh * this.dpr);
    const g = c.getContext('2d');
    if (!g) return;
    const w = c.width;
    const h = c.height;
    const grad = g.createRadialGradient(w / 2, h * 0.36, h * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, '#0b1220');
    grad.addColorStop(0.55, '#060b16');
    grad.addColorStop(1, '#02040a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // pubblico bokeh
    const crowdColors = ['56,189,248', '251,113,133', '251,191,36', '148,163,184'];
    for (let i = 0; i < 260; i++) {
      const col = crowdColors[Math.floor(Math.random() * crowdColors.length)];
      const alpha = 0.03 + Math.random() * 0.09;
      const r = (2 + Math.random() * 7) * this.dpr;
      g.fillStyle = `rgba(${col},${alpha})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      g.fill();
    }
    // fari agli angoli
    for (const [fx, fy] of [
      [0.08, 0.05],
      [0.92, 0.05],
      [0.08, 0.95],
      [0.92, 0.95],
    ]) {
      const beam = g.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, h * 0.75);
      beam.addColorStop(0, 'rgba(180,210,255,0.10)');
      beam.addColorStop(1, 'rgba(180,210,255,0)');
      g.fillStyle = beam;
      g.fillRect(0, 0, w, h);
    }
    this.bgCanvas = c;
  }

  private render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vw = this.vw;
    const vh = this.vh;

    if (this.bgCanvas) ctx.drawImage(this.bgCanvas, 0, 0, vw, vh);

    // rigori: scena in prima persona
    if (this.phase === 'pens') {
      this.renderPensFP(ctx, vw, vh);
      this.drawVignette(ctx, vw, vh);
      return;
    }

    const margin = 34;
    const s = Math.min((vw - margin * 2) / W, (vh - margin * 2) / H);
    const ox = (vw - W * s) / 2;
    const oy = (vh - H * s) / 2 + 8;

    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;

    ctx.save();
    ctx.translate(ox + shakeX, oy + shakeY);
    ctx.scale(s, s);

    this.drawPitch(ctx);
    this.drawGoals(ctx);

    // ombre
    for (const p of this.players) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + 3, p.y + 7, P_R * 0.95, P_R * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const keeper of this.goalkeepers) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(keeper.x + 4, keeper.y + 9, GK_R * 1.05, GK_R * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(0,0,0,${0.3 * Math.exp(-this.ball.z / 120)})`;
    ctx.beginPath();
    ctx.ellipse(this.ball.x + 2, this.ball.y + 6, B_R + this.ball.z * 0.04, B_R * 0.5 + this.ball.z * 0.015, 0, 0, Math.PI * 2);
    ctx.fill();

    // scia palla
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        ctx.fillStyle = `rgba(226,240,255,${t * 0.16})`;
        ctx.beginPath();
        ctx.arc(this.trail[i].x, this.trail[i].y, B_R * (0.35 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const p of this.players) this.drawPlayer(ctx, p);
    for (const keeper of this.goalkeepers) this.drawGoalkeeper(ctx, keeper);
    this.drawBall(ctx);
    this.drawParticles(ctx);

    // flash gol
    if (this.goalFlash > 0) {
      const gx = this.goalSide === 1 ? W : 0;
      const fg = ctx.createRadialGradient(gx, H / 2, 0, gx, H / 2, 420);
      fg.addColorStop(0, `rgba(255,255,255,${this.goalFlash * 0.45})`);
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-60, H / 2 - 430, W + 120, 860);
    }

    ctx.restore();

    this.drawVignette(ctx, vw, vh);
  }

  private drawVignette(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  }

  private drawPitch(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // base + strisce erba
    ctx.fillStyle = '#0c4a30';
    ctx.fillRect(0, 0, W, H);
    const bands = 12;
    for (let i = 0; i < bands; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.fillRect((i * W) / bands, 0, W / bands, H);
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, 0, H);
    sheen.addColorStop(0, 'rgba(190,235,255,0.05)');
    sheen.addColorStop(0.5, 'rgba(0,0,0,0)');
    sheen.addColorStop(1, 'rgba(0,20,10,0.16)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);

    // linee
    ctx.strokeStyle = 'rgba(240,252,255,0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(160,230,255,0.55)';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.strokeRect(0, 0, W, H);
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(W / 2 + 92, H / 2);
    ctx.arc(W / 2, H / 2, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeRect(0, H / 2 - 160, 150, 320);
    ctx.strokeRect(W - 150, H / 2 - 160, 150, 320);
    ctx.strokeRect(0, H / 2 - 95, 62, 190);
    ctx.strokeRect(W - 62, H / 2 - 95, 62, 190);
    ctx.beginPath();
    ctx.arc(112, H / 2, 78, -Math.PI / 3.1, Math.PI / 3.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W - 112, H / 2, 78, Math.PI - Math.PI / 3.1, Math.PI + Math.PI / 3.1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(240,252,255,0.9)';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2);
    ctx.arc(112, H / 2, 4, 0, Math.PI * 2);
    ctx.arc(W - 112, H / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGoals(ctx: CanvasRenderingContext2D) {
    for (const side of [-1, 1]) {
      const gx = side === -1 ? 0 : W;
      const x0 = side === -1 ? -GOAL_DEPTH : W;
      ctx.save();
      // rete
      ctx.strokeStyle = 'rgba(220,240,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= GOAL_DEPTH; i += 7) {
        const x = x0 + i;
        ctx.moveTo(x, H / 2 - GOAL_HALF);
        ctx.lineTo(x, H / 2 + GOAL_HALF);
      }
      for (let y = H / 2 - GOAL_HALF; y <= H / 2 + GOAL_HALF; y += 7) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + GOAL_DEPTH, y);
      }
      ctx.stroke();
      // telaio
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx, H / 2 - GOAL_HALF);
      ctx.lineTo(x0 + (side === -1 ? 0 : GOAL_DEPTH), H / 2 - GOAL_HALF);
      ctx.lineTo(x0 + (side === -1 ? 0 : GOAL_DEPTH), H / 2 + GOAL_HALF);
      ctx.lineTo(gx, H / 2 + GOAL_HALF);
      ctx.stroke();
      // pali
      ctx.fillStyle = '#ffffff';
      for (const py of [H / 2 - GOAL_HALF, H / 2 + GOAL_HALF]) {
        ctx.beginPath();
        ctx.arc(gx, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawKitPattern(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kit: TeamKit) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    if (kit.pattern === 'vertical') {
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(x - r * 0.48, y - r, r * 0.32, r * 2);
      ctx.fillRect(x + r * 0.16, y - r, r * 0.32, r * 2);
      if (kit.trim) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = kit.trim;
        ctx.fillRect(x - r * 0.7, y - r, r * 0.06, r * 2);
        ctx.fillRect(x + r * 0.64, y - r, r * 0.06, r * 2);
        ctx.globalAlpha = 1;
      }
    } else if (kit.pattern === 'horizontal') {
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(x - r, y - r * 0.28, r * 2, r * 0.56);
      ctx.fillStyle = kit.accent;
      ctx.fillRect(x - r, y + r * 0.28, r * 2, r * 0.16);
    } else if (kit.pattern === 'sash') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(-r * 1.7, -r * 0.28, r * 3.4, r * 0.56);
      ctx.fillStyle = kit.accent;
      ctx.fillRect(-r * 1.7, r * 0.18, r * 3.4, r * 0.12);
      ctx.restore();
    } else if (kit.pattern === 'chevron') {
      ctx.fillStyle = kit.secondary;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 0.2);
      ctx.lineTo(x, y + r * 0.2);
      ctx.lineTo(x + r, y - r * 0.2);
      ctx.lineTo(x + r, y + r * 0.14);
      ctx.lineTo(x, y + r * 0.54);
      ctx.lineTo(x - r, y + r * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = kit.accent;
      ctx.beginPath();
      ctx.moveTo(x - r, y + r * 0.18);
      ctx.lineTo(x, y + r * 0.54);
      ctx.lineTo(x + r, y + r * 0.18);
      ctx.lineTo(x + r, y + r * 0.31);
      ctx.lineTo(x, y + r * 0.68);
      ctx.lineTo(x - r, y + r * 0.31);
      ctx.closePath();
      ctx.fill();
      if (kit.trim) {
        ctx.fillStyle = kit.trim;
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * 0.35);
        ctx.lineTo(x, y + r * 0.69);
        ctx.lineTo(x + r, y + r * 0.35);
        ctx.lineTo(x + r, y + r * 0.47);
        ctx.lineTo(x, y + r * 0.82);
        ctx.lineTo(x - r, y + r * 0.47);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kit.pattern === 'pinstripe') {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = kit.secondary;
      const stripe = Math.max(1.5, r * 0.12);
      for (let offset = -3; offset <= 3; offset++) {
        ctx.fillRect(x + offset * r * 0.3, y - r, stripe, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = kit.accent;
      ctx.fillRect(x + r * 0.62, y - r, r * 0.38, r * 2);
    } else if (kit.pattern === 'waves') {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = kit.secondary;
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      for (let row = -1; row <= 2; row++) {
        ctx.beginPath();
        for (let step = 0; step <= 8; step++) {
          const px = x - r + (step / 8) * r * 2;
          const py = y + row * r * 0.42 + Math.sin((step / 8) * Math.PI * 2) * r * 0.1;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kit.pattern === 'panels') {
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(x - r, y - r, r * 0.28, r * 2);
      ctx.fillRect(x + r * 0.72, y - r, r * 0.28, r * 2);
      ctx.fillStyle = kit.accent;
      ctx.fillRect(x - r * 0.18, y + r * 0.48, r * 0.36, r * 0.13);
    } else if (kit.pattern === 'tonal') {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = kit.secondary;
      ctx.lineWidth = Math.max(1, r * 0.08);
      for (let offset = -2; offset <= 2; offset++) {
        ctx.beginPath();
        ctx.moveTo(x - r, y + offset * r * 0.38);
        ctx.lineTo(x + r, y + offset * r * 0.38 - r * 0.48);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kit.pattern === 'checks') {
      const cell = Math.max(5, r * 0.42);
      ctx.fillStyle = kit.secondary;
      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          if ((row + col) % 2 === 0) {
            ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
          }
        }
      }
      ctx.fillStyle = kit.accent;
      ctx.fillRect(x - 2, y - r, 4, r * 2);
    } else if (kit.pattern === 'cross') {
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(x - r * 0.18, y - r, r * 0.36, r * 2);
      ctx.fillRect(x - r, y - r * 0.18, r * 2, r * 0.36);
      ctx.fillStyle = kit.accent;
      ctx.fillRect(x - r, y + r * 0.3, r * 2, r * 0.12);
    } else {
      ctx.fillStyle = kit.secondary;
      ctx.fillRect(x - r * 0.18, y - r, r * 0.36, r * 2);
      ctx.fillStyle = kit.accent;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // piccolo colletto a contrasto, come dettaglio comune della divisa
    ctx.fillStyle = kit.accent;
    ctx.fillRect(x - r * 0.28, y - r * 0.78, r * 0.56, Math.max(2, r * 0.14));
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
    const kit = this.teamKit(p.team);
    const color = kit.primary;
    const isHuman =
      this.phase !== 'demo' &&
      (p.team === 0 || this.playerCount === 2) &&
      p.idx === this.controlledIdx[p.team];

    if (p.tackleT > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(251,191,36,${0.45 + p.tackleT * 2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, P_R + 8 + (0.22 - p.tackleT) * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isHuman) {
      const pulse = 1 + Math.sin(this.time * 6) * 0.08;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (P_R + 7) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      const ay = p.y - P_R - 22 + Math.sin(this.time * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(p.x, ay + 10);
      ctx.lineTo(p.x - 8, ay);
      ctx.lineTo(p.x + 8, ay);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = kit.glow;
    ctx.shadowBlur = isHuman ? 22 : 14;
    const grad = ctx.createRadialGradient(p.x - 5, p.y - 7, 2, p.x, p.y, P_R + 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, color);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, P_R, 0, Math.PI * 2);
    ctx.fill();
    this.drawKitPattern(ctx, p.x, p.y, P_R, kit);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(2,8,20,0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // indicatore direzione
    ctx.strokeStyle = kit.secondary;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x + p.faceX * (P_R - 4), p.y + p.faceY * (P_R - 4));
    ctx.lineTo(p.x + p.faceX * (P_R + 1), p.y + p.faceY * (P_R + 1));
    ctx.stroke();

    // numero in contrasto con la maglia
    ctx.font = '800 13px "Archivo Black", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(String(p.number), p.x, p.y + 0.5);
    ctx.fillStyle = kit.secondary;
    ctx.fillText(String(p.number), p.x, p.y + 0.5);
    ctx.restore();
  }

  private drawGoalkeeper(ctx: CanvasRenderingContext2D, keeper: FixedGoalkeeper) {
    const kit = this.teamKit(keeper.team);
    const { x, y } = keeper;

    ctx.save();
    ctx.shadowColor = kit.glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y, GK_R + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const grad = ctx.createRadialGradient(x - 6, y - 8, 2, x, y, GK_R + 1);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.28, kit.primary);
    grad.addColorStop(1, kit.primary);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, GK_R, 0, Math.PI * 2);
    ctx.fill();
    this.drawKitPattern(ctx, x, y, GK_R, kit);

    ctx.strokeStyle = 'rgba(2,8,20,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, GK_R, 0, Math.PI * 2);
    ctx.stroke();

    // Guanti e numero 1 distinguono il portiere dai tre giocatori di movimento.
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = 'rgba(15,23,42,0.85)';
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * GK_R * 0.68, y + 5, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.font = '900 14px "Archivo Black", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText('1', x, y + 0.5);
    ctx.fillStyle = kit.secondary;
    ctx.fillText('1', x, y + 0.5);
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    const b = this.ball;
    const drawY = b.y - b.z;
    const radius = B_R + Math.min(5, b.z * 0.025);
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 10 + b.z * 0.08;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(b.x, drawY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(15,23,42,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    const spin = this.time * 3;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + spin;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * radius * 0.5, drawY + Math.sin(a) * radius * 0.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    if (this.particles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- snapshot ----------
  getSnapshot(): Snapshot {
    const ps = this.pens;
    return {
      phase: this.phase,
      period: this.period,
      score: [...this.score],
      shots: [...this.shots],
      timeLeft: Math.max(0, this.timeLeft),
      countdown: Math.max(0, Math.ceil(this.countdown)),
      lastGoalTeam: this.lastGoalTeam,
      winner: this.winner,
      muted: this.sfx.muted,
      playerCount: this.playerCount,
      teamSize: this.teamSize,
      controlled: [...this.controlledIdx],
      gamepadsConnected: this.gamepadsConnected,
      pens: ps
        ? {
            score: [...ps.score],
            taken: [...ps.taken],
            turn: ps.turn,
            stage: ps.stage,
            stageT: Math.max(0, ps.stageT),
            results: [[...ps.results[0]], [...ps.results[1]]],
          }
        : null,
    };
  }
}
