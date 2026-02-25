import { PhysicsSimulationImpl } from '@/physics/simulation';
import { ScoringEngine, recalculateAllScores } from '@/core/scoring';
import { GameLoop } from '@/core/game-loop';
import { BasicInputManager } from '@/input/input-manager';
import { CanvasRenderer } from '@/rendering/renderer';
import { GameStateMachine } from '@/core/state-machine';
import { OverlayManager } from '@/ui/overlay-manager';
import { TurnTimer } from '@/core/turn-timer';
import { GameAudioManager } from '@/audio/audio-manager';
import { GameMusicManager } from '@/audio/music-manager';
import { EffectsManager } from '@/rendering/effects';
import { VisibilityHandler } from '@/core/visibility';
import { TutorialIndicator } from '@/ui/tutorial-indicator';
import { createSlowMotionState, triggerSlowMotion, updateSlowMotion, resetSlowMotion } from '@/core/slow-motion';
import { initTelemetry, trackEvent, setTag } from '@/telemetry/clarity';
import { showShoveGuidance, wasGuidanceShown } from '@/ui/shove-guidance';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { computePinPositions, computeBucketBoundaries } from '@/config/board-geometry';
import { detectDisplacedPucks, prepareSettling } from '@/physics/puck-settler';
import type { RenderState, TurnResult, PlayerRegistration } from '@/types/contracts';
import type { PuckStyle, Player, ScoringConfig } from '@/types/index';
import type { SlowMotionState } from '@/types/index';

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
const scoring = new ScoringEngine(layout, config.scoring);

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
input.setBoardHeight(layout.boardHeight);
input.attach(canvas);

// --- State Machine & Overlays ---
const stateMachine = new GameStateMachine();
const overlays = new OverlayManager(overlayContainer);

// --- Audio ---
const audioManager = new GameAudioManager();
const musicManager = new GameMusicManager();

// --- Effects ---
const effects = new EffectsManager();

// --- Tutorial indicator ---
const tutorial = new TutorialIndicator(overlayContainer);

// Wire effects into the renderer
renderer.setEffectsManager(effects);

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

// ---- Pre-compute render data (rebuilt on layout changes) ----
let pinRenderData: Array<{ x: number; y: number; radius: number }> = [];
let bucketRenderData: Array<{ x: number; width: number; score: number }> = [];

/** Rebuild pin and bucket render data from current layout. Called at game start and each round transition. */
function rebuildRenderData(): void {
  const pinPositions = computePinPositions(layout);
  pinRenderData = pinPositions.map(p => ({ x: p.x, y: p.y, radius: layout.pinRadius }));
  const bucketBoundaries = computeBucketBoundaries(layout);
  bucketRenderData = bucketBoundaries.map(b => ({
    x: b.leftX,
    width: b.rightX - b.leftX,
    score: b.score,
  }));
}

// Initialize render data
rebuildRenderData();

// ---- Game state ----
let dropX = 0;
let activePuckId: string | null = null;
let puckDropped = false;
let currentPlayer: Player | null = null;
let currentPuckStyle: PuckStyle = { color: '#E63946', pattern: 'stripes', label: 'Red Stripes' };
let shovesDisabled = false;
let gameRunning = false;
let bounceCount = 0;
const puckStyleMap = new Map<string, PuckStyle>();
let slowMotionState: SlowMotionState = createSlowMotionState();
let isFirstGame = true;
let shoveOccurredInRound1 = false;
let totalShoveCount = 0;
<<<<<<< 010-persistent-puck-growth
let pendingScoreRevocations: import('@/types/index').ScoreRevocationEvent[] = [];
=======
let isSettling = false;
>>>>>>> main

// ---- Audio rate limiter ----
const recentSoundTimestamps: number[] = [];
const SOUND_RATE_LIMIT = 4;      // max sounds per window
const SOUND_RATE_WINDOW_MS = 50;  // window size in ms

function shouldAttenuateSound(): boolean {
  const now = performance.now();
  // Remove timestamps outside the window
  while (recentSoundTimestamps.length > 0 && now - recentSoundTimestamps[0] > SOUND_RATE_WINDOW_MS) {
    recentSoundTimestamps.shift();
  }
  recentSoundTimestamps.push(now);
  return recentSoundTimestamps.length > SOUND_RATE_LIMIT;
}

