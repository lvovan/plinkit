import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '@/core/scoring';
import { DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG } from '@/config/game-config';

describe('Revocable Scoring', () => {
  // T044: revokeScore subtracts amount from player score and clamps at 0
  it('should subtract revoked amount from player score', () => {
    const scoring = new ScoringEngine(DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG);
    const revoked = scoring.revokeScore(1000, 500);
    expect(revoked).toBe(500);
  });

  it('should clamp revoked amount when it would make score negative', () => {
    const scoring = new ScoringEngine(DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG);
    // Player has 200 points, trying to revoke 500
    const revoked = scoring.revokeScore(200, 500);
    expect(revoked).toBe(200); // Can only revoke up to the current score
  });

  it('should return 0 when player score is already 0', () => {
    const scoring = new ScoringEngine(DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG);
    const revoked = scoring.revokeScore(0, 500);
    expect(revoked).toBe(0);
  });

  // T045: revokeScore returns actual amount subtracted (may be less if clamped)
  it('should return the actual amount subtracted', () => {
    const scoring = new ScoringEngine(DEFAULT_BOARD_LAYOUT, DEFAULT_SCORING_CONFIG);
    // Full revocation
    expect(scoring.revokeScore(1000, 300)).toBe(300);
    // Clamped revocation
    expect(scoring.revokeScore(100, 500)).toBe(100);
    // Zero score
    expect(scoring.revokeScore(0, 100)).toBe(0);
  });
});
