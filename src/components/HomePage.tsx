import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Gamepad2,
  Play,
  Sparkles,
} from 'lucide-react';
import { ALL_GAMES, GAME_CATEGORIES, getGameById } from '@/src/data/games';
import { AGE_GROUP_META, HERO_BANNER_IMAGE } from '@/src/data/assets';
import { usePlatform } from '@/src/context/PlatformContext';
import { GameCard } from '@/src/components/GameCard';
import { GameThumbnail } from '@/src/components/GameThumbnail';
import { GameCategory } from '@/src/types/platform';

export const HomePage: React.FC = () => {
  const {
    state,
    setCurrentPage,
    setSelectedCategoryFilter,
    setSelectedAgeFilter,
    launchGame,
  } = usePlatform();

  const user = state.profile!;
  const ageMeta = AGE_GROUP_META[user.ageGroup];

  // Age-matched games first
  const ageRecommendedGames = ALL_GAMES.filter(
    (g) => g.ageGroup === user.ageGroup,
  );

  const featuredGames = ALL_GAMES.filter((g) => g.isFeatured);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const currentFeatured = featuredGames[carouselIdx % featuredGames.length];

  const popularGames = [...ALL_GAMES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4);

  const newGames = ALL_GAMES.filter((g) => g.isNew).slice(0, 4);

  const recentEntries = Object.values(state.history)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .slice(0, 4);

  const handleCategoryJump = (cat: GameCategory) => {
    setSelectedCategoryFilter(cat);
    setSelectedAgeFilter('Barcha yoshlar');
    setCurrentPage('games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 min-h-[380px] lg:min-h-[430px] flex items-center">
        <img
          src={HERO_BANNER_IMAGE}
          alt="UZGAME 3D o'yinlar arenasi"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070B14] via-[#070B14]/80 to-[#070B14]/25" />

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-7 space-y-5"
          >
            <p className="text-sm font-medium text-blue-400">
              Salom, {user.name} · {ageMeta.label} ({ageMeta.subtitle})
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight text-balance">
              O‘YINLAR OLAMIGA XUSH KELIBSIZ!
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl">
              Eng qiziqarli o‘yinlar bir joyda! Sizning yoshingizga mos 3D poygalar, sarguzashtlar, sport va strategiya o‘yinlarini hoziroq boshlang.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  const firstGame = ageRecommendedGames[0] ?? ALL_GAMES[0];
                  launchGame(firstGame.id);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                O‘ynashni boshlash
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAgeFilter('Barcha yoshlar');
                  setSelectedCategoryFilter('Barchasi');
                  setCurrentPage('games');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 px-6 py-3.5 text-sm font-semibold text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                O‘yinlarni ko‘rish
              </button>
            </div>
          </motion.div>

          {/* Featured Game Carousel Card inside Hero */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-white/15 bg-[#0F1629]/90 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-orange-400">
                  Tanlangan 3D o‘yin
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIdx(
                        (i) => (i - 1 + featuredGames.length) % featuredGames.length,
                      )
                    }
                    aria-label="Oldingi o'yin"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-200 hover:border-blue-400 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIdx((i) => (i + 1) % featuredGames.length)
                    }
                    aria-label="Keyingi o'yin"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-200 hover:border-blue-400 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                onClick={() => launchGame(currentFeatured.id)}
                className="group cursor-pointer overflow-hidden rounded-lg border border-white/10"
              >
                <GameThumbnail game={currentFeatured} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold text-white truncate">
                    {currentFeatured.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {currentFeatured.category} · {currentFeatured.ageLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => launchGame(currentFeatured.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Boshlash
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AGE-RECOMMENDED GAMES (5 PLAYABLE GAMES FOR USER'S AGE) */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Sizning yosh guruhingiz uchun maxsus</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {ageMeta.label} uchun tavsiya etilgan 3D o‘yinlar
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedAgeFilter(user.ageGroup);
              setSelectedCategoryFilter('Barchasi');
              setCurrentPage('games');
            }}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
          >
            Hammasini ko‘rish
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {ageRecommendedGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              bestScore={state.history[g.id]?.bestScore}
            />
          ))}
        </div>
      </section>

      {/* 3. RECENTLY PLAYED (shown when user has history) */}
      {recentEntries.length > 0 && (
        <section className="space-y-5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Yaqinda o‘ynalganlar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentEntries.map((entry) => {
              const game = getGameById(entry.gameId);
              if (!game) return null;
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  bestScore={entry.bestScore}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* 4. POPULAR & NEW GAMES */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Ommabop o‘yinlar
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedAgeFilter('Barcha yoshlar');
              setSelectedCategoryFilter('Barchasi');
              setCurrentPage('games');
            }}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap cursor-pointer"
          >
            Barcha 20 ta o‘yin
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              bestScore={state.history[g.id]?.bestScore}
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-purple-500" />
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Yangi qo‘shilgan o‘yinlar
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {newGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              bestScore={state.history[g.id]?.bestScore}
            />
          ))}
        </div>
      </section>

      {/* 5. CATEGORY CARDS */}
      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          O‘yin kategoriyalari
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_CATEGORIES.map((cat) => {
            const count = ALL_GAMES.filter(
              (g) => g.category === cat.id || g.secondaryCategory === cat.id,
            ).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryJump(cat.id)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-5 hover:border-blue-500/60 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                    {cat.title}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {count} ta o‘yin
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
