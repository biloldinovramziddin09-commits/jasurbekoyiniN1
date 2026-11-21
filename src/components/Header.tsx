import React, { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { UzgameLogo } from '@/src/components/UzgameLogo';
import { usePlatform } from '@/src/context/PlatformContext';
import { PlatformPage } from '@/src/types/platform';

const NAV_ITEMS: { id: PlatformPage; label: string }[] = [
  { id: 'home', label: 'Bosh sahifa' },
  { id: 'games', label: "Barcha o'yinlar" },
  { id: 'categories', label: 'Kategoriyalar' },
  { id: 'favorites', label: 'Sevimlilar' },
  { id: 'profile', label: 'Profil' },
  { id: 'settings', label: 'Sozlamalar' },
];

export const Header: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
  } = usePlatform();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0 && currentPage !== 'games') {
      setCurrentPage('games');
    }
  };

  const handleNavClick = (page: PlatformPage) => {
    setCurrentPage(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          aria-label="UZGAME bosh sahifa"
        >
          <UzgameLogo size="md" />
        </button>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Asosiy navigatsiya"
          className="hidden lg:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search bar + Mobile menu trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative hidden sm:block w-52 xl:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="O‘yin qidirish..."
              aria-label="O‘yin qidirish"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700/90 bg-slate-100 dark:bg-[#0F1629] pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0F1629] text-slate-700 dark:text-slate-200"
            aria-label={mobileOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1020] px-4 py-4 space-y-3">
          <div className="relative sm:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="O‘yin qidirish..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#0F1629] pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-[#0F1629] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
