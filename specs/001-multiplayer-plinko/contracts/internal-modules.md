# Internal Module Contracts

**Date**: 2026-02-24
**Context**: Plinkit is a client-side SPA with no external API. These
contracts define the boundaries between internal modules so that each
can be developed and tested independently.

## Module Overview

```
src/config/    → exports GameConfig (read-only configuration)
src/core/      → exports GameStateMachine, ScoringEngine, TurnManager
src/physics/   → exports PhysicsSimulation (wraps Planck.js)
src/input/     → exports InputManager (flick detection)
src/rendering/ → exports Renderer (Canvas 2D drawing)
src/audio/     → exports AudioManager (Web Audio API)
src/ui/        → exports UIOverlayManager (DOM-based HUD)
src/main.ts    → wires everything together via the game loop
```

---

## Contract 1: PhysicsSimulation

The physics module wraps Planck.js and exposes a deterministic,
input-driven simulation. No other module touches Planck.js directly.

```typescript
interface PhysicsSimulation {
  /** Initialize the world with board layout and config. */
  createWorld(config: GameConfig): void;

  /** Drop a new puck at the given horizontal position. Returns puck ID. */
  dropPuck(x: number, playerId: string): string;

  /** Apply a shove impulse to the active puck. No-op if shove zone exited. */
  applyShove(puckId: string, vector: ShoveVector): boolean;

  /** Advance the simulation by one fixed timestep. Returns events. */
  step(): PhysicsStepResult;

  /** Query whether a puck has settled and in which bucket. */
  getPuckState(puckId: string): PuckState;

  /** Get positions of all bodies for rendering interpolation. */
  getSnapshot(): PhysicsSnapshot;

  /** Remove all pucks (for Play Again). Pins/walls remain. */
  clearPucks(): void;

  /** Destroy the world (for New Players / Quit). */
  destroy(): void;
}

interface PhysicsStepResult {
  tick: number;
  collisions: CollisionEvent[];  // pin hits, puck-puck hits
  settledPucks: SettledPuckEvent[];  // pucks that just came to rest
}

interface PuckState {
  isSettled: boolean;
  bucketIndex: number | null;
  position: { x: number; y: number };
  isInShoveZone: boolean;
}

interface PhysicsSnapshot {
  pucks: Array<{ id: string; x: number; y: number; settled: boolean }>;
}
```

**Determinism contract**: Given the same `GameConfig`, the same sequence
of `dropPuck()` and `applyShove()` calls at the same tick numbers MUST
produce the same `PhysicsStepResult` sequence.

---

## Contract 2: InputManager

The input module translates raw pointer events into game actions.

```typescript
interface InputManager {
  /** Start listening for input on the given canvas element. */
  attach(canvas: HTMLCanvasElement): void;

  /** Stop listening and clean up. */
  detach(): void;

  /** Set the board width in world units (used for coordinate transform). */
  setWorldWidth(width: number): void;

  /** Set the board height in world units (used for coordinate transform). */
  setBoardHeight(height: number): void;

  /** Register a callback for when the player selects a drop position. */
  onDropPositionChange(cb: (x: number) => void): void;

  /** Register a callback for puck release (tap/click). */
  onRelease(cb: () => void): void;

  /** Register a callback for flick gestures (shoves). */
  onFlick(cb: (vector: { dx: number; dy: number }) => void): void;

  /** Enable/disable flick detection (disabled during aiming, after shove zone exit). */
  setFlickEnabled(enabled: boolean): void;
}
```

**Coordinate transform contract**: `canvasToWorldX` MUST mirror the
renderer's transform — 5% canvas padding on each side, aspect-ratio
fitting via `Math.min(scaleX, scaleY)`, board centered at `canvasWidth / 2`.
Both `setWorldWidth` and `setBoardHeight` must be called before `attach`.

**Determinism contract**: Flick vectors are quantized to
`ShoveConfig.quantizationPrecision` before emission.

---

## Contract 3: Renderer

The rendering module draws the game state to a Canvas 2D context.
It does NOT own game logic or physics — it receives a snapshot and
draws it.

