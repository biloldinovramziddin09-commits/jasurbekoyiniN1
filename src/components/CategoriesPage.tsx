import React from 'react';
import { AGE_GROUP_META } from '@/src/data/assets';
import { ALL_GAMES, GAME_CATEGORIES } from '@/src/data/games';
import { usePlatform } from '@/src/context/PlatformContext';
import { AgeGroup, GameCategory } from '@/src/types/platform';

const AGE_LIST: AgeGroup[] = ['3-5', '6-9', '10-15', '16-20'];

export const CategoriesPage: React.FC = () => {
  const { setSelectedCategoryFilter, setSelectedAgeFilter, setCurrentPage } =
    usePlatform();

  const openCategory = (cat: GameCategory) => {
    setSelectedCategoryFilter(cat);
    setSelectedAgeFilter('Barcha yoshlar');
    setCurrentPage('games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAgeGroup = (age: AgeGroup) => {
    setSelectedCategoryFilter('Barchasi');
    setSelectedAgeFilter(age);
    setCurrentPage('games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
          Kategoriyalar va yosh guruhlari
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          O‘zingizga yoqqan janr yoki yosh toifasini tanlang
        </p>
      </div>

      {/* Age Groups Showcase */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Yosh toifalari bo‘yicha
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {AGE_LIST.map((age) => {
            const meta = AGE_GROUP_META[age];
            const count = ALL_GAMES.filter((g) => g.ageGroup === age).length;
            return (
              <button
                key={age}
                type="button"
                onClick={() => openAgeGroup(age)}
                className="group text-left overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] hover:border-blue-500/60 transition-all cursor-pointer"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={meta.image}
                    alt={meta.label}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="font-display text-xl font-bold">{meta.label}</span>
                    <span className="font-mono text-xs text-slate-300">{count} o‘yin</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    {meta.subtitle}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Genre Categories */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Janrlar bo‘yicha
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAME_CATEGORIES.map((cat) => {
            const games = ALL_GAMES.filter(
              (g) => g.category === cat.id || g.secondaryCategory === cat.id,
            );
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => openCategory(cat.id)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-6 hover:border-blue-500/60 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                    {cat.title}
                  </h3>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {games.length} o‘yin
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {cat.description}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {games.map((g) => g.title).join(' · ')}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
