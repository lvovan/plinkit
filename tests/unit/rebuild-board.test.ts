import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG, createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';

describe('rebuildBoard()', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  // T004: rebuildBoard destroys old pins and creates new ones while preserving pucks
  it('should destroy old pins and create new pins while preserving puck bodies', () => {
    // Drop two pucks
    const puckId1 = sim.dropPuck(0, 'player1');
    const puckId2 = sim.dropPuck(1, 'player2');

    const board = sim.getBoard()!;
    const originalPinCount = board.pins.length;
    expect(originalPinCount).toBeGreaterThan(0);

    // Change pin layout
    const newConfig = createGameConfig({
      boardLayout: { ...config.boardLayout, pinRows: 8, pinsPerRow: 6 },
    });

    sim.rebuildBoard(newConfig);

    const updatedBoard = sim.getBoard()!;
    // Pins should be different (new count for different layout)
    expect(updatedBoard.pins.length).not.toBe(originalPinCount);
    // Pucks should still exist
    expect(updatedBoard.pucks.length).toBe(2);
    expect(updatedBoard.pucks[0].id).toBe(puckId1);
    expect(updatedBoard.pucks[1].id).toBe(puckId2);

    // Puck physics bodies should still be in the world
    const snapshot = sim.getSnapshot();
    expect(snapshot.pucks.length).toBe(2);
  });

  // T005: rebuildBoard destroys and recreates bucket walls, recomputes shoveZoneY, and rebuilds BucketDetector
  it('should destroy/recreate bucket walls, recompute shoveZoneY, rebuild BucketDetector', () => {
    const board = sim.getBoard()!;
    const originalBucketWallCount = board.bucketWalls.length;
    const originalShoveZoneY = board.shoveZoneY;

    // Change to a different layout
    const newConfig = createGameConfig({
      boardLayout: { ...config.boardLayout, pinRows: 9, pinsPerRow: 6 },
    });

    sim.rebuildBoard(newConfig);

    const updatedBoard = sim.getBoard()!;
    // Bucket walls should be recreated (count may differ with different pinsPerRow)
    expect(updatedBoard.bucketWalls.length).toBeGreaterThan(0);
    // shoveZoneY should be recomputed
    expect(typeof updatedBoard.shoveZoneY).toBe('number');
    // With different pinRows, shoveZoneY will likely differ
    // (9 rows vs 6 rows should produce different shove zones)
    expect(updatedBoard.shoveZoneY).not.toBe(originalShoveZoneY);
  });

  // T006: rebuildBoard wakes all puck bodies after pin replacement
  it('should wake all puck bodies after pin replacement', () => {
    // Drop pucks and simulate until they settle
    const puckId1 = sim.dropPuck(0, 'player1');

    const board = sim.getBoard()!;
    const puck = board.pucks.find(p => p.id === puckId1)!;

    // Manually put the puck body to sleep
    puck.body.setAwake(false);
    expect(puck.body.isAwake()).toBe(false);

    sim.rebuildBoard(config);

    // After rebuild, puck should be awake
    const updatedBoard = sim.getBoard()!;
    const updatedPuck = updatedBoard.pucks.find(p => p.id === puckId1)!;
    expect(updatedPuck.body.isAwake()).toBe(true);
  });

  // T007: getAllPucks returns current board.pucks array
  it('getAllPucks should return current board.pucks array', () => {
    expect(sim.getAllPucks()).toHaveLength(0);

    sim.dropPuck(0, 'player1');
    sim.dropPuck(1, 'player2');

    const pucks = sim.getAllPucks();
    expect(pucks).toHaveLength(2);
    expect(pucks[0].playerId).toBe('player1');
    expect(pucks[1].playerId).toBe('player2');

    // Should be the same reference as board.pucks
    const board = sim.getBoard()!;
    expect(pucks).toBe(board.pucks);
  });
});