// ---- Bounce multiplier formatter ----
function formatMultiplier(count: number, scoringConfig: ScoringConfig): string {
  const multiplier = Math.min(
    scoringConfig.bounceMultiplierRate ** count,
    scoringConfig.bounceMultiplierCap,
  );
  return `×${multiplier.toFixed(1)}`;
}

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
    }
  },
);

// ---- Input handlers ----
input.onDropPositionChange((x: number) => {
  dropX = x;
  // Dismiss the tutorial indicator on first interaction
  if (tutorial.isVisible()) tutorial.dismiss();
});

input.onRelease(() => {
  if (!puckDropped && currentPlayer) {
    // Dismiss tutorial on puck drop
    if (tutorial.isVisible()) tutorial.dismiss();
    turnTimer.stop();
    activePuckId = sim.dropPuck(dropX, currentPlayer.id);
    puckStyleMap.set(activePuckId, currentPuckStyle);
    puckDropped = true;
    input.setFlickEnabled(true);
    shovesDisabled = false;
    audioManager.play('drop');
    // Crossfade to gameplay music on first drop of the round
    if (musicManager.getCurrentTrack() !== 'gameplay') {
      musicManager.crossfadeTo('gameplay');
    }
  }
});

input.onFlick((vector) => {
  if (activePuckId && !shovesDisabled) {
    const applied = sim.applyShove(activePuckId, {
      dx: vector.dx,
      dy: vector.dy,
      appliedAtTick: 0,
    });
    if (applied) {
      audioManager.play('shove');
      totalShoveCount++;

      // Track shove for round 1 guidance popup
      const gameState = stateMachine.getState();
      if (gameState.currentRound === 1) {
        shoveOccurredInRound1 = true;
      }

      // Proportional shake: 5 × (forceMagnitude / maxForceMagnitude)
      const forceMag = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
      const shakeIntensity = 5 * (forceMag / config.shoveConfig.maxForceMagnitude);
      renderer.shake(shakeIntensity, 150);

      // Slash effect along shove direction
      const puckState = sim.getPuckState(activePuckId);
      const normLen = forceMag || 1;
      effects.addSlashEffect(
        puckState.position.x, puckState.position.y,
        vector.dx / normLen, vector.dy / normLen,
        forceMag,
      );
    }
  }
});

// ---- Game loop ----
let shoveZoneY = sim.getBoard()?.shoveZoneY ?? 0;

