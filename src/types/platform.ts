export type AgeGroup = '3-5' | '6-9' | '10-15' | '16-20';

export type GameCategory =
  | 'Poyga'
  | 'Sarguzasht'
  | 'Sport'
  | 'Strategiya'
  | 'Simulyator'
  | "Bolalar o'yinlari";

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type SortOption = 'popular' | 'newest' | 'most_played';

export type PlatformPage =
  | 'home'
  | 'games'
  | 'categories'
  | 'favorites'
  | 'profile'
  | 'settings';

export type GameArchetype =
  | 'kids-collect-colors'
  | 'kids-animals-park'
  | 'kids-shape-match'
  | 'kids-fruit-harvest'
  | 'kids-cute-race'
  | 'racing-circuit'
  | 'voxel-builder'
  | 'dino-island'
  | 'space-flight'
  | 'football-match'
  | 'city-drive'
  | 'laser-arena'
  | 'offroad-climb'
  | 'survival-stun';

export interface GameMetadata {
  id: string;
  title: string;
  category: GameCategory;
  secondaryCategory?: GameCategory;
  ageGroup: AgeGroup;
  ageLabel: string;
  shortDescription: string;
  instructions: string;
  controlsSummary: string[];
  controlScheme: 'racing' | 'adventure' | 'football' | 'arena' | 'kids';
  archetype: GameArchetype;
  popularity: number;
  playCount: number;
  isNew?: boolean;
  isFeatured?: boolean;
  accentHex: string;
  secondaryHex: string;
  variantKey: string;
  hasDifficulty?: boolean;
  hasVehicleSelect?: boolean;
  hasTacticSelect?: boolean;
}

export interface PlayHistoryEntry {
  gameId: string;
  lastPlayedAt: number;
  bestScore: number;
  plays: number;
  totalSeconds: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt?: number;
}

export interface UserProfile {
  name: string;
  ageGroup: AgeGroup;
  createdAt: number;
}

export interface PlatformSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0..1
  graphicsQuality: GraphicsQuality;
  theme: 'dark' | 'light';
  language: 'uz';
}

export interface UzgameStorageState {
  profile: UserProfile | null;
  favorites: string[];
  history: Record<string, PlayHistoryEntry>;
  unlockedAchievements: Record<string, number>;
  settings: PlatformSettings;
}
