import { useRef, useState } from 'react';
import { Zap, Send, RefreshCw } from 'lucide-react';
import type { GameEngine } from '../game/engine';
import type { Strings } from '../i18n';

const STICK_R = 58;

interface StickState {
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  active: boolean;
}

const IDLE: StickState = { ox: 0, oy: 0, dx: 0, dy: 0, active: false };

/**
 * Ogni giocatore ha il proprio joystick e i propri pulsanti.
 * - 1 giocatore: joystick a sinistra, pulsanti in basso a destra (come prima).
 * - 2 giocatori: schermo diviso a metà, P1 a sinistra e P2 a destra, ciascuno
 *   con joystick e pulsanti nel proprio mezzo, così nessuno invade l'altro.
 */
function Pad({
  engine,
  slot,
  side,
  split,
  t,
}: {
  engine: GameEngine | null;
  slot: 0 | 1;
  side: 'left' | 'right';
  /** true in 2 giocatori: il pad si ferma a metà schermo. false in 1 giocatore: occupa tutto. */
  split: boolean;
  t: Strings;
}) {
  const [stick, setStick] = useState<StickState>(IDLE);
  const pointerId = useRef<number | null>(null);

  const moveStick = (clientX: number, clientY: number) => {
    let dx = clientX - stick.ox;
    let dy = clientY - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx = (dx / d) * STICK_R;
      dy = (dy / d) * STICK_R;
    }
    setStick((s) => ({ ...s, dx, dy }));
    engine?.setStick(slot, dx / STICK_R, dy / STICK_R, true);
  };

  const release = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setStick(IDLE);
    engine?.setStick(slot, 0, 0, false);
  };

  // in 2 giocatori ciascun pad occupa la sua metà; in 1 giocatore P1 ha tutto lo schermo
  const half = split
    ? side === 'left'
      ? 'left-0 w-[50%] border-r border-white/5'
      : 'right-0 w-[50%]'
    : 'inset-x-0 w-full';
  // dentro il pad: joystick verso il proprio bordo, pulsanti verso il centro
  const stickPos = side === 'left' ? 'left-0' : 'right-0';
  const btnsPos = side === 'left' ? 'right-3' : 'left-3';
  const knob = slot === 0
    ? 'bg-sky-300/80 shadow-[0_0_20px_rgba(56,189,248,0.7)]'
    : 'bg-rose-300/80 shadow-[0_0_20px_rgba(251,113,133,0.7)]';

  return (
    <div className={`pointer-events-auto absolute bottom-0 h-[58%] ${half}`} style={{ touchAction: 'none' }}>
      {/* zona joystick */}
      <div
        className={`absolute bottom-0 h-full w-[62%] ${stickPos}`}
        onPointerDown={(e) => {
          if (pointerId.current !== null) return;
          pointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          setStick({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, active: true });
          engine?.setStick(slot, 0, 0, true);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== pointerId.current) return;
          moveStick(e.clientX, e.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        {stick.active ? (
          <>
            <div
              className="pointer-events-none absolute rounded-full border-2 border-white/25 bg-white/5 backdrop-blur-sm"
              style={{
                left: stick.ox - STICK_R,
                top: stick.oy - STICK_R,
                width: STICK_R * 2,
                height: STICK_R * 2,
              }}
            />
            <div
              className={`pointer-events-none absolute rounded-full ${knob}`}
              style={{
                left: stick.ox + stick.dx - 25,
                top: stick.oy + stick.dy - 25,
                width: 50,
                height: 50,
              }}
            />
          </>
        ) : (
          <div
            className={`pointer-events-none absolute bottom-8 flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-white/20 text-center text-[10px] font-display tracking-widest text-white/30 ${
              side === 'left' ? 'left-6' : 'right-6'
            }`}
          >
            {t.touchMove}
            <span className="sr-only">{slot === 0 ? t.player1 : t.player2}</span>
          </div>
        )}
      </div>

      {/* pulsanti azione, impilati verso il centro schermo */}
      <div className={`pointer-events-auto absolute bottom-7 flex flex-col items-center gap-2.5 ${btnsPos}`}>
        <span
          className={`font-display text-[10px] tracking-[0.3em] ${
            slot === 0 ? 'text-sky-300/70' : 'text-rose-300/70'
          }`}
        >
          {slot === 0 ? 'P1' : 'P2'}
        </span>
        <button
          aria-label="switch"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 backdrop-blur-md active:bg-white/25"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engine?.touchSwitch(slot);
          }}
        >
          <RefreshCw size={17} />
        </button>
        <button
          aria-label="pass"
          className={`flex h-13 w-13 items-center justify-center rounded-full border text-white/90 backdrop-blur-md active:scale-95 ${
            slot === 0
              ? 'border-sky-200/40 bg-sky-400/25 text-sky-100 active:bg-sky-400/50'
              : 'border-rose-200/40 bg-rose-400/25 text-rose-50 active:bg-rose-400/50'
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engine?.touchPass(slot);
          }}
        >
          <Send size={20} />
        </button>
        <button
          aria-label="shoot"
          className={`flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md active:scale-95 ${
            slot === 0
              ? 'border-sky-200/50 bg-sky-400/30 text-sky-50 shadow-[0_0_25px_rgba(56,189,248,0.35)] active:bg-sky-400/60'
              : 'border-rose-200/50 bg-rose-400/30 text-rose-50 shadow-[0_0_25px_rgba(251,113,133,0.35)] active:bg-rose-400/60'
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engine?.touchShoot(slot);
          }}
        >
          <Zap size={25} className="fill-current" />
        </button>
      </div>
    </div>
  );
}

export default function TouchControls({
  engine,
  twoPlayer,
  t,
}: {
  engine: GameEngine | null;
  twoPlayer: boolean;
  t: Strings;
}) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none">
      <Pad engine={engine} slot={0} side="left" split={twoPlayer} t={t} />
      {twoPlayer && <Pad engine={engine} slot={1} side="right" split t={t} />}
    </div>
  );
}
