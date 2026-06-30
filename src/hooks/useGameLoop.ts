import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { DifficultyMode } from '../types';
import {
  BIRD_SIZE,
  BIRD_LEFT,
  PIPE_WIDTH,
  GROUND_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  GAME_TICK_MS,
  MAX_SPEED_FACTOR,
  DIFFICULTY_CONFIGS,
  WEATHER_THEMES,
  WEATHER_KEYS,
  BIRD_UPGRADES,
} from '../constants';
import { randomPipeHeight } from '../utils';

/**
 * Core game loop hook.
 *
 * Positions are driven by `Animated.Value.setValue()` so React only
 * re-renders when *state* changes (score, game-over, weather) — not
 * 60 times per second.
 */
export function useGameLoop(
  difficulty: DifficultyMode,
  best: number,
  saveBest: (s: number) => void,
) {
  // ── Animated values (native-side, no re-render) ─────────────
  const birdYAnim = useRef(new Animated.Value(SCREEN_HEIGHT / 2)).current;
  const pipeXAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const cloud1XAnim = useRef(new Animated.Value(50)).current;
  const cloud2XAnim = useRef(new Animated.Value(SCREEN_WIDTH - 120)).current;
  const cloud3XAnim = useRef(new Animated.Value(SCREEN_WIDTH + 100)).current;
  const birdRotationAnim = useRef(new Animated.Value(0)).current;

  // ── UI animation values ────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scorePulseAnim = useRef(new Animated.Value(1)).current;

  // ── JS-side physics refs ───────────────────────────────────
  const velocityRef = useRef(0);
  const birdYRef = useRef(SCREEN_HEIGHT / 2);
  const pipeXRef = useRef(SCREEN_WIDTH);
  const pipeHeightRef = useRef(220);
  const cloud1Ref = useRef(50);
  const cloud2Ref = useRef(SCREEN_WIDTH - 120);
  const cloud3Ref = useRef(SCREEN_WIDTH + 100);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoredRef = useRef(false);
  const bestRef = useRef(best);

  useEffect(() => {
    bestRef.current = best;
  }, [best]);

  // ── Minimal re-render state ────────────────────────────────
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [pipeHeight, setPipeHeight] = useState(220);
  const [weather, setWeather] = useState('sunny');
  const [isNewBest, setIsNewBest] = useState(false);
  const [scoreVersion, setScoreVersion] = useState(0);
  const [deathY, setDeathY] = useState(0);

  // ── Derived ────────────────────────────────────────────────
  const config = useMemo(() => DIFFICULTY_CONFIGS[difficulty], [difficulty]);
  const theme = useMemo(() => WEATHER_THEMES[weather], [weather]);
  const birdLevel = useMemo(() => Math.min(Math.floor(score / 10), 4), [score]);
  const birdUpgrade = useMemo(() => BIRD_UPGRADES[birdLevel], [birdLevel]);
  const speed = useMemo(
    () =>
      Math.min(
        (6 + score * 0.2) * config.speedMultiplier,
        MAX_SPEED_FACTOR * config.speedMultiplier,
      ),
    [score, config.speedMultiplier],
  );

  // ── Animation helpers ──────────────────────────────────────
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 30, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 20, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const triggerScorePulse = useCallback(() => {
    scorePulseAnim.setValue(1.35);
    Animated.spring(scorePulseAnim, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scorePulseAnim]);

  // ── Game-over handler ──────────────────────────────────────
  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setDeathY(birdYRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    triggerShake();
  }, [triggerShake]);

  // ── Score increment ────────────────────────────────────────
  const incrementScore = useCallback(() => {
    setScore((prev) => {
      const ns = prev + 1;
      if (ns > bestRef.current) {
        saveBest(ns);
        setIsNewBest(true);
      }
      if (ns % 10 === 0) {
        setWeather((w) => {
          const idx = WEATHER_KEYS.indexOf(w);
          return WEATHER_KEYS[(idx + 1) % WEATHER_KEYS.length];
        });
      }
      return ns;
    });
    setScoreVersion((v) => v + 1);
    triggerScorePulse();
  }, [saveBest, triggerScorePulse]);

  // ── Reset ──────────────────────────────────────────────────
  const reset = useCallback(() => {
    birdYRef.current = SCREEN_HEIGHT / 2;
    birdYAnim.setValue(SCREEN_HEIGHT / 2);
    velocityRef.current = 0;
    birdRotationAnim.setValue(0);
    pipeXRef.current = SCREEN_WIDTH;
    pipeXAnim.setValue(SCREEN_WIDTH);
    const h = randomPipeHeight(config.gap);
    pipeHeightRef.current = h;
    setPipeHeight(h);
    cloud1Ref.current = 50;
    cloud1XAnim.setValue(50);
    cloud2Ref.current = SCREEN_WIDTH - 120;
    cloud2XAnim.setValue(SCREEN_WIDTH - 120);
    cloud3Ref.current = SCREEN_WIDTH + 100;
    cloud3XAnim.setValue(SCREEN_WIDTH + 100);
    scoredRef.current = false;
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setIsNewBest(false);
    setWeather('sunny');
    setScoreVersion(0);
    setDeathY(0);
  }, [
    config.gap,
    birdYAnim,
    birdRotationAnim,
    pipeXAnim,
    cloud1XAnim,
    cloud2XAnim,
    cloud3XAnim,
  ]);

  // ── Start game (called from difficulty select) ─────────────
  const startGame = useCallback(() => {
    setGameStarted(true);
    velocityRef.current = config.flap;
  }, [config.flap]);

  // ── Flap (during gameplay only) ────────────────────────────
  const flap = useCallback(() => {
    if (!gameStarted || gameOver) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    velocityRef.current = config.flap;
  }, [gameStarted, gameOver, config.flap]);

  // ── Main loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted || gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      /* ---- physics ---- */
      velocityRef.current += config.gravity;
      birdYRef.current += velocityRef.current;
      pipeXRef.current -= speed;

      /* ---- boundary ---- */
      if (
        birdYRef.current < 0 ||
        birdYRef.current > SCREEN_HEIGHT - GROUND_HEIGHT - BIRD_SIZE
      ) {
        birdYRef.current = Math.max(
          0,
          Math.min(birdYRef.current, SCREEN_HEIGHT - GROUND_HEIGHT - BIRD_SIZE),
        );
        birdYAnim.setValue(birdYRef.current);
        pipeXAnim.setValue(pipeXRef.current);
        handleGameOver();
        return;
      }

      /* ---- collision ---- */
      if (
        pipeXRef.current < BIRD_LEFT + BIRD_SIZE &&
        pipeXRef.current + PIPE_WIDTH > BIRD_LEFT &&
        (birdYRef.current < pipeHeightRef.current ||
          birdYRef.current + BIRD_SIZE > pipeHeightRef.current + config.gap)
      ) {
        birdYAnim.setValue(birdYRef.current);
        pipeXAnim.setValue(pipeXRef.current);
        handleGameOver();
        return;
      }

      /* ---- score ---- */
      if (!scoredRef.current && pipeXRef.current + PIPE_WIDTH < BIRD_LEFT) {
        scoredRef.current = true;
        incrementScore();
      }

      /* ---- pipe reset ---- */
      if (pipeXRef.current < -PIPE_WIDTH) {
        pipeXRef.current = SCREEN_WIDTH;
        const h = randomPipeHeight(config.gap);
        pipeHeightRef.current = h;
        setPipeHeight(h);
        scoredRef.current = false;
      }

      /* ---- clouds ---- */
      cloud1Ref.current -= 0.5;
      if (cloud1Ref.current < -150) cloud1Ref.current = SCREEN_WIDTH + 50;
      cloud2Ref.current -= 0.3;
      if (cloud2Ref.current < -120) cloud2Ref.current = SCREEN_WIDTH + 120;
      cloud3Ref.current -= 0.4;
      if (cloud3Ref.current < -100) cloud3Ref.current = SCREEN_WIDTH + 100;

      /* ---- visuals ---- */
      const rot = Math.max(-30, Math.min(90, velocityRef.current * 3));
      birdYAnim.setValue(birdYRef.current);
      birdRotationAnim.setValue(rot);
      pipeXAnim.setValue(pipeXRef.current);
      cloud1XAnim.setValue(cloud1Ref.current);
      cloud2XAnim.setValue(cloud2Ref.current);
      cloud3XAnim.setValue(cloud3Ref.current);
    }, GAME_TICK_MS);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [
    gameStarted,
    gameOver,
    speed,
    config.gravity,
    config.gap,
    config.flap,
    handleGameOver,
    incrementScore,
    birdYAnim,
    birdRotationAnim,
    pipeXAnim,
    cloud1XAnim,
    cloud2XAnim,
    cloud3XAnim,
  ]);

  return {
    // animated values
    birdYAnim,
    pipeXAnim,
    cloud1XAnim,
    cloud2XAnim,
    cloud3XAnim,
    birdRotationAnim,
    shakeAnim,
    scorePulseAnim,
    // state
    score,
    gameOver,
    gameStarted,
    pipeHeight,
    weather,
    isNewBest,
    scoreVersion,
    deathY,
    // derived
    theme,
    birdUpgrade,
    config,
    // actions
    flap,
    startGame,
    reset,
  } as const;
}
