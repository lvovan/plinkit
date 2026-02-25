import { PhysicsSimulationImpl } from '@/physics/simulation';
import { ScoringEngine } from '@/core/scoring';
import { GameLoop } from '@/core/game-loop';
import { BasicInputManager } from '@/input/input-manager';
import { CanvasRenderer } from '@/rendering/renderer';
import { GameStateMachine } from '@/core/state-machine';
import { OverlayManager } from '@/ui/overlay-manager';
import { TurnTimer } from '@/core/turn-timer';
import { GameAudioManager } from '@/audio/audio-manager';
import { AUDIO_SPRITE_MAP, AUDIO_SPRITE_URL } from '@/audio/sprite-map';
import { EffectsManager } from '@/rendering/effects';
import { VisibilityHandler } from '@/core/visibility';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { computePinPositions, computeBucketBoundaries } from '@/config/board-geometry';
import type { RenderState, TurnResult, PlayerRegistration } from '@/types/contracts';
import type { PuckStyle, Player } from '@/types/index';

// ---- Bootstrap ----

const config = DEFAULT_GAME_CONFIG;
const layout = config.boardLayout;

// Grab DOM elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const overlayContainer = document.getElementById('overlay-container') as HTMLElement;
if (!canvas || !overlayContainer) throw new Error('Required DOM elements not found');

// --- Physics ---
const sim = new PhysicsSimulationImpl();
sim.createWorld(config);

// --- Scoring ---
const scoring = new ScoringEngine(layout);

// --- Renderer ---
const renderer = new CanvasRenderer();
renderer.init(canvas, layout);
renderer.resize();

window.addEventListener('resize', () => {
  // Debounced resize handler — recalculate layout without reload
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderer.resize();
    input.setWorldWidth(layout.boardWidth);
  }, 100);
});
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

// --- Input ---
const input = new BasicInputManager();
input.setWorldWidth(layout.boardWidth);
input.attach(canvas);

// --- State Machine & Overlays ---
const stateMachine = new GameStateMachine();
const overlays = new OverlayManager(overlayContainer);

// --- Audio ---
const audioManager = new GameAudioManager();

// --- Effects ---
const effects = new EffectsManager();

// --- Visibility ---
const visibility = new VisibilityHandler({
  onHidden: () => {
    loop.stop();
    turnTimer.stop();
  },
  onVisible: () => {
    loop.start();
    if (gameRunning && !puckDropped) {
      turnTimer.start();
    }
  },
});
visibility.attach();

// ---- Pre-compute static render data ----
const pinPositions = computePinPositions(layout);
const pinRenderData = pinPositions.map(p => ({ x: p.x, y: p.y, radius: layout.pinRadius }));
const bucketBoundaries = computeBucketBoundaries(layout);
const bucketRenderData = bucketBoundaries.map(b => ({
  x: b.leftX,
  width: b.rightX - b.leftX,
  score: b.score,
}));

// ---- Game state ----
let dropX = 0;
let activePuckId: string | null = null;
let puckDropped = false;
let currentPlayer: Player | null = null;
let currentPuckStyle: PuckStyle = { color: '#E63946', pattern: 'solid', label: 'Red Solid' };
let shovesUsed = 0;
let shovesDisabled = false;
let gameRunning = false;
const puckStyleMap = new Map<string, PuckStyle>();

// ---- Turn Timer ----
const turnTimer = new TurnTimer(
  config.turnTimerSeconds,
  (secondsRemaining) => {
    overlays.updateTimer(secondsRemaining);
  },
  () => {
    // Timer expired — auto-drop puck from last position with no shoves
    if (!puckDropped && currentPlayer) {
      activePuckId = sim.dropPuck(dropX, currentPlayer.id);
      puckStyleMap.set(activePuckId, currentPuckStyle);
      puckDropped = true;
      shovesDisabled = true; // no shoves allowed on timeout
      input.setFlickEnabled(false);
      audioManager.play('timeout');
      overlays.updateShoveCounter(0, config.shoveConfig.maxShovesPerTurn);
    }
  },
);

