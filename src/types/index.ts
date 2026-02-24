// ============================================================
// Shared types and enums from data-model.md
// ============================================================

/** Game lifecycle phases */
export type GamePhase = 'registration' | 'playing' | 'tieBreaker' | 'results' | 'ended';

/** Turn phases within a single turn */
export type TurnPhase = 'aiming' | 'falling' | 'scored';

/** Visual pattern overlays for pucks */
export type PuckPattern = 'solid' | 'stripes' | 'dots' | 'rings';

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

/** Preset palette — 4 color-blind accessible combinations */
export const PUCK_PALETTE: readonly PuckStyle[] = [
  { color: '#E63946', pattern: 'solid', label: 'Red Solid' },
  { color: '#457B9D', pattern: 'stripes', label: 'Blue Stripes' },
  { color: '#2A9D8F', pattern: 'dots', label: 'Teal Dots' },
  { color: '#E9C46A', pattern: 'rings', label: 'Gold Rings' },
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
}

export interface ShoveConfig {
  maxShovesPerTurn: number;
  maxForceMagnitude: number;
  minFlickSpeed: number;
  flickSampleWindowMs: number;
  quantizationPrecision: number;
  shoveZoneRowLimit: number;
}

export interface GameConfig {
  totalRounds: number;
  boardLayout: BoardLayout;
  physics: PhysicsConfig;
  shoveConfig: ShoveConfig;
  turnTimerSeconds: number;
  maxTieBreakers: number;
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
