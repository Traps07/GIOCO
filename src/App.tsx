import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, type Difficulty, type GameMode, type PlayerCount, type Snapshot, type TeamSize } from './game/engine';
import HUD from './components/HUD';
import TouchControls from './components/TouchControls';
import { MenuScreen, TeamSelectScreen, TournamentSetupScreen, TournamentScreen, PauseScreen, EndScreen } from './components/Menus';
import { DEFAULT_TEAMS, type NationalTeamId, type TeamSelection } from './game/teams';
import {
  createTournament,
  getActiveTournamentMatch,
  recordTournamentResult,
  type TournamentState,
} from './game/tournament';
import { STRINGS, isRTL, type Language } from './i18n';

const LANG_KEY = 'ss3v3-lang';

function loadLang(): Language {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (v && v in STRINGS) return v as Language;
  } catch {
    /* ignore */
  }
  const nav = window.navigator.language?.slice(0, 2);
  return nav && nav in STRINGS ? (nav as Language) : 'it';
}

type Screen = 'menu' | 'teams' | 'tournamentSetup' | 'tournament' | 'playing' | 'paused' | 'over';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bannerTimer = useRef<number | null>(null);
  const eventTimer = useRef<number | null>(null);
  const endTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mode, setMode] = useState<GameMode>('match');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(1);
  const [teamSize, setTeamSize] = useState<TeamSize>(3);
  const [teams, setTeams] = useState<TeamSelection>([...DEFAULT_TEAMS]);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const tournamentRef = useRef<TournamentState | null>(null);
  const [lang, setLangState] = useState<Language>(loadLang);
  const t = STRINGS[lang];
  const tRef = useRef(t);
  tRef.current = t;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [goalBanner, setGoalBanner] = useState<{ team: number; id: number } | null>(null);
  const [eventBanner, setEventBanner] = useState<{
    title: string;
    sub: string;
    tone: 'amber' | 'sky' | 'rose' | 'white';
    id: number;
  } | null>(null);
  const [result, setResult] = useState<{
    winner: number;
    score: [number, number];
    shots: [number, number];
    pens: [number, number] | null;
    decidedBy: 'regular' | 'golden' | 'pens';
  } | null>(null);
  const [isTouch] = useState(
    () => window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window,
  );

  const screenRef = useRef<Screen>('menu');
  screenRef.current = screen;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.inputEnabled = false;

    const showEventBanner = (
      title: string,
      sub: string,
      tone: 'amber' | 'sky' | 'rose' | 'white',
      dur = 2400,
    ) => {
      setEventBanner({ title, sub, tone, id: Date.now() });
      if (eventTimer.current) window.clearTimeout(eventTimer.current);
      eventTimer.current = window.setTimeout(() => setEventBanner(null), dur);
    };

    engine.on((e) => {
      if (e.type === 'goal') {
        setGoalBanner({ team: e.team, id: Date.now() });
        if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
        bannerTimer.current = window.setTimeout(() => setGoalBanner(null), 1900);
      } else if (e.type === 'extratime') {
        showEventBanner(tRef.current.extraTimeTitle, tRef.current.extraTimeSub, 'amber', 2700);
      } else if (e.type === 'pensstart') {
        showEventBanner(tRef.current.pensTitle, tRef.current.pensSub, 'white', 2700);
      } else if (e.type === 'penResult') {
        if (e.result === 'goal') {
          setGoalBanner({ team: e.team, id: Date.now() });
          if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
          bannerTimer.current = window.setTimeout(() => setGoalBanner(null), 1400);
        } else if (e.result === 'save') {
          showEventBanner(tRef.current.saveTitle, tRef.current.saveSub, 'sky', 1300);
        } else if (e.result === 'post') {
          showEventBanner(tRef.current.postTitle, tRef.current.postSub, 'amber', 1300);
        } else {
          showEventBanner(tRef.current.missTitle, tRef.current.missSub, 'rose', 1300);
        }
      } else if (e.type === 'end') {
        const s = engine.getSnapshot();
        const res = {
          winner: e.winner,
          score: e.score,
          shots: [...s.shots] as [number, number],
          pens: e.pens,
          decidedBy: e.decidedBy,
        };
        const cup = tournamentRef.current;
        const fixture = cup ? getActiveTournamentMatch(cup) : null;
        if (cup && fixture) {
          const playerIsHome = fixture.home === cup.playerTeam;
          const opponent = playerIsHome ? fixture.away : fixture.home;
          const fixtureScore: [number, number] = playerIsHome ? e.score : [e.score[1], e.score[0]];
          const fixturePens: [number, number] | null = !e.pens
            ? null
            : playerIsHome
              ? e.pens
              : [e.pens[1], e.pens[0]];
          const winnerTeam = e.winner < 0 ? null : e.winner === 0 ? cup.playerTeam : opponent;
          const nextCup = recordTournamentResult(cup, fixtureScore, winnerTeam, fixturePens);
          tournamentRef.current = nextCup;
          setTournament(nextCup);
        }
        endTimer.current = window.setTimeout(() => {
          setResult(res);
          setScreen('over');
          engine.inputEnabled = false;
        }, e.pens ? 1500 : 1100);
      } else if (e.type === 'pause') {
        setScreen('paused');
      } else if (e.type === 'resume') {
        setScreen('playing');
      }
    });

    const poll = window.setInterval(() => setSnap(engine.getSnapshot()), 120);

    const onBlur = () => {
      if (screenRef.current === 'playing') {
        engine.setPaused(true);
        setScreen('paused');
      }
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onBlur);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onBlur);
      if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
      if (eventTimer.current) window.clearTimeout(eventTimer.current);
      if (endTimer.current) window.clearTimeout(endTimer.current);
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setTeams(teams);
  }, [teams]);

  useEffect(() => {
    engineRef.current?.setDemoTeamSize(teamSize);
  }, [teamSize]);

  const startGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.unlockAudio();
    engine.startMatch(difficulty, mode, playerCount, teams, teamSize);
    engine.inputEnabled = true;
    engine.setPaused(false);
    setResult(null);
    setGoalBanner(null);
    setEventBanner(null);
    setScreen('playing');
  }, [difficulty, mode, playerCount, teams, teamSize]);

  const openTeamSelect = useCallback(() => setScreen('teams'), []);
  const openTournamentSetup = useCallback(() => setScreen('tournamentSetup'), []);
  const beginTournament = useCallback((playerTeam: NationalTeamId) => {
    const nextCup = createTournament(playerTeam);
    tournamentRef.current = nextCup;
    setTournament(nextCup);
    setResult(null);
    setGoalBanner(null);
    setEventBanner(null);
    setScreen('tournament');
  }, []);
  const startTournamentMatch = useCallback(() => {
    const cup = tournamentRef.current;
    const fixture = cup ? getActiveTournamentMatch(cup) : null;
    const engine = engineRef.current;
    if (!cup || !fixture || !engine) return;
    const opponent = fixture.home === cup.playerTeam ? fixture.away : fixture.home;
    const matchTeams: TeamSelection = [cup.playerTeam, opponent];
    const matchMode = fixture.round === 'group' ? 'group' : 'match';
    setTeams(matchTeams);
    setPlayerCount(1);
    engine.unlockAudio();
    engine.startMatch(difficulty, matchMode, 1, matchTeams, teamSize);
    engine.inputEnabled = true;
    engine.setPaused(false);
    setResult(null);
    setGoalBanner(null);
    setEventBanner(null);
    setScreen('playing');
  }, [difficulty, teamSize]);
  const continueTournament = useCallback(() => {
    setResult(null);
    setScreen('tournament');
  }, []);
  const newTournament = useCallback(() => {
    tournamentRef.current = null;
    setTournament(null);
    setResult(null);
    setScreen('tournamentSetup');
  }, []);
  const backToMenu = useCallback(() => setScreen('menu'), []);
  const chooseTeam = useCallback((side: 0 | 1, teamId: NationalTeamId) => {
    setTeams((current) => {
      if (current[side] === teamId) return current;
      const otherSide = (side === 0 ? 1 : 0) as 0 | 1;
      const next: TeamSelection = [...current];
      if (current[otherSide] === teamId) next[otherSide] = current[side];
      next[side] = teamId;
      return next;
    });
  }, []);

  const pauseGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || screenRef.current !== 'playing') return;
    engine.setPaused(true);
    setScreen('paused');
  }, []);

  const resumeGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setPaused(false);
    setScreen('playing');
  }, []);

  const toMenu = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.inputEnabled = false;
    engine.setPaused(false);
    engine.startDemo();
    tournamentRef.current = null;
    setTournament(null);
    setGoalBanner(null);
    setEventBanner(null);
    setResult(null);
    setScreen('menu');
  }, []);

  const toggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.unlockAudio();
    const next = !muted;
    engine.setMuted(next);
    setMuted(next);
  }, [muted]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div dir={isRTL(lang) ? 'rtl' : 'ltr'} className="relative h-full w-full overflow-hidden bg-[#02040a]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {(screen === 'playing' || screen === 'paused' || screen === 'over') && (
        <HUD
          snap={snap}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={pauseGame}
          playerCount={playerCount}
          teams={teams}
          lang={lang}
          goalBanner={goalBanner}
          eventBanner={eventBanner}
          t={t}
        />
      )}

      {screen === 'playing' && isTouch && <TouchControls engine={engineRef.current} teamSize={teamSize} t={t} />}

      {screen === 'menu' && (
        <MenuScreen
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          mode={mode}
          setMode={setMode}
          playerCount={playerCount}
          setPlayerCount={setPlayerCount}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          teams={teams}
          lang={lang}
          setLang={setLang}
          onStart={openTeamSelect}
          onTournament={openTournamentSetup}
          t={t}
        />
      )}
      {screen === 'tournamentSetup' && (
        <TournamentSetupScreen
          teamSize={teamSize}
          initialTeam={tournament?.playerTeam ?? teams[0]}
          lang={lang}
          onBack={backToMenu}
          onStart={beginTournament}
          t={t}
        />
      )}
      {screen === 'tournament' && tournament && (
        <TournamentScreen
          tournament={tournament}
          lang={lang}
          onPlayNext={startTournamentMatch}
          onNewTournament={newTournament}
          onMenu={toMenu}
          t={t}
        />
      )}
      {screen === 'teams' && (
        <TeamSelectScreen
          playerCount={playerCount}
          teamSize={teamSize}
          mode={mode}
          teams={teams}
          lang={lang}
          onChooseTeam={chooseTeam}
          onBack={backToMenu}
          onStart={startGame}
          t={t}
        />
      )}
      {screen === 'paused' && (
        <PauseScreen
          onResume={resumeGame}
          onRestart={tournament ? startTournamentMatch : startGame}
          onMenu={toMenu}
          t={t}
        />
      )}
      {screen === 'over' && result && (
        <EndScreen
          winner={result.winner}
          score={result.score}
          shots={result.shots}
          pens={result.pens}
          decidedBy={result.decidedBy}
          pensOnly={!tournament && mode === 'pens'}
          playerCount={tournament ? 1 : playerCount}
          teams={teams}
          lang={lang}
          onRematch={tournament ? continueTournament : startGame}
          rematchLabel={tournament ? t.tournamentBackToBracket : undefined}
          onMenu={toMenu}
          t={t}
        />
      )}
    </div>
  );
}
