import type { BoardLayout, Player, ScoringConfig, ScoreBreakdown } from '@/types/index';
import type { PuckBody } from '@/physics/board-builder';

/**
 * Computes scores for bucket indices based on the board layout's bucket scores.
 * Supports bounce-based exponential scoring multiplier.
 */
export class ScoringEngine {
  private bucketScores: readonly number[];
  private scoringConfig: ScoringConfig;

  constructor(boardLayout: BoardLayout, scoringConfig?: ScoringConfig) {
    this.bucketScores = boardLayout.bucketScores;
    this.scoringConfig = scoringConfig ?? { bounceMultiplierRate: 1.15, bounceMultiplierCap: 10.0 };
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

  /**
   * Calculate round score with bounce multiplier.
   * multiplier = min(rate^bounceCount, cap)
   * totalScore = floor(baseScore × multiplier)
   * @throws RangeError if bucketIndex is out of bounds
   */
  calculateRoundScore(bucketIndex: number, bounceCount: number): ScoreBreakdown {
    const baseScore = this.getScoreForBucket(bucketIndex);
    const multiplier = Math.min(
      this.scoringConfig.bounceMultiplierRate ** bounceCount,
      this.scoringConfig.bounceMultiplierCap,
    );
    const totalScore = Math.floor(baseScore * multiplier);
    return { baseScore, bounceCount, multiplier, totalScore };
  }
}

/**
 * Recalculate total scores for all players from their settled pucks.
 * Score per puck = floor(bucketScores[bucket] × puck.bounceMultiplier).
 * Unsettled pucks (off board, in flight) contribute 0.
 *
 * @returns Map of playerId → total score
 */
export function recalculateAllScores(
  pucks: ReadonlyArray<Pick<PuckBody, 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'>>,
  bucketScores: readonly number[],
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const puck of pucks) {
    if (!scores.has(puck.playerId)) {
      scores.set(puck.playerId, 0);
    }

    if (puck.isSettled && puck.settledInBucket !== null && puck.settledInBucket >= 0 && puck.settledInBucket < bucketScores.length) {
      const puckScore = Math.floor(bucketScores[puck.settledInBucket] * puck.bounceMultiplier);
      scores.set(puck.playerId, scores.get(puck.playerId)! + puckScore);
    }
  }

  return scores;
}