// ---- Input handlers ----
input.onDropPositionChange((x: number) => {
  dropX = x;
});

input.onRelease(() => {
  if (!puckDropped && currentPlayer) {
    turnTimer.stop();
    activePuckId = sim.dropPuck(dropX, currentPlayer.id);
    puckStyleMap.set(activePuckId, currentPuckStyle);
    puckDropped = true;
    input.setFlickEnabled(true);
    shovesUsed = 0;
    shovesDisabled = false;
    audioManager.play('drop');
    overlays.updateShoveCounter(
      config.shoveConfig.maxShovesPerTurn,
      config.shoveConfig.maxShovesPerTurn,
    );
  }
});

input.onFlick((vector) => {
  if (activePuckId && !shovesDisabled && shovesUsed < config.shoveConfig.maxShovesPerTurn) {
    const applied = sim.applyShove(activePuckId, {
      dx: vector.dx,
      dy: vector.dy,
      appliedAtTick: 0,
    });
    if (applied) {
      shovesUsed++;
      audioManager.play('shove');
      renderer.shake(3, 150);
      overlays.updateShoveCounter(
        config.shoveConfig.maxShovesPerTurn - shovesUsed,
        config.shoveConfig.maxShovesPerTurn,
      );
    }
  }
});

// ---- Game loop ----
const board = sim.getBoard();
const shoveZoneY = board?.shoveZoneY ?? 0;

const loop = new GameLoop({
  onStep() {
    if (!puckDropped || !gameRunning) return;

    const result = sim.step();

    // Process collision events — trigger audio and particle effects
    for (const collision of result.collisions) {
      if (collision.type === 'pinHit') {
        audioManager.play('pinHit', { pitchVariation: 0.15 });
        renderer.emitParticles(collision.x, collision.y, 'pinHit');
      }
    }

    // Check for out-of-bounds pucks
    if (result.outOfBoundsPucks.length > 0) {
      const turnResult: TurnResult = {
        dropPositionX: dropX,
        shoves: [],
        bucketIndex: -1,
        scoreEarned: 0,
        wasTimeout: false,
      };

      stateMachine.completeTurn(turnResult);
      overlays.showOutOfBounds();
      const state = stateMachine.getState();
      overlays.updateScoreboard(state.players);

      const roundAction = stateMachine.evaluateRoundEnd();

      puckDropped = false;
      activePuckId = null;
      input.setFlickEnabled(false);

      if (roundAction.type === 'nextRound') {
        startNextTurn();
      } else if (roundAction.type === 'winner') {
        gameRunning = false;
        turnTimer.stop();
        audioManager.play('winner');
        handleGameEnd(state.players, roundAction.winner, false);
      } else if (roundAction.type === 'tieBreaker') {
        stateMachine.startTieBreaker(roundAction.tiedPlayers);
        sim.clearPucks();
        puckStyleMap.clear();
        startNextTurn();
      } else if (roundAction.type === 'coWinners') {
        gameRunning = false;
        turnTimer.stop();
        audioManager.play('winner');
        handleGameEnd(state.players, roundAction.winners, true);
      }
      return; // OOB handled — skip settled puck processing
    }

    // Check for settled pucks
    for (const settled of result.settledPucks) {
      const score = scoring.getScoreForBucket(settled.bucketIndex);

      // Audio and visual feedback for bucket landing
      audioManager.play('bucketLand');
      const puckState = sim.getPuckState(settled.puckId);
      renderer.emitParticles(puckState.position.x, puckState.position.y, 'bucketLand');
      effects.triggerScorePop(puckState.position.x, puckState.position.y, score);

      // Build turn result and complete the turn
      const turnResult: TurnResult = {
        dropPositionX: dropX,
        shoves: [],
        bucketIndex: settled.bucketIndex,
        scoreEarned: score,
        wasTimeout: shovesDisabled, // shovesDisabled is set on timeout
      };

      stateMachine.completeTurn(turnResult);
      const state = stateMachine.getState();
      overlays.updateScoreboard(state.players);

      // Check if round is complete
      const roundAction = stateMachine.evaluateRoundEnd();

      puckDropped = false;
      activePuckId = null;
      input.setFlickEnabled(false);

      if (roundAction.type === 'nextRound') {
        // Start next turn
        startNextTurn();
      } else if (roundAction.type === 'winner') {
        gameRunning = false;
        turnTimer.stop();
        audioManager.play('winner');
        handleGameEnd(state.players, roundAction.winner, false);
      } else if (roundAction.type === 'tieBreaker') {
        // Start tie-breaker round with only tied players
        stateMachine.startTieBreaker(roundAction.tiedPlayers);
        sim.clearPucks();
        puckStyleMap.clear();
        startNextTurn();
      } else if (roundAction.type === 'coWinners') {
        gameRunning = false;
        turnTimer.stop();
        audioManager.play('winner');
        handleGameEnd(state.players, roundAction.winners, true);
      }
    }
  },

  onRender(alpha) {
    const snapshot = sim.getSnapshot();

    const state: RenderState = {
      pins: pinRenderData,
      pucks: snapshot.pucks.map(p => ({
        x: p.x,
        y: p.y,
        radius: layout.puckRadius,
        style: puckStyleMap.get(p.id) ?? currentPuckStyle,
        settled: p.settled,
      })),
      buckets: bucketRenderData,
      shoveZoneY,
      activePuckId,
      interpolationAlpha: alpha,
    };

    renderer.drawFrame(state);
  },
});

