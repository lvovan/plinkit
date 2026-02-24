import type { Player } from '@/types/index';

/**
 * Manages turn cycling through players across rounds.
 */
export class TurnManager {
  private players: Player[] = [];
  private totalRounds = 5;
  private currentPlayerIndex = 0;
  private currentRound = 1;
  private turnNumber = 1;
  private roundJustCompleted = false;

  constructor(players: Player[], totalRounds: number) {
    this.players = [...players];
    this.totalRounds = totalRounds;
  }

  getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getTurnNumber(): number {
    return this.turnNumber;
  }

  /**
   * Advance to the next turn.
   * Cycles through players, then advances the round.
   */
  advanceTurn(): void {
    this.currentPlayerIndex++;
    this.turnNumber++;

    if (this.currentPlayerIndex >= this.players.length) {
      // All players have played this round
      this.currentPlayerIndex = 0;
      this.currentRound++;
      this.roundJustCompleted = true;
    } else {
      this.roundJustCompleted = false;
    }
  }

  /**
   * Returns true if all players have completed their turns for the current round.
   * This is checked by seeing if we just wrapped around.
   */
  isRoundComplete(): boolean {
    return this.roundJustCompleted;
  }

  /**
   * Returns true when all rounds have been played.
   */
  isAllRoundsComplete(): boolean {
    return this.currentRound > this.totalRounds;
  }

  /**
   * Filter active players (for tie-breaker scenarios).
   */
  setActivePlayers(players: Player[]): void {
    this.players = [...players];
    this.currentPlayerIndex = 0;
  }

  /**
   * Reset to initial state with new player list and round count.
   */
  reset(players: Player[], totalRounds: number): void {
    this.players = [...players];
    this.totalRounds = totalRounds;
    this.currentPlayerIndex = 0;
    this.currentRound = 1;
    this.turnNumber = 1;
    this.roundJustCompleted = false;
  }
}
