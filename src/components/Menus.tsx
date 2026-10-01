import { useMemo, useState, type ReactNode } from 'react';
import {
  Play, RotateCcw, Home, Trophy, Frown, Handshake, ChevronRight, ChevronLeft, Zap, Target, Timer, User, Users,
  Gamepad2, Settings, Search, X, Globe2, SlidersHorizontal, Shuffle, Star, Flag, Check, Layers, Minus, Plus, Info,
  Save, Trash2,
} from 'lucide-react';
import type { Difficulty, DecidedBy, GameMode, MatchDuration, PlayerCount, TeamSize } from '../game/engine';
import type { TournamentSave } from '../game/save';
import { formatKeyCode, type KeyboardBindings } from '../game/keyboard';
import {
  CONFEDERATION_META,
  NATIONAL_TEAMS,
  TEAM_COUNT,
  filterTeams,
  getNationalTeam,
  getTeamQuality,
  resolveKits,
  type Confederation,
  type NationalTeam,
  type NationalTeamId,
  type TeamKit,
  type TeamSelection,
  type Tier,
} from '../game/teams';
import {
  DEFAULT_TOURNAMENT_CONFIG,
  FORMAT_IDS,
  PARTICIPANT_OPTIONS,
  QUALIFY_OPTIONS,
  SEEDING_IDS,
  poolCandidates,
  drawParticipants,
  getActiveTournamentMatch,
  getGroupMatches,
  getGroupStandings,
  knockoutRoundSizes,
  getPlayerRecord,
  roundKeyForSize,
  summarizeConfig,
  TOURNAMENT_PRESETS,
  totalGroupMatchdays,
  type CupFormat,
  type SeedingMode,
  type TournamentConfig,
  type TournamentGroup,
  type TournamentMatch,
  type TournamentState,
} from '../game/tournament';
import { fmt, type Language, type Strings } from '../i18n';

export interface TournamentLaunch {
  playerTeam: NationalTeamId;
  participants: NationalTeamId[];
  config: TournamentConfig;
  match: { teamSize: TeamSize; matchDuration: MatchDuration; difficulty: Difficulty };
}

interface ScreenProps {
  t: Strings;
}

const TEAM_SIZES: TeamSize[] = [1, 2, 3, 4, 5];

