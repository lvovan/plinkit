import type { BoardLayout, Player } from '@/types/index';

/**
 * Computes scores for bucket indices based on the board layout's bucket scores.
 */
export class ScoringEngine {
  private bucketScores: readonly number[];

  constructor(boardLayout: BoardLayout) {
    this.bucketScores = boardLayout.bucketScores;
  }

  /**
   * Returns the score for the given bucket index.
   * @throws if bucketIndex is out of range
   */
  getScoreForBucket(bucketIndex: number): number {
    if (bucketIndex < 0 || bucketIndex >= this.bucketScores.length) {
      throw new RangeError(
        `Bucket index ${bucketIndex} out of range [0, ${this.bucketScores.length - 1}]`,
      );
    }
    return this.bucketScores[bucketIndex];
  }

  /**
   * Identify players sharing the maximum score.
   * Returns empty array if no players, single-element if clear winner,
   * multi-element if tied.
   */
  findTiedPlayers(players: Player[]): Player[] {
    if (players.length === 0) return [];
    const maxScore = Math.max(...players.map(p => p.score));
    return players.filter(p => p.score === maxScore);
  }
}
