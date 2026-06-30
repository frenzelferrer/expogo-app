export type DifficultyMode = 'easy' | 'medium' | 'hell';

export interface DifficultyConfig {
  gravity: number;
  flap: number;
  gap: number;
  speedMultiplier: number;
  label: string;
  color: string;
  description: string;
}

export interface WeatherTheme {
  background: string;
  background2: string;
  ground: string;
  ground2: string;
  grassColor: string;
  pipe: string;
  pipeBorder: string;
  pipeHighlight: string;
  hasSun: boolean;
  hasMoon: boolean;
  hasStars: boolean;
}

export interface BirdUpgrade {
  color: string;
  borderColor: string;
  hat: 'cap' | 'crown' | 'tophat' | 'wizard' | null;
  accessory: 'glasses' | null;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface MedalInfo {
  tier: MedalTier;
  emoji: string;
  color: string;
  borderColor: string;
}
