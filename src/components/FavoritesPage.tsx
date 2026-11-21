import React from 'react';
import { Heart, History } from 'lucide-react';
import { getGameById } from '@/src/data/games';
import { usePlatform } from '@/src/context/PlatformContext';
import { GameCard } from '@/src/components/GameCard';

export const FavoritesPage: React.FC = () => {
  const { state, setCurrentPage, setSelectedAgeFilter } = usePlatform();

  const favoriteGames = state.favorites
    .map((id) => getGameById(id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const recentGames = Object.values(state.history)
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .map((entry) => ({
      entry,
      game: getGameById(entry.gameId),
    }))
    .filter((item): item is { entry: typeof item.entry; game: NonNullable<typeof item.game> } =>
      Boolean(item.game),
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Favorites */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Heart className="h-6 w-6 text-orange-500" />
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Sevimli o‘yinlar
          </h1>
        </div>

        {favoriteGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favoriteGames.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                bestScore={state.history[g.id]?.bestScore}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-10 text-center space-y-3">
            <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Sevimlilar ro‘yxati hozircha bo‘sh
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Yoqtirgan o‘yinlaringiz kartasidagi yurakcha belgisini bosib ularni bu yerga saqlang.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAgeFilter('Barcha yoshlar');
                setCurrentPage('games');
              }}
              className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              O‘yinlarni ko‘rish
            </button>
          </div>
        )}
      </section>

      {/* Play History */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <History className="h-6 w-6 text-blue-500" />
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            O‘yinlar tarixi
          </h2>
        </div>

        {recentGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentGames.map(({ game, entry }) => (
              <GameCard
                key={game.id}
                game={game}
                bestScore={entry.bestScore}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hali birorta o‘yin o‘ynalmadi. O‘ynashni boshlang va rekordlaringiz shu yerda ko‘rinadi!
          </p>
        )}
      </section>
    </div>
  );
};
