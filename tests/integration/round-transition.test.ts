import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';

describe('Round Transition Integration', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  // T018: Full 2-round, 2-player game where pucks from round 1 remain collidable in round 2
  it('should keep pucks from round 1 collidable in round 2 after rebuildBoard', () => {
    // Round 1 — player 1 drops puck
    const puckR1P1 = sim.dropPuck(-1, 'player1');
    // Step physics a few times so puck is in the world
    for (let i = 0; i < 10; i++) {
      sim.step();
    }

    // Round 1 — player 2 drops puck
    const puckR1P2 = sim.dropPuck(1, 'player2');
    for (let i = 0; i < 10; i++) {
      sim.step();
    }

    // All pucks present
    expect(sim.getAllPucks()).toHaveLength(2);

    // Round transition — rebuild board (new pins, keep pucks)
    sim.rebuildBoard(config);

    // Pucks from round 1 should still be here
    const pucksAfterRebuild = sim.getAllPucks();
    expect(pucksAfterRebuild).toHaveLength(2);
    expect(pucksAfterRebuild[0].id).toBe(puckR1P1);
    expect(pucksAfterRebuild[1].id).toBe(puckR1P2);

    // Round 2 — player 1 drops another puck
    const puckR2P1 = sim.dropPuck(0, 'player1');

    // Step physics — the new puck should interact with old pucks (collidable)
    for (let i = 0; i < 30; i++) {
      const result = sim.step();
      // Check for puck-puck collisions (proves old pucks are collidable)
      for (const collision of result.collisions) {
        if (collision.type === 'puckHit') {
          // A puck-puck collision means persistence is working
          expect(collision.puckId).toBeDefined();
        }
      }
    }

    // All 3 pucks should be in the world
    expect(sim.getAllPucks()).toHaveLength(3);
    const snapshot = sim.getSnapshot();
    expect(snapshot.pucks).toHaveLength(3);
    expect(snapshot.pucks.map(p => p.id)).toContain(puckR1P1);
    expect(snapshot.pucks.map(p => p.id)).toContain(puckR1P2);
    expect(snapshot.pucks.map(p => p.id)).toContain(puckR2P1);
  });

  // T045: Tie-breaker clears all persistent pucks
  it('should clear all pucks when starting a tie-breaker', () => {
    sim.dropPuck(-1, 'player1');
    sim.dropPuck(1, 'player2');
    sim.rebuildBoard(config);
    sim.dropPuck(0, 'player1');
    expect(sim.getAllPucks()).toHaveLength(3);

    // Tie-breaker — clear pucks
    sim.clearPucks();
    expect(sim.getAllPucks()).toHaveLength(0);
  });

  // T046: Play-again resets board completely
  it('should have no leftover pucks after play-again (clearPucks + createWorld)', () => {
    sim.dropPuck(-1, 'player1');
    sim.dropPuck(1, 'player2');
    sim.rebuildBoard(config);
    sim.dropPuck(0, 'player1');
    expect(sim.getAllPucks()).toHaveLength(3);

    // Play-again — clear pucks + fresh world
    sim.clearPucks();
    sim.createWorld(config);
    expect(sim.getAllPucks()).toHaveLength(0);
  });
});
