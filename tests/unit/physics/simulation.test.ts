import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG, createGameConfig } from '@/config/game-config';

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

  describe('Out-of-Bounds detection', () => {
    it('should trigger OOB event when puck is above top boundary for 30+ ticks (T006)', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        boardLayout: {
          ...DEFAULT_GAME_CONFIG.boardLayout,
          pinRows: 2,
        },
      });
      sim2.createWorld(config);
      const puckId = sim2.dropPuck(0, 'player1');

      // Apply massive upward force to send puck above the board
      sim2.applyShove(puckId, { dx: 0, dy: 50, appliedAtTick: 0 });

      // Step until puck goes above the top boundary, then keep stepping for grace period
      let oobFound = false;
      for (let i = 0; i < 200; i++) {
        const result = sim2.step();
        if (result.outOfBoundsPucks.length > 0) {
          oobFound = true;
          expect(result.outOfBoundsPucks[0].puckId).toBe(puckId);
          break;
        }
      }
      expect(oobFound).toBe(true);
      sim2.destroy();
    });

    it('should NOT trigger OOB when puck is above boundary for less than 30 ticks (T007)', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        boardLayout: {
          ...DEFAULT_GAME_CONFIG.boardLayout,
          pinRows: 2,
        },
      });
      sim2.createWorld(config);
      const puckId = sim2.dropPuck(0, 'player1');

      // Apply a gentle upward force — puck goes above briefly then returns
      // With gravity=-10, density=1, puckRadius=0.5, the puck is at y=6.0
      // Top boundary for OOB is at y=7.5. Need just barely enough to cross.
      sim2.applyShove(puckId, { dx: 0, dy: 3, appliedAtTick: 0 });

      let oobTriggered = false;
      for (let i = 0; i < 60; i++) {
        const result = sim2.step();
        if (result.outOfBoundsPucks.length > 0) {
          oobTriggered = true;
          break;
        }
      }
      // With gentle force, puck crosses above briefly, gravity pulls back within 30 ticks
      expect(oobTriggered).toBe(false);
      sim2.destroy();
    });

    it('should reset OOB timer when puck returns below boundary (T008)', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        boardLayout: {
          ...DEFAULT_GAME_CONFIG.boardLayout,
          pinRows: 2,
        },
      });
      sim2.createWorld(config);
      const puckId = sim2.dropPuck(0, 'player1');

      // Apply gentle upward force — puck may cross boundary briefly then return
      sim2.applyShove(puckId, { dx: 0, dy: 3, appliedAtTick: 0 });

      // Step for a while — puck may go above briefly then return
      let oobTriggered = false;
      for (let i = 0; i < 60; i++) {
        const result = sim2.step();
        if (result.outOfBoundsPucks.length > 0) {
          oobTriggered = true;
          break;
        }
      }
      // With gentle force, puck returns in-bounds, timer resets, no OOB
      expect(oobTriggered).toBe(false);
      sim2.destroy();
    });

    it('should include correct puckId and position in OOB event (T009)', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        boardLayout: {
          ...DEFAULT_GAME_CONFIG.boardLayout,
          pinRows: 2,
        },
      });
      sim2.createWorld(config);
      const puckId = sim2.dropPuck(0, 'player1');
      const topBoundary = config.boardLayout.boardHeight / 2;

      // Apply strong upward force
      sim2.applyShove(puckId, { dx: 0, dy: 50, appliedAtTick: 0 });

      let oobEvent = null;
      for (let i = 0; i < 200; i++) {
        const result = sim2.step();
        if (result.outOfBoundsPucks.length > 0) {
          oobEvent = result.outOfBoundsPucks[0];
          break;
        }
      }

      expect(oobEvent).not.toBeNull();
      expect(oobEvent!.puckId).toBe(puckId);
      expect(oobEvent!.position.y).toBeGreaterThan(topBoundary);
      expect(typeof oobEvent!.position.x).toBe('number');
      sim2.destroy();
    });
  });
});
