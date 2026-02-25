import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';
import * as planck from 'planck';

/**
 * Pin Randomization Timing (US2)
 * 
 * Pin layout re-randomizes only at round boundaries (before P1's turn).
 * All players within a round face the same layout.
 * 
 * Since randomizeLayout() is internal to main.ts, we test the observable behavior:
 * - rebuildBoard() changes pins (round boundary)
 * - Between turns within a round, pins don't change (no rebuildBoard called)
 * - Game initialization creates pins
 */
describe('Pin Randomization Timing (US2)', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  function getPinPositions(): Array<{ x: number; y: number }> {
    const board = sim.getBoard()!;
    return board.pins.map(pin => {
      const pos = pin.getPosition();
      return { x: pos.x, y: pos.y };
    });
  }

  // T024: Pin layout does NOT change between turns within the same round
  it('should NOT change pin layout between turns within the same round', () => {
    const pinsBeforeTurn1 = getPinPositions();

    // Simulate player 1 dropping and settling
    sim.dropPuck(-1, 'player1');
    for (let i = 0; i < 10; i++) sim.step();

    // Between turns (no rebuildBoard) — pins should be identical
    const pinsBeforeTurn2 = getPinPositions();
    expect(pinsBeforeTurn2).toEqual(pinsBeforeTurn1);

    // Player 2 drops
    sim.dropPuck(1, 'player2');
    for (let i = 0; i < 10; i++) sim.step();

    // Still the same pins
    const pinsAfterTurn2 = getPinPositions();
    expect(pinsAfterTurn2).toEqual(pinsBeforeTurn1);
  });

  // T025: Pin layout DOES change at round boundary (rebuildBoard with different layout)
  it('should change pin layout at round boundary via rebuildBoard', () => {
    const pinsRound1 = getPinPositions();

    // Simulate round boundary — change layout and rebuild
    const newConfig = createGameConfig({
      boardLayout: { ...config.boardLayout, pinRows: 8, pinsPerRow: 6 },
    });
    sim.rebuildBoard(newConfig);

    const pinsRound2 = getPinPositions();

    // Pin count should differ (different layout params)
    expect(pinsRound2.length).not.toBe(pinsRound1.length);
  });

  // T026: Game initialization generates pin layout before first turn
  it('should have pins available after createWorld (game initialization)', () => {
    const freshSim = new PhysicsSimulationImpl();
    freshSim.createWorld(config);

    const board = freshSim.getBoard()!;
    expect(board.pins.length).toBeGreaterThan(0);
    // Pins should be at valid positions
    for (const pin of board.pins) {
      const pos = pin.getPosition();
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    }
  });
});
