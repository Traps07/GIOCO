import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { MATCH_DURATIONS, type MatchDuration } from '../game/engine';
import { formatKeyCode, type KeyboardBindings, type PlayerKeyAction } from '../game/keyboard';
import { LANGUAGES, type Language, type Strings } from '../i18n';

interface Props {
  lang: Language;
  setLang: (language: Language) => void;
  muted: boolean;
  onToggleMute: () => void;
  matchDuration: MatchDuration;
  setMatchDuration: (duration: MatchDuration) => void;
  keyBindings: KeyboardBindings;
  onChangeKeyBinding: (player: 'p1' | 'p2', action: PlayerKeyAction, code: string) => void;
  onChangePauseKey: (code: string) => void;
  onResetKeyBindings: () => void;
  onBack: () => void;
  t: Strings;
}

type CaptureTarget =
  | { player: 'p1' | 'p2'; action: PlayerKeyAction }
  | { player: 'global'; action: 'pause' };

const ACTIONS: { action: PlayerKeyAction; labelKey: keyof Strings }[] = [
  { action: 'up', labelKey: 'settingsUp' },
  { action: 'down', labelKey: 'settingsDown' },
  { action: 'left', labelKey: 'settingsLeft' },
  { action: 'right', labelKey: 'settingsRight' },
  { action: 'sprint', labelKey: 'kSprint' },
  { action: 'shoot', labelKey: 'kShoot' },
  { action: 'pass', labelKey: 'kPass' },
  { action: 'through', labelKey: 'kThrough' },
  { action: 'cross', labelKey: 'kCross' },
  { action: 'curve', labelKey: 'kCurve' },
  { action: 'power', labelKey: 'kPower' },
  { action: 'tackle', labelKey: 'kTackle' },
  { action: 'switch', labelKey: 'kSwitch' },
];

const MODIFIER_ONLY_KEYS = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'NumLock',
  'ScrollLock',
]);

function targetId(target: CaptureTarget) {
  return `${target.player}.${target.action}`;
}

