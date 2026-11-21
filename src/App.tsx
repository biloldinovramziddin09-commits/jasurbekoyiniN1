import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlatformProvider, usePlatform } from '@/src/context/PlatformContext';
import { Onboarding } from '@/src/components/Onboarding';
import { Header } from '@/src/components/Header';
import { HomePage } from '@/src/components/HomePage';
import { CatalogPage } from '@/src/components/CatalogPage';
import { CategoriesPage } from '@/src/components/CategoriesPage';
import { FavoritesPage } from '@/src/components/FavoritesPage';
import { ProfilePage } from '@/src/components/ProfilePage';
import { SettingsPage } from '@/src/components/SettingsPage';
import { GamePlayer } from '@/src/components/GamePlayer';
import { CustomCursor } from '@/src/components/CustomCursor';
import { soundEngine } from '@/src/engine/audio';

const PlatformShell: React.FC = () => {
  const { state, currentPage, setCurrentPage, activeGameId, toastMessage } =
    usePlatform();

  useEffect(() => {
    soundEngine.syncSettings(state.settings);
  }, [state.settings]);

  if (!state.profile) {
    return (
      <>
        <CustomCursor />
        <Onboarding />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'games':
        return <CatalogPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100">
      <CustomCursor disabled={Boolean(activeGameId)} />
      <Header />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#070B14]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} UZGAME · O‘zbek tilidagi 3D onlayn o‘yinlar platformasi
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setCurrentPage('games')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Barcha o‘yinlar
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('profile')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Profil
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('settings')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Sozlamalar
            </button>
          </div>
        </div>
      </footer>

      {activeGameId && <GamePlayer gameId={activeGameId} />}

      {/* Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 rounded-xl border border-blue-500/40 bg-[#0F1629] px-5 py-3 text-sm font-medium text-white shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <PlatformShell />
    </PlatformProvider>
  );
}
