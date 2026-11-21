import { GameMetadata, GraphicsQuality } from '@/src/types/platform';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type FootballTactic = 'attacking' | 'balanced' | 'defensive';
export type RacingVehicleType = 'gt' | 'hyper' | 'rally';

export interface GameSessionOptions {
  difficulty: DifficultyLevel;
  tactic: FootballTactic;
  vehicle: RacingVehicleType;
}

export interface GameHudState {
  score: number;
  targetScore?: number;
  timeRemaining?: number; // seconds
  elapsedTime?: number;
  speedKmh?: number;
  lap?: number;
  totalLaps?: number;
  health?: number;
  maxHealth?: number;
  primaryLabel: string;
  secondaryLabel?: string;
  missionPrompt: string;
  actionButtonLabel?: string;
  extraStat?: string;
  voxelBlockIndex?: number;
}

export interface GameFinishPayload {
  won: boolean;
  score: number;
  summaryText: string;
  durationSeconds: number;
}

export interface GameEngineCallbacks {
  onHudUpdate: (hud: GameHudState) => void;
  onFinish: (result: GameFinishPayload) => void;
  onReady: () => void;
}

export interface GameControllerHandle {
  setPaused: (paused: boolean) => void;
  triggerAction: (action: 'primary' | 'secondary' | 'aux') => void;
  setJoystickVector: (x: number, y: number) => void;
  selectVoxelBlock?: (index: number) => void;
  dispose: () => void;
}

export type GameInitializer = (
  container: HTMLElement,
  meta: GameMetadata,
  quality: GraphicsQuality,
  options: GameSessionOptions,
  callbacks: GameEngineCallbacks,
) => GameControllerHandle;
