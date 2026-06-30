import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DifficultyMode } from '../types';

const KEYS = {
  BEST: 'flappyBestScore',
  DIFFICULTY: 'flappyDifficulty',
} as const;

export function useStorage() {
  const [best, setBest] = useState(0);
  const [savedDifficulty, setSavedDifficulty] = useState<DifficultyMode>('medium');
  const [loaded, setLoaded] = useState(false);

  /* hydrate from disk on mount */
  useEffect(() => {
    (async () => {
      try {
        const [bestStr, diffStr] = await Promise.all([
          AsyncStorage.getItem(KEYS.BEST),
          AsyncStorage.getItem(KEYS.DIFFICULTY),
        ]);
        if (bestStr) setBest(parseInt(bestStr, 10));
        if (diffStr && ['easy', 'medium', 'hell'].includes(diffStr)) {
          setSavedDifficulty(diffStr as DifficultyMode);
        }
      } catch (e) {
        console.error('Storage load error:', e);
      }
      setLoaded(true);
    })();
  }, []);

  const saveBest = useCallback(async (score: number) => {
    setBest(score);
    try {
      await AsyncStorage.setItem(KEYS.BEST, score.toString());
    } catch (e) {
      console.error('Save best error:', e);
    }
  }, []);

  const saveDifficulty = useCallback(async (mode: DifficultyMode) => {
    setSavedDifficulty(mode);
    try {
      await AsyncStorage.setItem(KEYS.DIFFICULTY, mode);
    } catch (e) {
      console.error('Save difficulty error:', e);
    }
  }, []);

  return { best, savedDifficulty, loaded, saveBest, saveDifficulty } as const;
}
