import { useState } from 'react';
import { Play, RotateCcw, Home, Trophy, Frown, Handshake, ChevronRight, ChevronLeft, Zap, Target, Timer, Languages, User, Users } from 'lucide-react';
import type { Difficulty, DecidedBy, GameMode, PlayerCount, TeamSize } from '../game/engine';
import { getNationalTeam, NATIONAL_TEAMS, type NationalTeam, type NationalTeamId, type TeamKit, type TeamSelection } from '../game/teams';
import { getActiveTournamentMatch, getGroupStandings, type TournamentGroup, type TournamentMatch, type TournamentState } from '../game/tournament';
import { fmt, LANGUAGES, type Language, type Strings } from '../i18n';

interface ScreenProps {
  t: Strings;
}

const TEAM_SIZES: TeamSize[] = [1, 2, 3, 4, 5];

function kitPatternBackground(kit: TeamKit) {
  switch (kit.pattern) {
    case 'vertical':
      return `${kit.trim ? `linear-gradient(90deg, transparent 0 15%, ${kit.trim} 15% 18%, transparent 18% 82%, ${kit.trim} 82% 85%, transparent 85%), ` : ''}linear-gradient(90deg, ${kit.primary} 0 25%, ${kit.secondary} 25% 42%, ${kit.primary} 42% 58%, ${kit.secondary} 58% 75%, ${kit.primary} 75%)`;
    case 'horizontal':
      return `linear-gradient(180deg, ${kit.primary} 0 34%, ${kit.secondary} 34% 58%, ${kit.accent} 58% 66%, ${kit.primary} 66%)`;
    case 'sash':
      return `linear-gradient(135deg, ${kit.primary} 0 38%, ${kit.secondary} 38% 49%, ${kit.accent} 49% 54%, ${kit.secondary} 54% 65%, ${kit.primary} 65%)`;
    case 'checks':
      return `conic-gradient(${kit.secondary} 25%, transparent 0 50%, ${kit.secondary} 0 75%, transparent 0)`;
    case 'cross':
      return `linear-gradient(90deg, transparent 0 43%, ${kit.secondary} 43% 57%, transparent 57%), linear-gradient(0deg, transparent 0 41%, ${kit.secondary} 41% 59%, transparent 59%)`;
    case 'center':
      return `linear-gradient(90deg, transparent 0 43%, ${kit.secondary} 43% 57%, transparent 57%), radial-gradient(circle at 50% 50%, ${kit.accent} 0 15%, transparent 16%)`;
    case 'chevron':
      return `linear-gradient(135deg, transparent 0 39%, ${kit.secondary} 40% 47%, transparent 48%), linear-gradient(45deg, transparent 0 39%, ${kit.secondary} 40% 47%, transparent 48%), linear-gradient(135deg, transparent 0 54%, ${kit.accent} 55% 59%, transparent 60%), linear-gradient(135deg, transparent 0 63%, ${kit.trim ?? kit.accent} 64% 67%, transparent 68%)`;
    case 'pinstripe':
      return `repeating-linear-gradient(90deg, transparent 0 7px, ${kit.secondary} 7px 9px), linear-gradient(90deg, ${kit.primary} 0 80%, ${kit.accent} 80% 100%)`;
    case 'waves':
      return `repeating-radial-gradient(ellipse at 50% 130%, transparent 0 7px, ${kit.secondary} 8px 10px, transparent 11px 16px), linear-gradient(180deg, ${kit.primary}, ${kit.primary})`;
    case 'panels':
      return `linear-gradient(90deg, ${kit.secondary} 0 15%, transparent 15% 85%, ${kit.secondary} 85%), linear-gradient(0deg, transparent 0 82%, ${kit.accent} 82% 100%)`;
    case 'tonal':
      return `repeating-linear-gradient(135deg, ${kit.secondary}44 0 2px, transparent 2px 9px), linear-gradient(${kit.primary}, ${kit.primary})`;
  }
}

