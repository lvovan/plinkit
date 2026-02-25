import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';

describe('bounceMultiplier', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  // T008: bounceMultiplier defaults to 1.0 on puck creation
  it('should default to 1.0 on puck creation', () => {
    const puckId = sim.dropPuck(0, 'player1');
    const board = sim.getBoard()!;
    const puck = board.pucks.find(p => p.id === puckId)!;

    expect(puck.bounceMultiplier).toBe(1.0);
  });

  // T009: bounceMultiplier is stamped from ScoreBreakdown.multiplier when puck settles
  // This is an integration concern — the stamping happens in main.ts after calculateRoundScore.
  // We test the contract: after manual stamping, the value persists across rebuildBoard.
  it('should persist across rebuildBoard calls after being stamped', () => {
    const puckId = sim.dropPuck(0, 'player1');
    const board = sim.getBoard()!;
    const puck = board.pucks.find(p => p.id === puckId)!;

    // Simulate stamping at settlement
    puck.bounceMultiplier = 2.5;

    // Rebuild board (simulates round transition)
    sim.rebuildBoard(config);

    const updatedBoard = sim.getBoard()!;
    const updatedPuck = updatedBoard.pucks.find(p => p.id === puckId)!;
    expect(updatedPuck.bounceMultiplier).toBe(2.5);
  });

  it('should be independent per puck', () => {
    const id1 = sim.dropPuck(-1, 'player1');
    const id2 = sim.dropPuck(1, 'player2');
    const board = sim.getBoard()!;

    const puck1 = board.pucks.find(p => p.id === id1)!;
    const puck2 = board.pucks.find(p => p.id === id2)!;

    puck1.bounceMultiplier = 3.0;
    puck2.bounceMultiplier = 1.5;

    expect(puck1.bounceMultiplier).toBe(3.0);
    expect(puck2.bounceMultiplier).toBe(1.5);
  });
});
