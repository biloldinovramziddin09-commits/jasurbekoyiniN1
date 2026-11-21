import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Gamepad2,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getGameById } from '@/src/data/games';
import { usePlatform } from '@/src/context/PlatformContext';
import { GAME_ENGINE_REGISTRY } from '@/src/games/registry';
import {
  DifficultyLevel,
  FootballTactic,
  GameControllerHandle,
  GameFinishPayload,
  GameHudState,
  RacingVehicleType,
} from '@/src/engine/types';
import { soundEngine } from '@/src/engine/audio';
import { TouchControls } from '@/src/components/TouchControls';
import { GameThumbnail } from '@/src/components/GameThumbnail';

interface GamePlayerProps {
  gameId: string;
}

type PlayerPhase = 'menu' | 'loading' | 'playing' | 'paused' | 'finished';

const VOXEL_LABELS = ['1: Maysa', '2: Tosh', "3: Yog'och", '4: Oltin'];

export const GamePlayer: React.FC<GamePlayerProps> = ({ gameId }) => {
  const game = getGameById(gameId);
  const {
    state,
    closeGame,
    toggleFavorite,
    recordGameSession,
    updateSettings,
  } = usePlatform();

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GameControllerHandle | null>(null);

  const [phase, setPhase] = useState<PlayerPhase>('menu');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [tactic, setTactic] = useState<FootballTactic>('balanced');
  const [vehicle, setVehicle] = useState<RacingVehicleType>('gt');
  const [sessionKey, setSessionKey] = useState(0);
  const [showTouchPad, setShowTouchPad] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  const [finishData, setFinishData] = useState<GameFinishPayload | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [hud, setHud] = useState<GameHudState>({
    score: 0,
    primaryLabel: 'Tayyor',
    missionPrompt: game?.shortDescription ?? '',
  });

  const latestConfigRef = useRef({
    game,
    quality: state.settings.graphicsQuality,
    difficulty,
    tactic,
    vehicle,
    recordGameSession,
  });
  latestConfigRef.current = {
    game,
    quality: state.settings.graphicsQuality,
    difficulty,
    tactic,
    vehicle,
    recordGameSession,
  };

  useEffect(() => {
    soundEngine.syncSettings(state.settings);
  }, [state.settings]);

  // Mount Three.js engine strictly when sessionKey increments (> 0)
  useEffect(() => {
    if (sessionKey === 0) return;
    const {
      game: activeGame,
      quality,
      difficulty: diff,
      tactic: tac,
      vehicle: veh,
      recordGameSession: recordSession,
    } = latestConfigRef.current;

    if (!activeGame || !canvasMountRef.current) return;

    const initFn = GAME_ENGINE_REGISTRY[activeGame.archetype];
    if (!initFn) {
      setErrorMsg("Ushbu o'yin moduli topilmadi.");
      return;
    }

    let disposed = false;
    try {
      const handle = initFn(
        canvasMountRef.current,
        activeGame,
        quality,
        { difficulty: diff, tactic: tac, vehicle: veh },
        {
          onReady: () => {
            if (!disposed) setPhase('playing');
          },
          onHudUpdate: (nextHud) => {
            if (!disposed) setHud(nextHud);
          },
          onFinish: (payload) => {
            if (disposed) return;
            setFinishData(payload);
            const unlocked = recordSession(
              activeGame.id,
              payload.score,
              payload.durationSeconds,
              payload.won,
            );
            setNewAchievements(unlocked);
            setPhase('finished');
          },
        },
      );
      controllerRef.current = handle;
    } catch (err) {
      console.error('3D game initialization error:', err);
      setErrorMsg("3D grafikani ishga tushirishda xatolik yuz berdi.");
    }

    return () => {
      disposed = true;
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [sessionKey]);

  // Escape / P key pause toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phase === 'playing') {
          controllerRef.current?.setPaused(true);
          setPhase('paused');
        } else if (phase === 'paused') {
          controllerRef.current?.setPaused(false);
          setPhase('playing');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  if (!game) return null;

  const isFav = state.favorites.includes(game.id);
  const prevBest = state.history[game.id]?.bestScore ?? 0;

  const handleStart = () => {
    setErrorMsg(null);
    setFinishData(null);
    setNewAchievements([]);
    setPhase('loading');
    setSessionKey((k) => k + 1);
  };

  const handleRestart = () => {
    handleStart();
  };

  const handlePauseToggle = () => {
    if (phase === 'playing') {
      controllerRef.current?.setPaused(true);
      setPhase('paused');
    } else if (phase === 'paused') {
      controllerRef.current?.setPaused(false);
      setPhase('playing');
    }
  };

  const handleExit = () => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
    soundEngine.stopMusic();
    closeGame();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070B14] text-white overflow-hidden">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Error State */}
      {errorMsg && (
        <div className="relative z-40 m-auto max-w-md rounded-2xl border border-red-500/40 bg-[#0F1629] p-6 text-center space-y-4">
          <p className="font-display text-xl font-bold text-white">{errorMsg}</p>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      )}

      {/* 1. START MENU */}
      {phase === 'menu' && (
        <div className="relative z-20 flex-1 overflow-y-auto flex items-center justify-center p-4 sm:p-8 bg-[#070B14]">
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-slate-800 bg-[#0F1629] p-6 sm:p-8 shadow-2xl">
            <div className="lg:col-span-5 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <GameThumbnail game={game} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{game.category} · {game.ageLabel}</span>
                {prevBest > 0 && (
                  <span className="font-mono text-orange-400">
                    Rekord: {prevBest}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(game.id)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold cursor-pointer ${
                  isFav
                    ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? 'Sevimlilarda saqlangan' : 'Sevimlilarga qo‘shish'}
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {game.title}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {game.instructions}
                </p>

                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-400 mb-2">
                    Boshqaruv tugmalari
                  </p>
                  {game.controlsSummary.map((line) => (
                    <p key={line} className="text-xs text-slate-300">
                      {line}
                    </p>
                  ))}
                </div>

                {/* Optional Difficulty / Vehicle / Tactic Selectors */}
                {game.hasDifficulty && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-400">
                      Qiyinlik darajasi
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['easy', 'Oson'],
                          ['medium', "O'rta"],
                          ['hard', 'Qiyin'],
                        ] as [DifficultyLevel, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDifficulty(id)}
                          className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${
                            difficulty === id
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {game.hasVehicleSelect && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-400">
                      Avtomobil tanlash
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['gt', 'GT Kupe'],
                          ['hyper', 'Giperkar'],
                          ['rally', 'Ralli'],
                        ] as [RacingVehicleType, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setVehicle(id)}
                          className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${
                            vehicle === id
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {game.hasTacticSelect && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-400">
                      Jamoa taktikasi
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['attacking', 'Hujumkor (4-3-3)'],
                          ['balanced', 'Muvozanat (4-4-2)'],
                          ['defensive', 'Himoya (3-5-2)'],
                        ] as [FootballTactic, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setTactic(id)}
                          className={`rounded-lg py-2 text-xs font-semibold border cursor-pointer ${
                            tactic === id
                              ? 'border-emerald-500 bg-emerald-600 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStart}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  O‘yinni boshlash
                </button>
                <button
                  type="button"
                  onClick={handleExit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-5 py-3.5 text-sm font-medium text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Bosh sahifa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LOADING SKELETON */}
      {phase === 'loading' && (
        <div className="relative z-30 m-auto flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-[#0F1629] px-10 py-8 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="font-display text-lg font-bold text-white">
            3D dunyo yuklanmoqda...
          </p>
          <p className="text-xs text-slate-400">{game.title}</p>
        </div>
      )}

      {/* 3. ACTIVE GAMEPLAY HUD (No backdrop-blur over WebGL!) */}
      {(phase === 'playing' || phase === 'paused') && (
        <>
          <div className="pointer-events-none relative z-20 flex flex-wrap items-start justify-between gap-3 p-3 sm:p-4">
            {/* Top-left Score & Mission */}
            <div className="pointer-events-auto flex flex-col gap-1.5 rounded-xl border border-white/15 bg-[#070B14]/88 px-4 py-2.5 max-w-md">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-display font-bold text-white text-sm">
                  {game.title}
                </span>
                <span className="font-mono font-bold text-orange-400 tabular-nums">
                  Ball: {hud.score}
                </span>
                <span className="font-mono text-blue-300 tabular-nums">
                  {hud.primaryLabel}
                </span>
                {hud.secondaryLabel && (
                  <span className="font-mono text-emerald-300 tabular-nums">
                    {hud.secondaryLabel}
                  </span>
                )}
                {typeof hud.timeRemaining === 'number' && (
                  <span className="font-mono text-amber-300 tabular-nums">
                    {Math.ceil(hud.timeRemaining)}s
                  </span>
                )}
              </div>

              {typeof hud.health === 'number' && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{
                      width: `${Math.max(0, Math.min(100, hud.health))}%`,
                    }}
                  />
                </div>
              )}

              <p className="text-xs text-slate-300 leading-snug">
                {hud.missionPrompt}
              </p>
            </div>

            {/* Top-right Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTouchPad((v) => !v)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-[#070B14]/88 px-3 text-xs font-medium text-slate-200 hover:border-blue-400 cursor-pointer"
                title="Sensor boshqaruvni yoqish/o'chirish"
              >
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden sm:inline">Sensor</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSettings({ soundEnabled: !state.settings.soundEnabled })
                }
                aria-label="Ovoz"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#070B14]/88 text-slate-200 hover:border-blue-400 cursor-pointer"
              >
                {state.settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-500" />
                )}
              </button>

              <button
                type="button"
                onClick={handlePauseToggle}
                aria-label="Pauza"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-[#070B14]/88 px-3.5 text-xs font-semibold text-white hover:border-blue-400 cursor-pointer"
              >
                <Pause className="h-4 w-4" />
                <span>Pauza</span>
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-red-600/85 hover:bg-red-500 px-3.5 text-xs font-semibold text-white cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Chiqish</span>
              </button>
            </div>
          </div>

          {/* Voxel Material Picker for Minecraft-style game */}
          {game.archetype === 'voxel-builder' && (
            <div className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-[#070B14]/90 p-1.5">
              {VOXEL_LABELS.map((lbl, idx) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => controllerRef.current?.selectVoxelBlock?.(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                    hud.voxelBlockIndex === idx
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          {/* Mobile / Touch Controls */}
          {showTouchPad && phase === 'playing' && (
            <TouchControls
              onJoystickMove={(x, y) =>
                controllerRef.current?.setJoystickVector(x, y)
              }
              onAction={(act) => controllerRef.current?.triggerAction(act)}
              primaryLabel={hud.actionButtonLabel ?? 'Harakat'}
              showAux={game.id === 'open-world-explorer' || game.archetype === 'voxel-builder'}
              auxLabel={game.archetype === 'voxel-builder' ? 'Buzish' : 'Mashina'}
            />
          )}
        </>
      )}

      {/* 4. PAUSE MODAL */}
      {phase === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#0F1629] p-6 text-center space-y-4 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">
              O‘yin to‘xtatildi
            </h2>
            <p className="text-xs text-slate-400">
              {game.title} · Joriy ball: {hud.score}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handlePauseToggle}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Davom etish
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Qayta boshlash
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 py-3 text-sm font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                Bosh sahifaga qaytish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VICTORY / GAME OVER MODAL */}
      {phase === 'finished' && finishData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F1629] p-7 text-center space-y-5 shadow-2xl">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                finishData.won
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
              }`}
            >
              <Trophy className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-3xl font-bold text-white">
                {finishData.won ? 'G‘alaba!' : 'O‘yin yakunlandi'}
              </h2>
              <p className="text-sm text-slate-300">{finishData.summaryText}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#070B14] border border-slate-800 p-4">
              <div>
                <p className="text-xs text-slate-400">To‘plangan ball</p>
                <p className="font-mono text-2xl font-bold text-orange-400 tabular-nums">
                  {finishData.score}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Eng yaxshi rekord</p>
                <p className="font-mono text-2xl font-bold text-blue-400 tabular-nums">
                  {Math.max(prevBest, finishData.score)}
                </p>
              </div>
            </div>

            {newAchievements.length > 0 && (
              <div className="rounded-xl bg-blue-500/15 border border-blue-500/30 p-3 text-xs text-blue-300">
                Yangi yutuq ochildi: <strong>{newAchievements.join(', ')}</strong>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Qayta o‘ynash
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Bosh sahifaga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