function KitPreview({ team, className = 'h-14 w-12' }: { team: NationalTeam; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-t-[35%] rounded-b-md border border-white/30 ${className}`}
      style={{
        backgroundColor: team.kit.primary,
        backgroundImage: kitPatternBackground(team.kit),
        backgroundSize: team.kit.pattern === 'checks' ? '14px 14px' : '100% 100%',
        clipPath: 'polygon(27% 0, 73% 0, 100% 18%, 85% 39%, 75% 32%, 75% 100%, 25% 100%, 25% 32%, 15% 39%, 0 18%)',
        boxShadow: `0 0 24px ${team.kit.glow}`,
      }}
    />
  );
}

export function MenuScreen({
  difficulty,
  setDifficulty,
  mode,
  setMode,
  playerCount,
  setPlayerCount,
  teamSize,
  setTeamSize,
  teams,
  lang,
  setLang,
  onStart,
  onTournament,
  t,
}: ScreenProps & {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  mode: GameMode;
  setMode: (m: GameMode) => void;
  playerCount: PlayerCount;
  setPlayerCount: (count: PlayerCount) => void;
  teamSize: TeamSize;
  setTeamSize: (size: TeamSize) => void;
  teams: TeamSelection;
  lang: Language;
  setLang: (l: Language) => void;
  onStart: () => void;
  onTournament: () => void;
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
  const homeTeam = getNationalTeam(teams[0]);
  const awayTeam = getNationalTeam(teams[1]);

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
            SOCCER {mode === 'match' ? `${teamSize}v${teamSize}` : 'PENS'}
          </span>
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base text-white/60">
          {playerCount === 2 ? (
            fmt(t.tagLocal, { home: `${homeTeam.flag} ${homeTeam.names[lang]}`, away: `${awayTeam.flag} ${awayTeam.names[lang]}` })
          ) : (
            <>
              {t.tagA}
              <span className="font-semibold" style={{ color: homeTeam.kit.primary, textShadow: `0 0 12px ${homeTeam.kit.glow}` }}>
                {homeTeam.flag} {homeTeam.names[lang]}
              </span>
              {t.tagB}
              <span className="font-semibold" style={{ color: awayTeam.kit.primary, textShadow: `0 0 12px ${awayTeam.kit.glow}` }}>
                {awayTeam.flag} {awayTeam.names[lang]}
              </span>
              {t.tagC}
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

        {mode === 'match' && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="font-display text-[10px] tracking-[0.3em] text-white/50">{t.teamSizeTitle}</span>
              <span className="mt-0.5 text-[9px] text-white/35">{t.teamSizeDesc}</span>
            </div>
            <div dir="ltr" className="flex gap-1.5 sm:gap-2">
              {TEAM_SIZES.map((size) => {
                const active = teamSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${size}v${size} · ${t.teamSizeDesc}`}
                    onClick={() => setTeamSize(size)}
                    className={`flex h-10 w-12 items-center justify-center rounded-xl border font-display text-xs tracking-wide transition ${
                      active
                        ? 'border-emerald-300/70 bg-emerald-400/15 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.18)]'
                        : 'border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    {size}v{size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
        <button
          onClick={onTournament}
          className="mt-2 flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl border border-amber-300/35 bg-amber-300/10 px-5 py-2.5 text-left text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/15"
        >
          <Trophy size={18} className="shrink-0 text-amber-300" />
          <span className="flex flex-col">
            <span className="font-display text-xs tracking-[0.16em]">{t.tournamentButton}</span>
            <span className="mt-0.5 text-[9px] text-white/45">{t.tournamentButtonDesc}</span>
          </span>
        </button>

        {playerCount === 2 ? (
          <div className="mt-5 grid w-full max-w-3xl grid-cols-1 gap-2 text-left sm:grid-cols-2">
            <div
              className="flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-[10px] text-white/60"
              style={{ borderColor: `${homeTeam.kit.primary}66`, backgroundColor: `${homeTeam.kit.primary}12` }}
            >
              <span className="font-display text-[11px] tracking-widest" style={{ color: homeTeam.kit.primary }}>
                P1 · {homeTeam.flag} {homeTeam.names[lang]}
              </span>
              <span><kbd>WASD</kbd> {t.kMove} · <kbd>Shift</kbd> {t.kSprint}</span>
              <span><kbd>Space</kbd> {t.kShoot} · <kbd>C</kbd> {t.kPass}{teamSize > 1 && <> · <kbd>Q</kbd> {t.kSwitch}</>}</span>
            </div>
            <div
              className="flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-[10px] text-white/60"
              style={{ borderColor: `${awayTeam.kit.primary}66`, backgroundColor: `${awayTeam.kit.primary}12` }}
            >
              <span className="font-display text-[11px] tracking-widest" style={{ color: awayTeam.kit.primary }}>
                P2 · {awayTeam.flag} {awayTeam.names[lang]}
              </span>
              <span><kbd>↑ ↓ ← →</kbd> {t.kMove} · <kbd>RShift</kbd> {t.kSprint}</span>
              <span><kbd>Enter</kbd> {t.kShoot} · <kbd>/</kbd> {t.kPass}{teamSize > 1 && <> · <kbd>.</kbd> {t.kSwitch}</>}</span>
            </div>
          </div>
        ) : (
          <div className={`mt-7 hidden gap-2 sm:grid ${teamSize > 1 ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {[
              ['WASD · Frecce', t.menuMove],
              ['Shift', t.menuSprint],
              ['Spazio', t.menuShoot],
              ['C', t.menuPass],
              ...(teamSize > 1 ? [['Q · Tab', t.menuSwitch]] : []),
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

export function TeamSelectScreen({
  playerCount,
  teamSize,
  mode,
  teams,
  lang,
  onChooseTeam,
  onBack,
  onStart,
  t,
}: ScreenProps & {
  playerCount: PlayerCount;
  teamSize: TeamSize;
  mode: GameMode;
  teams: TeamSelection;
  lang: Language;
  onChooseTeam: (side: 0 | 1, team: NationalTeamId) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const [activeSide, setActiveSide] = useState<0 | 1>(0);
  const sideName = (side: 0 | 1) =>
    side === 0 ? t.teamHome : playerCount === 2 ? t.teamAway : t.teamCpu;
  const selectedTeam = getNationalTeam(teams[activeSide]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-[#02040ae8] via-[#02040acb] to-[#02040af2] px-4 py-5 backdrop-blur-md sm:px-6">
      <div className="my-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="mb-4 flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <div className="flex-1 text-center">
            <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)] leading-tight text-white">{t.teamSelectTitle}</h2>
            <p className="mx-auto mt-1 max-w-2xl text-[11px] text-white/55 sm:text-sm">{t.teamSelectSubtitle}</p>
          </div>
          <div className="w-[84px] shrink-0" />
        </div>

        {mode === 'match' && (
          <div dir="ltr" className="mb-3 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-100/75">
            {teamSize}v{teamSize} · {t.teamSizeDesc}
          </div>
        )}

        <div className="mb-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {teams.map((teamId, side) => {
            const sideIndex = side as 0 | 1;
            const team = getNationalTeam(teamId);
            const active = activeSide === sideIndex;
            return (
              <button
                key={sideIndex}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveSide(sideIndex)}
                className="flex items-center gap-4 rounded-2xl border bg-black/40 px-4 py-3 text-left transition"
                style={{
                  borderColor: active ? team.kit.primary : `${team.kit.primary}55`,
                  boxShadow: active ? `0 0 24px ${team.kit.glow}` : 'none',
                }}
              >
                <KitPreview team={team} className="h-16 w-12" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-[10px] tracking-[0.25em] text-white/45">{sideName(sideIndex)}</span>
                  <span className="truncate font-display text-lg text-white sm:text-xl">{team.flag} {team.names[lang]}</span>
                  <span className="text-[10px] text-white/40">{active ? `${t.teamSelectPick} ${sideName(sideIndex)}` : sideIndex === 0 ? 'P1' : playerCount === 2 ? 'P2' : t.teamCpu}</span>
                </span>
                {active && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.kit.primary, boxShadow: `0 0 14px ${team.kit.glow}` }} />}
              </button>
            );
          })}
        </div>

        <p className="mb-2 font-display text-[10px] tracking-[0.3em] text-white/45">
          {t.teamSelectPick} · {sideName(activeSide)} · {selectedTeam.flag} {selectedTeam.names[lang]}
        </p>

        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {NATIONAL_TEAMS.map((team) => {
            const selectedSide = teams.indexOf(team.id);
            const active = selectedSide === activeSide;
            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChooseTeam(activeSide, team.id)}
                className="group flex min-h-[108px] flex-col items-center justify-between rounded-2xl border bg-black/45 p-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 sm:min-h-[118px] sm:p-3"
                style={{
                  borderColor: selectedSide >= 0 ? `${team.kit.primary}bb` : 'rgba(255,255,255,0.10)',
                  backgroundColor: active ? `${team.kit.primary}24` : undefined,
                  boxShadow: active ? `0 0 22px ${team.kit.glow}` : 'none',
                }}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="text-xl leading-none">{team.flag}</span>
                  <KitPreview team={team} className="h-9 w-7" />
                </span>
                <span className="mt-1 line-clamp-2 w-full text-center text-[10px] font-semibold text-white/85 sm:text-xs">{team.names[lang]}</span>
                <span className="mt-1 min-h-3 font-display text-[8px] tracking-widest" style={{ color: selectedSide >= 0 ? team.kit.primary : 'rgba(255,255,255,0.28)' }}>
                  {selectedSide === 0 ? 'P1' : selectedSide === 1 ? (playerCount === 2 ? 'P2' : 'IA') : ' '}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex w-full flex-col-reverse justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 font-display text-xs tracking-[0.15em] text-white/80 transition hover:bg-white/10"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="btn-play flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-8 py-3 font-display text-sm tracking-[0.15em] text-[#031524] transition hover:scale-[1.03] active:scale-95"
          >
            <Play size={18} className="fill-current" /> {mode === 'pens' ? t.btnPlayPens : t.btnPlay}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TournamentSetupScreen({ teamSize, initialTeam, lang, onBack, onStart, t }: ScreenProps & {
  teamSize: TeamSize;
  initialTeam: NationalTeamId;
  lang: Language;
  onBack: () => void;
  onStart: (team: NationalTeamId) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<NationalTeamId>(initialTeam);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-[#02040ae8] via-[#02040acb] to-[#02040af2] px-4 py-6 backdrop-blur-md sm:px-6">
      <div className="my-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="mb-5 flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <div className="flex-1 text-center">
            <h2 className="font-display text-[clamp(1.7rem,5vw,3.2rem)] leading-tight text-white">{t.tournamentTitle}</h2>
            <p className="mx-auto mt-1 max-w-2xl text-[11px] text-white/55 sm:text-sm">{t.tournamentSubtitle}</p>
          </div>
          <div className="w-[84px] shrink-0" />
        </div>

        <div className="mb-2 flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[10px] text-amber-100/80 sm:text-xs">
          <Trophy size={15} className="shrink-0 text-amber-300" />
          <span>{t.tournamentFormat}</span>
        </div>
        <div dir="ltr" className="mb-4 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-100/75">
          {teamSize}v{teamSize} · {t.teamSizeDesc}
        </div>
        <p className="mb-3 font-display text-[10px] tracking-[0.3em] text-white/45">{t.tournamentSelectTeam}</p>
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {NATIONAL_TEAMS.map((team) => {
            const active = selectedTeam === team.id;
            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTeam(team.id)}
                className="flex min-h-[112px] flex-col items-center justify-between rounded-2xl border bg-black/45 p-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 sm:min-h-[126px] sm:p-3"
                style={{
                  borderColor: active ? `${team.kit.primary}dd` : 'rgba(255,255,255,0.10)',
                  backgroundColor: active ? `${team.kit.primary}26` : undefined,
                  boxShadow: active ? `0 0 24px ${team.kit.glow}` : 'none',
                }}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="text-xl leading-none">{team.flag}</span>
                  <KitPreview team={team} className="h-10 w-8" />
                </span>
                <span className="mt-1 line-clamp-2 w-full text-center text-[10px] font-semibold text-white/85 sm:text-xs">{team.names[lang]}</span>
                {active && <span className="font-display text-[8px] tracking-widest text-amber-200">P1</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex w-full flex-col-reverse justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 font-display text-xs tracking-[0.15em] text-white/80 transition hover:bg-white/10"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <button
            type="button"
            onClick={() => onStart(selectedTeam)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-200 px-8 py-3 font-display text-sm tracking-[0.15em] text-[#251805] transition hover:scale-[1.03] active:scale-95"
          >
            <Play size={18} className="fill-current" /> {t.tournamentStart}
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentMatchCard({ match, activeMatchId, playerTeam, lang, t }: {
  match: TournamentMatch | null;
  activeMatchId: string | null;
  playerTeam: NationalTeamId;
  lang: Language;
  t: Strings;
}) {
  if (!match) {
    return (
      <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-2 text-[10px] text-white/35">
        {t.tournamentPending}
      </div>
    );
  }
  const home = getNationalTeam(match.home);
  const away = getNationalTeam(match.away);
  const active = match.id === activeMatchId;
  const homeWon = match.winner === match.home;
  const awayWon = match.winner === match.away;
  return (
    <div className={`rounded-xl border px-3 py-2 ${active ? 'border-amber-300/55 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.14)]' : 'border-white/8 bg-black/30'}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-left text-[10px] ${homeWon ? 'font-bold text-white' : homeWon === false && match.winner ? 'text-white/45' : 'text-white/75'}`} dir="auto">
          {home.flag} {home.names[lang]}
        </span>
        <span className={`shrink-0 font-display text-xs tabular-nums ${match.score ? 'text-white' : 'text-white/30'}`}>
          {match.score ? `${match.score[0]}–${match.score[1]}` : 'VS'}
        </span>
        <span className={`min-w-0 flex-1 truncate text-right text-[10px] ${awayWon ? 'font-bold text-white' : awayWon === false && match.winner ? 'text-white/45' : 'text-white/75'}`} dir="auto">
          {away.flag} {away.names[lang]}
        </span>
      </div>
      {match.pens && (
        <div className="mt-1 text-center font-display text-[8px] tracking-wider text-amber-200/70">
          PK {match.pens[0]}–{match.pens[1]}
        </div>
      )}
      {active && (
        <div className="mt-1 text-center font-display text-[8px] tracking-[0.18em] text-amber-200">
          {getNationalTeam(playerTeam).flag} P1
        </div>
      )}
    </div>
  );
}

function TournamentBracket({ tournament, lang, t }: { tournament: TournamentState; lang: Language; t: Strings }) {
  const rounds: { title: string; matches: (TournamentMatch | null)[] }[] = [
    { title: t.tournamentStageQuarterfinals, matches: tournament.quarterfinals.length ? tournament.quarterfinals : [null, null, null, null] },
    { title: t.tournamentStageSemifinals, matches: tournament.semifinals.length ? tournament.semifinals : [null, null] },
    { title: t.tournamentStageFinal, matches: [tournament.final] },
  ];
  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
      {rounds.map((round) => (
        <section key={round.title} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
          <h3 className="text-center font-display text-[9px] tracking-[0.22em] text-amber-200/80">{round.title}</h3>
          <div className="flex flex-col gap-2">
            {round.matches.map((match, index) => (
              <TournamentMatchCard
                key={match?.id ?? `${round.title}-${index}`}
                match={match}
                activeMatchId={tournament.activeMatchId}
                playerTeam={tournament.playerTeam}
                lang={lang}
                t={t}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TournamentScreen({ tournament, lang, onPlayNext, onNewTournament, onMenu, t }: ScreenProps & {
  tournament: TournamentState;
  lang: Language;
  onPlayNext: () => void;
  onNewTournament: () => void;
  onMenu: () => void;
}) {
  const activeMatch = getActiveTournamentMatch(tournament);
  const opponentId = activeMatch
    ? activeMatch.home === tournament.playerTeam ? activeMatch.away : activeMatch.home
    : null;
  const opponent = opponentId ? getNationalTeam(opponentId) : null;
  const playerTeam = getNationalTeam(tournament.playerTeam);
  const stageLabel = tournament.stage === 'groups'
    ? t.tournamentStageGroups
    : tournament.stage === 'quarterfinals'
      ? t.tournamentStageQuarterfinals
      : tournament.stage === 'semifinals'
        ? t.tournamentStageSemifinals
        : tournament.stage === 'final'
          ? t.tournamentStageFinal
          : t.tournamentStageComplete;
  const champion = tournament.champion ? getNationalTeam(tournament.champion) : null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-[#02040ae8] via-[#02040acb] to-[#02040af2] px-4 py-5 backdrop-blur-md sm:px-6">
      <div className="my-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="mb-4 flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> {t.btnMenu}
          </button>
          <div className="flex-1 text-center">
            <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)] leading-tight text-white">{t.tournamentTitle}</h2>
            <p className="mt-1 font-display text-[10px] tracking-[0.2em] text-amber-200/80">{stageLabel}</p>
          </div>
          <div className="flex w-[84px] shrink-0 justify-end text-xl">{playerTeam.flag}</div>
        </div>

        {tournament.stage === 'groups' ? (
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tournament.groups.map((group: TournamentGroup) => {
              const standings = getGroupStandings(group);
              return (
                <section key={group.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-left">
                  <h3 className="font-display text-center text-[10px] tracking-[0.22em] text-amber-200/80">{fmt(t.tournamentGroupLabel, { group: group.id })}</h3>
                  <div className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
                    <div className="grid grid-cols-[minmax(0,1fr)_26px_32px_32px] gap-1 border-b border-white/10 px-2 py-1.5 font-display text-[8px] text-white/35">
                      <span>{t.tournamentTeam}</span><span className="text-center">{t.tournamentPlayed}</span><span className="text-center">{t.tournamentPoints}</span><span className="text-center">{t.tournamentGoalDiff}</span>
                    </div>
                    {standings.map((standing, index) => {
                      const team = getNationalTeam(standing.team);
                      const goalDiff = standing.goalsFor - standing.goalsAgainst;
                      const isPlayer = standing.team === tournament.playerTeam;
                      return (
                        <div key={standing.team} className={`grid grid-cols-[minmax(0,1fr)_26px_32px_32px] items-center gap-1 px-2 py-1.5 text-[9px] ${index < 2 ? 'bg-emerald-300/[0.04]' : ''}`}>
                          <span className={`min-w-0 truncate ${isPlayer ? 'font-bold text-amber-100' : 'text-white/75'}`} dir="auto">{team.flag} {team.names[lang]}</span>
                          <span className="text-center tabular-nums text-white/45">{standing.played}</span>
                          <span className="text-center tabular-nums font-bold text-white/85">{standing.points}</span>
                          <span className="text-center tabular-nums text-white/45">{goalDiff > 0 ? `+${goalDiff}` : goalDiff}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.matches.map((match) => (
                      <TournamentMatchCard
                        key={match.id}
                        match={match}
                        activeMatchId={tournament.activeMatchId}
                        playerTeam={tournament.playerTeam}
                        lang={lang}
                        t={t}
                      />
                    ))}
                  </div>
                  <span className="text-center text-[8px] text-white/35">{t.tournamentStandings}</span>
                </section>
              );
            })}
          </div>
        ) : (
          <TournamentBracket tournament={tournament} lang={lang} t={t} />
        )}

        {champion && (
          <div className="mt-4 flex flex-col items-center gap-1 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-6 py-3 shadow-[0_0_26px_rgba(251,191,36,0.12)]">
            <span className="flex items-center gap-2 font-display text-[10px] tracking-[0.25em] text-amber-200"><Trophy size={14} /> {tournament.eliminated ? t.tournamentStageComplete : t.tournamentChampion}</span>
            <span className="font-display text-lg text-white" dir="auto">{champion.flag} {champion.names[lang]}</span>
            {tournament.eliminated && <span className="max-w-xl text-[10px] text-white/50">{t.tournamentEliminated}</span>}
          </div>
        )}

        <div className="mt-4 flex w-full flex-col items-center justify-center gap-2 sm:flex-row">
          {activeMatch && opponent && (
            <button
              type="button"
              onClick={onPlayNext}
              className="flex w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-200 px-7 py-3 font-display text-xs tracking-[0.15em] text-[#251805] transition hover:scale-[1.02] active:scale-95"
            >
              <Play size={16} className="fill-current" />
              <span className="flex flex-col items-start">
                <span>{t.tournamentPlayNext}</span>
                <span className="mt-0.5 text-[10px] font-semibold tracking-normal">{playerTeam.flag} {playerTeam.names[lang]} · {opponent.flag} {opponent.names[lang]}</span>
              </span>
            </button>
          )}
          {tournament.stage === 'complete' && (
            <button
              type="button"
              onClick={onNewTournament}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-200 px-7 py-3 font-display text-xs tracking-[0.15em] text-[#251805] transition hover:scale-[1.02] active:scale-95"
            >
              <RotateCcw size={16} /> {t.tournamentNew}
            </button>
          )}
        </div>
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
  teams,
  lang,
  onRematch,
  rematchLabel,
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
  teams: TeamSelection;
  lang: Language;
  onRematch: () => void;
  rematchLabel?: string;
  onMenu: () => void;
}) {
  const homeWinner = winner === 0;
  const draw = winner === -1;
  const homeTeam = getNationalTeam(teams[0]);
  const awayTeam = getNationalTeam(teams[1]);
  const winningTeam = homeWinner ? homeTeam : awayTeam;
  const headline = draw ? t.draw : playerCount === 2 ? t.win : homeWinner ? t.win : t.lose;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#02040ab8] backdrop-blur-md">
      <div className="menu-stagger flex flex-col items-center text-center px-6">
        <div
          className={`mb-4 rounded-full p-4 ${draw ? 'bg-white/10 text-white/70' : ''}`}
          style={draw ? undefined : { color: winningTeam.kit.primary, backgroundColor: `${winningTeam.kit.primary}24` }}
        >
          {draw ? <Handshake size={40} /> : playerCount === 2 || homeWinner ? <Trophy size={40} /> : <Frown size={40} />}
        </div>
        <h2
          className={`font-display text-[clamp(2.6rem,9vw,5.5rem)] leading-none ${draw ? 'text-white' : ''}`}
          style={draw ? undefined : { color: winningTeam.kit.primary, textShadow: `0 0 20px ${winningTeam.kit.glow}, 0 0 60px ${winningTeam.kit.glow}` }}
        >
          {headline}
        </h2>
        <p dir="auto" className="mt-2 text-sm tracking-wide text-white/65">
          {draw
            ? `${homeTeam.flag} ${homeTeam.names[lang]} — ${awayTeam.flag} ${awayTeam.names[lang]}`
            : `${winningTeam.flag} ${winningTeam.names[lang]}`}
        </p>
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
            <span className="font-display text-5xl tabular-nums" style={{ color: homeTeam.kit.primary }}>{pens[0]}</span>
            <span className="font-display text-2xl text-white/30">—</span>
            <span className="font-display text-5xl tabular-nums" style={{ color: awayTeam.kit.primary }}>{pens[1]}</span>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/50 px-8 py-3 backdrop-blur-md">
            <span className="font-display text-5xl tabular-nums" style={{ color: homeTeam.kit.primary }}>{score[0]}</span>
            <span className="font-display text-2xl text-white/30">—</span>
            <span className="font-display text-5xl tabular-nums" style={{ color: awayTeam.kit.primary }}>{score[1]}</span>
          </div>
        )}
        {pens && !pensOnly && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-400/10 px-5 py-2 backdrop-blur-md">
            <span className="font-display text-[10px] tracking-[0.25em] text-amber-200">{t.pensScoreLabel}</span>
            <span className="font-display text-2xl tabular-nums" style={{ color: homeTeam.kit.primary }}>{pens[0]}</span>
            <span className="font-display text-base text-white/30">—</span>
            <span className="font-display text-2xl tabular-nums" style={{ color: awayTeam.kit.primary }}>{pens[1]}</span>
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
            <RotateCcw size={17} /> {rematchLabel ?? t.btnRematch}
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
