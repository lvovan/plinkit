import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '@/core/scoring';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

describe('ScoringEngine', () => {
  describe('getScoreForBucket()', () => {
    it('should return correct score for each bucket index (T020)', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout);
      const expectedScores = [100, 1000, 10000, 1000, 100];

      for (let i = 0; i < expectedScores.length; i++) {
        expect(engine.getScoreForBucket(i)).toBe(expectedScores[i]);
      }
    });

    it('should throw for out-of-bounds bucket index (T022)', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout);
      expect(() => engine.getScoreForBucket(-1)).toThrow();
      expect(() => engine.getScoreForBucket(5)).toThrow();
    });

    it('should have symmetric scoring — center highest (T021)', () => {
      new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout);
      const scores = DEFAULT_GAME_CONFIG.boardLayout.bucketScores;

      // Verify symmetry: index i === index (length - 1 - i)
      for (let i = 0; i < Math.floor(scores.length / 2); i++) {
        expect(scores[i]).toBe(scores[scores.length - 1 - i]);
      }

      // Center bucket should be the maximum
      const centerIndex = Math.floor(scores.length / 2);
      expect(scores[centerIndex]).toBe(Math.max(...scores));
    });
  });

  describe('cumulative scoring', () => {
    it('should accumulate scores across multiple turns', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout);

      // Player scores in bucket 2 (10000) and bucket 0 (100)
      const total = engine.getScoreForBucket(2) + engine.getScoreForBucket(0);
      expect(total).toBe(10100);
    });

    it('should allow the same bucket to be scored multiple times', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout);
      const score1 = engine.getScoreForBucket(2);
      const score2 = engine.getScoreForBucket(2);
      expect(score1 + score2).toBe(20000);
    });
  });

  describe('calculateRoundScore()', () => {
    it('should return multiplier 1.0 and totalScore equals baseScore for 0 bounces', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      const result = engine.calculateRoundScore(2, 0); // bucket 2 = 10000 (center)
      expect(result.baseScore).toBe(10000);
      expect(result.bounceCount).toBe(0);
      expect(result.multiplier).toBe(1.0);
      expect(result.totalScore).toBe(10000);
    });

    it('should return multiplier ≈2.01 for 5 bounces', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      const result = engine.calculateRoundScore(0, 5); // bucket 0 = 100
      expect(result.multiplier).toBeCloseTo(2.01, 1);
      expect(result.totalScore).toBe(Math.floor(100 * result.multiplier));
    });

    it('should return multiplier ≈4.05 for 10 bounces', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      const result = engine.calculateRoundScore(0, 10);
      expect(result.multiplier).toBeCloseTo(4.05, 1);
    });

    it('should cap multiplier at 10.0 for 17+ bounces', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      const result17 = engine.calculateRoundScore(0, 17);
      expect(result17.multiplier).toBe(10.0);

      const result20 = engine.calculateRoundScore(0, 20);
      expect(result20.multiplier).toBe(10.0);

      const result50 = engine.calculateRoundScore(0, 50);
      expect(result50.multiplier).toBe(10.0);
    });

    it('should always return totalScore as floor(baseScore × multiplier)', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      // bucket 1 = 1000, 3 bounces → 1.15^3 = 1.521..., 1000 × 1.521 = 1521.67 → 1521
      const result = engine.calculateRoundScore(1, 3);
      expect(result.totalScore).toBe(Math.floor(1000 * result.multiplier));
      expect(Number.isInteger(result.totalScore)).toBe(true);
    });

    it('should throw RangeError for invalid bucketIndex', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      expect(() => engine.calculateRoundScore(-1, 5)).toThrow(RangeError);
      expect(() => engine.calculateRoundScore(DEFAULT_GAME_CONFIG.boardLayout.bucketCount, 5)).toThrow(RangeError);
    });

    it('should satisfy SC-003: 10 bounces scores at least 2× more than 5 bounces', () => {
      const engine = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
      const result5 = engine.calculateRoundScore(2, 5);
      const result10 = engine.calculateRoundScore(2, 10);
      expect(result10.totalScore).toBeGreaterThanOrEqual(result5.totalScore * 2);
    });
  });
});
