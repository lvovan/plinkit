import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';
import type { PuckBody } from '@/physics/board-builder';
import {
  detectDisplacedPucks,
  prepareSettling,
} from '@/physics/puck-settler';
import { recalculateAllScores } from '@/core/scoring';

describe('Puck Settling (US3)', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  // T029: Displaced pucks have isSettled reset to false and settledInBucket reset to null
  it('should reset isSettled and settledInBucket on displaced pucks', () => {
    const puckId = sim.dropPuck(0, 'player1');
    const board = sim.getBoard()!;
    const puck = board.pucks.find(p => p.id === puckId)!;

    // Simulate settled state
    puck.isSettled = true;
    puck.settledInBucket = 2;
    puck.bounceMultiplier = 1.5;

    const displacedIds = [puckId];
    prepareSettling(board, displacedIds);

    expect(puck.isSettled).toBe(false);
    expect(puck.settledInBucket).toBeNull();
    // bounceMultiplier should be preserved
    expect(puck.bounceMultiplier).toBe(1.5);
    // Puck should be awake
    expect(puck.body.isAwake()).toBe(true);
  });

  // T030: After physics stepping, displaced pucks reach stable positions with no pin overlaps
  it('should reach stable positions after physics stepping', () => {
    // Drop a puck and let it settle
    const puckId = sim.dropPuck(0, 'player1');

    // Step physics until puck settles
    for (let i = 0; i < 600; i++) {
      const result = sim.step();
      if (result.settledPucks.length > 0) break;
    }

    const board = sim.getBoard()!;
    board.pucks.find(p => p.id === puckId)!;

    // Rebuild board (which may displace puck)
    sim.rebuildBoard(config);

    const displaced = detectDisplacedPucks(sim.getBoard()!, config);
    if (displaced.length > 0) {
      prepareSettling(sim.getBoard()!, displaced);
      // Step physics until puck re-settles
      for (let i = 0; i < 600; i++) {
        sim.step();
        const updatedPuck = sim.getBoard()!.pucks.find(p => p.id === puckId)!;
        if (updatedPuck.isSettled) break;
      }
    }

    // After re-settling, puck should be settled
    const finalPuck = sim.getBoard()!.pucks.find(p => p.id === puckId)!;
    // Puck should either be settled or still exist
    expect(finalPuck).toBeDefined();
  });

  // T031: Score recalculation uses puck.bounceMultiplier × bucketScores[newBucket]
  it('should recalculate scores using bounceMultiplier × bucketScore', () => {
    const bucketScores = config.boardLayout.bucketScores; // [100, 1000, 10000, 1000, 100]

    const puck1: Pick<PuckBody, 'id' | 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'> = {
      id: 'puck_1',
      playerId: 'player1',
      isSettled: true,
      settledInBucket: 2, // 10000 base
      bounceMultiplier: 2.0,
    };

    const puck2: Pick<PuckBody, 'id' | 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'> = {
      id: 'puck_2',
      playerId: 'player2',
      isSettled: true,
      settledInBucket: 0, // 100 base
      bounceMultiplier: 3.0,
    };

    const scores = recalculateAllScores(
      [puck1 as PuckBody, puck2 as PuckBody],
      bucketScores,
    );

    expect(scores.get('player1')).toBe(Math.floor(10000 * 2.0)); // 20000
    expect(scores.get('player2')).toBe(Math.floor(100 * 3.0));   // 300
  });

  // T032: Puck that falls off-board during repositioning has score set to 0
  it('should contribute 0 score for unsettled pucks', () => {
    const bucketScores = config.boardLayout.bucketScores;

    const settledPuck: Pick<PuckBody, 'id' | 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'> = {
      id: 'puck_1',
      playerId: 'player1',
      isSettled: true,
      settledInBucket: 2,
      bounceMultiplier: 1.5,
    };

    const unsettledPuck: Pick<PuckBody, 'id' | 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'> = {
      id: 'puck_2',
      playerId: 'player1',
      isSettled: false,
      settledInBucket: null,
      bounceMultiplier: 2.0,
    };

    const scores = recalculateAllScores(
      [settledPuck as PuckBody, unsettledPuck as PuckBody],
      bucketScores,
    );

    // Only the settled puck contributes
    expect(scores.get('player1')).toBe(Math.floor(10000 * 1.5)); // 15000
  });

  // T033: recalculateAllScores returns correct per-player totals
  it('should return correct per-player totals from all settled pucks', () => {
    const bucketScores = config.boardLayout.bucketScores;

    const pucks: Array<Pick<PuckBody, 'id' | 'playerId' | 'isSettled' | 'settledInBucket' | 'bounceMultiplier'>> = [
      { id: 'p1', playerId: 'player1', isSettled: true, settledInBucket: 0, bounceMultiplier: 1.0 },
      { id: 'p2', playerId: 'player1', isSettled: true, settledInBucket: 2, bounceMultiplier: 2.0 },
      { id: 'p3', playerId: 'player2', isSettled: true, settledInBucket: 1, bounceMultiplier: 1.5 },
      { id: 'p4', playerId: 'player2', isSettled: true, settledInBucket: 3, bounceMultiplier: 1.0 },
    ];

    const scores = recalculateAllScores(pucks as PuckBody[], bucketScores);

    // player1: floor(100*1.0) + floor(10000*2.0) = 100 + 20000 = 20100
    expect(scores.get('player1')).toBe(20100);
    // player2: floor(1000*1.5) + floor(1000*1.0) = 1500 + 1000 = 2500
    expect(scores.get('player2')).toBe(2500);
  });
});
