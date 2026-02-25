// ============================================================
// Module contract interfaces from contracts/internal-modules.md
// ============================================================

import type {
  GameConfig,
  GameSession,
  Player,
  PuckStyle,
  ShoveVector,
  BoardLayout,
  ScoreBreakdown,
} from './index';

// ---- Contract 1: PhysicsSimulation ----

export interface CollisionEvent {
  type: 'pinHit' | 'puckHit' | 'wallHit';
  puckId: string;
  x: number;
  y: number;
}

export interface SettledPuckEvent {
  puckId: string;
  bucketIndex: number;
}

export interface OutOfBoundsEvent {
  puckId: string;
  position: { x: number; y: number };
}

export interface PhysicsStepResult {
  tick: number;
  collisions: CollisionEvent[];
  settledPucks: SettledPuckEvent[];
  outOfBoundsPucks: OutOfBoundsEvent[];
}

export interface PuckState {
  isSettled: boolean;
  bucketIndex: number | null;
  position: { x: number; y: number };
  isInShoveZone: boolean;
}

export interface PhysicsSnapshot {
  pucks: Array<{ id: string; x: number; y: number; angle: number; settled: boolean }>;
}

export interface PhysicsSimulation {
  createWorld(config: GameConfig): void;
  dropPuck(x: number, playerId: string): string;
  applyShove(puckId: string, vector: ShoveVector): boolean;
  step(): PhysicsStepResult;
  getPuckState(puckId: string): PuckState;
  getSnapshot(): PhysicsSnapshot;
  clearPucks(): void;
  destroy(): void;
}

// ---- Contract 2: InputManager ----

export interface InputManager {
  attach(canvas: HTMLCanvasElement): void;
  detach(): void;
  onDropPositionChange(cb: (x: number) => void): void;
  onRelease(cb: () => void): void;
  onFlick(cb: (vector: { dx: number; dy: number }) => void): void;
  setFlickEnabled(enabled: boolean): void;
}

// ---- Contract 3: Renderer ----

export interface RenderState {
  pins: Array<{ x: number; y: number; radius: number }>;
  pucks: Array<{
    x: number;
    y: number;
    radius: number;
    style: PuckStyle;
    settled: boolean;
  }>;
  buckets: Array<{ x: number; width: number; score: number }>;
  shoveZoneY: number;
  activePuckId: string | null;
  interpolationAlpha: number;
  /** When present, renderer draws a ghost puck at this position. */
  dropIndicator?: {
    x: number;
    style: PuckStyle;
  };
}

export type ParticleType = 'pinHit' | 'bucketLand' | 'shove';

export interface Renderer {
  init(canvas: HTMLCanvasElement, layout: BoardLayout): void;
  drawFrame(state: RenderState): void;
  shake(intensity: number, durationMs: number): void;
  emitParticles(x: number, y: number, type: ParticleType): void;
  resize(): void;
}

// ---- Contract 4: AudioManager ----

export type SoundName = 'drop' | 'pinHit' | 'shove' | 'bucketLand' | 'winner' | 'tick' | 'timeout';

export interface SpriteMap {
  [name: string]: { offset: number; duration: number };
}

export interface AudioManager {
  unlock(): Promise<void>;
  load(spriteUrl: string, spriteMap: SpriteMap): Promise<void>;
  play(name: SoundName, options?: { pitchVariation?: number }): void;
  setVolume(volume: number): void;
  toggleMute(): void;
}

// ---- Contract 5: GameStateMachine ----

export type RoundEndAction =
  | { type: 'nextRound' }
  | { type: 'tieBreaker'; tiedPlayers: Player[] }
  | { type: 'winner'; winner: Player }
  | { type: 'coWinners'; winners: Player[] };

export interface TurnContext {
  player: Player;
  turnNumber: number;
  roundNumber: number;
  shovesRemaining: number;
  timerSeconds: number;
}

export interface TurnResult {
  dropPositionX: number;
  shoves: ShoveVector[];
  bucketIndex: number;
  scoreEarned: number;
  wasTimeout: boolean;
  /** Total number of bounces during this turn. */
  bounceCount: number;
  /** Full scoring breakdown with multiplier. */
  scoreBreakdown: ScoreBreakdown;
}

export interface PlayerRegistration {
  name: string;
  puckStyle: PuckStyle;
}

export interface GameStateMachineContract {
  startSession(players: PlayerRegistration[], config: GameConfig): GameSession;
  startTurn(): TurnContext;
  completeTurn(result: TurnResult): void;
  evaluateRoundEnd(): RoundEndAction;
  resetForReplay(): void;
  resetFull(): void;
  getState(): GameSession;
}

// ---- Contract 6: UIOverlayManager ----

export type ResultsAction = 'playAgain' | 'newPlayers' | 'quit';

export interface UIOverlayManager {
  showRegistration(maxPlayers: number): Promise<PlayerRegistration[]>;
  updateScoreboard(players: Player[]): void;
  showTurnIndicator(player: Player, timerSeconds: number): void;
  updateTimer(secondsRemaining: number): void;
  updateShoveCounter(remaining: number, total: number): void;
  showResults(players: Player[], winner: Player | Player[]): Promise<ResultsAction>;
  showOutOfBounds(): void;
  showFarewell(): void;
  hideAll(): void;
}
