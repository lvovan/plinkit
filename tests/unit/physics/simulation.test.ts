import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

describe('PhysicsSimulation', () => {
  let sim: PhysicsSimulationImpl;

  beforeEach(() => {
    sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);
  });

  afterEach(() => {
    sim.destroy();
  });

  describe('createWorld()', () => {
    it('should create a world without error', () => {
      // Already created in beforeEach — just check it didn't throw
      expect(true).toBe(true);
    });
  });

  describe('dropPuck()', () => {
    it('should return a unique puck ID', () => {
      const id1 = sim.dropPuck(0, 'player1');
      const id2 = sim.dropPuck(1, 'player2');
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should create a puck that appears in the snapshot', () => {
      const puckId = sim.dropPuck(0, 'player1');
      const snapshot = sim.getSnapshot();
      expect(snapshot.pucks.length).toBe(1);
      expect(snapshot.pucks[0].id).toBe(puckId);
    });
  });

  describe('step()', () => {
    it('should return a PhysicsStepResult with an incrementing tick', () => {
      sim.dropPuck(0, 'player1');
      const result1 = sim.step();
      const result2 = sim.step();
      expect(result1.tick).toBe(1);
      expect(result2.tick).toBe(2);
    });

    it('should return collision events when puck hits pins', () => {
      sim.dropPuck(0, 'player1');
      // Run simulation for enough steps that the puck reaches pins
      let foundCollision = false;
      for (let i = 0; i < 300; i++) {
        const result = sim.step();
        if (result.collisions.length > 0) {
          foundCollision = true;
          break;
        }
      }
      expect(foundCollision).toBe(true);
    });
  });

  describe('getPuckState()', () => {
    it('should report puck as not settled immediately after drop', () => {
      const puckId = sim.dropPuck(0, 'player1');
      const state = sim.getPuckState(puckId);
      expect(state.isSettled).toBe(false);
      expect(state.bucketIndex).toBeNull();
    });

    it('should report puck as in shove zone initially', () => {
      const puckId = sim.dropPuck(0, 'player1');
      const state = sim.getPuckState(puckId);
      expect(state.isInShoveZone).toBe(true);
    });
  });

  describe('getSnapshot()', () => {
    it('should return positions for all pucks', () => {
      sim.dropPuck(-1, 'player1');
      sim.dropPuck(1, 'player2');
      const snapshot = sim.getSnapshot();
      expect(snapshot.pucks.length).toBe(2);
      expect(snapshot.pucks[0].x).toBeDefined();
      expect(snapshot.pucks[0].y).toBeDefined();
    });
  });

  describe('clearPucks()', () => {
    it('should remove all pucks from the world', () => {
      sim.dropPuck(0, 'player1');
      sim.dropPuck(1, 'player2');
      expect(sim.getSnapshot().pucks.length).toBe(2);
      sim.clearPucks();
      expect(sim.getSnapshot().pucks.length).toBe(0);
    });
  });
});
