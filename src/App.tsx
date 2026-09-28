import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, type Difficulty, type GameMode, type Opponent, type Snapshot } from './game/engine';
import HUD from './components/HUD';
import TouchControls from './components/TouchControls';
import { MenuScreen, PauseScreen, EndScreen } from './components/Menus';
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

type Screen = 'menu' | 'playing' | 'paused' | 'over';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bannerTimer = useRef<number | null>(null);
  const eventTimer = useRef<number | null>(null);
  const endTimer = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mode, setMode] = useState<GameMode>('match');
  const [opponent, setOpponent] = useState<Opponent>('ai');
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

  const startGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.unlockAudio();
    engine.startMatch(difficulty, mode, opponent);
    engine.inputEnabled = true;
    engine.setPaused(false);
    setResult(null);
    setGoalBanner(null);
    setEventBanner(null);
    setScreen('playing');
  }, [difficulty, mode, opponent]);

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

      {screen !== 'menu' && (
        <HUD
          snap={snap}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={pauseGame}
          goalBanner={goalBanner}
          eventBanner={eventBanner}
          t={t}
        />
      )}

      {screen === 'playing' && isTouch && (
        <TouchControls engine={engineRef.current} twoPlayer={opponent === 'human'} t={t} />
      )}

      {screen === 'menu' && (
        <MenuScreen
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          mode={mode}
          setMode={setMode}
          opponent={opponent}
          setOpponent={setOpponent}
          lang={lang}
          setLang={setLang}
          onStart={startGame}
          t={t}
        />
      )}
      {screen === 'paused' && (
        <PauseScreen onResume={resumeGame} onRestart={startGame} onMenu={toMenu} t={t} />
      )}
      {screen === 'over' && result && (
        <EndScreen
          winner={result.winner}
          score={result.score}
          shots={result.shots}
          pens={result.pens}
          decidedBy={result.decidedBy}
          pensOnly={mode === 'pens'}
          onRematch={startGame}
          onMenu={toMenu}
          t={t}
        />
      )}
    </div>
  );
}
