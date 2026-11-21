import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AgeGroup,
  PlatformPage,
  PlatformSettings,
  UserProfile,
  UzgameStorageState,
} from '@/src/types/platform';
import { getGameById } from '@/src/data/games';

const STORAGE_KEY = 'uzgame_platform_state_v1';

const DEFAULT_SETTINGS: PlatformSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.65,
  graphicsQuality: 'medium',
  theme: 'dark',
  language: 'uz',
};

const DEFAULT_STATE: UzgameStorageState = {
  profile: null,
  favorites: [],
  history: {},
  unlockedAchievements: {},
  settings: DEFAULT_SETTINGS,
};

function loadInitialState(): UzgameStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<UzgameStorageState>;
    return {
      profile: parsed.profile ?? null,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      history: parsed.history ?? {},
      unlockedAchievements: parsed.unlockedAchievements ?? {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

interface PlatformContextValue {
  state: UzgameStorageState;
  currentPage: PlatformPage;
  setCurrentPage: (page: PlatformPage) => void;
  activeGameId: string | null;
  launchGame: (gameId: string) => void;
  closeGame: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (cat: string) => void;
  selectedAgeFilter: string;
  setSelectedAgeFilter: (age: string) => void;
  completeOnboarding: (name: string, ageGroup: AgeGroup) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleFavorite: (gameId: string) => void;
  recordGameSession: (
    gameId: string,
    score: number,
    durationSeconds: number,
    won: boolean,
  ) => string[];
  updateSettings: (updates: Partial<PlatformSettings>) => void;
  resetProgress: () => void;
  resetFullAccount: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<UzgameStorageState>(loadInitialState);
  const [currentPage, setCurrentPage] = useState<PlatformPage>('home');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Barchasi');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState('Mening yoshim');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [state]);

  // Sync dark/light class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.settings.theme]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const completeOnboarding = (name: string, ageGroup: AgeGroup) => {
    const cleanName = name.trim();
    setState((prev) => ({
      ...prev,
      profile: {
        name: cleanName,
        ageGroup,
        createdAt: Date.now(),
      },
    }));
    setSelectedAgeFilter('Mening yoshim');
    setCurrentPage('home');
    showToast(`Xush kelibsiz, ${cleanName}! O'yinlar olamiga tayyormisiz?`);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setState((prev) => {
      if (!prev.profile) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          ...updates,
        },
      };
    });
    showToast("Profil ma'lumotlari saqlandi.");
  };

  const toggleFavorite = (gameId: string) => {
    setState((prev) => {
      const exists = prev.favorites.includes(gameId);
      const nextFavs = exists
        ? prev.favorites.filter((id) => id !== gameId)
        : [...prev.favorites, gameId];
      const nextAch = { ...prev.unlockedAchievements };
      if (nextFavs.length >= 3 && !nextAch['collector']) {
        nextAch['collector'] = Date.now();
      }
      return {
        ...prev,
        favorites: nextFavs,
        unlockedAchievements: nextAch,
      };
    });
  };

  const recordGameSession = (
    gameId: string,
    score: number,
    durationSeconds: number,
    won: boolean,
  ): string[] => {
    const newlyUnlocked: string[] = [];
    setState((prev) => {
      const existing = prev.history[gameId];
      const nextHistory = {
        ...prev.history,
        [gameId]: {
          gameId,
          lastPlayedAt: Date.now(),
          bestScore: Math.max(existing?.bestScore ?? 0, Math.round(score)),
          plays: (existing?.plays ?? 0) + 1,
          totalSeconds: (existing?.totalSeconds ?? 0) + Math.max(1, Math.round(durationSeconds)),
        },
      };

      const nextAch = { ...prev.unlockedAchievements };
      const now = Date.now();
      const totalUniqueGames = Object.keys(nextHistory).length;
      const gameMeta = getGameById(gameId);

      if (!nextAch['first-game']) {
        nextAch['first-game'] = now;
        newlyUnlocked.push('Ilk qadam');
      }
      if (totalUniqueGames >= 3 && !nextAch['three-games']) {
        nextAch['three-games'] = now;
        newlyUnlocked.push('Faol o‘yinchi');
      }
      if (totalUniqueGames >= 5 && !nextAch['explorer-five']) {
        nextAch['explorer-five'] = now;
        newlyUnlocked.push('Olamlar kashfiyotchisi');
      }
      if (score >= 500 && !nextAch['high-scorer']) {
        nextAch['high-scorer'] = now;
        newlyUnlocked.push('Rekordchi');
      }
      if (
        won &&
        (gameMeta?.category === 'Poyga' || gameMeta?.category === 'Simulyator') &&
        !nextAch['speed-master']
      ) {
        nextAch['speed-master'] = now;
        newlyUnlocked.push('Tezlik chempioni');
      }

      return {
        ...prev,
        history: nextHistory,
        unlockedAchievements: nextAch,
      };
    });
    return newlyUnlocked;
  };

  const updateSettings = (updates: Partial<PlatformSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }));
  };

  const resetProgress = () => {
    setState((prev) => ({
      ...prev,
      favorites: [],
      history: {},
      unlockedAchievements: {},
    }));
    showToast("O'yin natijalari va yutuqlar tozalandi.");
  };

  const resetFullAccount = () => {
    setState((prev) => ({
      ...DEFAULT_STATE,
      settings: prev.settings,
    }));
    setActiveGameId(null);
    setCurrentPage('home');
  };

  const launchGame = (gameId: string) => {
    setActiveGameId(gameId);
  };

  const closeGame = () => {
    setActiveGameId(null);
  };

  return (
    <PlatformContext.Provider
      value={{
        state,
        currentPage,
        setCurrentPage,
        activeGameId,
        launchGame,
        closeGame,
        searchQuery,
        setSearchQuery,
        selectedCategoryFilter,
        setSelectedCategoryFilter,
        selectedAgeFilter,
        setSelectedAgeFilter,
        completeOnboarding,
        updateProfile,
        toggleFavorite,
        recordGameSession,
        updateSettings,
        resetProgress,
        resetFullAccount,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return ctx;
}
