import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '@/core/state-machine';
import { ScoringEngine } from '@/core/scoring';
import { PUCK_PALETTE } from '@/types/index';
import type { PlayerRegistration, TurnResult } from '@/types/contracts';
import type { ScoreBreakdown } from '@/types/index';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

function makePlayers(n: number): PlayerRegistration[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    puckStyle: PUCK_PALETTE[i],
  }));
}

function makeTurnResult(bucketIndex: number, score: number, bounceCount = 0): TurnResult {
  const breakdown: ScoreBreakdown = {
    baseScore: score,
    bounceCount,
    multiplier: 1.0,
    totalScore: score,
  };
  return {
    dropPositionX: 0,
    shoves: [],
    bucketIndex,
    scoreEarned: score,
    bounceCount,
    scoreBreakdown: breakdown,
    wasTimeout: false,
  };
}

describe('Full Game Session Integration', () => {
  it('should complete a full 3-player, 5-round game and declare a winner', () => {
    const sm = new GameStateMachine();
    const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 5 };
    const session = sm.startSession(makePlayers(3), config);

    expect(session.phase).toBe('playing');
    expect(session.players.length).toBe(3);

    // Play 5 rounds: each round 3 players take turns
    // Player 1 always scores 100, Player 2 always scores 500, Player 3 always scores 1000
    for (let round = 0; round < 5; round++) {
      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));   // P1: 100 per round
      sm.startTurn();
      sm.completeTurn(makeTurnResult(1, 500));   // P2: 500 per round
      sm.startTurn();
      sm.completeTurn(makeTurnResult(2, 1000));  // P3: 1000 per round

      const action = sm.evaluateRoundEnd();
      if (round < 4) {
        expect(action.type).toBe('nextRound');
      } else {
        expect(action.type).toBe('winner');
        if (action.type === 'winner') {
          expect(action.winner.name).toBe('Player 3');
          expect(action.winner.score).toBe(5000);
        }
      }
    }

    // Final scores
    const state = sm.getState();
    expect(state.players[0].score).toBe(500);  // P1: 5 × 100
    expect(state.players[1].score).toBe(2500); // P2: 5 × 500
    expect(state.players[2].score).toBe(5000); // P3: 5 × 1000
  });

  it('should handle Play Again (resetForReplay) properly', () => {
    const sm = new GameStateMachine();
    const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
    sm.startSession(makePlayers(2), config);

    sm.startTurn();
    sm.completeTurn(makeTurnResult(4, 10000));
    sm.startTurn();
    sm.completeTurn(makeTurnResult(0, 100));
    sm.evaluateRoundEnd();

    // Player selects "Play Again"
    sm.resetForReplay();
    const state = sm.getState();
    expect(state.phase).toBe('playing');
    expect(state.players.length).toBe(2);
    expect(state.players[0].score).toBe(0);
    expect(state.players[1].score).toBe(0);
    expect(state.currentRound).toBe(1);

    // Can play again immediately
    const ctx = sm.startTurn();
    expect(ctx.player.name).toBe('Player 1');
  });

  it('should handle New Players (resetFull) properly', () => {
    const sm = new GameStateMachine();
    sm.startSession(makePlayers(2), DEFAULT_GAME_CONFIG);
    sm.resetFull();

    const state = sm.getState();
    expect(state.phase).toBe('registration');
    expect(state.players.length).toBe(0);
  });

  it('should handle tie-breaker when players tie', () => {
    const sm = new GameStateMachine();
    const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
    sm.startSession(makePlayers(2), config);

    // Both players score 100
    sm.startTurn();
    sm.completeTurn(makeTurnResult(0, 100));
    sm.startTurn();
    sm.completeTurn(makeTurnResult(0, 100));

    const action = sm.evaluateRoundEnd();
    expect(action.type).toBe('tieBreaker');

    if (action.type === 'tieBreaker') {
      expect(action.tiedPlayers.length).toBe(2);
    }
  });

  it('should track bounce scoring through a full round flow', () => {
    const scoring = new ScoringEngine(DEFAULT_GAME_CONFIG.boardLayout, DEFAULT_GAME_CONFIG.scoring);
    const sm = new GameStateMachine();
    const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
    sm.startSession(makePlayers(2), config);

    // Player 1: bucket 0 (edge, base 100) with 10 bounces
    const p1BounceCount = 10;
    const p1Breakdown = scoring.calculateRoundScore(0, p1BounceCount);
    expect(p1Breakdown.baseScore).toBe(100);
    expect(p1Breakdown.bounceCount).toBe(10);
    expect(p1Breakdown.multiplier).toBeGreaterThan(1.0);
    expect(p1Breakdown.totalScore).toBeGreaterThan(p1Breakdown.baseScore);

    sm.startTurn();
    const p1Result: TurnResult = {
      dropPositionX: 0,
      shoves: [],
      bucketIndex: 0,
      scoreEarned: p1Breakdown.totalScore,
      bounceCount: p1BounceCount,
      scoreBreakdown: p1Breakdown,
      wasTimeout: false,
    };
    sm.completeTurn(p1Result);

    // Player 2: bucket 4 (center, base 10000) with 5 bounces
    const p2BounceCount = 5;
    const p2Breakdown = scoring.calculateRoundScore(4, p2BounceCount);
    expect(p2Breakdown.baseScore).toBe(10000);
    expect(p2Breakdown.bounceCount).toBe(5);

    sm.startTurn();
    const p2Result: TurnResult = {
      dropPositionX: 0,
      shoves: [],
      bucketIndex: 0,
      scoreEarned: p2Breakdown.totalScore,
      bounceCount: p2BounceCount,
      scoreBreakdown: p2Breakdown,
      wasTimeout: false,
    };
    sm.completeTurn(p2Result);

    const action = sm.evaluateRoundEnd();
    expect(action.type).toBe('winner');

    // Verify scores match breakdown totalScores
    const state = sm.getState();
    expect(state.players[0].score).toBe(p1Breakdown.totalScore);
    expect(state.players[1].score).toBe(p2Breakdown.totalScore);

    // Player 2 should win (edge bucket × multiplier)
    if (action.type === 'winner') {
      expect(action.winner.name).toBe('Player 2');
    }
  });
});
