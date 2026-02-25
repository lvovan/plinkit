import type { GameConfig, BoardLayout, PhysicsConfig, ShoveConfig, ScoringConfig } from '@/types/index';

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
};

// ---- Physics Config ----

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: { x: 0, y: -10 },   // Planck.js Y-down convention (negative = down)
  fixedTimestep: 1 / 60,
  velocityIterations: 8,
  positionIterations: 3,
  puckRestitution: 0.5,
  puckFriction: 0.1,
  puckDensity: 1.0,
  pinRestitution: 0.4,
  pinFriction: 0.05,
  stalledVelocityThreshold: 0.01,
  stalledTimeoutMs: 10000,
};

// ---- Shove Config ----

export const DEFAULT_SHOVE_CONFIG: ShoveConfig = {
  maxShovesPerTurn: 2,
  maxForceMagnitude: 5.0,     // max impulse magnitude in world units
  minFlickSpeed: 200,          // px/s minimum pointer velocity
  flickSampleWindowMs: 80,     // velocity sampling window
  quantizationPrecision: 0.001,
  shoveZoneRowLimit: 5,        // shoves allowed only above row 5
};

// ---- Scoring Config ----

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  bounceMultiplierRate: 1.15,
  bounceMultiplierCap: 10.0,
};

// ---- Full Game Config ----

export const DEFAULT_GAME_CONFIG: GameConfig = {
  totalRounds: 5,
  boardLayout: DEFAULT_BOARD_LAYOUT,
  physics: DEFAULT_PHYSICS_CONFIG,
  shoveConfig: DEFAULT_SHOVE_CONFIG,
  scoring: DEFAULT_SCORING_CONFIG,
  turnTimerSeconds: 15,
  maxTieBreakers: 10,
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
  };
}