// ---- Game flow ----

function startNextTurn(): void {
  const ctx = stateMachine.startTurn();
  currentPlayer = ctx.player;
  currentPuckStyle = ctx.player.puckStyle;
  shovesDisabled = false;
  overlays.showTurnIndicator(ctx.player, ctx.timerSeconds);
  overlays.updateTimer(ctx.timerSeconds);
  // Pucks persist as collidable objects — only cleared at game end / tie-breaker
  turnTimer.reset();
  turnTimer.start();
}

async function handleGameEnd(players: Player[], winner: Player | Player[], isTieBreaker: boolean): Promise<void> {
  const action = await overlays.showResults(players, winner, isTieBreaker);

  if (action === 'playAgain') {
    stateMachine.resetForReplay();
    sim.clearPucks();
    puckStyleMap.clear();
    sim.createWorld(config);
    gameRunning = true;
    startNextTurn();
    overlays.updateScoreboard(stateMachine.getState().players);
  } else if (action === 'newPlayers') {
    stateMachine.resetFull();
    sim.clearPucks();
    puckStyleMap.clear();
    sim.createWorld(config);
    startGame();
  } else {
    overlays.showFarewell();
    loop.stop();
  }
}

async function startGame(): Promise<void> {
  overlays.hideAll();

  // Show registration first — no audio until user interacts
  const registrations: PlayerRegistration[] = await overlays.showRegistration(4);

  // Unlock audio after first user gesture (registration submit)
  audioManager.unlock().then(() => {
    audioManager.load(AUDIO_SPRITE_URL, AUDIO_SPRITE_MAP).catch(() => {
      // Audio loading is non-critical — game works without audio
    });
  }).catch(() => {
    // Audio unlock is non-critical
  });

  stateMachine.startSession(registrations, config);

  // Start playing
  const state = stateMachine.getState();
  overlays.updateScoreboard(state.players);
  gameRunning = true;

  sim.clearPucks();
  puckStyleMap.clear();
  sim.createWorld(config);
  startNextTurn();
}

// ---- Launch ----
loop.start();
startGame();

// ---- Service Worker ----
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // SW registration is non-critical
  });
}

// ---- Expose for debugging ----
(window as unknown as Record<string, unknown>).__plinkit = { sim, scoring, loop, config, stateMachine };
