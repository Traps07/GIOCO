import { useRef, useState } from 'react';
import { Crosshair, MoveUpRight, RefreshCw, Send, Shield, Zap } from 'lucide-react';
import type { GameEngine, PlayerCount, TeamSize } from '../game/engine';
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

function TouchPad({
  engine,
  teamSize,
  slot,
  split,
  t,
}: {
  engine: GameEngine | null;
  teamSize: TeamSize;
  slot: 0 | 1;
  split: boolean;
  t: Strings;
}) {
  const [stick, setStick] = useState<StickState>(IDLE);
  const pointerId = useRef<number | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const side = slot === 0 ? 'left' : 'right';
  const knob = slot === 0
    ? 'bg-sky-300/80 shadow-[0_0_20px_rgba(56,189,248,0.7)]'
    : 'bg-rose-300/80 shadow-[0_0_20px_rgba(251,113,133,0.7)]';

  const localPoint = (clientX: number, clientY: number) => {
    const rect = zoneRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  const moveStick = (clientX: number, clientY: number) => {
    const point = localPoint(clientX, clientY);
    let dx = point.x - stick.ox;
    let dy = point.y - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx = (dx / d) * STICK_R;
      dy = (dy / d) * STICK_R;
    }
    setStick((s) => ({ ...s, dx, dy }));
    engine?.setStick(slot, dx / STICK_R, dy / STICK_R, true);
  };

  const press = (e: React.PointerEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const padBounds = split
    ? slot === 0
      ? 'left-0 w-1/2 border-r border-white/5'
      : 'right-0 w-1/2'
    : 'inset-x-0 w-full';
  const stickZone = split
    ? side === 'left' ? 'left-0 w-[72%]' : 'right-0 w-[72%]'
    : 'left-0 w-[45%]';
  const stickIdlePos = side === 'left' ? 'left-6' : 'right-6';
  const actionPos = split ? (side === 'left' ? 'right-2' : 'left-2') : 'right-3';
  const miniSize = split ? 'h-9 w-9' : 'h-11 w-11';
  const miniIcon = split ? 14 : 17;
  const miniText = split ? 'text-[6px]' : 'text-[7px]';

  return (
    <div className={`pointer-events-none absolute inset-y-0 ${padBounds}`}>
      <div
        ref={zoneRef}
        className={`pointer-events-auto absolute bottom-0 h-[58%] ${stickZone}`}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (pointerId.current !== null) return;
          pointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          const point = localPoint(e.clientX, e.clientY);
          setStick({ ox: point.x, oy: point.y, dx: 0, dy: 0, active: true });
          engine?.setStick(slot, 0, 0, true);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== pointerId.current) return;
          moveStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.pointerId !== pointerId.current) return;
          pointerId.current = null;
          setStick(IDLE);
          engine?.setStick(slot, 0, 0, false);
        }}
        onPointerCancel={(e) => {
          if (e.pointerId !== pointerId.current) return;
          pointerId.current = null;
          setStick(IDLE);
          engine?.setStick(slot, 0, 0, false);
        }}
      >
        {stick.active ? (
          <>
            <div
              className="pointer-events-none absolute rounded-full border-2 border-white/25 bg-white/5 backdrop-blur-sm"
              style={{ left: stick.ox - STICK_R, top: stick.oy - STICK_R, width: STICK_R * 2, height: STICK_R * 2 }}
            />
            <div
              className={`pointer-events-none absolute rounded-full ${knob}`}
              style={{ left: stick.ox + stick.dx - 25, top: stick.oy + stick.dy - 25, width: 50, height: 50 }}
            />
          </>
        ) : (
          <div className={`pointer-events-none absolute bottom-8 flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-white/20 text-center text-[9px] font-display tracking-widest text-white/30 ${stickIdlePos}`}>
            {t.touchMove}
            {split && <span className="sr-only">P{slot + 1}</span>}
          </div>
        )}
      </div>

      <div className={`pointer-events-auto absolute bottom-5 flex flex-col items-center gap-1.5 ${actionPos}`}>
        {split && (
          <span className={`font-display text-[9px] tracking-[0.25em] ${slot === 0 ? 'text-sky-300/70' : 'text-rose-300/70'}`}>
            P{slot + 1}
          </span>
        )}
        <div className="grid grid-cols-3 gap-1">
          {teamSize > 1 && (
            <button
              aria-label={t.kSwitch}
              title={t.kSwitch}
              className={`flex ${miniSize} flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85 backdrop-blur-md active:bg-white/25`}
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => press(e, () => engine?.touchSwitch(slot))}
            >
              <RefreshCw size={miniIcon} />
              <span className={`${miniText} font-bold leading-none`}>{t.kSwitch}</span>
            </button>
          )}
          <button
            aria-label={t.touchCross}
            title={t.touchCross}
            className={`flex ${miniSize} flex-col items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-400/15 text-cyan-100 backdrop-blur-md active:bg-cyan-400/35`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchCross(slot))}
          >
            <MoveUpRight size={miniIcon} />
            <span className={`${miniText} font-bold leading-none`}>{t.touchCross}</span>
          </button>
          <button
            aria-label={t.touchCurve}
            title={t.touchCurve}
            className={`flex ${miniSize} flex-col items-center justify-center rounded-full border border-fuchsia-200/35 bg-fuchsia-400/15 text-fuchsia-100 backdrop-blur-md active:bg-fuchsia-400/35`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchCurve(slot))}
          >
            <Crosshair size={miniIcon} />
            <span className={`${miniText} font-bold leading-none`}>{t.touchCurve}</span>
          </button>
          <button
            aria-label={t.touchPower}
            title={t.touchPower}
            className={`flex ${miniSize} flex-col items-center justify-center rounded-full border border-amber-200/35 bg-amber-400/15 text-amber-100 backdrop-blur-md active:bg-amber-400/35`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchPower(slot))}
          >
            <Zap size={miniIcon} />
            <span className={`${miniText} font-bold leading-none`}>{t.touchPower}</span>
          </button>
          <button
            aria-label={t.touchTackle}
            title={t.touchTackle}
            className={`flex ${miniSize} flex-col items-center justify-center rounded-full border border-rose-200/35 bg-rose-400/15 text-rose-100 backdrop-blur-md active:bg-rose-400/35`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchTackle(slot))}
          >
            <Shield size={miniIcon} />
            <span className={`${miniText} font-bold leading-none`}>{t.touchTackle}</span>
          </button>
        </div>
        <div className="flex items-end gap-1.5">
          <button
            aria-label={t.kPass}
            title={t.kPass}
            className={`flex ${split ? 'h-12 w-12' : 'h-14 w-14'} flex-col items-center justify-center rounded-full border border-sky-200/40 bg-sky-400/25 text-sky-100 backdrop-blur-md active:bg-sky-400/50`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchPass(slot))}
          >
            <Send size={split ? 17 : 20} />
            <span className="text-[7px] font-bold">{t.kPass}</span>
          </button>
          <button
            aria-label={t.kShoot}
            title={t.kShoot}
            className={`flex ${split ? 'h-14 w-14' : 'h-16 w-16'} flex-col items-center justify-center rounded-full border border-rose-200/50 bg-rose-400/30 text-rose-50 backdrop-blur-md shadow-[0_0_25px_rgba(251,113,133,0.35)] active:bg-rose-400/60`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => press(e, () => engine?.touchShoot(slot))}
          >
            <Zap size={split ? 20 : 24} className="fill-current" />
            <span className="text-[7px] font-bold">{t.kShoot}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TouchControls({
  engine,
  playerCount,
  teamSize,
  t,
}: {
  engine: GameEngine | null;
  playerCount: PlayerCount;
  teamSize: TeamSize;
  t: Strings;
}) {
  const split = playerCount === 2;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <TouchPad engine={engine} teamSize={teamSize} slot={0} split={split} t={t} />
      {split && <TouchPad engine={engine} teamSize={teamSize} slot={1} split t={t} />}
    </div>
  );
}
