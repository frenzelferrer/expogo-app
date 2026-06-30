import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const BIRD = 45;
const PIPE_WIDTH = 80;

type DifficultyMode = 'easy' | 'medium' | 'hell';

interface DifficultyConfig {
  gravity: number;
  flap: number;
  gap: number;
  speedMultiplier: number;
  label: string;
  color: string;
}

const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    gravity: 0.8,
    flap: -12,
    gap: 280,
    speedMultiplier: 0.7,
    label: 'EASY',
    color: '#4ADE80',
  },
  medium: {
    gravity: 1.2,
    flap: -14,
    gap: 230,
    speedMultiplier: 1.0,
    label: 'MEDIUM',
    color: '#FBBF24',
  },
  hell: {
    gravity: 1.6,
    flap: -16,
    gap: 180,
    speedMultiplier: 1.4,
    label: 'HELL',
    color: '#EF4444',
  },
};


interface WeatherTheme {
  background: string;
  background2: string;
  ground: string;
  ground2: string;
  pipe: string;
  pipeBorder: string;
  pipeHighlight: string;
  hasSun: boolean;
  hasMoon: boolean;
  hasStars: boolean;
}

interface BirdUpgrade {
  color: string;
  borderColor: string;
  hat: 'cap' | 'crown' | 'tophat' | 'wizard' | null;
  accessory: 'glasses' | null;
}

const WEATHER_THEMES: Record<string, WeatherTheme> = {
  sunny: {
    background: '#70C5CE',
    background2: '#87CEEB',
    ground: '#D9A441',
    ground2: '#C4943D',
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
    pipe: '#718096',
    pipeBorder: '#4a5568',
    pipeHighlight: '#A0AEC0',
    hasSun: false,
    hasMoon: false,
    hasStars: false,
  },
};

const BIRD_UPGRADES: Record<number, BirdUpgrade> = {
  0: {
    color: '#FFD93D',
    borderColor: '#E6B800',
    hat: null,
    accessory: null,
  },
  1: {
    color: '#FF6B6B',
    borderColor: '#C92A2A',
    hat: 'cap',
    accessory: null,
  },
  2: {
    color: '#4ECDC4',
    borderColor: '#2A9D8F',
    hat: 'crown',
    accessory: null,
  },
  3: {
    color: '#9B59B6',
    borderColor: '#8E44AD',
    hat: 'tophat',
    accessory: 'glasses',
  },
  4: {
    color: '#F39C12',
    borderColor: '#D68910',
    hat: 'wizard',
    accessory: 'glasses',
  },
};

