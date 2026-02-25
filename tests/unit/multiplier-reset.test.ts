import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '@/core/scoring';
import { DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG } from '@/config/game-config';

describe('Score Multiplier Reset Per Turn', () => {
  const scoring = new ScoringEngine(DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG);

  // T020: Multiplier starts at 1.0× for each turn regardless of prior bounces
  it('should calculate multiplier as 1.0× when bounceCount is 0', () => {
    // First turn — 0 bounces → multiplier = rate^0 = 1.0
    const result1 = scoring.calculateRoundScore(0, 0);
    expect(result1.multiplier).toBe(1.0);

    // Simulate a turn with bounces
    const resultWithBounces = scoring.calculateRoundScore(0, 10);
    expect(resultWithBounces.multiplier).toBeGreaterThan(1.0);

    // Next turn — bounceCount resets to 0, so multiplier is 1.0 again
    const result2 = scoring.calculateRoundScore(0, 0);
    expect(result2.multiplier).toBe(1.0);
  });

  // T021: bounceCount of 0 at start of each turn
  it('should produce independent scores when bounceCount is reset between turns', () => {
    // Turn 1: 5 bounces
    const turn1 = scoring.calculateRoundScore(2, 5); // center bucket (10000)
    const expectedMultiplier1 = Math.min(
      DEFAULT_SCORING_CONFIG.bounceMultiplierRate ** 5,
      DEFAULT_SCORING_CONFIG.bounceMultiplierCap,
    );
    expect(turn1.multiplier).toBeCloseTo(expectedMultiplier1, 5);

    // Turn 2 starts fresh — 0 bounces
    const turn2 = scoring.calculateRoundScore(2, 0);
    expect(turn2.multiplier).toBe(1.0);
    expect(turn2.totalScore).toBe(10000); // base score with no multiplier

    // Turn 3: 3 bounces (independent of turn 1's 5 bounces)
    const turn3 = scoring.calculateRoundScore(2, 3);
    const expectedMultiplier3 = Math.min(
      DEFAULT_SCORING_CONFIG.bounceMultiplierRate ** 3,
      DEFAULT_SCORING_CONFIG.bounceMultiplierCap,
    );
    expect(turn3.multiplier).toBeCloseTo(expectedMultiplier3, 5);
  });

  it('ScoringEngine is stateless — no multiplier state carried between calls', () => {
    // The ScoringEngine.calculateRoundScore is a pure function of its inputs
    // Calling it with the same inputs always produces the same output
    const a = scoring.calculateRoundScore(0, 5);
    const b = scoring.calculateRoundScore(0, 5);
    expect(a).toEqual(b);
  });
});
