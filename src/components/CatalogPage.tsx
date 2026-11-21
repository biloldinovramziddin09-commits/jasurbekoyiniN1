import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ALL_GAMES } from '@/src/data/games';
import { usePlatform } from '@/src/context/PlatformContext';
import { GameCard } from '@/src/components/GameCard';
import { SortOption } from '@/src/types/platform';

const CATEGORY_FILTERS = [
  'Barchasi',
  'Poyga',
  'Sarguzasht',
  'Sport',
  'Strategiya',
  'Simulyator',
  "Bolalar o'yinlari",
];

const AGE_FILTERS = [
  { id: 'Mening yoshim', label: 'Mening yoshim' },
  { id: 'Barcha yoshlar', label: 'Barcha yoshlar' },
  { id: '3-5', label: '3–5 yosh' },
  { id: '6-9', label: '6–9 yosh' },
  { id: '10-15', label: '10–15 yosh' },
  { id: '16-20', label: '16–20 yosh' },
];

export const CatalogPage: React.FC = () => {
  const {
    state,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedAgeFilter,
    setSelectedAgeFilter,
  } = usePlatform();

  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = ALL_GAMES.filter((g) => {
      // Age filter
      if (selectedAgeFilter === 'Mening yoshim' && state.profile) {
        if (g.ageGroup !== state.profile.ageGroup) return false;
      } else if (
        selectedAgeFilter !== 'Barcha yoshlar' &&
        selectedAgeFilter !== 'Mening yoshim'
      ) {
        if (g.ageGroup !== selectedAgeFilter) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'Barchasi') {
        if (
          g.category !== selectedCategoryFilter &&
          g.secondaryCategory !== selectedCategoryFilter
        ) {
          return false;
        }
      }

      // Search query
      if (q.length > 0) {
        const hay = `${g.title} ${g.category} ${g.secondaryCategory ?? ''} ${g.shortDescription} ${g.ageLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    if (sortBy === 'popular') {
      list.sort((a, b) => b.popularity - a.popularity);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    } else if (sortBy === 'most_played') {
      list.sort((a, b) => b.playCount - a.playCount);
    }

    return list;
  }, [
    searchQuery,
    selectedCategoryFilter,
    selectedAgeFilter,
    sortBy,
    state.profile,
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            Barcha 3D o‘yinlar katalogi
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Jami {filteredGames.length} ta o‘yin topildi
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nomi yoki turi bo‘yicha..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1629] pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Saralash"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1629] px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="popular">Eng mashhur</option>
              <option value="newest">Yangi qo‘shilgan</option>
              <option value="most_played">Eng ko‘p o‘ynalgan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Bars */}
      <div className="space-y-3">
        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0F1629] p-1.5 border border-slate-200 dark:border-slate-800">
          {CATEGORY_FILTERS.map((cat) => {
            const active = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Age Group Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {AGE_FILTERS.map((af) => {
            const active = selectedAgeFilter === af.id;
            return (
              <button
                key={af.id}
                type="button"
                onClick={() => setSelectedAgeFilter(af.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {af.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              bestScore={state.history[g.id]?.bestScore}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1629] p-12 text-center space-y-3">
          <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Mos o‘yinlar topilmadi
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryFilter('Barchasi');
              setSelectedAgeFilter('Barcha yoshlar');
            }}
            className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}
    </div>
  );
};
