import type { GameConfig, BoardLayout, PhysicsConfig, ShoveConfig, ScoringConfig, SlowMotionConfig, AutoShoveConfig } from '@/types/index';

// ---- Board Layout ----

export const DEFAULT_BOARD_LAYOUT: BoardLayout = {
  pinRows: 6,
  bucketCount: 5,
  pinSpacing: 2.0,        // 2 world units between pin centers
  pinRadius: 0.30,       // pin visual/collision radius (scaled with spacing)
  puckRadius: 0.5,       // puck visual/collision radius
  bucketScores: [100, 1000, 10000, 1000, 100],
  boardWidth: 10.0,      // total board width in world units
  boardHeight: 14.0,     // total board height in world units
  pinsPerRow: 5,         // pins in even rows (odd rows get pinsPerRow - 1)
};

// ---- Physics Config ----

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: { x: 0, y: -10 },   // Planck.js Y-down convention (negative = down)
  fixedTimestep: 1 / 60,
  velocityIterations: 8,
  positionIterations: 3,
  puckRestitution: 0.5,
  puckFriction: 0.4,
  puckDensity: 1.0,
  pinRestitution: 0.4,
  pinFriction: 0.3,
  stalledVelocityThreshold: 0.01,
  stalledTimeoutMs: 10000,
  angularDamping: 3.0,
  maxAngularVelocity: 12.57,
  autoShoveVelocityThreshold: 0.1,
};

// ---- Shove Config ----

export const DEFAULT_SHOVE_CONFIG: ShoveConfig = {
  maxForceMagnitude: 5.0,     // max impulse magnitude in world units
  minFlickSpeed: 200,          // px/s minimum pointer velocity
  flickSampleWindowMs: 80,     // velocity sampling window
  quantizationPrecision: 0.001,
  shoveZoneRowLimit: 5,        // shoves allowed only above row 5
  shoveOffsetFraction: 0.25,   // 25% of puck radius for off-center shove spin
};

// ---- Scoring Config ----

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  bounceMultiplierRate: 1.15,
  bounceMultiplierCap: 10.0,
};

// ---- Slow-Motion Config ----

export const DEFAULT_SLOW_MOTION_CONFIG: SlowMotionConfig = {
  targetScale: 0.3,
  enterDuration: 0.25,
  holdDuration: 1.5,
  exitDuration: 0.4,
};

// ---- Auto-Shove Config ----

export const DEFAULT_AUTO_SHOVE: AutoShoveConfig = {
  velocityThreshold: 0.1,
  stallTicks: 180,           // 3 seconds at 60fps
  impulseMagnitude: 1.5,
  maxAttempts: 3,
  warningDurationMs: 300,
};

// ---- Full Game Config ----

export const DEFAULT_GAME_CONFIG: GameConfig = {
  totalRounds: 5,
  boardLayout: DEFAULT_BOARD_LAYOUT,
  physics: DEFAULT_PHYSICS_CONFIG,
  shoveConfig: DEFAULT_SHOVE_CONFIG,
  scoring: DEFAULT_SCORING_CONFIG,
  slowMotion: DEFAULT_SLOW_MOTION_CONFIG,
  turnTimerSeconds: 15,
  maxTieBreakers: 10,
  autoShove: DEFAULT_AUTO_SHOVE,
};

/**
 * Create a GameConfig with optional overrides merged into defaults.
 */
export function createGameConfig(overrides?: Partial<GameConfig>): GameConfig {
  if (!overrides) return { ...DEFAULT_GAME_CONFIG };
  return {
    ...DEFAULT_GAME_CONFIG,
    ...overrides,
    boardLayout: {
      ...DEFAULT_BOARD_LAYOUT,
      ...overrides.boardLayout,
    },
    physics: {
      ...DEFAULT_PHYSICS_CONFIG,
      ...overrides.physics,
    },
    shoveConfig: {
      ...DEFAULT_SHOVE_CONFIG,
      ...overrides.shoveConfig,
    },
    scoring: {
      ...DEFAULT_SCORING_CONFIG,
      ...overrides.scoring,
    },
    slowMotion: {
      ...DEFAULT_SLOW_MOTION_CONFIG,
      ...overrides.slowMotion,
    },
    autoShove: {
      ...DEFAULT_AUTO_SHOVE,
      ...overrides.autoShove,
    },
  };
}
