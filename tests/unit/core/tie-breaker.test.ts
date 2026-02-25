import { describe, it, expect } from 'vitest';
import { GameStateMachine } from '@/core/state-machine';
import { PUCK_PALETTE } from '@/types/index';
import type { PlayerRegistration, TurnResult } from '@/types/contracts';

function makePlayers(n: number): PlayerRegistration[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    puckStyle: PUCK_PALETTE[i],
  }));
}

function makeTurnResult(score: number): TurnResult {
  return {
    dropPositionX: 0,
    shoves: [],
    bucketIndex: 0,
    scoreEarned: score,
    wasTimeout: false,
    bounceCount: 0,
    scoreBreakdown: { baseScore: score, bounceCount: 0, multiplier: 1, totalScore: score },
  };
}

describe('Tie-Breaker Logic', () => {
  const baseConfig = {
    boardLayout: {
      pinRows: 12, bucketCount: 9, pinSpacing: 1.0, pinRadius: 0.15, puckRadius: 0.25,
      bucketScores: [100, 500, 1000, 5000, 10000, 5000, 1000, 500, 100],
      boardWidth: 10.0, boardHeight: 14.0,
    },
    physics: {
      gravity: { x: 0, y: -10 }, fixedTimestep: 1 / 60,
      velocityIterations: 8, positionIterations: 3,
      puckRestitution: 0.5, puckFriction: 0.1, puckDensity: 1.0,
      pinRestitution: 0.4, pinFriction: 0.05,
      stalledVelocityThreshold: 0.01, stalledTimeoutMs: 10000,
      angularDamping: 0.3, maxAngularVelocity: 20,
    },
    shoveConfig: {
      maxForceMagnitude: 5.0, minFlickSpeed: 200,
      flickSampleWindowMs: 80, quantizationPrecision: 0.001, shoveZoneRowLimit: 9,
      shoveOffsetFraction: 0.35,
    },
    scoring: { bounceMultiplierRate: 1.15, bounceMultiplierCap: 10.0 },
    slowMotion: { targetScale: 0.3, enterDuration: 0.25, holdDuration: 1.5, exitDuration: 0.4 },
    turnTimerSeconds: 15,
    maxTieBreakers: 10,
  };

  it('should detect tied players after final round', () => {
    const sm = new GameStateMachine();
    const config = { ...baseConfig, totalRounds: 1 };

    sm.startSession(makePlayers(3), config);

    // All score the same
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));

    const action = sm.evaluateRoundEnd();
    expect(action.type).toBe('tieBreaker');
    if (action.type === 'tieBreaker') {
      expect(action.tiedPlayers.length).toBe(3);
    }
  });

  it('should filter active roster to only tied players', () => {
    const sm = new GameStateMachine();
    const config = { ...baseConfig, totalRounds: 1 };

    sm.startSession(makePlayers(3), config);

    // P1 and P3 tie at 500, P2 scores 100
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    sm.startTurn(); sm.completeTurn(makeTurnResult(100));
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));

    const action = sm.evaluateRoundEnd();
    expect(action.type).toBe('tieBreaker');
    if (action.type === 'tieBreaker') {
      expect(action.tiedPlayers.length).toBe(2);
      const names = action.tiedPlayers.map(p => p.name);
      expect(names).toContain('Player 1');
      expect(names).toContain('Player 3');
    }
  });

  it('should declare winner after tie-breaker resolves', () => {
    const sm = new GameStateMachine();
    const config = { ...baseConfig, totalRounds: 1 };

    sm.startSession(makePlayers(2), config);

    // Tie in regular round
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));

    const tieAction = sm.evaluateRoundEnd();
    expect(tieAction.type).toBe('tieBreaker');

    // Now play a tie-breaker round where P1 wins
    // Need to start a tiebreaker session with the tied players
    if (tieAction.type === 'tieBreaker') {
      sm.startTieBreaker(tieAction.tiedPlayers);
      sm.startTurn(); sm.completeTurn(makeTurnResult(1000)); // P1
      sm.startTurn(); sm.completeTurn(makeTurnResult(100));   // P2

      const result = sm.evaluateRoundEnd();
      expect(result.type).toBe('winner');
      if (result.type === 'winner') {
        expect(result.winner.name).toBe('Player 1');
      }
    }
  });

  it('should declare co-winners after 10 tied rounds', () => {
    const sm = new GameStateMachine();
    const config = { ...baseConfig, totalRounds: 1 };

    sm.startSession(makePlayers(2), config);

    // Initial tie
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    sm.startTurn(); sm.completeTurn(makeTurnResult(500));
    let action = sm.evaluateRoundEnd();

    // Play 10 tie-breaker rounds, all tied
    for (let tb = 0; tb < 10; tb++) {
      if (action.type === 'tieBreaker') {
        sm.startTieBreaker(action.tiedPlayers);
        sm.startTurn(); sm.completeTurn(makeTurnResult(200));
        sm.startTurn(); sm.completeTurn(makeTurnResult(200));
        action = sm.evaluateRoundEnd();
      }
    }

    expect(action.type).toBe('coWinners');
    if (action.type === 'coWinners') {
      expect(action.winners.length).toBe(2);
    }
  });
});