/** PRNG deterministico: il pulsante «ri-sorteggia» cambia solo il seme. */
const randomSeed = (seed: number): (() => number) => {
  let state = (seed * 2654435761 + 12345) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const CONF_IDS: Confederation[] = ['uefa', 'conmebol', 'concacaf', 'caf', 'afc', 'ofc'];

const confName = (conf: Confederation, t: Strings) =>
  conf === 'uefa'
    ? t.confEurope
    : conf === 'conmebol'
      ? t.confSouthAmerica
      : conf === 'concacaf'
        ? t.confNorthAmerica
        : conf === 'caf'
          ? t.confAfrica
          : conf === 'afc'
            ? t.confAsia
            : t.confOceania;

const confCode = (conf: Confederation) => CONFEDERATION_META[conf].code;

const ROUND_LABELS: Record<string, keyof Strings> = {
  final: 'tournamentStageFinal',
  semifinals: 'tournamentStageSemifinals',
  quarterfinals: 'tournamentStageQuarterfinals',
  eighthfinals: 'tournamentStageEighthfinals',
  round32: 'tournamentStageRound32',
  round64: 'tournamentStageRound64',
};

// ------------------------------------------------------------------ divise

function kitPatternBackground(kit: TeamKit): string {
  const sheen = 'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.22), transparent 62%)';
  switch (kit.pattern) {
    case 'vertical':
      return `${kit.trim ? `linear-gradient(90deg, transparent 0 15%, ${kit.trim} 15% 18%, transparent 18% 82%, ${kit.trim} 82% 85%, transparent 85%), ` : ''}linear-gradient(90deg, ${kit.primary} 0 25%, ${kit.secondary} 25% 42%, ${kit.primary} 42% 58%, ${kit.secondary} 58% 75%, ${kit.primary} 75%)`;
    case 'horizontal':
      return `linear-gradient(180deg, ${kit.primary} 0 34%, ${kit.secondary} 34% 58%, ${kit.accent} 58% 66%, ${kit.primary} 66%)`;
    case 'hoops':
      return `repeating-linear-gradient(180deg, ${kit.primary} 0 10px, ${kit.secondary} 10px 17px, ${kit.accent} 17px 19px)`;
    case 'halves':
      return `linear-gradient(90deg, ${kit.primary} 0 50%, ${kit.secondary} 50% 100%), linear-gradient(180deg, transparent 0 78%, ${kit.accent} 78% 82%, transparent 82%)`;
    case 'sash':
      return `linear-gradient(135deg, ${kit.primary} 0 38%, ${kit.secondary} 38% 49%, ${kit.accent} 49% 54%, ${kit.secondary} 54% 65%, ${kit.primary} 65%)`;
    case 'checks':
      return `conic-gradient(${kit.secondary} 25%, transparent 0 50%, ${kit.secondary} 0 75%, transparent 0)`;
    case 'cross':
      return `linear-gradient(90deg, transparent 0 43%, ${kit.secondary} 43% 57%, transparent 57%), linear-gradient(0deg, transparent 0 41%, ${kit.secondary} 41% 59%, transparent 59%), radial-gradient(circle at 50% 50%, ${kit.accent} 0 7%, transparent 8%)`;
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
    case 'flag':
      return `linear-gradient(180deg, ${kit.primary} 0 33.4%, ${kit.secondary} 33.4% 66.7%, ${kit.accent} 66.7% 100%)`;
    case 'star':
      return `radial-gradient(circle at 50% 42%, ${kit.accent} 0 8.5%, transparent 9%), linear-gradient(180deg, ${kit.primary}, ${kit.primary}), ${sheen}`;
    case 'gradient':
      return `linear-gradient(135deg, ${kit.primary} 0 30%, ${kit.secondary} 72%, ${kit.accent} 100%)`;
    case 'sleeves':
      return `linear-gradient(90deg, ${kit.secondary} 0 19%, ${kit.primary} 19% 81%, ${kit.secondary} 81% 100%), linear-gradient(0deg, transparent 0 92%, ${kit.accent} 92%)`;
    case 'solid':
    default:
      return `linear-gradient(180deg, transparent 0 88%, ${kit.trim ?? kit.accent} 88% 92%, transparent 92%), ${sheen}, linear-gradient(${kit.primary}, ${kit.primary})`;
  }
}

function KitPreview({ team, className = 'h-14 w-12', kit }: { team: NationalTeam; className?: string; kit?: TeamKit }) {
  const active = kit ?? team.kit;
  return (
    <div
      aria-hidden="true"
      title={team.kitSource === 'fifa' ? team.names.en : undefined}
      className={`shrink-0 rounded-t-[35%] rounded-b-md border border-white/30 ${className}`}
      style={{
        backgroundColor: active.primary,
        backgroundImage: kitPatternBackground(active),
        backgroundSize: active.pattern === 'checks' ? '14px 14px' : '100% 100%',
        clipPath: 'polygon(27% 0, 73% 0, 100% 18%, 85% 39%, 75% 32%, 75% 100%, 25% 100%, 25% 32%, 15% 39%, 0 18%)',
        boxShadow: `0 0 22px ${active.glow}`,
      }}
    />
  );
}

/** Maglia + pantaloncini + calzettoni, come una scheda kit completa. */
function KitStrip({ kit }: { kit: TeamKit }) {
  return (
    <span dir="ltr" className="flex items-end gap-1.5">
      <span
        className="h-7 w-6 rounded-t-[35%] rounded-b-[3px] border border-white/25"
        style={{ backgroundColor: kit.primary, backgroundImage: kitPatternBackground(kit), backgroundSize: kit.pattern === 'checks' ? '9px 9px' : '100% 100%' }}
      />
      <span className="flex flex-col items-center gap-0.5">
        <span className="h-3.5 w-5 rounded-[3px] border border-white/25" style={{ backgroundColor: kit.secondary }} />
        <span className="h-3 w-4 rounded-b-[3px] border border-white/25" style={{ backgroundColor: kit.accent }} />
      </span>
    </span>
  );
}

function TierStars({ tier, className = '' }: { tier: Tier; className?: string }) {
  return (
    <span dir="ltr" className={`flex items-center gap-px ${className}`} title={`${tier}/5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} size={9} className={step <= tier ? 'fill-amber-300 text-amber-300' : 'text-white/20'} />
      ))}
    </span>
  );
}

// ------------------------------------------------------------------ picker

interface NationPickerProps {
  t: Strings;
  lang: Language;
  /** Sottoinsieme ammesso (per il roster manuale del torneo). */
  limit?: readonly NationalTeam[];
  mode: 'single' | 'multiple';
  value?: NationalTeamId;
  values?: readonly NationalTeamId[];
  onPick?: (id: NationalTeamId) => void;
  onToggle?: (id: NationalTeamId) => void;
  disabled?: boolean;
  dense?: boolean;
  pageSize?: number;
}

function NationPicker({
  t,
  lang,
  limit,
  mode,
  value,
  values,
  onPick,
  onToggle,
  disabled,
  dense,
  pageSize = 96,
}: NationPickerProps) {
  const [query, setQuery] = useState('');
  const [conf, setConf] = useState<Confederation | 'all'>('all');
  const [visible, setVisible] = useState(pageSize);
  const pool = limit ? limit : NATIONAL_TEAMS;

  const results = useMemo(() => {
    const filtered = filterTeams({ query, confederation: conf }, lang, pool);
    if (query.trim()) return filtered; // l'ordinamento per rilevanza è già nel filtro
    return [...filtered].sort((a, b) => a.names[lang].localeCompare(b.names[lang]));
  }, [query, conf, lang, pool]);

  const selectedSet = new Set(mode === 'multiple' ? (values ?? []) : [value]);
  const shown = results.slice(0, visible);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(pageSize);
            }}
            placeholder={t.teamSearchPlaceholder}
            aria-label={t.teamSearchPlaceholder}
            dir="auto"
            className="w-full rounded-xl border border-white/15 bg-black/45 py-2 pe-8 ps-9 text-xs text-white placeholder:text-white/35 focus:border-sky-300/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label={t.settingsCancel}
            >
              <X size={12} />
            </button>
          )}
        </div>
        <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center font-display text-[9px] tracking-[0.18em] text-white/55">
          {results.length} / {pool.length}
        </span>
      </div>

      <div dir="ltr" className="mt-2 flex w-full flex-wrap justify-center gap-1.5">
        <button
          type="button"
          onClick={() => setConf('all')}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-display tracking-[0.16em] transition ${
            conf === 'all' ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-black/30 text-white/55 hover:border-white/25'
          }`}
        >
          <Globe2 size={11} /> {t.teamFilterAll}
        </button>
        {CONF_IDS.map((id) => {
          const [a, b] = CONFEDERATION_META[id].colors;
          const active = conf === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setConf(active ? 'all' : id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-display tracking-[0.16em] transition ${
                active ? 'text-white' : 'border-white/10 bg-black/30 text-white/55 hover:border-white/25'
              }`}
              style={active ? { borderColor: `${a}aa`, backgroundColor: `${a}22`, backgroundImage: `linear-gradient(120deg, ${a}33, ${b}33)` } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: `linear-gradient(120deg, ${a}, ${b})` }} />
              {confCode(id)}
              <span className="text-white/35">{pool.filter((team) => team.confederation === id).length}</span>
            </button>
          );
        })}
      </div>

      <div className={`mt-3 grid w-full gap-2 ${dense ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
        {shown.map((team) => {
          const selected = selectedSet.has(team.id);
          return (
            <button
              key={team.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled && !selected}
              onClick={() => (mode === 'multiple' ? onToggle?.(team.id) : onPick?.(team.id))}
              className="group relative flex min-h-[96px] flex-col items-center justify-between rounded-2xl border bg-black/45 p-2 text-center transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[104px] sm:p-2.5"
              style={{
                borderColor: selected ? `${team.kit.primary}dd` : 'rgba(255,255,255,0.10)',
                backgroundColor: selected ? `${team.kit.primary}26` : undefined,
                boxShadow: selected ? `0 0 22px ${team.kit.glow}` : 'none',
              }}
            >
              <span className="flex w-full items-center justify-between gap-1">
                <span className="truncate font-display text-[8px] tracking-[0.16em] text-white/40">{team.code}</span>
                {selected && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/90 text-black">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="flex w-full items-center justify-between gap-1">
                <span className="text-lg leading-none">{team.flag}</span>
                <KitPreview team={team} className="h-9 w-7" />
              </span>
              <span className="line-clamp-2 w-full text-[9px] leading-tight font-semibold text-white/85 sm:text-[10px]">{team.names[lang]}</span>
              <span className="flex w-full items-center justify-between">
                <TierStars tier={team.tier} />
                <span className="font-display text-[7px] tracking-[0.14em] text-white/35">{confCode(team.confederation)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {results.length > shown.length && (
        <button
          type="button"
          onClick={() => setVisible((current) => current + pageSize)}
          className="mt-3 rounded-xl border border-white/15 bg-white/5 px-5 py-2 font-display text-[10px] tracking-[0.18em] text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {results.length - shown.length} →
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- controlli

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  tone = 'sky',
}: {
  options: { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (id: T) => void;
  tone?: 'sky' | 'amber' | 'emerald';
}) {
  const toneMap: Record<string, string> = {
    sky: 'border-sky-300/70 bg-sky-400/15 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.18)]',
    amber: 'border-amber-300/70 bg-amber-400/15 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.18)]',
    emerald: 'border-emerald-300/70 bg-emerald-400/15 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.18)]',
  };
  return (
    <div dir="ltr" className="flex flex-wrap justify-center gap-1.5">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={String(option.id)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-1.5 transition ${
              active ? toneMap[tone] : 'border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10'
            }`}
          >
            <span className="font-display text-[11px] tracking-[0.1em]">{option.label}</span>
            {option.hint && <span className="mt-0.5 text-[8px] text-white/40">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SwitchRow({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
        checked ? 'border-emerald-300/50 bg-emerald-400/12' : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className="flex min-w-0 flex-col">
        <span className={`text-[11px] font-semibold ${checked ? 'text-emerald-100' : 'text-white/70'}`}>{label}</span>
        {hint && <span className="mt-0.5 text-[9px] text-white/40">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-emerald-300/80' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function SetupSection({ icon: Icon, title, children, tone = 'white' }: { icon: typeof Trophy; title: string; children: ReactNode; tone?: 'white' | 'amber' }) {
  return (
    <section className={`w-full rounded-2xl border p-3 text-left sm:p-4 ${tone === 'amber' ? 'border-amber-300/25 bg-amber-300/[0.06]' : 'border-white/10 bg-black/30'}`}>
      <h3 className={`mb-2.5 flex items-center gap-2 font-display text-[10px] tracking-[0.24em] ${tone === 'amber' ? 'text-amber-200' : 'text-white/55'}`}>
        <Icon size={13} /> {title}
      </h3>
      {children}
    </section>
  );
}

// --------------------------------------------------------------- menu

export function MenuScreen({
  difficulty,
  setDifficulty,
  mode,
  setMode,
  playerCount,
  setPlayerCount,
  teamSize,
  setTeamSize,
  matchDuration,
  teams,
  lang,
  keyBindings,
  onStart,
  onTournament,
  onSettings,
  resume,
  onResume,
  onDiscardResume,
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
  matchDuration: MatchDuration;
  teams: TeamSelection;
  lang: Language;
  keyBindings: KeyboardBindings;
  onStart: () => void;
  onTournament: () => void;
  onSettings: () => void;
  /** Torneo ripartito dall'ultimo salvataggio automatico. */
  resume?: TournamentSave | null;
  onResume?: () => void;
  onDiscardResume?: () => void;
}) {
  const savedCup = resume?.tournament ?? null;
  const savedRecord = savedCup ? getPlayerRecord(savedCup) : null;
  const savedTeam = savedCup ? getNationalTeam(savedCup.playerTeam) : null;
  const DIFF_INFO: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'easy', label: t.diffEasy, desc: t.diffEasyDesc },
    { id: 'normal', label: t.diffNormal, desc: t.diffNormalDesc },
    { id: 'hard', label: t.diffHard, desc: t.diffHardDesc },
  ];
  const MODE_INFO: { id: GameMode; label: string; desc: string; icon: 'timer' | 'target' }[] = [
    { id: 'match', label: `${t.modeMatch} · ${matchDuration}s`, desc: t.modeMatchDesc, icon: 'timer' },
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
            {mode === 'pens' ? t.badgePens : fmt(t.badgeMatch, { seconds: matchDuration })}
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
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-amber-200/80">
          <span className="flex items-center gap-1.5"><Globe2 size={12} /> {fmt(t.tournamentAvailable, { n: TEAM_COUNT })}</span>
          <span className="text-white/20">•</span>
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
            <span className="mt-0.5 text-[9px] text-white/45">{fmt(t.tournamentButtonDesc, { n: TEAM_COUNT })}</span>
          </span>
        </button>
        {savedCup && onResume && (
          <div className="mt-2 flex w-full max-w-xs items-stretch gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-left transition hover:border-emerald-200/60">
            <Save size={15} className="mt-0.5 shrink-0 text-emerald-300" />
            <button type="button" onClick={onResume} className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-display text-[10px] tracking-[0.16em] text-emerald-100">
                {savedCup.stage === 'complete' ? t.menuResumeFinished : t.menuResumeTitle}
                {savedCup.champion ? ` · ${getNationalTeam(savedCup.champion).flag} ${getNationalTeam(savedCup.champion).code}` : ''}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-white/50">
                {savedTeam ? `${savedTeam.flag} ${savedTeam.names[lang]}` : ''} ·{' '}
                {fmt(t.menuResumeInfo, { n: savedCup.participants.length, p: savedRecord?.played ?? 0 })}
              </span>
              <span className="mt-0.5 block font-display text-[9px] tracking-[0.14em] text-emerald-200/80">
                {savedCup.stage === 'complete' ? t.menuResumeView : t.menuResumeButton}
              </span>
            </button>
            {onDiscardResume && (
              <button
                type="button"
                onClick={onDiscardResume}
                aria-label={t.menuResumeDiscard}
                title={t.menuResumeDiscard}
                className="flex items-center rounded-xl border border-white/10 bg-black/25 px-2 text-white/45 transition hover:border-rose-300/45 hover:text-rose-200"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
        <button
          onClick={onSettings}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2 text-[10px] font-display tracking-[0.18em] text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          <Settings size={14} /> {t.settingsButton}
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
              <span><kbd>{[keyBindings.p1.up, keyBindings.p1.left, keyBindings.p1.down, keyBindings.p1.right].map(formatKeyCode).join(' ')}</kbd> {t.kMove} · <kbd>{formatKeyCode(keyBindings.p1.sprint)}</kbd> {t.kSprint}</span>
              <span><kbd>{formatKeyCode(keyBindings.p1.shoot)}</kbd> {t.kShoot} · <kbd>{formatKeyCode(keyBindings.p1.pass)}</kbd> {t.kPass} · <kbd>{formatKeyCode(keyBindings.p1.cross)}</kbd> {t.kCross} · <kbd>{formatKeyCode(keyBindings.p1.curve)}</kbd> {t.kCurve}</span>
              <span><kbd>{formatKeyCode(keyBindings.p1.power)}</kbd> {t.kPower} · <kbd>{formatKeyCode(keyBindings.p1.tackle)}</kbd> {t.kTackle}{teamSize > 1 && <> · <kbd>{formatKeyCode(keyBindings.p1.switch)}</kbd> {t.kSwitch}</>}</span>
            </div>
            <div
              className="flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-[10px] text-white/60"
              style={{ borderColor: `${awayTeam.kit.primary}66`, backgroundColor: `${awayTeam.kit.primary}12` }}
            >
              <span className="font-display text-[11px] tracking-widest" style={{ color: awayTeam.kit.primary }}>
                P2 · {awayTeam.flag} {awayTeam.names[lang]}
              </span>
              <span><kbd>{[keyBindings.p2.up, keyBindings.p2.left, keyBindings.p2.down, keyBindings.p2.right].map(formatKeyCode).join(' ')}</kbd> {t.kMove} · <kbd>{formatKeyCode(keyBindings.p2.sprint)}</kbd> {t.kSprint}</span>
              <span><kbd>{formatKeyCode(keyBindings.p2.shoot)}</kbd> {t.kShoot} · <kbd>{formatKeyCode(keyBindings.p2.pass)}</kbd> {t.kPass} · <kbd>{formatKeyCode(keyBindings.p2.cross)}</kbd> {t.kCross} · <kbd>{formatKeyCode(keyBindings.p2.curve)}</kbd> {t.kCurve}</span>
              <span><kbd>{formatKeyCode(keyBindings.p2.power)}</kbd> {t.kPower} · <kbd>{formatKeyCode(keyBindings.p2.tackle)}</kbd> {t.kTackle}{teamSize > 1 && <> · <kbd>{formatKeyCode(keyBindings.p2.switch)}</kbd> {t.kSwitch}</>}</span>
            </div>
          </div>
        ) : (
          <div className="mt-7 hidden max-w-5xl flex-wrap justify-center gap-2 sm:flex">
            {[
              [[keyBindings.p1.up, keyBindings.p1.left, keyBindings.p1.down, keyBindings.p1.right].map(formatKeyCode).join(' '), t.menuMove],
              [formatKeyCode(keyBindings.p1.sprint), t.menuSprint],
              [formatKeyCode(keyBindings.p1.shoot), t.menuShoot],
              [formatKeyCode(keyBindings.p1.pass), t.menuPass],
              [formatKeyCode(keyBindings.p1.cross), t.menuCross],
              [formatKeyCode(keyBindings.p1.curve), t.menuCurve],
              [formatKeyCode(keyBindings.p1.power), t.menuPower],
              [formatKeyCode(keyBindings.p1.tackle), t.menuTackle],
              ...(teamSize > 1 ? [[formatKeyCode(keyBindings.p1.switch), t.menuSwitch]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex min-w-20 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                <span className="font-display text-[11px] text-sky-200 tracking-wide">{k}</span>
                <span className="text-[10px] text-white/45">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex max-w-4xl items-start justify-center gap-2 text-left text-[9px] leading-relaxed text-white/40">
          <Gamepad2 size={14} className="mt-0.5 shrink-0 text-sky-200/70" />
          <span>{t.gamepadHint}</span>
        </div>

        <p className="mt-5 text-[11px] text-white/35 sm:hidden">
          {playerCount === 2 ? t.playerDuoDesc : t.mobileHint}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------- scelta nazionale

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
  const [kitsHome, kitsAway] = resolveKits(teams[0], teams[1]);
  const clash = kitsAway === getNationalTeam(teams[1]).awayKit;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-[#02040ae8] via-[#02040acb] to-[#02040af2] px-4 py-5 backdrop-blur-md sm:px-6">
      <div className="my-auto flex w-full max-w-6xl flex-col items-center text-center">
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

        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          {mode === 'match' && (
            <div dir="ltr" className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-100/75">
              {teamSize}v{teamSize} · {t.teamSizeDesc}
            </div>
          )}
          <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] text-white/55">
            {fmt(t.teamSelectCount, { n: TEAM_COUNT })}
          </div>
          {clash && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] text-amber-100/80">
              <Info size={11} /> {getNationalTeam(teams[1]).flag} {getNationalTeam(teams[1]).names[lang]} · {t.teamKitAwayClash}
            </div>
          )}
        </div>

        <div className="mb-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {teams.map((teamId, side) => {
            const sideIndex = side as 0 | 1;
            const team = getNationalTeam(teamId);
            const kit = sideIndex === 1 ? kitsAway : kitsHome;
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
                <KitPreview team={team} className="h-16 w-12" kit={kit} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-[10px] tracking-[0.25em] text-white/45">{sideName(sideIndex)}</span>
                  <span className="truncate font-display text-lg text-white sm:text-xl">{team.flag} {team.names[lang]}</span>
                  <span className="flex items-center gap-2 text-[10px] text-white/40">
                    <TierStars tier={team.tier} />
                    {confName(team.confederation, t)} · {team.kitSource === 'fifa' ? t.teamKitFifa : t.teamKitFlag}
                  </span>
                </span>
                {active && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.kit.primary, boxShadow: `0 0 14px ${team.kit.glow}` }} />}
              </button>
            );
          })}
        </div>

        <div className="mb-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {teams.map((teamId, side) => {
            const team = getNationalTeam(teamId);
            const quality = Math.round(getTeamQuality(teamId) * 100);
            return (
              <div key={side} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5">
                <span className="shrink-0 font-display text-[9px] tracking-[0.2em] text-white/45">{t.teamPowerLabel}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full transition-all duration-300"
                    style={{ width: `${quality}%`, backgroundColor: team.kit.primary, boxShadow: `0 0 12px ${team.kit.glow}` }}
                  />
                </span>
                <span className="shrink-0 font-display text-[10px] tabular-nums text-white/70">{team.strength}</span>
              </div>
            );
          })}
        </div>
        <p className="mb-3 text-center text-[9px] text-white/40 sm:text-[10px]">{t.teamPowerHint}</p>

        <p className="mb-2 font-display text-[10px] tracking-[0.3em] text-white/45">
          {t.teamSelectPick} · {sideName(activeSide)} · {selectedTeam.flag} {selectedTeam.names[lang]}
        </p>

        <NationPicker
          t={t}
          lang={lang}
          mode="single"
          value={teams[activeSide]}
          onPick={(id) => onChooseTeam(activeSide, id)}
        />

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

// ---------------------------------------------------------- creazione torneo

const FORMAT_LABELS: Record<CupFormat, { label: (t: Strings) => string; desc: (t: Strings) => string }> = {
  cup: { label: (t) => t.tournamentFormatCup, desc: (t) => t.tournamentFormatCupDesc },
  groups: { label: (t) => t.tournamentFormatGroups, desc: (t) => t.tournamentFormatGroupsDesc },
  league: { label: (t) => t.tournamentFormatLeague, desc: (t) => t.tournamentFormatLeagueDesc },
  knockout: { label: (t) => t.tournamentFormatKnockout, desc: (t) => t.tournamentFormatKnockoutDesc },
};

const PRESET_LABELS: Record<string, string> = {
  wc48: 'MONDIALE 48',
  wc32: 'MONDIALE 32',
  euro: 'CAMPIONATO EUROPEO',
  america: "COPA AMÉRICA",
  africa: "COPPA D'AFRICA",
  asia: 'COPPA ASIATICA',
  oceania: "COPPA D'OCEANIA",
  micro: 'NAZIONI MINORI',
  league: 'GIRONE MONDIALE',
  sudden: 'TABELLONE SECCO',
};

export function TournamentSetupScreen({
  teamSize,
  matchDuration,
  difficulty,
  initialTeam,
  lang,
  onBack,
  onStart,
  t,
}: ScreenProps & {
  teamSize: TeamSize;
  matchDuration: MatchDuration;
  difficulty: Difficulty;
  initialTeam: NationalTeamId;
  lang: Language;
  onBack: () => void;
  onStart: (launch: TournamentLaunch) => void;
}) {
  const [playerTeam, setPlayerTeam] = useState<NationalTeamId>(initialTeam);
  const [confederations, setConfederations] = useState<Confederation[]>([]);
  const [minTier, setMinTier] = useState<Tier | 0>(0);
  const [manual, setManual] = useState(false);
  const [manualTeams, setManualTeams] = useState<NationalTeamId[]>([]);
  const [count, setCount] = useState<number>(16);
  const [config, setConfig] = useState<TournamentConfig>({ ...DEFAULT_TOURNAMENT_CONFIG });
  const [size, setSize] = useState<TeamSize>(teamSize);
  const [length, setLength] = useState<MatchDuration>(matchDuration);
  const [level, setLevel] = useState<Difficulty>(difficulty);
  const [seed, setSeed] = useState(0);
  const [onlySmall, setOnlySmall] = useState(false);

  const patch = (partial: Partial<TournamentConfig>) => setConfig((current) => ({ ...current, ...partial }));
  const toggleConfederation = (id: Confederation) =>
    setConfederations((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const poolOptions = useMemo(
    () => ({ confederations, minTier, maxTier: onlySmall ? (2 as Tier) : undefined }),
    [confederations, minTier, onlySmall],
  );
  const poolSize = useMemo(() => poolCandidates(poolOptions).length + 1, [confederations, minTier, onlySmall]);
  const participants = useMemo(
    () =>
      manual
        ? [...new Set([playerTeam, ...manualTeams])]
        : drawParticipants(Math.min(Math.max(4, count), Math.max(4, poolSize)), playerTeam, poolOptions, randomSeed(seed)),
    [manual, manualTeams, playerTeam, count, poolSize, confederations, minTier, onlySmall, seed],
  );
  const summary = summarizeConfig(config, Math.max(4, participants.length));
  const canStart = participants.length >= 4;
  const team = getNationalTeam(playerTeam);

  const launch = () => {
    if (!canStart) return;
    onStart({
      playerTeam,
      participants,
      config: { ...config, groupMatchdaysLimit: config.groupMatchdaysLimit },
      match: { teamSize: size, matchDuration: length, difficulty: level },
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto bg-gradient-to-b from-[#02040ae8] via-[#02040acb] to-[#02040af2] px-4 py-5 backdrop-blur-md sm:px-6">
      <div className="my-auto flex w-full max-w-6xl flex-col items-center text-center">
        <div className="mb-4 flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <div className="flex-1 text-center">
            <h2 className="font-display text-[clamp(1.5rem,4.6vw,2.8rem)] leading-tight text-white">{t.tournamentSetupTitle}</h2>
            <p className="mx-auto mt-1 max-w-2xl text-[11px] text-white/55 sm:text-sm">{t.tournamentSetupSubtitle}</p>
          </div>
          <div className="w-[84px] shrink-0" />
        </div>

        <div className="flex w-full flex-col gap-3">
          <SetupSection icon={Flag} title={t.tournamentSelectTeam} tone="amber">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-black/35 px-3 py-2.5 text-left"
                style={{ borderColor: `${team.kit.primary}88` }}
              >
                <KitPreview team={team} className="h-14 w-11" />
                <KitStrip kit={team.awayKit} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-base text-white">{team.flag} {team.names[lang]}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[9px] text-white/45">
                    <TierStars tier={team.tier} />
                    {confName(team.confederation, t)} · {team.code} · COEF {team.strength}
                  </span>
                  <span className="text-[9px] text-white/35">{team.kitSource === 'fifa' ? t.teamKitFifa : t.teamKitFlag}</span>
                </span>
              </div>
              <div className="min-w-0 flex-[2]">
                <NationPicker t={t} lang={lang} mode="single" value={playerTeam} onPick={setPlayerTeam} dense pageSize={48} />
              </div>
            </div>
          </SetupSection>

          <SetupSection icon={Globe2} title={t.tournamentPoolTitle}>
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfederations([])}
                className={`rounded-full border px-3 py-1 font-display text-[9px] tracking-[0.16em] transition ${
                  confederations.length === 0 ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-black/30 text-white/55 hover:border-white/25'
                }`}
              >
                {t.tournamentPoolAll}
              </button>
              {CONF_IDS.map((id) => {
                const [a, b] = CONFEDERATION_META[id].colors;
                const active = confederations.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleConfederation(id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[9px] tracking-[0.14em] transition ${
                      active ? 'text-white' : 'border-white/10 bg-black/30 text-white/55 hover:border-white/25'
                    }`}
                    style={active ? { borderColor: `${a}bb`, backgroundImage: `linear-gradient(120deg, ${a}33, ${b}33)` } : undefined}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: `linear-gradient(120deg, ${a}, ${b})` }} />
                    {confCode(id)} · {confName(id, t)}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[9px] text-white/45">
              <span className="font-display tracking-[0.2em] text-white/40">{t.teamTierLabel}</span>
              <Segmented
                tone="emerald"
                options={[
                  { id: 0, label: t.tierAll },
                  { id: 1, label: '★1' },
                  { id: 2, label: '★2' },
                  { id: 3, label: '★3' },
                  { id: 4, label: '★4' },
                  { id: 5, label: '★5' },
                ]}
                value={minTier as number}
                onChange={(value) => setMinTier(value as Tier | 0)}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setOnlySmall((current) => !current)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] transition ${
                  onlySmall ? 'border-rose-300/60 bg-rose-400/15 text-rose-100' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                <Flag size={11} /> {t.tournamentOnlySmall}
              </button>
              <span className="text-[10px] text-white/40">{fmt(t.tournamentAvailable, { n: participants.length })}</span>
            </div>
          </SetupSection>

          <SetupSection icon={Users} title={t.tournamentCountTitle}>
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Segmented
                  tone="amber"
                  options={PARTICIPANT_OPTIONS.map((n) => ({ id: n, label: String(n) }))}
                  value={count}
                  onChange={(value) => {
                    setManual(false);
                    setCount(value as number);
                  }}
                />
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 px-1.5 py-1">
                  <button type="button" onClick={() => { setManual(false); setCount((c) => Math.max(4, c - 2)); }} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="-2">
                    <Minus size={12} />
                  </button>
                  <span className="min-w-9 text-center font-display text-xs text-white">{manual ? participants.length : count}</span>
                  <button type="button" onClick={() => { setManual(false); setCount((c) => Math.min(64, c + 2)); }} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="+2">
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setManual((current) => !current)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-display text-[9px] tracking-[0.16em] transition ${
                    manual ? 'border-amber-300/70 bg-amber-400/15 text-amber-100' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Layers size={12} /> {t.tournamentManualTitle}
                </button>
                {!manual && (
                  <button
                    type="button"
                    onClick={() => setSeed((current) => current + 1)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-display text-[9px] tracking-[0.16em] text-white/60 transition hover:bg-white/10"
                  >
                    <Shuffle size={12} /> {t.tournamentDrawButton}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-white/40">{manual ? t.tournamentManualHint : fmt(t.tournamentCountHint, { n: participants.length })}</p>
              {manual && (
                <>
                  <p className={`text-[10px] ${canStart ? 'text-emerald-200/70' : 'text-amber-200/80'}`}>
                    {fmt(t.tournamentManualNeed, { n: participants.length })}
                  </p>
                  <NationPicker
                    t={t}
                    lang={lang}
                    mode="multiple"
                    values={participants}
                    onToggle={(id) =>
                      setManualTeams((current) => {
                        const list = current.filter((item) => item !== playerTeam);
                        return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
                      })
                    }
                    pageSize={64}
                  />
                </>
              )}
            </div>
          </SetupSection>

          <SetupSection icon={Trophy} title={t.tournamentFormatTitle}>
            <div className="mb-2.5 flex flex-wrap justify-center gap-1.5">
              {TOURNAMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setConfederations(preset.confederations);
                    setMinTier(preset.minTier);
                    setOnlySmall(preset.onlySmall);
                    setCount(preset.count);
                    setManual(false);
                    setManualTeams([]);
                    setConfig({ ...DEFAULT_TOURNAMENT_CONFIG, ...preset.config });
                    setSeed((current) => current + 1);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-display text-[9px] tracking-[0.14em] text-white/65 transition hover:border-amber-200/60 hover:bg-amber-300/10 hover:text-amber-100"
                >
                  {PRESET_LABELS[preset.id] ?? preset.id}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {FORMAT_IDS.map((id) => {
                const active = config.format === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ format: id })}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition ${
                      active ? 'border-amber-300/70 bg-amber-400/15 shadow-[0_0_22px_rgba(251,191,36,0.16)]' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className={`font-display text-[10px] tracking-[0.16em] ${active ? 'text-amber-100' : 'text-white/70'}`}>{FORMAT_LABELS[id].label(t)}</span>
                    <span className="text-[9px] text-white/40">{FORMAT_LABELS[id].desc(t)}</span>
                  </button>
                );
              })}
            </div>
            {(config.format === 'cup' || config.format === 'groups') && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.tournamentGroupSize}</span>
                  <Segmented options={[2, 3, 4, 5, 6].map((n) => ({ id: n, label: String(n) }))} value={config.groupSize} onChange={(v) => patch({ groupSize: Number(v) })} />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.tournamentQualify}</span>
                  <Segmented options={QUALIFY_OPTIONS.map((n) => ({ id: n, label: String(n) }))} value={config.qualify} onChange={(v) => patch({ qualify: Number(v) })} tone="emerald" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.tournamentMatchdays}</span>
                  <Segmented
                    options={[0, 1, 2, 3].map((n) => ({ id: n, label: n === 0 ? t.tournamentMatchdaysAll : String(n) }))}
                    value={config.groupMatchdaysLimit ?? 0}
                    onChange={(v) => patch({ groupMatchdaysLimit: Number(v) || undefined })}
                    tone="emerald"
                  />
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.tournamentSeedingTitle}</span>
                <Segmented
                  options={SEEDING_IDS.map((id) => ({ id, label: t[`tournamentSeed${id === 'pots' ? 'Pots' : id === 'serpentine' ? 'Serpentine' : 'Random'}` as const] }))}
                  value={config.seeding}
                  onChange={(v) => patch({ seeding: v as SeedingMode })}
                />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.tournamentUpsetsTitle}</span>
                <Segmented
                  options={[
                    { id: 0, label: t.tournamentUpsetsLow },
                    { id: 1, label: t.tournamentUpsetsMedium },
                    { id: 2, label: t.tournamentUpsetsHigh },
                  ]}
                  value={config.upsets}
                  onChange={(v) => patch({ upsets: Number(v) })}
                  tone="emerald"
                />
              </div>
            </div>
          </SetupSection>

          <SetupSection icon={SlidersHorizontal} title={t.tournamentRulesTitle}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SwitchRow label={t.tournamentExtraTimeOpt} checked={config.extraTime} onChange={(v) => patch({ extraTime: v })} />
              <SwitchRow label={t.tournamentPenaltiesOpt} checked={config.penalties} onChange={(v) => patch({ penalties: v })} />
              <SwitchRow
                label={t.tournamentThirdPlace}
                checked={config.thirdPlace}
                onChange={(v) => patch({ thirdPlace: v })}
                hint={config.format === 'cup' || config.format === 'knockout' ? undefined : '—'}
              />
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.settingsDuration}</span>
                <Segmented
                  options={[60, 90, 120, 180].map((n) => ({ id: n, label: `${n}s` }))}
                  value={length}
                  onChange={(v) => setLength(Number(v) as MatchDuration)}
                />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.teamSizeTitle}</span>
                <Segmented options={TEAM_SIZES.map((n) => ({ id: n, label: `${n}v${n}` }))} value={size} onChange={(v) => setSize(Number(v) as TeamSize)} tone="emerald" />
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <span className="font-display text-[9px] tracking-[0.2em] text-white/40">{t.diffNormal.replace('NORMALE', 'DIFFICOLTÀ')}</span>
                <Segmented
                  options={[
                    { id: 'easy' as Difficulty, label: t.diffEasy },
                    { id: 'normal' as Difficulty, label: t.diffNormal },
                    { id: 'hard' as Difficulty, label: t.diffHard },
                  ]}
                  value={level}
                  onChange={(v) => setLevel(v as Difficulty)}
                />
              </div>
            </div>
          </SetupSection>

          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3">
            <h3 className="flex items-center justify-center gap-2 font-display text-[9px] tracking-[0.24em] text-amber-200">
              <Trophy size={12} /> {t.tournamentPathTitle}
            </h3>
            <p className="mt-1.5 text-center text-[11px] text-white/70">
              {fmt(t.tournamentCountHint, { n: participants.length })}
              {summary.groups > 0 && <> · {summary.groups === 1 ? t.tournamentGroupsCountOne : fmt(t.tournamentGroupsCount, { n: summary.groups })}{config.format === 'league' ? '' : ` · ${summary.groupSize}`}</>}
              {summary.bracketSize > 0 && <> · {fmt(t.tournamentBracketCount, { n: summary.bracketSize })}</>}
              {config.thirdPlace && (config.format === 'cup' || config.format === 'knockout') && <> · {t.tournamentStageThird}</>}
            </p>
            <p className="mt-1 text-center text-[10px] text-white/45">
              {fmt(t.tournamentPlayerMatches, { n: summary.playerMatches })} · {fmt(t.tournamentTotalMatches, { n: summary.totalMatches })}
            </p>
          </div>
        </div>

        <div className="mt-5 flex w-full flex-col-reverse justify-center gap-2 pb-2 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 font-display text-xs tracking-[0.15em] text-white/80 transition hover:bg-white/10"
          >
            <ChevronLeft size={16} /> {t.btnBack}
          </button>
          <button
            type="button"
            disabled={!canStart}
            onClick={launch}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-200 px-8 py-3 font-display text-sm tracking-[0.15em] text-[#251805] transition hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Play size={18} className="fill-current" /> {t.tournamentStart}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- schermo torneo

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
  const bye = match.decidedBy === 'bye';
  if (bye) {
    const advancing = getNationalTeam(match.winner ?? match.home);
    const activeBye = match.id === activeMatchId;
    return (
      <div className={`rounded-xl border px-3 py-2 ${activeBye ? 'border-amber-300/55 bg-amber-300/10' : 'border-white/8 bg-black/25'}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-left text-[10px] font-bold text-white" dir="auto">
            {advancing.flag} {advancing.names[lang]}
          </span>
          <span className="shrink-0 font-display text-[8px] tracking-[0.16em] text-white/40">{t.tournamentBye}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border px-3 py-2 ${active ? 'border-amber-300/55 bg-amber-300/10 shadow-[0_0_18px_rgba(251,191,36,0.14)]' : 'border-white/8 bg-black/30'}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-left text-[10px] ${homeWon ? 'font-bold text-white' : match.winner ? 'text-white/45' : 'text-white/75'}`} dir="auto">
          {home.flag} {home.names[lang]}
        </span>
        <span className={`shrink-0 font-display text-xs tabular-nums ${match.score ? 'text-white' : 'text-white/30'}`}>
          {bye ? '—' : match.score ? `${match.score[0]}–${match.score[1]}` : 'VS'}
        </span>
        <span className={`min-w-0 flex-1 truncate text-right text-[10px] ${awayWon ? 'font-bold text-white' : match.winner ? 'text-white/45' : 'text-white/75'}`} dir="auto">
          {away.flag} {away.names[lang]}
        </span>
      </div>
      {match.pens && (
        <div className="mt-1 text-center font-display text-[8px] tracking-wider text-amber-200/70">
          PK {match.pens[0]}–{match.pens[1]}
        </div>
      )}
      {bye && <div className="mt-1 text-center font-display text-[8px] tracking-[0.18em] text-white/35">{t.tournamentBye}</div>}
      {match.decidedBy === 'seed' && (
        <div className="mt-1 text-center font-display text-[8px] tracking-[0.14em] text-white/35">{t.tournamentDecisionSeed}</div>
      )}
      {active && (
        <div className="mt-1 text-center font-display text-[8px] tracking-[0.18em] text-amber-200">
          {getNationalTeam(playerTeam).flag} P1
        </div>
      )}
    </div>
  );
}

function RoundHeading({ size, t }: { size: number; t: Strings }) {
  const key = roundKeyForSize(size);
  const label = t[ROUND_LABELS[key] ?? 'tournamentStageKnockout'];
  return <h3 className="text-center font-display text-[9px] tracking-[0.22em] text-amber-200/80">{label}</h3>;
}

function TournamentBracket({ tournament, lang, t }: { tournament: TournamentState; lang: Language; t: Strings }) {
  const sizes = knockoutRoundSizes(tournament);
  const rounds = tournament.knockout.filter((round) => round.length > 0);
  if (rounds.length === 0) return null;
  return (
    <div dir="ltr" className="flex w-full gap-3 overflow-x-auto pb-1">
      {rounds.map((round, index) => (
        <section key={`round-${index}`} className="flex min-w-[210px] flex-1 flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
          <RoundHeading size={sizes[index] ?? round.length * 2} t={t} />
          <div className="flex flex-col gap-1.5">
            {round.map((match) => (
              <TournamentMatchCard
                key={match.id}
                match={match}
                activeMatchId={tournament.activeMatchId}
                playerTeam={tournament.playerTeam}
                lang={lang}
                t={t}
              />
            ))}
            {index === rounds.length - 1 && tournament.thirdPlace && (
              <>
                <h3 className="mt-2 text-center font-display text-[8px] tracking-[0.2em] text-white/45">{t.tournamentStageThird}</h3>
                <TournamentMatchCard
                  match={tournament.thirdPlace}
                  activeMatchId={tournament.activeMatchId}
                  playerTeam={tournament.playerTeam}
                  lang={lang}
                  t={t}
                />
              </>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function GroupCard({ group, tournament, lang, t, highlight }: {
  group: TournamentGroup;
  tournament: TournamentState;
  lang: Language;
  t: Strings;
  highlight: number;
}) {
  const standings = getGroupStandings(group);
  const matches = getGroupMatches(group);
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-left">
      <h3 className="font-display text-center text-[10px] tracking-[0.22em] text-amber-200/80">
        {fmt(t.tournamentGroupLabel, { group: group.id })}
      </h3>
      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="grid grid-cols-[minmax(0,1fr)_24px_24px_24px_30px_30px] gap-1 border-b border-white/10 px-2 py-1.5 font-display text-[8px] text-white/35">
          <span>{t.tournamentTeam}</span>
          <span className="text-center">{t.tournamentPlayed}</span>
          <span className="text-center">V</span>
          <span className="text-center">N</span>
          <span className="text-center">P</span>
          <span className="text-center">{t.tournamentPoints}</span>
        </div>
        {standings.map((standing, index) => {
          const team = getNationalTeam(standing.team);
          const isPlayer = standing.team === tournament.playerTeam;
          const qualified = index < highlight;
          return (
            <div
              key={standing.team}
              className={`grid grid-cols-[minmax(0,1fr)_24px_24px_24px_30px_30px] items-center gap-1 px-2 py-1 text-[9px] ${qualified ? 'bg-emerald-300/[0.05]' : ''}`}
            >
              <span className={`min-w-0 truncate ${isPlayer ? 'font-bold text-amber-100' : 'text-white/75'}`} dir="auto">
                {index + 1}. {team.flag} {team.names[lang]}
              </span>
              <span className="text-center tabular-nums text-white/45">{standing.played}</span>
              <span className="text-center tabular-nums text-white/45">{standing.wins}</span>
              <span className="text-center tabular-nums text-white/45">{standing.draws}</span>
              <span className="text-center tabular-nums text-white/45">{standing.losses}</span>
              <span className="text-center tabular-nums font-bold text-white/85">{standing.points}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1">
        {matches.map((match) => (
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
    </section>
  );
}

export function TournamentScreen({ tournament, lang, onPlayNext, onNewTournament, onMenu, t }: ScreenProps & {
  tournament: TournamentState;
  lang: Language;
  onPlayNext: () => void;
  onNewTournament: () => void;
  onMenu: () => void;
}) {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const activeMatch = getActiveTournamentMatch(tournament);
  const opponentId = activeMatch
    ? activeMatch.home === tournament.playerTeam ? activeMatch.away : activeMatch.home
    : null;
  const opponent = opponentId ? getNationalTeam(opponentId) : null;
  const playerTeam = getNationalTeam(tournament.playerTeam);
  const record = getPlayerRecord(tournament);
  const manyGroups = tournament.groups.length > 4;
  const groups = showAllGroups || !manyGroups
    ? tournament.groups
    : tournament.groups.filter((group) => group.teams.includes(tournament.playerTeam));
  const currentRoundSize = knockoutRoundSizes(tournament)[tournament.koRound] ?? 0;
  const stageLabel =
    tournament.stage === 'groups'
      ? `${t.tournamentStageGroups} · ${Math.min(tournament.matchday + 1, totalGroupMatchdays(tournament))}/${totalGroupMatchdays(tournament)}`
      : tournament.stage === 'complete'
        ? t.tournamentStageComplete
        : `${ROUND_LABELS[roundKeyForSize(currentRoundSize)] ?? t.tournamentStageKnockout} · ${Math.min(tournament.koRound + 1, tournament.bracketRounds)}/${tournament.bracketRounds}`;
  const champion = tournament.champion ? getNationalTeam(tournament.champion) : null;
  const highlight = tournament.config.format === 'league' ? 1 : Math.max(1, tournament.config.qualify);

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
            <h2 className="font-display text-[clamp(1.4rem,4.4vw,2.6rem)] leading-tight text-white">{t.tournamentTitle}</h2>
            <p className="mt-1 font-display text-[10px] tracking-[0.2em] text-amber-200/80">{stageLabel}</p>
          </div>
          <div className="flex w-[84px] shrink-0 justify-end text-xl">{playerTeam.flag}</div>
        </div>

        <div className="mb-3 flex w-full flex-wrap items-center justify-center gap-2 text-[10px] text-white/60">
          <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
            {fmt(t.tournamentCountHint, { n: tournament.participants.length })}
          </span>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-emerald-100/80">
            {record.wins}V {record.draws}N {record.losses}P · {record.goalsFor}:{record.goalsAgainst}
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-white/45"
            title={t.tournamentAutoSaved}
          >
            <Save size={11} className="shrink-0 text-emerald-300/80" />
            <span className="hidden sm:inline">{t.tournamentAutoSaved}</span>
          </span>
          {manyGroups && (
            <button
              type="button"
              onClick={() => setShowAllGroups((current) => !current)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-display text-[9px] tracking-[0.14em] text-white/70 transition hover:bg-white/10"
            >
              {showAllGroups ? playerTeam.flag : `${tournament.groups.length} ×`}
            </button>
          )}
        </div>

        {tournament.stage === 'groups' && tournament.groups.length > 0 ? (
          <div className={`grid w-full grid-cols-1 gap-3 ${manyGroups && !showAllGroups ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} xl:grid-cols-4`}>
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} tournament={tournament} lang={lang} t={t} highlight={highlight} />
            ))}
          </div>
        ) : tournament.knockout.length > 0 ? (
          <TournamentBracket tournament={tournament} lang={lang} t={t} />
        ) : (
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tournament.groups.map((group) => (
              <GroupCard key={group.id} group={group} tournament={tournament} lang={lang} t={t} highlight={highlight} />
            ))}
          </div>
        )}

        {champion && (
          <div className="mt-4 flex flex-col items-center gap-1 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-6 py-3 shadow-[0_0_26px_rgba(251,191,36,0.12)]">
            <span className="flex items-center gap-2 font-display text-[10px] tracking-[0.25em] text-amber-200"><Trophy size={14} /> {tournament.eliminated ? t.tournamentStageComplete : t.tournamentChampion}</span>
            <span className="font-display text-lg text-white" dir="auto">{champion.flag} {champion.names[lang]}</span>
            {tournament.runnerUp && (
              <span className="text-[10px] text-white/45" dir="auto">
                {getNationalTeam(tournament.runnerUp).flag} {getNationalTeam(tournament.runnerUp).names[lang]}
              </span>
            )}
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

// --------------------------------------------------------------- pausa / fine

export function PauseScreen({
  onResume,
  onRestart,
  onSettings,
  onMenu,
  t,
}: ScreenProps & {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
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
            onClick={onSettings}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 py-3 font-display text-sm tracking-[0.15em] text-white/85 transition hover:bg-white/15 active:scale-95"
          >
            <Settings size={16} /> {t.settingsButton}
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
  const [homeKit, awayKit] = resolveKits(teams[0], teams[1]);
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
        <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-white/35">
          <span className="flex items-center gap-1"><KitPreview team={homeTeam} className="h-4 w-3.5" kit={homeKit} /> {homeTeam.code}</span>
          <span className="flex items-center gap-1"><KitPreview team={awayTeam} className="h-4 w-3.5" kit={awayKit} /> {awayTeam.code}{awayKit === awayTeam.awayKit ? ` · ${t.teamKitAwayClash}` : ''}</span>
        </div>
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
