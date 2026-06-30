import type { MedalInfo, Star } from './types';
import { SCREEN_HEIGHT, SCREEN_WIDTH, GROUND_HEIGHT } from './constants';

export function getMedal(score: number): MedalInfo {
  if (score >= 40)
    return { tier: 'diamond', emoji: '💎', color: '#B9F2FF', borderColor: '#00CED1' };
  if (score >= 25)
    return { tier: 'gold', emoji: '🥇', color: '#FFD700', borderColor: '#DAA520' };
  if (score >= 15)
    return { tier: 'silver', emoji: '🥈', color: '#C0C0C0', borderColor: '#A0A0A0' };
  if (score >= 5)
    return { tier: 'bronze', emoji: '🥉', color: '#CD7F32', borderColor: '#8B4513' };
  return { tier: 'none', emoji: '', color: '#666', borderColor: '#444' };
}

export function randomPipeHeight(gap: number): number {
  const min = 100;
  const max = SCREEN_HEIGHT - gap - GROUND_HEIGHT - 100;
  return Math.random() * (max - min) + min;
}

export function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * (SCREEN_HEIGHT - 200),
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.5,
  }));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
