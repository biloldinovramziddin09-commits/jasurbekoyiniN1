import { GameInitializer } from '@/src/engine/types';
import { GameArchetype } from '@/src/types/platform';
import { initKidsGame } from '@/src/games/kidsGames';
import {
  initCityAndOpenWorldGame,
  initRacingCircuitGame,
} from '@/src/games/racingGames';
import {
  initDinoIslandGame,
  initSpaceExplorerGame,
  initVoxelAdventureGame,
} from '@/src/games/adventureGames';
import { initFootballGame } from '@/src/games/footballGames';
import {
  initLaserArenaGame,
  initZombieSurvivalGame,
} from '@/src/games/arenaAndSurvivalGames';
import { initOffroadGame } from '@/src/games/offroadGames';

export const GAME_ENGINE_REGISTRY: Record<GameArchetype, GameInitializer> = {
  'kids-collect-colors': initKidsGame,
  'kids-animals-park': initKidsGame,
  'kids-shape-match': initKidsGame,
  'kids-fruit-harvest': initKidsGame,
  'kids-cute-race': initRacingCircuitGame,
  'racing-circuit': initRacingCircuitGame,
  'voxel-builder': initVoxelAdventureGame,
  'dino-island': initDinoIslandGame,
  'space-flight': initSpaceExplorerGame,
  'football-match': initFootballGame,
  'city-drive': initCityAndOpenWorldGame,
  'laser-arena': initLaserArenaGame,
  'offroad-climb': initOffroadGame,
  'survival-stun': initZombieSurvivalGame,
};