```typescript
interface Renderer {
  /** Initialize with the canvas element and board layout. */
  init(canvas: HTMLCanvasElement, layout: BoardLayout): void;

  /** Draw one frame. Called from requestAnimationFrame. */
  drawFrame(state: RenderState): void;

  /** Trigger a board-shake effect (for shove feedback). */
  shake(intensity: number, durationMs: number): void;

  /** Trigger a particle burst at a position (for collision effects). */
  emitParticles(x: number, y: number, type: ParticleType): void;

  /** Handle canvas resize. */
  resize(): void;
}

interface RenderState {
  pins: Array<{ x: number; y: number; radius: number }>;
  pucks: Array<{ x: number; y: number; radius: number; style: PuckStyle;
                 settled: boolean }>;
  buckets: Array<{ x: number; width: number; score: number }>;
  shoveZoneY: number;
  activePuckId: string | null;
  interpolationAlpha: number;  // for smooth rendering between physics steps
}

type ParticleType = 'pinHit' | 'bucketLand' | 'shove';
```

---

## Contract 4: AudioManager

The audio module manages Web Audio API playback.

```typescript
interface AudioManager {
  /** Initialize AudioContext (call on first user gesture). */
  unlock(): Promise<void>;

  /** Load and decode the audio sprite sheet. */
  load(spriteUrl: string, spriteMap: SpriteMap): Promise<void>;

  /** Play a named sound effect. Returns immediately. */
  play(name: SoundName, options?: { pitchVariation?: number }): void;

  /** Set master volume (0.0 – 1.0). */
  setVolume(volume: number): void;

  /** Mute/unmute toggle. */
  toggleMute(): void;
}

type SoundName = 'drop' | 'pinHit' | 'shove' | 'bucketLand' | 'winner' | 'tick' | 'timeout';

interface SpriteMap {
  [name: string]: { offset: number; duration: number };
}
```

---

## Contract 5: GameStateMachine

The core game logic module. Orchestrates turns, scoring, phases.

```typescript
interface GameStateMachine {
  /** Start a new session with registered players and config. */
  startSession(players: PlayerRegistration[], config: GameConfig): GameSession;

  /** Begin the next turn. Returns the active player. */
  startTurn(): TurnContext;

  /** Record a completed turn and advance. */
  completeTurn(result: TurnResult): void;

  /** Check if the round/game is complete. Returns next action. */
  evaluateRoundEnd(): RoundEndAction;

  /** Reset for Play Again (same players). */
  resetForReplay(): void;

  /** Full reset for New Players. */
  resetFull(): void;

  /** Get current session state (for UI rendering). */
  getState(): GameSession;
}

type RoundEndAction =
  | { type: 'nextRound' }
  | { type: 'tieBreaker'; tiedPlayers: Player[] }
  | { type: 'winner'; winner: Player }
  | { type: 'coWinners'; winners: Player[] };

interface TurnContext {
  player: Player;
  turnNumber: number;
  roundNumber: number;
  shovesRemaining: number;
  timerSeconds: number;
}

interface TurnResult {
  dropPositionX: number;
  shoves: ShoveVector[];
  bucketIndex: number;
  scoreEarned: number;
  wasTimeout: boolean;
}
```

---

## Contract 6: UIOverlayManager

DOM-based UI overlays for non-game-surface elements.

```typescript
interface UIOverlayManager {
  /** Show the registration screen. Returns when players are registered. */
  showRegistration(maxPlayers: number): Promise<PlayerRegistration[]>;

  /** Update the scoreboard display. */
  updateScoreboard(players: Player[]): void;

  /** Show/update the turn indicator. */
  showTurnIndicator(player: Player, timerSeconds: number): void;

  /** Update the countdown timer display. */
  updateTimer(secondsRemaining: number): void;

  /** Show the shove counter. */
  updateShoveCounter(remaining: number, total: number): void;

  /** Show the results screen. Returns the user's choice. */
  showResults(players: Player[], winner: Player | Player[]): Promise<ResultsAction>;

  /** Show farewell message. */
  showFarewell(): void;

  /** Hide all overlays (during active gameplay). */
  hideAll(): void;
}

type ResultsAction = 'playAgain' | 'newPlayers' | 'quit';

interface PlayerRegistration {
  name: string;
  puckStyle: PuckStyle;
}
```