export default function App(): React.JSX.Element {
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const velocityRef = useRef<number>(0);

  const [birdY, setBirdY] = useState<number>(height / 2);
  const [velocity, setVelocity] = useState<number>(0);

  const [pipeX, setPipeX] = useState<number>(width);
  const [pipeHeight, setPipeHeight] = useState<number>(220);

  const [score, setScore] = useState<number>(0);
  const [best, setBest] = useState<number>(0);  

  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);

  const [weather, setWeather] = useState<string>('sunny');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('medium');
  const [showDifficultySelect, setShowDifficultySelect] = useState<boolean>(true);

  const [cloud1X, setCloud1X] = useState<number>(50);
  const [cloud2X, setCloud2X] = useState<number>(width - 120);
  const [cloud3X, setCloud3X] = useState<number>(width + 100);

  const [stars] = useState<Array<{x: number; y: number; size: number}>>(() =>
    Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height - 200),
      size: Math.random() * 2 + 1,
    }))
  );

  const birdLevel = useMemo(() => Math.min(Math.floor(score / 10), 4), [score]);
  const birdUpgrade = useMemo(() => BIRD_UPGRADES[birdLevel], [birdLevel]);

  const difficultyConfig = useMemo(() => DIFFICULTY_CONFIGS[difficulty], [difficulty]);

  const speed = useMemo(() => Math.min((6 + score * 0.2) * difficultyConfig.speedMultiplier, 14 * difficultyConfig.speedMultiplier), [score, difficultyConfig.speedMultiplier]);

  const currentGravity = useMemo(() => difficultyConfig.gravity, [difficultyConfig.gravity]);
  const currentFlap = useMemo(() => difficultyConfig.flap, [difficultyConfig.flap]);
  const currentGap = useMemo(() => difficultyConfig.gap, [difficultyConfig.gap]);

  const weatherKeys = useMemo(() => Object.keys(WEATHER_THEMES), []);
  const currentTheme = useMemo(() => WEATHER_THEMES[weather], [weather]);

  const loadBestScore = useCallback(async (): Promise<void> => {
    try {
      const savedBest = await AsyncStorage.getItem('flappyBestScore');
      if (savedBest !== null) {
        setBest(parseInt(savedBest, 10));
      }
    } catch (error) {
      console.error('Failed to load best score:', error);
    }
  }, []);

  const loadDifficulty = useCallback(async (): Promise<void> => {
    try {
      const savedDifficulty = await AsyncStorage.getItem('flappyDifficulty');
      if (savedDifficulty !== null && (savedDifficulty === 'easy' || savedDifficulty === 'medium' || savedDifficulty === 'hell')) {
        setDifficulty(savedDifficulty as DifficultyMode);
      }
    } catch (error) {
      console.error('Failed to load difficulty:', error);
    }
  }, []);

  const saveBestScore = useCallback(async (newBest: number): Promise<void> => {
    try {
      await AsyncStorage.setItem('flappyBestScore', newBest.toString());
    } catch (error) {
      console.error('Failed to save best score:', error);
    }
  }, []);

  const saveDifficulty = useCallback(async (newDifficulty: DifficultyMode): Promise<void> => {
    try {
      await AsyncStorage.setItem('flappyDifficulty', newDifficulty);
    } catch (error) {
      console.error('Failed to save difficulty:', error);
    }
  }, []);

  const randomPipe = useCallback((): number => {
    const minHeight = 100;
    const maxHeight = height - currentGap - 200;
    return Math.random() * (maxHeight - minHeight) + minHeight;
  }, [currentGap]);

  const reset = useCallback((): void => {
    setBirdY(height / 2);
    setVelocity(0);
    velocityRef.current = 0;
    setPipeX(width);
    setPipeHeight(randomPipe());
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setShowDifficultySelect(true);
    setIsNewBest(false);
    setWeather('sunny');
    setCloud1X(50);
    setCloud2X(width - 120);
    setCloud3X(width + 100);
  }, [randomPipe]);

  const flap = useCallback((): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (gameOver) {
      reset();
      return;
    }

    if (!gameStarted) {
      if (showDifficultySelect) {
        setShowDifficultySelect(false);
        return;
      }
      setGameStarted(true);
      setVelocity(currentFlap);
      velocityRef.current = currentFlap;
      return;
    }

    setVelocity(currentFlap);
    velocityRef.current = currentFlap;
  }, [gameOver, gameStarted, showDifficultySelect, currentFlap, reset]);

  // Load best score and difficulty on mount
  useEffect(() => {
    loadBestScore();
    loadDifficulty();
  }, [loadBestScore, loadDifficulty]);

  // Save best score whenever it changes
  useEffect(() => {
    if (best > 0) {
      saveBestScore(best);
    }
  }, [best, saveBestScore]);

  // Game loop
  useEffect(() => {
    if (gameOver || !gameStarted) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      velocityRef.current = velocityRef.current + currentGravity;
      setVelocity(velocityRef.current);

      setBirdY((y) => {
        const next = y + velocityRef.current;

        if (next < 0 || next > height - 90 - BIRD) {
          setGameOver(true);
          return y;
        }

        return next;
      });

      setPipeX((x) => {
        const next = x - speed;

        if (next < -PIPE_WIDTH) {
          setScore((s) => {
            const ns = s + 1;
            if (ns > best) {
              setBest(ns);
              setIsNewBest(true);
            }
            return ns;
          });

          setPipeHeight(randomPipe());

          return width;
        }

        return next;
      });

      setCloud1X((x) => {
        const next = x - 0.5;
        return next < -150 ? width + 50 : next;
      });

      setCloud2X((x) => {
        const next = x - 0.3;
        return next < -120 ? width + 120 : next;
      });

      setCloud3X((x) => {
        const next = x - 0.4;
        return next < -100 ? width + 100 : next;
      });
    }, 16); // ~60fps for smoother animation

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [velocity, gameOver, gameStarted, speed, randomPipe, currentGravity]);

  // Collision detection
  useEffect(() => {
    const birdLeft = 80;
    const birdRight = 80 + BIRD;
    const birdTop = birdY;
    const birdBottom = birdY + BIRD;

    const hit =
      pipeX < birdRight &&
      pipeX + PIPE_WIDTH > birdLeft &&
      (birdTop < pipeHeight || birdBottom > pipeHeight + currentGap);

    if (hit) {
      setGameOver(true);
    }
  }, [birdY, pipeX, pipeHeight, currentGap]);

  // Weather change on score milestones
  useEffect(() => {
    if (score > 0 && score % 10 === 0) {
      const currentIndex = weatherKeys.indexOf(weather);
      const nextIndex = (currentIndex + 1) % weatherKeys.length;
      setWeather(weatherKeys[nextIndex]);
    }
  }, [score, weather, weatherKeys]);

  const birdRotation = useMemo(() => {
    return `${Math.max(-30, Math.min(30, velocity * 3))}deg`;
  }, [velocity]);

  const handlePress = useCallback(
    (event: NativeSyntheticEvent<NativeTouchEvent>) => {
      event.preventDefault();
      flap();
    },
    [flap]
  );

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        {/* Background Gradient */}
        <View style={[styles.backgroundGradient, { backgroundColor: currentTheme.background2 }]} />

        {/* Stars (night theme) */}
        {currentTheme.hasStars && stars.map((star, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                width: star.size,
                height: star.size,
              },
            ]}
          />
        ))}

        {/* Sun/Moon */}
        {currentTheme.hasSun && <View style={styles.sun} />}
        {currentTheme.hasMoon && <View style={styles.moon} />}

        {/* Clouds */}
        <View style={[styles.cloud1, { left: cloud1X }]} />
        <View style={[styles.cloud2, { left: cloud2X }]} />
        <View style={[styles.cloud3, { left: cloud3X }]} />

        {/* Score */}
        <Text style={styles.score}>{score}</Text>

        <Text style={styles.best}>Best: {best}</Text>

        {/* Bird */}
        <View
          style={[
            styles.bird,
            {
              top: birdY,
              backgroundColor: birdUpgrade.color,
              borderColor: birdUpgrade.borderColor,
              transform: [{ rotate: birdRotation }],
            },
          ]}
        >
          {/* Eye */}
          <View style={styles.eye}>
            <View style={styles.pupil} />
          </View>
          {/* Beak */}
          <View style={styles.beak} />
          {/* Wing */}
          <View style={[styles.wing, { backgroundColor: birdUpgrade.borderColor }]} />

          {/* Hat */}
          {birdUpgrade.hat === 'cap' && <View style={styles.cap} />}
          {birdUpgrade.hat === 'crown' && <View style={styles.crown} />}
          {birdUpgrade.hat === 'tophat' && <View style={styles.tophat} />}
          {birdUpgrade.hat === 'wizard' && <View style={styles.wizardHat} />}

          {/* Glasses */}
          {birdUpgrade.accessory === 'glasses' && (
            <>
              <View style={styles.glassesLeft} />
              <View style={styles.glassesRight} />
              <View style={styles.glassesBridge} />
            </>
          )}
        </View>

        {/* Top Pipe */}
        <View
          style={[
            styles.pipe,
            {
              left: pipeX,
              height: pipeHeight,
              backgroundColor: currentTheme.pipe,
              borderColor: currentTheme.pipeBorder,
            },
          ]}
        />
        <View
          style={[
            styles.pipeHighlight,
            {
              left: pipeX + 5,
              height: pipeHeight,
              backgroundColor: currentTheme.pipeHighlight,
            },
          ]}
        />
        <View
          style={[
            styles.pipeCap,
            {
              left: pipeX - 5,
              top: pipeHeight - 30,
              backgroundColor: currentTheme.pipe,
              borderColor: currentTheme.pipeBorder,
            },
          ]}
        />

        {/* Bottom Pipe */}
        <View
          style={[
            styles.pipe,
            {
              left: pipeX,
              bottom: 90,
              height: height - pipeHeight - currentGap - 90,
              backgroundColor: currentTheme.pipe,
              borderColor: currentTheme.pipeBorder,
            },
          ]}
        />
        <View
          style={[
            styles.pipeHighlight,
            {
              left: pipeX + 5,
              bottom: 90,
              height: height - pipeHeight - currentGap - 90,
              backgroundColor: currentTheme.pipeHighlight,
            },
          ]}
        />
        <View
          style={[
            styles.pipeCap,
            {
              left: pipeX - 5,
              bottom: height - pipeHeight - currentGap - 30,
              backgroundColor: currentTheme.pipe,
              borderColor: currentTheme.pipeBorder,
            },
          ]}
        />

        {/* Ground */}
        <View style={[styles.ground, { backgroundColor: currentTheme.ground }]} />
        <View style={[styles.groundGradient, { backgroundColor: currentTheme.ground2 }]} />

        {/* Start Screen */}
        {!gameStarted && !gameOver && (
          <View style={styles.overlay}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>FLAPPY BIRD</Text>
            </View>
            {showDifficultySelect ? (
              <View style={styles.difficultyContainer}>
                <Text style={styles.difficultyLabel}>Select Difficulty:</Text>
                {(Object.keys(DIFFICULTY_CONFIGS) as DifficultyMode[]).map((mode) => (
                  <TouchableWithoutFeedback
                    key={mode}
                    onPress={() => {
                      setDifficulty(mode);
                      saveDifficulty(mode);
                      setShowDifficultySelect(false);
                      setGameStarted(true);
                      setVelocity(currentFlap);
                      velocityRef.current = currentFlap;
                    }}
                  >
                    <View
                      style={[
                        styles.difficultyButton,
                        {
                          backgroundColor: difficulty === mode ? DIFFICULTY_CONFIGS[mode].color : '#333',
                          borderColor: difficulty === mode ? DIFFICULTY_CONFIGS[mode].color : '#555',
                          shadowColor: difficulty === mode ? DIFFICULTY_CONFIGS[mode].color : '#000',
                        },
                      ]}
                    >
                      <Text style={styles.difficultyButtonText}>{DIFFICULTY_CONFIGS[mode].label}</Text>
                    </View>
                  </TouchableWithoutFeedback>
                ))}
              </View>
            ) : (
              <Text style={styles.tap}>Tap to Start</Text>
            )}
          </View>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <View style={styles.overlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.title}>GAME OVER</Text>
              {isNewBest && (
                <View style={styles.newBestBadge}>
                  <Text style={styles.newBestText}>🎉 NEW BEST! 🎉</Text>
                </View>
              )}
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Score:</Text>
                <Text style={styles.scoreValue}>{score}</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Best:</Text>
                <Text style={styles.scoreValue}>{best}</Text>
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.color }]}>
                <Text style={styles.difficultyBadgeText}>{difficultyConfig.label}</Text>
              </View>
              <Text style={styles.tap}>Tap to Play Again</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  score: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    color: 'white',
    fontSize: 64,
    fontWeight: '900',
    zIndex: 10,
  },
  best: {
    position: 'absolute',
    top: 40,
    right: 25,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bird: {
    position: 'absolute',
    left: 80,
    width: BIRD,
    height: BIRD,
    borderRadius: 50,
    borderWidth: 3,
  },
  eye: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    backgroundColor: 'white',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#333',
  },
  pupil: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 50,
  },
  beak: {
    position: 'absolute',
    top: 18,
    right: -8,
    width: 16,
    height: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  wing: {
    position: 'absolute',
    top: 22,
    left: 5,
    width: 20,
    height: 12,
    borderRadius: 10,
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    borderWidth: 3,
  },
  pipeHighlight: {
    position: 'absolute',
    width: 15,
    opacity: 0.3,
  },
  pipeCap: {
    position: 'absolute',
    width: PIPE_WIDTH + 10,
    height: 30,
    borderWidth: 3,
    borderRadius: 5,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 90,
  },
  groundGradient: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 40,
    opacity: 0.4,
  },
  overlay: {
    position: 'absolute',
    top: 200,
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
  },
  tap: {
    marginTop: 20,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameOverCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  scoreValue: {
    color: '#FFD93D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  difficultyBadge: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
  },
  difficultyBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newBestBadge: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  newBestText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cloud1: {
    position: 'absolute',
    top: 150,
    width: 120,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 50,
    opacity: 0.8,
  },
  cloud2: {
    position: 'absolute',
    top: 220,
    width: 90,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 50,
    opacity: 0.7,
  },
  cloud3: {
    position: 'absolute',
    top: 100,
    width: 80,
    height: 35,
    backgroundColor: '#fff',
    borderRadius: 50,
    opacity: 0.6,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 50,
  },
  sun: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 60,
    height: 60,
    backgroundColor: '#FFD93D',
    borderRadius: 50,
    shadowColor: '#FFD93D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  moon: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 50,
    height: 50,
    backgroundColor: '#F5F5DC',
    borderRadius: 50,
    shadowColor: '#F5F5DC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cap: {
    position: 'absolute',
    top: -12,
    left: 5,
    width: 35,
    height: 15,
    backgroundColor: '#E74C3C',
    borderRadius: 3,
  },
  crown: {
    position: 'absolute',
    top: -15,
    left: 8,
    width: 29,
    height: 18,
    backgroundColor: '#F1C40F',
    borderRadius: 2,
  },
  tophat: {
    position: 'absolute',
    top: -20,
    left: 10,
    width: 25,
    height: 25,
    backgroundColor: '#2C3E50',
    borderRadius: 2,
  },
  wizardHat: {
    position: 'absolute',
    top: -25,
    left: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8E44AD',
  },
  glassesLeft: {
    position: 'absolute',
    top: 8,
    right: 18,
    width: 12,
    height: 12,
    backgroundColor: '#333',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#000',
  },
  glassesRight: {
    position: 'absolute',
    top: 8,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#333',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#000',
  },
  glassesBridge: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 4,
    height: 2,
    backgroundColor: '#000',
  },
  difficultyContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  difficultyLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 8,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  difficultyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  difficultyText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
