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
});
