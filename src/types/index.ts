// ============================================================
// Shared types and enums from data-model.md
// ============================================================

/** Game lifecycle phases */
export type GamePhase = 'registration' | 'playing' | 'tieBreaker' | 'results' | 'ended';

/** Turn phases within a single turn */
export type TurnPhase = 'aiming' | 'falling' | 'scored';

/** Visual pattern overlays for pucks */
export type PuckPattern = 'stripes' | 'dots' | 'rings';

// ---- PuckStyle ----

/** Visual identity for a player's puck */
export interface PuckStyle {
  /** Primary fill color (hex, e.g., '#E63946') */
  color: string;
  /** Visual pattern overlay */
  pattern: PuckPattern;
  /** Human-readable name for accessibility */
  label: string;
}

/** Preset palette — 4 color-blind accessible combinations (round-robin: stripes→dots→rings) */
export const PUCK_PALETTE: readonly PuckStyle[] = [
  { color: '#E63946', pattern: 'stripes', label: 'Red Stripes' },
  { color: '#457B9D', pattern: 'dots', label: 'Blue Dots' },
  { color: '#2A9D8F', pattern: 'rings', label: 'Teal Rings' },
  { color: '#E9C46A', pattern: 'stripes', label: 'Gold Stripes' },
] as const;

// ---- Player ----

export interface Player {
  id: string;
  name: string;
  puckStyle: PuckStyle;
  score: number;
  turnOrder: number;
  isActive: boolean;
}

// ---- Configuration ----

export interface BoardLayout {
  pinRows: number;
  bucketCount: number;
  pinSpacing: number;
  pinRadius: number;
  puckRadius: number;
  bucketScores: number[];
  boardWidth: number;
  boardHeight: number;
}

export interface PhysicsConfig {
  gravity: { x: number; y: number };
  fixedTimestep: number;
  velocityIterations: number;
  positionIterations: number;
  puckRestitution: number;
  puckFriction: number;
  puckDensity: number;
  pinRestitution: number;
  pinFriction: number;
  stalledVelocityThreshold: number;
  stalledTimeoutMs: number;
  /** Spin decay rate applied to puck bodies. 3.0 ≈ ~1s decay at 60 Hz. */
  angularDamping: number;
  /** Angular velocity cap in rad/s. 12.57 ≈ 2 rotations/sec (4π). */
  maxAngularVelocity: number;
}

export interface ShoveConfig {
  maxForceMagnitude: number;
  minFlickSpeed: number;
  flickSampleWindowMs: number;
  quantizationPrecision: number;
  shoveZoneRowLimit: number;
  /** Fraction of puck radius used as off-center offset for shove impulse (0–1). */
  shoveOffsetFraction: number;
}

export interface GameConfig {
  totalRounds: number;
  boardLayout: BoardLayout;
  physics: PhysicsConfig;
  shoveConfig: ShoveConfig;
  turnTimerSeconds: number;
  maxTieBreakers: number;
  scoring: ScoringConfig;
}

// ---- Turn Records ----

export interface ShoveVector {
  dx: number;
  dy: number;
  appliedAtTick: number;
}

export interface Turn {
  playerId: string;
  roundNumber: number;
  dropPositionX: number;
  shoves: ShoveVector[];
  resultBucketIndex: number;
  scoreEarned: number;
  wasTimeout: boolean;
  simulationTicks: number;
}

// ---- Game Session ----

export interface GameSession {
  id: string;
  players: Player[];
  config: GameConfig;
  phase: GamePhase;
  currentRound: number;
  currentTurnIndex: number;
  turns: Turn[];
  tieBreakersPlayed: number;
  activePlayers: Player[];
}

// ---- Runtime Types (Physics) ----

export interface RuntimePuck {
  id: string;
  playerId: string;
  turnIndex: number;
  isSettled: boolean;
  settledInBucket: number | null;
}

// ---- Geometry ----

export interface Vec2 {
  x: number;
  y: number;
}

export interface PinPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface BucketBoundary {
  index: number;
  leftX: number;
  rightX: number;
  centerX: number;
  score: number;
}

// ---- Scoring ----

/** Configuration for bounce-based exponential scoring */
export interface ScoringConfig {
  /** Exponential rate per bounce. Must be > 1.0. Default: 1.15 */
  bounceMultiplierRate: number;
  /** Maximum multiplier cap. Must be >= 1.0. Default: 10.0 */
  bounceMultiplierCap: number;
}

/** Full breakdown of a round's score calculation */
export interface ScoreBreakdown {
  /** Score from the bucket index lookup */
  baseScore: number;
  /** Total collisions during the round */
  bounceCount: number;
  /** min(rate^bounces, cap), always >= 1.0 */
  multiplier: number;
  /** floor(baseScore × multiplier) */
  totalScore: number;
}

// ---- Visual Effects ----

/** A time-limited radial flash effect at a collision point */
export interface CollisionFlash {
  x: number;
  y: number;
  startTime: number;
  /** Lifetime in ms. Default: 250 */
  duration: number;
  /** Current bounce multiplier as text (e.g., "1.3×") */
  multiplierText: string;
}

/** A directional slash animation triggered on successful shove */
export interface SlashEffect {
  originX: number;
  originY: number;
  /** Normalized X component of shove direction */
  directionX: number;
  /** Normalized Y component of shove direction */
  directionY: number;
  /** Force magnitude of the shove */
  magnitude: number;
  startTime: number;
  /** Lifetime in ms. Default: 400 */
  duration: number;
}

/** State for the pre-drop visual helper (ghost puck) */
export interface DropIndicator {
  /** Current horizontal position in world coordinates */
  x: number;
  /** Player's puck visual style */
  style: PuckStyle;
  /** Whether the indicator is showing */
  visible: boolean;
}
