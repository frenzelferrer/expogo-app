import { Dimensions } from 'react-native';
import type { DifficultyConfig, DifficultyMode, WeatherTheme, BirdUpgrade } from './types';

const { width, height } = Dimensions.get('window');
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

export const BIRD_SIZE = 45;
export const PIPE_WIDTH = 80;
export const GROUND_HEIGHT = 90;
export const BIRD_LEFT = 80;
export const GAME_TICK_MS = 16;
export const MAX_SPEED_FACTOR = 14;

// ── Difficulty ──────────────────────────────────────────────
export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    gravity: 0.8,
    flap: -12,
    gap: 280,
    speedMultiplier: 0.7,
    label: 'EASY',
    color: '#4ADE80',
    description: 'Relaxed gaps, gentle gravity',
  },
  medium: {
    gravity: 1.2,
    flap: -14,
    gap: 230,
    speedMultiplier: 1.0,
    label: 'MEDIUM',
    color: '#FBBF24',
    description: 'The classic experience',
  },
  hell: {
    gravity: 1.6,
    flap: -16,
    gap: 180,
    speedMultiplier: 1.4,
    label: 'HELL',
    color: '#EF4444',
    description: 'Tight gaps, brutal speed',
  },
};

// ── Weather / sky themes ────────────────────────────────────
export const WEATHER_THEMES: Record<string, WeatherTheme> = {
  sunny: {
    background: '#70C5CE',
    background2: '#87CEEB',
    ground: '#D9A441',
    ground2: '#C4943D',
    grassColor: '#4ADE80',
    pipe: '#22C55E',
    pipeBorder: '#15803D',
    pipeHighlight: '#4ADE80',
    hasSun: true,
    hasMoon: false,
    hasStars: false,
  },
  sunset: {
    background: '#FF7E5F',
    background2: '#FEB47B',
    ground: '#C4A574',
    ground2: '#A68B5B',
    grassColor: '#8B9D6B',
    pipe: '#4A90A4',
    pipeBorder: '#2C5F6E',
    pipeHighlight: '#7EC8E3',
    hasSun: true,
    hasMoon: false,
    hasStars: false,
  },
  night: {
    background: '#1a1a2e',
    background2: '#16213e',
    ground: '#4a4a6a',
    ground2: '#3a3a5a',
    grassColor: '#2a4a3a',
    pipe: '#6b6b8a',
    pipeBorder: '#4a4a6a',
    pipeHighlight: '#8b8baa',
    hasSun: false,
    hasMoon: true,
    hasStars: true,
  },
  storm: {
    background: '#4a5568',
    background2: '#2d3748',
    ground: '#2d3748',
    ground2: '#1a202c',
    grassColor: '#3a5a4a',
    pipe: '#718096',
    pipeBorder: '#4a5568',
    pipeHighlight: '#A0AEC0',
    hasSun: false,
    hasMoon: false,
    hasStars: false,
  },
};

export const WEATHER_KEYS = Object.keys(WEATHER_THEMES);

// ── Bird upgrades (earned every 10 pts) ─────────────────────
export const BIRD_UPGRADES: Record<number, BirdUpgrade> = {
  0: { color: '#FFD93D', borderColor: '#E6B800', hat: null, accessory: null },
  1: { color: '#FF6B6B', borderColor: '#C92A2A', hat: 'cap', accessory: null },
  2: { color: '#4ECDC4', borderColor: '#2A9D8F', hat: 'crown', accessory: null },
  3: { color: '#9B59B6', borderColor: '#8E44AD', hat: 'tophat', accessory: 'glasses' },
  4: { color: '#F39C12', borderColor: '#D68910', hat: 'wizard', accessory: 'glasses' },
};

// ── Particle burst palette ──────────────────────────────────
export const PARTICLE_COLORS = [
  '#FF6B6B', '#FFD93D', '#4ECDC4', '#FF8E53', '#A78BFA', '#F472B6',
];
