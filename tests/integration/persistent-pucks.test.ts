import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { computePinPositions } from '@/config/board-geometry';

describe('Persistent Pucks Integration', () => {
  let sim: PhysicsSimulationImpl;

  beforeEach(() => {
    sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);
  });

  // T012: Pin layout identical across 3 rounds (using same physics simulation)
  it('should produce identical pin layout across rounds (fixed 5-row board)', () => {
    const layout = DEFAULT_GAME_CONFIG.boardLayout;
    const pins1 = computePinPositions(layout);
    const pins2 = computePinPositions(layout);
    const pins3 = computePinPositions(layout);

    expect(pins1).toEqual(pins2);
    expect(pins2).toEqual(pins3);
    expect(pins1.length).toBe(28); // 5 rows: 3×6 + 2×5
  });

  // T016: Drop puck, "advance round" (no clearPucks), assert puck body still exists
  it('should retain puck body after simulated round transition (no clearPucks)', () => {
    const puckId = sim.dropPuck(0, 'player1');
    const board = sim.getBoard();

    expect(board).not.toBeNull();
    expect(board!.pucks.length).toBe(1);
    expect(board!.pucks[0].id).toBe(puckId);
    expect(board!.pucks[0].playerId).toBe('player1');

    // Simulate a round transition (just step the world, don't clear pucks)
    for (let i = 0; i < 60; i++) sim.step();

    // Puck should still exist
    expect(board!.pucks.length).toBe(1);
    expect(board!.pucks[0].id).toBe(puckId);
  });

  // T017: Drop 3 pucks across 3 turns, all remain in board.pucks
  it('should retain all pucks across multiple turns (persistent pucks)', () => {
    const id1 = sim.dropPuck(-2, 'player1');
    for (let i = 0; i < 30; i++) sim.step();

    const id2 = sim.dropPuck(0, 'player2');
    for (let i = 0; i < 30; i++) sim.step();

    const id3 = sim.dropPuck(2, 'player1');
    for (let i = 0; i < 30; i++) sim.step();

    const board = sim.getBoard();
    expect(board).not.toBeNull();
    expect(board!.pucks.length).toBe(3);

    // Verify each puck exists with correct playerId
    const puckMap = new Map(board!.pucks.map(p => [p.id, p.playerId]));
    expect(puckMap.get(id1)).toBe('player1');
    expect(puckMap.get(id2)).toBe('player2');
    expect(puckMap.get(id3)).toBe('player1');
  });

  it('should clear pucks when clearPucks() is explicitly called (game reset)', () => {
    sim.dropPuck(0, 'player1');
    sim.dropPuck(1, 'player2');
    const board = sim.getBoard();
    expect(board!.pucks.length).toBe(2);

    sim.clearPucks();
    expect(board!.pucks.length).toBe(0);
  });

  it('should initialize new PuckBody fields correctly', () => {
    sim.dropPuck(0, 'player1');
    const board = sim.getBoard();
    const puck = board!.pucks[0];

    expect(puck.currentRadius).toBe(DEFAULT_GAME_CONFIG.boardLayout.puckRadius);
    expect(puck.growthCount).toBe(0);
    expect(puck.lastScoredBucket).toBeNull();
    expect(puck.scoreAwarded).toBe(0);
  });
});
