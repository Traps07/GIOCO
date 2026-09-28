import { Play, RotateCcw, Home, Trophy, Frown, Handshake, ChevronRight, Zap, Target, Timer, Languages, User, Users } from 'lucide-react';
import type { Difficulty, DecidedBy, GameMode, PlayerCount } from '../game/engine';
import { LANGUAGES, type Language, type Strings } from '../i18n';

interface ScreenProps {
  t: Strings;
}

export function MenuScreen({
  difficulty,
  setDifficulty,
  mode,
  setMode,
  playerCount,
  setPlayerCount,
  lang,
  setLang,
  onStart,
  t,
}: ScreenProps & {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  mode: GameMode;
  setMode: (m: GameMode) => void;
  playerCount: PlayerCount;
  setPlayerCount: (count: PlayerCount) => void;
  lang: Language;
  setLang: (l: Language) => void;
  onStart: () => void;
}) {
  const DIFF_INFO: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'easy', label: t.diffEasy, desc: t.diffEasyDesc },
    { id: 'normal', label: t.diffNormal, desc: t.diffNormalDesc },
    { id: 'hard', label: t.diffHard, desc: t.diffHardDesc },
  ];
  const MODE_INFO: { id: GameMode; label: string; desc: string; icon: 'timer' | 'target' }[] = [
    { id: 'match', label: t.modeMatch, desc: t.modeMatchDesc, icon: 'timer' },
    { id: 'pens', label: t.modePens, desc: t.modePensDesc, icon: 'target' },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#02040ad9] via-[#02040a8c] to-[#02040ae6] backdrop-blur-[2px] py-6">
      <div className="menu-stagger flex flex-col items-center px-6 text-center my-auto">
        <div className={`mb-3 flex items-center gap-2 rounded-full border px-4 py-1.5 ${
          mode === 'pens' ? 'border-amber-400/30 bg-amber-400/10' : 'border-sky-400/30 bg-sky-400/10'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${mode === 'pens' ? 'bg-amber-300' : 'bg-sky-300'}`} />
          <span className={`font-display text-[10px] tracking-[0.4em] ${mode === 'pens' ? 'text-amber-200' : 'text-sky-200'}`}>
            {mode === 'pens' ? t.badgePens : t.badgeMatch}
          </span>
        </div>

        <h1 className="font-display leading-[0.9] tracking-tight">
          <span className="block text-[clamp(2.4rem,9vw,5.5rem)] text-white">STREET</span>
          <span className="block text-[clamp(2.4rem,9vw,5.5rem)] text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-rose-300 glow-soft">
            SOCCER 3v3
          </span>
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base text-white/60">
          {playerCount === 2 ? (
            t.tagLocal
          ) : (
            <>
              {t.tagA}<span className="text-sky-300 font-semibold">{t.tagBlu}</span>{t.tagB}
              <span className="text-rose-300 font-semibold">{t.tagRossa}</span>{t.tagC}
            </>
          )}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-amber-200/80">
          <span className="flex items-center gap-1.5"><Zap size={12} /> {t.featGolden}</span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5"><Target size={12} /> {t.featPens}</span>
        </div>

        {/* giocatori */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <span className="font-display text-[10px] tracking-[0.3em] text-white/40">{t.playerCountTitle}</span>
          <div className="flex gap-2 sm:gap-3">
            {[
              { id: 1 as const, label: t.playerSolo, desc: t.playerSoloDesc, Icon: User },
              { id: 2 as const, label: t.playerDuo, desc: t.playerDuoDesc, Icon: Users },
            ].map(({ id, label, desc, Icon }) => {
              const active = playerCount === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPlayerCount(id)}
                  className={`group flex min-w-36 flex-col items-center rounded-2xl border px-5 sm:px-8 py-2.5 transition-all duration-200 ${
                    active
                      ? id === 2
                        ? 'border-rose-300/70 bg-rose-400/15 shadow-[0_0_30px_rgba(251,113,133,0.2)]'
                        : 'border-sky-300/70 bg-sky-400/15 shadow-[0_0_30px_rgba(56,189,248,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                  }`}
                >
                  <span className={`flex items-center gap-2 font-display text-xs tracking-[0.15em] ${
                    active ? (id === 2 ? 'text-rose-200' : 'text-sky-200') : 'text-white/75'
                  }`}>
                    <Icon size={14} /> {label}
                  </span>
                  <span className="mt-1 text-[10px] text-white/40">{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* modalità */}
        <div className="mt-6 flex gap-2 sm:gap-3">
          {MODE_INFO.map((m) => {
            const Icon = m.icon === 'timer' ? Timer : Target;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`group flex flex-col items-center rounded-2xl border px-5 sm:px-8 py-3 transition-all duration-200 ${
                  active
                    ? 'border-amber-300/70 bg-amber-400/15 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span className={`flex items-center gap-2 font-display text-xs tracking-[0.2em] ${active ? 'text-amber-200' : 'text-white/75'}`}>
                  <Icon size={14} /> {m.label}
                </span>
                <span className="mt-1 text-[10px] text-white/40">{m.desc}</span>
              </button>
            );
          })}
        </div>

        {/* difficoltà */}
        <div className="mt-3 flex gap-2 sm:gap-3">
          {DIFF_INFO.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`group flex flex-col items-center rounded-2xl border px-4 sm:px-6 py-3 transition-all duration-200 ${
                difficulty === d.id
                  ? 'border-sky-300/70 bg-sky-400/15 shadow-[0_0_30px_rgba(56,189,248,0.25)]'
                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
              }`}
            >
              <span className={`font-display text-xs tracking-[0.2em] ${difficulty === d.id ? 'text-sky-200' : 'text-white/75'}`}>
                {d.label}
              </span>
              <span className="mt-1 text-[10px] text-white/40">{d.desc}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onStart}
          className="btn-play group mt-7 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-10 py-4 font-display text-lg tracking-[0.15em] text-[#031524] transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <Play size={22} className="fill-current" />
          {mode === 'pens' ? t.btnPlayPens : t.btnPlay}
        </button>

        {playerCount === 2 ? (
          <div className="mt-5 grid w-full max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-xl border border-sky-300/20 bg-sky-400/5 px-4 py-3 text-[10px] text-white/60">
              <span className="font-display text-[11px] tracking-widest text-sky-200">P1 · {t.teamBlue}</span>
              <span><kbd>WASD</kbd> {t.kMove} · <kbd>Shift</kbd> {t.kSprint}</span>
              <span><kbd>Space</kbd> {t.kShoot} · <kbd>C</kbd> {t.kPass} · <kbd>Q</kbd> {t.kSwitch}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/5 px-4 py-3 text-[10px] text-white/60">
              <span className="font-display text-[11px] tracking-widest text-rose-200">P2 · {t.teamRed}</span>
              <span><kbd>↑ ↓ ← →</kbd> {t.kMove} · <kbd>RShift</kbd> {t.kSprint}</span>
              <span><kbd>Enter</kbd> {t.kShoot} · <kbd>/</kbd> {t.kPass} · <kbd>.</kbd> {t.kSwitch}</span>
            </div>
          </div>
        ) : (
          <div className="mt-7 hidden grid-cols-5 gap-2 sm:grid">
            {[
              ['WASD · Frecce', t.menuMove],
              ['Shift', t.menuSprint],
              ['Spazio', t.menuShoot],
              ['C', t.menuPass],
              ['Q · Tab', t.menuSwitch],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                <span className="font-display text-[11px] text-sky-200 tracking-wide">{k}</span>
                <span className="text-[10px] text-white/45">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* selezione lingua */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="flex items-center gap-1.5 font-display text-[10px] tracking-[0.3em] text-white/40">
            <Languages size={12} /> {t.language}
          </span>
          <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
            {LANGUAGES.map((l) => {
              const active = lang === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  title={l.name}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all duration-150 ${
                    active
                      ? 'border-white/60 bg-white/15 text-white shadow-[0_0_16px_rgba(255,255,255,0.15)]'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/90'
                  }`}
                >
                  <span className="text-sm leading-none">{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-5 text-[11px] text-white/35 sm:hidden">
          {playerCount === 2 ? t.playerDuoDesc : t.mobileHint}
        </p>
      </div>
    </div>
  );
}

export function PauseScreen({
  onResume,
  onRestart,
  onMenu,
  t,
}: ScreenProps & {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#02040ab3] backdrop-blur-md">
      <div className="menu-stagger flex flex-col items-center text-center px-6">
        <h2 className="font-display text-[clamp(2.5rem,8vw,5rem)] text-white leading-none">{t.pauseTitle}</h2>
        <p className="mt-2 text-sm text-white/50 tracking-wide">{t.pauseSub}</p>
        <div className="mt-8 flex flex-col gap-3 w-64">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3.5 font-display text-sm tracking-[0.15em] text-[#031524] transition hover:scale-[1.03] active:scale-95"
          >
            <ChevronRight size={18} className="fill-current" /> {t.btnResume}
          </button>
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 py-3 font-display text-sm tracking-[0.15em] text-white/85 transition hover:bg-white/15 active:scale-95"
          >
            <RotateCcw size={16} /> {t.btnRestart}
          </button>
          <button
            onClick={onMenu}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 py-3 font-display text-sm tracking-[0.15em] text-white/85 transition hover:bg-white/15 active:scale-95"
          >
            <Home size={16} /> {t.btnMenu}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EndScreen({
  winner,
  score,
  shots,
  pens,
  decidedBy,
  pensOnly,
  playerCount,
  onRematch,
  onMenu,
  t,
}: ScreenProps & {
  winner: number;
  score: [number, number];
  shots: [number, number];
  pens: [number, number] | null;
  decidedBy: DecidedBy;
  pensOnly: boolean;
  playerCount: PlayerCount;
  onRematch: () => void;
  onMenu: () => void;
}) {
  const blueWinner = winner === 0;
  const draw = winner === -1;
  const headline = draw
    ? t.draw
    : playerCount === 2
      ? `${blueWinner ? t.teamBlue : t.teamRed} · ${t.win}`
      : blueWinner
        ? t.win
        : t.lose;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#02040ab8] backdrop-blur-md">
      <div className="menu-stagger flex flex-col items-center text-center px-6">
        <div className={`mb-4 rounded-full p-4 ${draw ? 'bg-white/10 text-white/70' : blueWinner ? 'bg-sky-400/15 text-sky-300' : 'bg-rose-400/15 text-rose-300'}`}>
          {draw ? <Handshake size={40} /> : playerCount === 2 || blueWinner ? <Trophy size={40} /> : <Frown size={40} />}
        </div>
        <h2
          className={`font-display text-[clamp(2.6rem,9vw,5.5rem)] leading-none ${
            draw ? 'text-white' : blueWinner ? 'text-sky-300 glow-sky-strong' : 'text-rose-300 glow-rose-strong'
          }`}
        >
          {headline}
        </h2>
        {decidedBy === 'golden' && (
          <p className="mt-2 flex items-center gap-1.5 font-display text-xs tracking-[0.3em] text-amber-300">
            <Zap size={13} /> {t.decGolden}
          </p>
        )}
        {decidedBy === 'pens' && (
          <p className="mt-2 flex items-center gap-1.5 font-display text-xs tracking-[0.3em] text-amber-300">
            <Target size={13} /> {pensOnly ? t.pensOnlyTitle : t.decPens}
          </p>
        )}
        {pensOnly && pens ? (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-8 py-3 backdrop-blur-md">
            <span className="font-display text-5xl text-sky-300 tabular-nums">{pens[0]}</span>
            <span className="font-display text-2xl text-white/30">—</span>
            <span className="font-display text-5xl text-rose-300 tabular-nums">{pens[1]}</span>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/50 px-8 py-3 backdrop-blur-md">
            <span className="font-display text-5xl text-sky-300 tabular-nums">{score[0]}</span>
            <span className="font-display text-2xl text-white/30">—</span>
            <span className="font-display text-5xl text-rose-300 tabular-nums">{score[1]}</span>
          </div>
        )}
        {pens && !pensOnly && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-5 py-2 backdrop-blur-md">
            <span className="font-display text-[10px] tracking-[0.25em] text-amber-200">{t.pensScoreLabel}</span>
            <span className="font-display text-2xl text-sky-300 tabular-nums">{pens[0]}</span>
            <span className="font-display text-base text-white/30">—</span>
            <span className="font-display text-2xl text-rose-300 tabular-nums">{pens[1]}</span>
          </div>
        )}
        {!pensOnly && (
          <p className="mt-3 text-xs tracking-[0.3em] text-white/40 font-display">
            {t.shots} {shots[0]} · {shots[1]}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRematch}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-8 py-3.5 font-display text-sm tracking-[0.15em] text-[#031524] transition hover:scale-[1.03] active:scale-95"
          >
            <RotateCcw size={17} /> {t.btnRematch}
          </button>
          <button
            onClick={onMenu}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-8 py-3.5 font-display text-sm tracking-[0.15em] text-white/85 transition hover:bg-white/15 active:scale-95"
          >
            <Home size={16} /> {t.btnMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
