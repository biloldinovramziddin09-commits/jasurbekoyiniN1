import React from 'react';
import { Heart, Play } from 'lucide-react';
import { GameMetadata } from '@/src/types/platform';
import { GameThumbnail } from '@/src/components/GameThumbnail';
import { usePlatform } from '@/src/context/PlatformContext';

interface GameCardProps {
  game: GameMetadata;
  bestScore?: number;
}

export const GameCard: React.FC<GameCardProps> = ({ game, bestScore }) => {
  const { state, toggleFavorite, launchGame } = usePlatform();
  const isFav = state.favorites.includes(game.id);

  return (
    <article className="group uz-card-tilt relative flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F1629] hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/10">
      <div className="relative">
        <button
          type="button"
          onClick={() => launchGame(game.id)}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`${game.title} o'yinini boshlash`}
        >
          <GameThumbnail game={game} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(game.id);
          }}
          aria-label={isFav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
          className={`absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            isFav
              ? 'bg-orange-500 border-orange-400 text-white'
              : 'bg-slate-950/75 border-white/15 text-slate-200 hover:text-orange-400'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium text-blue-600 dark:text-blue-400">{game.category}</span>
            <span aria-hidden="true">·</span>
            <span>{game.ageLabel}</span>
            {game.isNew && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-orange-500">Yangi</span>
              </>
            )}
          </div>

          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
            {game.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {game.shortDescription}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {bestScore && bestScore > 0
              ? `Rekord: ${bestScore}`
              : `${game.playCount.toLocaleString('uz-UZ')} o‘ynalgan`}
          </span>

          <button
            type="button"
            onClick={() => launchGame(game.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            O‘ynash
          </button>
        </div>
      </div>
    </article>
  );
};