const loop = new GameLoop({
  onStep() {
    if (isSettling) return; // Physics stepping handled by settling loop during settling phase
    if (!puckDropped || !gameRunning) return;

    // Clear pending revocations from previous step
    pendingScoreRevocations = [];

    // Update slow-motion state
    const dt = config.physics.fixedTimestep;
    slowMotionState = updateSlowMotion(slowMotionState, dt, config.slowMotion);
    const timeScale = slowMotionState.timeScale;

    // Apply timeScale to music
    musicManager.setTimeScale(timeScale);

    const result = sim.step(timeScale);

    // Process auto-shove events — apply impulse to stuck pucks
    for (const autoShoveEvent of sim.getAutoShoveEvents()) {
      sim.applyAutoShove(autoShoveEvent);
      audioManager.play('autoShove', { timeScale });
    }

    // Check if active puck crossed below shove zone — trigger slow-motion
    if (activePuckId && slowMotionState.phase === 'normal' && !slowMotionState.triggeredThisTurn) {
      const puckState = sim.getPuckState(activePuckId);
      if (!puckState.isInShoveZone && !puckState.isSettled) {
        slowMotionState = triggerSlowMotion(slowMotionState);
      }
    }

    // Process collision events — trigger audio and visual effects
    for (const collision of result.collisions) {
      // Handle ALL collision types: pinHit, puckHit, wallHit
      bounceCount++;

      // Audio with rate limiting
      if (!shouldAttenuateSound()) {
        audioManager.play('pinHit', { pitchVariation: 0.15, timeScale });
      }

      // Collision flash with current multiplier text
      effects.addCollisionFlash(
        collision.x,
        collision.y,
        formatMultiplier(bounceCount, config.scoring),
      );
    }

    // T040/T043: Process growth events — visual pop + audio
    for (const growthEvent of result.growthEvents) {
      const board = sim.getBoard();
      if (board) {
        const puckA = board.pucks.find(p => p.id === growthEvent.puckIdA);
        const puckB = board.pucks.find(p => p.id === growthEvent.puckIdB);
        if (puckA) {
          const posA = puckA.body.getPosition();
          effects.addGrowthPop(posA.x, posA.y);
        }
        if (puckB) {
          const posB = puckB.body.getPosition();
          effects.addGrowthPop(posB.x, posB.y);
        }
      }
      if (!shouldAttenuateSound()) {
        audioManager.play('puckGrowth', { timeScale });
      }
    }

    // T054: Process score revocations — subtract score, flash, update scoreboard
    for (const revocation of result.scoreRevocations) {
      const state = stateMachine.getState();
      const player = state.players.find(p => p.id === revocation.playerId);
      if (player) {
        const actualRevoked = scoring.revokeScore(player.score, revocation.revokedScore);
        player.score -= actualRevoked;
        effects.addNegativeScoreFlash(revocation.x, revocation.y, actualRevoked);
        overlays.updateScoreboard(state.players);
        pendingScoreRevocations.push({ ...revocation, revokedScore: actualRevoked });
      }
    }

    // Check for out-of-bounds pucks
    if (result.outOfBoundsPucks.length > 0) {
      const turnResult: TurnResult = {
        dropPositionX: dropX,
        shoves: [],
        bucketIndex: -1,
        scoreEarned: 0,
        bounceCount,
        scoreBreakdown: { baseScore: 0, bounceCount, multiplier: 1, totalScore: 0 },
        wasTimeout: false,
      };

      stateMachine.completeTurn(turnResult);
      overlays.showOutOfBounds();
      const state = stateMachine.getState();
      overlays.updateScoreboard(state.players);

      // Telemetry: track turn completion (out-of-bounds)
      trackEvent('turn_complete');
      setTag('lastBucketScore', '0');
      setTag('bounceCount', String(bounceCount));

      const roundAction = stateMachine.evaluateRoundEnd();

      puckDropped = false;
      activePuckId = null;
      input.setFlickEnabled(false);

      if (roundAction.type === 'nextRound') {
        transitionToNextRound();
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
      // Calculate score with bounce multiplier
      const scoreBreakdown = scoring.calculateRoundScore(settled.bucketIndex, bounceCount);

<<<<<<< 010-persistent-puck-growth
      // T051: Track score awarded on the PuckBody for revocation
      const board = sim.getBoard();
      if (board) {
        const settledPuck = board.pucks.find(p => p.id === settled.puckId);
        if (settledPuck) {
          settledPuck.scoreAwarded = scoreBreakdown.totalScore;
        }
=======
      // Stamp bounce multiplier on the puck body for persistence across rounds
      const allPucks = sim.getAllPucks();
      const settledPuck = allPucks.find(p => p.id === settled.puckId);
      if (settledPuck) {
        settledPuck.bounceMultiplier = scoreBreakdown.multiplier;
>>>>>>> main
      }

      // Audio and visual feedback for bucket landing
      audioManager.play('bucketLand');
      audioManager.play('coinDing', { timeScale });

      // Play jackpot sound for center (highest-scoring) bucket
      const middleBucketIndex = Math.floor(layout.bucketScores.length / 2);
      if (settled.bucketIndex === middleBucketIndex) {
        audioManager.play('jackpotBucket');
      }

      const puckState = sim.getPuckState(settled.puckId);
      renderer.emitParticles(puckState.position.x, puckState.position.y, 'bucketLand');
      effects.triggerScorePop(puckState.position.x, puckState.position.y, scoreBreakdown);

      // Build turn result and complete the turn
      const turnResult: TurnResult = {
        dropPositionX: dropX,
        shoves: [],
        bucketIndex: settled.bucketIndex,
        scoreEarned: scoreBreakdown.totalScore,
        bounceCount,
        scoreBreakdown,
        wasTimeout: shovesDisabled, // shovesDisabled is set on timeout
      };

      stateMachine.completeTurn(turnResult);
      bounceCount = 0; // Reset for next turn
      const state = stateMachine.getState();
      overlays.updateScoreboard(state.players);

      // Telemetry: track turn completion (bucket landed)
      trackEvent('turn_complete');
      setTag('lastBucketScore', String(scoreBreakdown.totalScore));
      setTag('bounceCount', String(turnResult.bounceCount));

      // Check if round is complete
      const roundAction = stateMachine.evaluateRoundEnd();

      puckDropped = false;
      activePuckId = null;
      input.setFlickEnabled(false);

      if (roundAction.type === 'nextRound') {
        transitionToNextRound();
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
    const board = sim.getBoard();

    const state: RenderState = {
      pins: pinRenderData,
      pucks: snapshot.pucks.map(p => {
        // Use PuckBody.currentRadius for dynamic puck sizing (growth)
        const puckBody = board?.pucks.find(pb => pb.id === p.id);
        return {
          x: p.x,
          y: p.y,
          radius: puckBody?.currentRadius ?? layout.puckRadius,
          style: puckStyleMap.get(p.id) ?? currentPuckStyle,
          settled: p.settled,
          angle: p.angle,
          autoShoveProgress: sim.getAutoShoveProgress(p.id),
        };
      }),
      buckets: bucketRenderData,
      shoveZoneY,
      activePuckId,
      interpolationAlpha: alpha,
      scoreRevocations: pendingScoreRevocations,
      // Ghost puck shown before drop; default dropX to center (0) per FR-014
      ...((!puckDropped && currentPlayer) ? {
        dropIndicator: {
          x: Math.max(-layout.boardWidth / 2, Math.min(layout.boardWidth / 2, dropX)),
          style: currentPuckStyle,
        },
      } : {}),
    };

    renderer.drawFrame(state);
  },
});

// ---- Game flow ----

/** Handle round transition with optional shove guidance popup */
async function transitionToNextRound(): Promise<void> {
  const gameState = stateMachine.getState();

  // Show shove guidance at end of Round 1 if no shoves occurred
  if (gameState.currentRound === 1 && !shoveOccurredInRound1 && !wasGuidanceShown() && gameState.phase !== 'tieBreaker') {
    gameRunning = false;
    await showShoveGuidance(overlayContainer);
    gameRunning = true;
  }

<<<<<<< 010-persistent-puck-growth
  // Board layout is fixed (8-row, no randomization) — pucks persist across rounds
=======
  // Snapshot old bucket assignments for score delta detection
  const oldBuckets = new Map<string, number | null>();
  for (const puck of sim.getAllPucks()) {
    oldBuckets.set(puck.id, puck.settledInBucket);
  }

  // Rebuild board with new random layout (pucks persist)
  randomizeLayout();
  sim.rebuildBoard(config);
  shoveZoneY = sim.getBoard()?.shoveZoneY ?? 0;
  rebuildRenderData();

  // Detect displaced pucks and start settling phase
  const board = sim.getBoard();
  if (board) {
    const displacedIds = detectDisplacedPucks(board, config);
    if (displacedIds.length > 0) {
      prepareSettling(board, displacedIds);
      isSettling = true;

      // Wait for all pucks to re-settle (physics runs visibly via game loop)
      await waitForSettling();

      isSettling = false;

      // Recalculate scores after settling
      const newScores = recalculateAllScores(sim.getAllPucks(), config.boardLayout.bucketScores);

      // Update player scores and show delta indicators
      const state = stateMachine.getState();
      for (const player of state.players) {
        const newScore = newScores.get(player.id) ?? 0;
        const oldScore = player.score;
        if (newScore !== oldScore) {
          player.score = newScore;
        }
      }

      // Show score delta indicators for pucks whose bucket changed
      for (const puck of sim.getAllPucks()) {
        if (!puck.isSettled) continue;
        const oldBucket = oldBuckets.get(puck.id);
        if (oldBucket !== puck.settledInBucket) {
          const pos = puck.body.getPosition();
          const oldScore = (oldBucket !== null && oldBucket !== undefined && oldBucket >= 0)
            ? Math.floor(config.boardLayout.bucketScores[oldBucket] * puck.bounceMultiplier)
            : 0;
          const newScore = (puck.settledInBucket !== null && puck.settledInBucket >= 0)
            ? Math.floor(config.boardLayout.bucketScores[puck.settledInBucket] * puck.bounceMultiplier)
            : 0;
          const delta = newScore - oldScore;
          if (delta !== 0) {
            const deltaText = delta > 0 ? `+${delta.toLocaleString()}` : `\u2212${Math.abs(delta).toLocaleString()}`;
            const puckStyle = puckStyleMap.get(puck.id);
            const color = puckStyle?.color ?? '#ffd700';
            effects.addScoreDelta(pos.x, pos.y, deltaText, color);
          }
        }
      }

      overlays.updateScoreboard(state.players);
    }
  }

>>>>>>> main
  startNextTurn();
}

/** Wait for all pucks to finish settling after pin relocation. */
function waitForSettling(): Promise<void> {
  return new Promise<void>((resolve) => {
    const maxSettlingFrames = 600; // ~10 seconds at 60fps safety limit
    let frameCount = 0;

    function checkSettled(): void {
      frameCount++;
      const allPucks = sim.getAllPucks();
      const allSettled = allPucks.every(p => p.isSettled);

      if (allSettled || frameCount >= maxSettlingFrames) {
        resolve();
        return;
      }

      // Step physics for settling (game loop renders each frame)
      sim.step();
      requestAnimationFrame(checkSettled);
    }

    requestAnimationFrame(checkSettled);
  });
}

function startNextTurn(): void {
  const ctx = stateMachine.startTurn();
  currentPlayer = ctx.player;
  currentPuckStyle = ctx.player.puckStyle;
  shovesDisabled = false;
  slowMotionState = resetSlowMotion();
  musicManager.setTimeScale(1.0);
  overlays.showTurnIndicator(ctx.player, ctx.timerSeconds);
  overlays.updateTimer(ctx.timerSeconds);
  // Show tutorial on first turn of first round of first game
  tutorial.show(ctx.roundNumber, ctx.turnNumber, isFirstGame);
  // Pucks persist as collidable objects — only cleared at game end / tie-breaker
  turnTimer.reset();
  turnTimer.start();
}

async function handleGameEnd(players: Player[], winner: Player | Player[], isTieBreaker: boolean): Promise<void> {
  // Telemetry: tag game end with results
  trackEvent('game_end');
  const winnerArr = Array.isArray(winner) ? winner : [winner];
  const totalRounds = stateMachine.getState().currentRound;
  setTag('winningScore', String(Math.max(...winnerArr.map(w => w.score))));
  setTag('totalRounds', String(totalRounds));
  setTag('totalShoves', String(totalShoveCount));
  setTag('avgShovesPerRound', totalRounds > 0 ? (totalShoveCount / totalRounds).toFixed(1) : '0');

  // Crossfade back to lobby music when showing results
  musicManager.crossfadeTo('lobby');
  const action = await overlays.showResults(players, winner, isTieBreaker);

  if (action === 'playAgain') {
    trackEvent('replay');
    isFirstGame = false;
    shoveOccurredInRound1 = false;
    totalShoveCount = 0;
    stateMachine.resetForReplay();
    sim.clearPucks();
    puckStyleMap.clear();
    sim.createWorld(config);
    shoveZoneY = sim.getBoard()?.shoveZoneY ?? 0;
    rebuildRenderData();
    gameRunning = true;
    startNextTurn();
    overlays.updateScoreboard(stateMachine.getState().players);
  } else if (action === 'newPlayers') {
    trackEvent('new_session');
    isFirstGame = true;
    shoveOccurredInRound1 = false;
    totalShoveCount = 0;
    tutorial.reset();
    stateMachine.resetFull();
    sim.clearPucks();
    puckStyleMap.clear();
    sim.createWorld(config);
    shoveZoneY = sim.getBoard()?.shoveZoneY ?? 0;
    rebuildRenderData();
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
    audioManager.init();
    // Initialize music manager with shared audio context + master gain bus
    const ctx = audioManager.getContext();
    const masterGain = audioManager.getMasterGain();
    if (ctx && masterGain) {
      musicManager.init(ctx, masterGain);
      musicManager.startTrack('lobby');
    }
  }).catch(() => {
    // Audio unlock is non-critical
  });

  // Initialize audio toggle buttons
  overlays.initAudioToggles(
    () => {
      audioManager.toggleMuteSfx();
      overlays.updateAudioToggleState(audioManager.isSfxMuted(), musicManager.isMuted());
    },
    () => {
      musicManager.toggleMute();
      overlays.updateAudioToggleState(audioManager.isSfxMuted(), musicManager.isMuted());
    },
  );

  // Initialize animation toggle button
  overlays.initAnimationToggle((_enabled: boolean) => {
    renderer.background.toggleAnimation();
    overlays.updateAnimationToggleState(renderer.background.isAnimationEnabled());
  });

  stateMachine.startSession(registrations, config);
  shoveOccurredInRound1 = false;
  totalShoveCount = 0;

  // Telemetry: tag game start with player count
  trackEvent('game_start');
  setTag('playerCount', String(registrations.length));

  // Start playing
  const state = stateMachine.getState();
  overlays.updateScoreboard(state.players);
  gameRunning = true;

  sim.clearPucks();
  puckStyleMap.clear();
  sim.createWorld(config);
  shoveZoneY = sim.getBoard()?.shoveZoneY ?? 0;
  rebuildRenderData();
  startNextTurn();
}

// ---- Launch ----
initTelemetry();
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
