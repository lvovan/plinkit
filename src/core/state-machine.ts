import type {
  GameConfig,
  GameSession,
  GamePhase,
} from '@/types/index';
import type {
  GameStateMachineContract,
  PlayerRegistration,
  TurnContext,
  TurnResult,
  RoundEndAction,
} from '@/types/contracts';
import { createPlayer, resetPlayerIds } from './player';
import { TurnManager } from './turn-manager';

/**
 * Core game state machine managing phases, turns, rounds, and scoring.
 */
export class GameStateMachine implements GameStateMachineContract {
  private session: GameSession;
  private config: GameConfig | null = null;
  private turnManager: TurnManager | null = null;

  constructor() {
    this.session = this.createEmptySession();
  }

  startSession(registrations: PlayerRegistration[], config: GameConfig): GameSession {
    this.config = config;
    resetPlayerIds();

    const players = registrations.map((reg, i) =>
      createPlayer(reg.name, reg.puckStyle, i),
    );

    this.session = {
      id: `session_${Date.now()}`,
      players,
      config,
      phase: 'playing',
      currentRound: 1,
      currentTurnIndex: 0,
      turns: [],
      tieBreakersPlayed: 0,
      activePlayers: [...players],
    };

    this.turnManager = new TurnManager(players, config.totalRounds);
    return this.session;
  }

  startTurn(): TurnContext {
    if (!this.turnManager || !this.config) {
      throw new Error('Session not started');
    }

    const player = this.turnManager.getCurrentPlayer();
    return {
      player,
      turnNumber: this.turnManager.getTurnNumber(),
      roundNumber: this.turnManager.getCurrentRound(),
      shovesRemaining: this.config.shoveConfig.maxShovesPerTurn,
      timerSeconds: this.config.turnTimerSeconds,
    };
  }

  completeTurn(result: TurnResult): void {
    if (!this.turnManager) throw new Error('Session not started');

    const player = this.turnManager.getCurrentPlayer();

    // Update player score
    player.score += result.scoreEarned;

    // Record turn
    this.session.turns.push({
      playerId: player.id,
      roundNumber: this.turnManager.getCurrentRound(),
      dropPositionX: result.dropPositionX,
      shoves: result.shoves,
      resultBucketIndex: result.bucketIndex,
      scoreEarned: result.scoreEarned,
      wasTimeout: result.wasTimeout,
      simulationTicks: 0,
    });

    this.session.currentTurnIndex++;
    this.turnManager.advanceTurn();
  }

  evaluateRoundEnd(): RoundEndAction {
    if (!this.turnManager || !this.config) {
      throw new Error('Session not started');
    }

    // Check if all rounds are complete
    if (!this.turnManager.isAllRoundsComplete()) {
      this.session.currentRound = this.turnManager.getCurrentRound();
      return { type: 'nextRound' };
    }

    // All rounds done — determine winner
    const players = this.session.players;
    const maxScore = Math.max(...players.map(p => p.score));
    const topPlayers = players.filter(p => p.score === maxScore);

    if (topPlayers.length === 1) {
      this.session.phase = 'results';
      return { type: 'winner', winner: topPlayers[0] };
    }

    // Tie detected
    if (this.session.tieBreakersPlayed >= this.config.maxTieBreakers) {
      this.session.phase = 'results';
      return { type: 'coWinners', winners: topPlayers };
    }

    this.session.phase = 'tieBreaker';
    return { type: 'tieBreaker', tiedPlayers: topPlayers };
  }

  /**
   * Start a tie-breaker round with only the tied players.
   * Each tie-breaker round is 1 round with the filtered player set.
   */
  startTieBreaker(tiedPlayers: import('@/types/index').Player[]): void {
    if (!this.config) throw new Error('No session');

    this.session.phase = 'tieBreaker';
    this.session.tieBreakersPlayed++;
    this.session.activePlayers = [...tiedPlayers];

    // Create a turn manager for 1 round with only tied players
    this.turnManager = new TurnManager(tiedPlayers, 1);
  }

  resetForReplay(): void {
    if (!this.config) throw new Error('No session to reset');

    // Keep players but reset scores
    for (const player of this.session.players) {
      player.score = 0;
    }

    this.session.phase = 'playing';
    this.session.currentRound = 1;
    this.session.currentTurnIndex = 0;
    this.session.turns = [];
    this.session.tieBreakersPlayed = 0;
    this.session.activePlayers = [...this.session.players];

    this.turnManager = new TurnManager(this.session.players, this.config.totalRounds);
  }

  resetFull(): void {
    this.session = this.createEmptySession();
    this.config = null;
    this.turnManager = null;
  }

  getState(): GameSession {
    return this.session;
  }

  private createEmptySession(): GameSession {
    return {
      id: '',
      players: [],
      config: null as unknown as GameConfig,
      phase: 'registration' as GamePhase,
      currentRound: 0,
      currentTurnIndex: 0,
      turns: [],
      tieBreakersPlayed: 0,
      activePlayers: [],
    };
  }
}