export default function SettingsScreen({
  lang,
  setLang,
  muted,
  onToggleMute,
  matchDuration,
  setMatchDuration,
  keyBindings,
  onChangeKeyBinding,
  onChangePauseKey,
  onResetKeyBindings,
  onBack,
  t,
}: Props) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState<CaptureTarget | null>(null);

  useEffect(() => {
    screenRef.current?.focus();
  }, []);
  const [hasConflict, setHasConflict] = useState(false);

  useEffect(() => {
    const guardGamePauseShortcut = (event: globalThis.KeyboardEvent) => {
      if (capturing) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onBack();
      } else if (event.code === keyBindings.pause) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', guardGamePauseShortcut, true);
    return () => window.removeEventListener('keydown', guardGamePauseShortcut, true);
  }, [capturing, keyBindings.pause, onBack]);

  const beginCapture = (target: CaptureTarget) => {
    setHasConflict(false);
    setCapturing(target);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!capturing) {
      event.stopPropagation();
      if (event.code === 'Escape') {
        event.preventDefault();
        onBack();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.code === 'Escape' && capturing.player !== 'global') {
      setCapturing(null);
      setHasConflict(false);
      return;
    }
    if (MODIFIER_ONLY_KEYS.has(event.code)) return;

    const currentTargetId = targetId(capturing);
    const duplicates = [
      ...Object.entries(keyBindings.p1).map(([action, code]) => ({ id: `p1.${action}`, code })),
      ...Object.entries(keyBindings.p2).map(([action, code]) => ({ id: `p2.${action}`, code })),
      { id: 'global.pause', code: keyBindings.pause },
    ].some((binding) => binding.code === event.code && binding.id !== currentTargetId);

    if (duplicates) {
      setHasConflict(true);
      return;
    }

    if (capturing.player === 'global') onChangePauseKey(event.code);
    else onChangeKeyBinding(capturing.player, capturing.action, event.code);
    setCapturing(null);
    setHasConflict(false);
  };

  const renderPlayerBindings = (player: 'p1' | 'p2', title: string, accent: 'sky' | 'rose') => {
    const accentText = accent === 'sky' ? 'text-sky-200' : 'text-rose-200';
    const accentBorder = accent === 'sky' ? 'border-sky-300/20' : 'border-rose-300/20';
    return (
      <section className={`rounded-2xl border ${accentBorder} bg-slate-950/70 p-4 sm:p-5`}>
        <h3 className={`mb-3 font-display text-xs tracking-[0.22em] ${accentText}`}>{title}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACTIONS.map(({ action, labelKey }) => {
            const target: CaptureTarget = { player, action };
            const active = capturing !== null && targetId(capturing) === targetId(target);
            return (
              <div key={action} dir="ltr" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2">
                <span className="text-sm text-white/70">{t[labelKey]}</span>
                <button
                  type="button"
                  aria-label={`${title}: ${t[labelKey]}`}
                  onClick={() => beginCapture(target)}
                  className={`min-w-24 rounded-lg border px-3 py-1.5 font-display text-xs transition ${
                    active
                      ? 'border-amber-300/70 bg-amber-300/15 text-amber-100 animate-pulse'
                      : 'border-white/15 bg-black/30 text-white hover:border-white/35 hover:bg-white/10'
                  }`}
                >
                  {active ? t.settingsPressKey : formatKeyCode(keyBindings[player][action])}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const pauseTarget: CaptureTarget = { player: 'global', action: 'pause' };
  const isCapturingPause = capturing !== null && targetId(capturing) === targetId(pauseTarget);

  return (
    <div
      ref={screenRef}
      tabIndex={-1}
      className="absolute inset-0 z-30 overflow-y-auto bg-gradient-to-b from-[#02040af2] via-[#071522f2] to-[#02040af7] px-4 py-5 outline-none focus:outline-none backdrop-blur-md sm:px-8 sm:py-8"
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-display tracking-[0.12em] text-white/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <div className="text-right">
            <h1 className="font-display text-2xl tracking-[0.12em] text-white sm:text-3xl">{t.settingsTitle}</h1>
            <p className="mt-1 text-xs text-white/45">{t.settingsSubtitle}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <h2 className="font-display text-xs tracking-[0.22em] text-amber-200">{t.settingsAudioTitle}</h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-sm text-white/75">{t.settingsMuteLabel}</span>
              <button
                type="button"
                role="switch"
                aria-label={t.settingsMuteLabel}
                aria-checked={muted}
                onClick={onToggleMute}
                className={`flex min-w-28 items-center justify-center gap-2 rounded-xl border px-4 py-2 font-display text-xs tracking-widest transition ${
                  muted
                    ? 'border-rose-300/50 bg-rose-300/10 text-rose-100'
                    : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'
                }`}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {muted ? t.settingsOn : t.settingsOff}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <h2 className="font-display text-xs tracking-[0.22em] text-amber-200">{t.settingsDuration}</h2>
            <div className="mt-4 flex flex-wrap gap-2" dir="ltr">
              {MATCH_DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  aria-pressed={matchDuration === duration}
                  onClick={() => setMatchDuration(duration)}
                  className={`rounded-xl border px-4 py-2 font-display text-xs transition ${
                    matchDuration === duration
                      ? 'border-amber-300/60 bg-amber-300/15 text-amber-100'
                      : 'border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10'
                  }`}
                >
                  {duration} {t.settingsSeconds}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/40">{t.settingsDurationHint}</p>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xs tracking-[0.22em] text-sky-200">{t.settingsControls}</h2>
              <p className="mt-1 text-[11px] text-white/40">{t.settingsControlsHint}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetKeyBindings();
                setCapturing(null);
                setHasConflict(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-display tracking-wide text-white/65 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={14} /> {t.settingsReset}
            </button>
          </div>

          {hasConflict && <p role="alert" className="mt-3 text-xs text-rose-200">{t.settingsConflict}</p>}

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {renderPlayerBindings('p1', t.settingsP1, 'sky')}
            {renderPlayerBindings('p2', t.settingsP2, 'rose')}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3" dir="ltr">
            <span className="text-sm text-white/70">{t.settingsPause}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.settingsPause}
                onClick={() => beginCapture(pauseTarget)}
                className={`min-w-24 rounded-lg border px-3 py-1.5 font-display text-xs transition ${
                  isCapturingPause
                    ? 'border-amber-300/70 bg-amber-300/15 text-amber-100 animate-pulse'
                    : 'border-white/15 bg-black/30 text-white hover:border-white/35 hover:bg-white/10'
                }`}
              >
                {isCapturingPause ? t.settingsPressKey : formatKeyCode(keyBindings.pause)}
              </button>
            </div>
          </div>
          {capturing && (
            <button
              type="button"
              onClick={() => {
                setCapturing(null);
                setHasConflict(false);
              }}
              className="mt-3 text-xs text-white/50 underline decoration-white/25 underline-offset-4 hover:text-white"
            >
              {t.settingsCancel}
            </button>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
          <h2 className="mb-3 font-display text-xs tracking-[0.22em] text-emerald-200">{t.language}</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={lang === item.id}
                onClick={() => setLang(item.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                  lang === item.id
                    ? 'border-white/55 bg-white/15 text-white shadow-[0_0_18px_rgba(255,255,255,0.12)]'
                    : 'border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{item.flag}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-5 flex justify-end pb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3 font-display text-xs tracking-[0.15em] text-[#031524] transition hover:scale-[1.02] active:scale-95"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
        </div>
      </div>
    </div>
  );
}
