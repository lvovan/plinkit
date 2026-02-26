// ============================================================
// Shared types and enums from data-model.md
// ============================================================

/** Game lifecycle phases */
export type GamePhase = 'registration' | 'playing' | 'tieBreaker' | 'results' | 'ended';

/** Slow-motion effect phases */
export type SlowMotionPhase = 'normal' | 'entering' | 'slow' | 'exiting';

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
  /** Number of pins in even-numbered rows (odd rows get pinsPerRow - 1). Default: 6 */
  pinsPerRow: number;
  /** Explicit bucket width fractions (must sum to 1.0). If omitted, widths are computed via log₁₀ weighting. */
  bucketWidths?: number[];
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
  /** Velocity below which a puck is considered stuck for auto-shove (u/s). Default: 0.1 */
  autoShoveVelocityThreshold: number;
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

/** Configuration for the stuck-puck auto-shove system */
export interface AutoShoveConfig {
  /** Velocity below which a puck is considered "stuck" (u/s). Default: 0.1 */
  velocityThreshold: number;
  /** Number of ticks (at 60fps) a puck must be below threshold before auto-shove. Default: 180 (3s) */
  stallTicks: number;
  /** Impulse magnitude applied per auto-shove. Default: 1.5 */
  impulseMagnitude: number;
  /** Maximum auto-shove attempts before fallback to nearest-bucket. Default: 3 */
  maxAttempts: number;
  /** Duration of visual warning pulse before impulse fires (ms). Default: 300 */
  warningDurationMs: number;
}

/** Runtime event emitted when a stuck puck needs an auto-shove */
export interface AutoShoveEvent {
  /** The stuck puck's runtime ID */
  puckId: string;
  /** Which attempt this is (0-indexed) */
  attemptIndex: number;
  /** Direction unit vector for the impulse */
  direction: { x: number; y: number };
}

/** Configuration for same-player puck growth mechanics */
export interface GrowthConfig {
  /** Surface area growth factor per same-player contact. Default: 1.20 (20% increase) */
  surfaceAreaGrowthFactor: number;
  /** Maximum puck radius after growth (world units). Default: 0.631 */
  maxPuckRadius: number;
  /** Maximum chain-reaction depth per drop. Default: 10 */
  maxChainDepth: number;
}

export interface GameConfig {
  totalRounds: number;
  boardLayout: BoardLayout;
  physics: PhysicsConfig;
  shoveConfig: ShoveConfig;
  turnTimerSeconds: number;
  maxTieBreakers: number;
  scoring: ScoringConfig;
  slowMotion: SlowMotionConfig;
  autoShove: AutoShoveConfig;
  growth: GrowthConfig;
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
  /** Current collision radius (starts at puckRadius, grows up to MAX_PUCK_RADIUS) */
  currentRadius: number;
  /** Number of growth events applied (for debugging/telemetry) */
  growthCount: number;
}

/** Runtime event emitted when two same-player pucks touch */
export interface GrowthEvent {
  /** First puck in the contact pair */
  puckIdA: string;
  /** Second puck in the contact pair */
  puckIdB: string;
  /** Owning player (same for both pucks) */
  playerId: string;
  /** Chain depth at which this event was generated (0 = initial contact) */
  chainDepth: number;
}

/** Emitted when a puck is displaced from a bucket and its score is revoked */
export interface ScoreRevocationEvent {
  /** The puck that was displaced */
  puckId: string;
  /** The owning player whose score is reduced */
  playerId: string;
  /** The score amount being subtracted */
  revokedScore: number;
  /** The bucket the puck was displaced from */
  fromBucket: number;
  /** World position for the negative-score flash */
  x: number;
  y: number;
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

// ---- Slow-Motion ----

/** Configuration for the slow-motion effect triggered below the shove line */
export interface SlowMotionConfig {
  /** Target time-scale during the 'slow' phase (0–1). Default: 0.3 */
  targetScale: number;
  /** Duration in seconds for the entering ease-out transition */
  enterDuration: number;
  /** Duration in seconds to hold at targetScale */
  holdDuration: number;
  /** Duration in seconds for the exiting ease-in transition */
  exitDuration: number;
}

/** Runtime state of the slow-motion effect */
export interface SlowMotionState {
  /** Current phase of the slow-motion lifecycle */
  phase: SlowMotionPhase;
  /** Current time-scale factor (1.0 = normal, < 1.0 = slow) */
  timeScale: number;
  /** Elapsed time in seconds within the current phase */
  phaseElapsed: number;
  /** Whether slow-motion has already been triggered this turn */
  triggeredThisTurn: boolean;
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
