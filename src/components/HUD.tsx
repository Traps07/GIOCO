import { Volume2, VolumeX, Pause, Check, X } from 'lucide-react';
import type { Snapshot, PensSnap, PlayerCount } from '../game/engine';
import { getNationalTeam, type TeamSelection } from '../game/teams';
import { fmt, type Language, type Strings } from '../i18n';

interface Props {
  snap: Snapshot | null;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  playerCount: PlayerCount;
  teams: TeamSelection;
  lang: Language;
  goalBanner: { team: number; id: number } | null;
  eventBanner: { title: string; sub: string; tone: 'amber' | 'sky' | 'rose' | 'white'; id: number } | null;
  t: Strings;
}

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const TONE_CLASSES: Record<string, string> = {
  amber: 'text-amber-300',
  sky: 'text-sky-300 glow-sky-strong',
  rose: 'text-rose-300 glow-rose-strong',
  white: 'text-white glow-white',
};

function PenDots({ results, taken }: { results: PensSnap['results'][0]; taken: number }) {
  const slots = Math.max(5, taken + 1, results.length);
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: slots }, (_, i) => {
        const r = results[i];
        if (r === 'goal') {
          return (
            <span
              key={i}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            >
              <Check size={11} strokeWidth={4} className="text-emerald-950" />
            </span>
          );
        }
        if (r === 'save' || r === 'miss') {
          return (
            <span
              key={i}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/85 shadow-[0_0_8px_rgba(244,63,94,0.7)]"
            >
              <X size={11} strokeWidth={4} className="text-rose-50" />
            </span>
          );
        }
        const pending = i === taken;
        return (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border ${
              pending ? 'border-white/70 animate-pulse bg-white/10' : 'border-white/20'
            }`}
          />
        );
      })}
    </div>
  );
}

function PensPanel({ pens, t, playerCount, teams, lang }: {
  pens: PensSnap;
  t: Strings;
  playerCount: PlayerCount;
  teams: TeamSelection;
  lang: Language;
}) {
  const homeTeam = getNationalTeam(teams[0]);
  const awayTeam = getNationalTeam(teams[1]);
  const round = Math.min(pens.taken[0], pens.taken[1]) + 1;
  const suddenDeath = round > 5;
  const yourShot = pens.turn === 0;
  const shooterPrefix = playerCount === 2 ? `${yourShot ? 'P1' : 'P2'} · ` : '';
  const status =
    pens.stage === 'intro'
      ? playerCount === 2
        ? `${shooterPrefix}${t.psGetReadyShoot}`
        : yourShot
          ? t.psGetReadyShoot
          : t.psGetReadySave
      : pens.stage === 'aim'
        ? playerCount === 2
          ? `${shooterPrefix}${t.psAimShoot} · ${Math.ceil(pens.stageT)}`
          : yourShot
            ? `${t.psAimShoot} · ${Math.ceil(pens.stageT)}`
            : t.psSaveNow
        : pens.stage === 'kick'
          ? playerCount === 2
            ? `${shooterPrefix}${t.psYourShot}`
            : yourShot
              ? t.psYourShot
              : t.psTheirShot
          : '';
  return (
    <div className="mt-2 flex flex-col items-center gap-1.5 rounded-2xl border border-amber-300/30 bg-black/55 px-4 py-2 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      <span className="font-display text-[10px] tracking-[0.3em] text-amber-300">
        {suddenDeath ? t.psSuddenDeath : fmt(t.psSeries, { n: round })}
      </span>
      <div className="flex max-w-[90vw] flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="max-w-[32vw] truncate font-display text-[8px] tracking-wide sm:max-w-none sm:text-[9px]" style={{ color: homeTeam.kit.primary }}>
          {homeTeam.flag} {homeTeam.names[lang]}
        </span>
        <PenDots results={pens.results[0]} taken={pens.taken[0]} />
        <span className="font-display text-lg leading-none tabular-nums" style={{ color: homeTeam.kit.primary }}>{pens.score[0]}</span>
      </div>
      <div className="flex max-w-[90vw] flex-wrap items-center justify-center gap-2 sm:gap-3">
        <span className="max-w-[32vw] truncate font-display text-[8px] tracking-wide sm:max-w-none sm:text-[9px]" style={{ color: awayTeam.kit.primary }}>
          {awayTeam.flag} {awayTeam.names[lang]}
        </span>
        <PenDots results={pens.results[1]} taken={pens.taken[1]} />
        <span className="font-display text-lg leading-none tabular-nums" style={{ color: awayTeam.kit.primary }}>{pens.score[1]}</span>
      </div>
      <span className="font-display text-[10px] tracking-[0.2em]" style={{ color: yourShot ? homeTeam.kit.primary : awayTeam.kit.primary }}>
        {status}
      </span>
    </div>
  );
}

export default function HUD({ snap, muted, onToggleMute, onPause, playerCount, teams, lang, goalBanner, eventBanner, t }: Props) {
  if (!snap) return null;
  const homeTeam = getNationalTeam(teams[0]);
  const awayTeam = getNationalTeam(teams[1]);
  const inPens = snap.period === 'pens' && snap.pens;
  const inExtra = snap.period === 'extra';
  const urgent = snap.timeLeft <= 10 && snap.phase === 'play';
  const progress = snap.timeLeft / (inExtra ? 30 : 90);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* tabellone */}
      <div className="flex items-start justify-between px-4 pt-4 sm:px-6">
        <div className="w-24" />
        <div className="score-pill flex flex-col items-center">
          <div dir="ltr" className="flex max-w-[76vw] items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] sm:gap-4 sm:px-5">
            <div className="flex min-w-0 flex-col items-center">
              <span dir="auto" title={`${homeTeam.flag} ${homeTeam.names[lang]}`} className="max-w-[30vw] truncate font-display text-[8px] leading-tight tracking-wide text-white/75 sm:max-w-32 sm:text-[10px]">
                {homeTeam.flag} {homeTeam.names[lang]}
              </span>
              <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl" style={{ color: homeTeam.kit.primary, textShadow: `0 0 18px ${homeTeam.kit.glow}` }}>
                {snap.score[0]}
              </span>
            </div>
            <span className="font-display text-xl leading-none text-white/30">—</span>
            <div className="flex min-w-0 flex-col items-center">
              <span dir="auto" title={`${awayTeam.flag} ${awayTeam.names[lang]}`} className="max-w-[30vw] truncate font-display text-[8px] leading-tight tracking-wide text-white/75 sm:max-w-32 sm:text-[10px]">
                {awayTeam.flag} {awayTeam.names[lang]}
              </span>
              <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl" style={{ color: awayTeam.kit.primary, textShadow: `0 0 18px ${awayTeam.kit.glow}` }}>
                {snap.score[1]}
              </span>
            </div>
          </div>
          {inPens ? (
            <PensPanel pens={snap.pens!} t={t} playerCount={playerCount} teams={teams} lang={lang} />
          ) : (
            <>
              <div className={`mt-2 flex w-56 items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 backdrop-blur-md`}>
                <span dir="ltr" title={t.teamSizeDesc} className="shrink-0 font-display text-[9px] tabular-nums text-emerald-200/75">
                  {snap.teamSize}v{snap.teamSize}
                </span>
                <span className={`font-display text-sm tabular-nums leading-none ${urgent ? 'text-amber-300 animate-pulse' : 'text-white/85'}`}>
                  {fmtTime(snap.timeLeft)}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-[width] duration-150 ${urgent ? 'bg-amber-400' : inExtra ? 'bg-gradient-to-r from-amber-400 to-amber-300' : 'bg-gradient-to-r from-sky-400 to-rose-400'}`}
                    style={{
                      width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
                      ...(urgent || inExtra ? {} : { backgroundImage: `linear-gradient(to right, ${homeTeam.kit.primary}, ${awayTeam.kit.primary})` }),
                    }}
                  />
                </div>
              </div>
              {inExtra && (
                <div className="mt-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1">
                  <span className="font-display text-[10px] tracking-[0.3em] text-amber-300 animate-pulse">
                    {t.badgeGolden}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="pointer-events-auto flex w-24 justify-end gap-2">
          <button
            onClick={onToggleMute}
            className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            aria-label="Audio"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={onPause}
            className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            aria-label="Pause"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* banner GOL */}
      {goalBanner && (
        <div key={goalBanner.id} className="absolute inset-0 flex items-center justify-center">
          <div className="goal-banner text-center">
            <div
              className="font-display text-[clamp(3.5rem,13vw,9rem)] leading-none tracking-tight"
              style={{
                color: (goalBanner.team === 0 ? homeTeam : awayTeam).kit.primary,
                textShadow: `0 0 20px ${(goalBanner.team === 0 ? homeTeam : awayTeam).kit.glow}, 0 0 60px ${(goalBanner.team === 0 ? homeTeam : awayTeam).kit.glow}`,
              }}
            >
              {t.goal}
            </div>
            <div className="mt-2 font-display text-sm tracking-[0.2em] text-white/80 sm:text-base sm:tracking-[0.4em]" dir="auto">
              {(goalBanner.team === 0 ? homeTeam : awayTeam).flag} {(goalBanner.team === 0 ? homeTeam : awayTeam).names[lang]}
            </div>
          </div>
        </div>
      )}

      {/* banner eventi: supplementari / rigori / esiti */}
      {eventBanner && !goalBanner && (
        <div key={eventBanner.id} className="absolute inset-0 flex items-center justify-center">
          <div className="goal-banner text-center px-4">
            <div className={`font-display text-[clamp(2.4rem,9vw,6rem)] leading-none tracking-tight ${TONE_CLASSES[eventBanner.tone]}`}>
              {eventBanner.title}
            </div>
            <div className="mt-3 font-display text-xs sm:text-sm tracking-[0.4em] text-white/70">
              {eventBanner.sub}
            </div>
          </div>
        </div>
      )}

      {/* countdown */}
      {snap.phase === 'countdown' && snap.countdown > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-sm tracking-[0.5em] text-white/60">
            {inExtra ? t.extraTimeTitle : t.kickOff}
          </div>
          <div key={snap.countdown} className="count-pop font-display text-[clamp(5rem,18vw,11rem)] leading-none text-white glow-white">
            {snap.countdown}
          </div>
        </div>
      )}

      {/* controlli a fondo pagina (desktop) */}
      <div className="mt-auto hidden justify-center pb-4 md:flex">
        {inPens ? (
          playerCount === 2 ? (
            <div className="flex max-w-[96vw] flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-amber-300/25 bg-black/50 px-5 py-2 text-[10px] font-medium tracking-wide text-amber-100/80 backdrop-blur-md">
              <span style={{ color: homeTeam.kit.primary }}>P1 · {homeTeam.flag} {homeTeam.names[lang]}</span>
              <span><kbd>WASD</kbd> {t.hintAimUpDown} / {t.hintKeeperMove} · <kbd>Space</kbd> {t.hintKickPen} / {t.hintDive}</span>
              <span style={{ color: awayTeam.kit.primary }}>P2 · {awayTeam.flag} {awayTeam.names[lang]}</span>
              <span><kbd>↑ ↓ ← →</kbd> {t.hintAimUpDown} / {t.hintKeeperMove} · <kbd>Enter</kbd> {t.hintKickPen} / {t.hintDive}</span>
              <span><kbd>Esc</kbd> {t.kPause}</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-full border border-amber-300/25 bg-black/50 px-6 py-2 text-[11px] font-medium tracking-wide text-amber-100/80 backdrop-blur-md">
              {snap.pens!.turn === 0 ? (
                <>
                  <span><kbd>WASD</kbd> / <kbd>Frecce</kbd> {t.hintAimUpDown}</span>
                  <span className="text-white/20">•</span>
                  <span><kbd>Spazio</kbd> {t.hintKickPen}</span>
                </>
              ) : (
                <>
                  <span><kbd>WASD</kbd> / <kbd>Frecce</kbd> {t.hintKeeperMove}</span>
                  <span className="text-white/20">•</span>
                  <span><kbd>Spazio</kbd> {t.hintDive}</span>
                </>
              )}
              <span className="text-white/20">•</span>
              <span><kbd>Esc</kbd> {t.kPause}</span>
            </div>
          )
        ) : playerCount === 2 ? (
          <div className="grid w-full max-w-4xl grid-cols-1 gap-1.5 px-2 text-[10px] font-medium tracking-wide md:grid-cols-2">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border bg-black/50 px-3 py-2 text-white/65 backdrop-blur-md" style={{ borderColor: `${homeTeam.kit.primary}55` }}>
              <span className="font-display" style={{ color: homeTeam.kit.primary }}>P1 · {homeTeam.flag} {homeTeam.names[lang]}</span>
              <span><kbd>WASD</kbd> {t.kMove}</span>
              <span><kbd>Shift</kbd> {t.kSprint}</span>
              <span><kbd>Space</kbd> {t.kShoot}</span>
              <span><kbd>C</kbd> {t.kPass}</span>
              <span><kbd>V</kbd> {t.kCross}</span>
              <span><kbd>F</kbd> {t.kCurve}</span>
              <span><kbd>R</kbd> {t.kPower}</span>
              <span><kbd>E</kbd> {t.kTackle}</span>
              {snap.teamSize > 1 && <span><kbd>Q</kbd> {t.kSwitch}</span>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border bg-black/50 px-3 py-2 text-white/65 backdrop-blur-md" style={{ borderColor: `${awayTeam.kit.primary}55` }}>
              <span className="font-display" style={{ color: awayTeam.kit.primary }}>P2 · {awayTeam.flag} {awayTeam.names[lang]}</span>
              <span><kbd>↑ ↓ ← →</kbd> {t.kMove}</span>
              <span><kbd>RShift</kbd> {t.kSprint}</span>
              <span><kbd>Enter</kbd> {t.kShoot}</span>
              <span><kbd>/</kbd> {t.kPass}</span>
              <span><kbd>M</kbd> {t.kCross}</span>
              <span><kbd>U</kbd> {t.kCurve}</span>
              <span><kbd>O</kbd> {t.kPower}</span>
              <span><kbd>I</kbd> {t.kTackle}</span>
              {snap.teamSize > 1 && <span><kbd>.</kbd> {t.kSwitch}</span>}
              <span><kbd>Esc</kbd> {t.kPause}</span>
            </div>
          </div>
        ) : (
          <div className="flex max-w-[96vw] flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-medium tracking-wide text-white/55 backdrop-blur-md">
            <span><kbd>WASD</kbd> / <kbd>Frecce</kbd> {t.kMove}</span>
            <span className="text-white/20">•</span>
            <span><kbd>Shift</kbd> {t.kSprint}</span>
            <span className="text-white/20">•</span>
            <span><kbd>Spazio</kbd> {t.kShoot}</span>
            <span className="text-white/20">•</span>
            <span><kbd>C</kbd> {t.kPass}</span>
            <span className="text-white/20">•</span>
            <span><kbd>V</kbd> {t.kCross}</span>
            <span className="text-white/20">•</span>
            <span><kbd>F</kbd> {t.kCurve}</span>
            <span className="text-white/20">•</span>
            <span><kbd>R</kbd> {t.kPower}</span>
            <span className="text-white/20">•</span>
            <span><kbd>E</kbd> {t.kTackle}</span>
            {snap.teamSize > 1 && (
              <>
                <span className="text-white/20">•</span>
                <span><kbd>Q</kbd> {t.kSwitch}</span>
              </>
            )}
            <span className="text-white/20">•</span>
            <span><kbd>Esc</kbd> {t.kPause}</span>
          </div>
        )}
      </div>
    </div>
  );
}
