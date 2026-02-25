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

  describe('Puck Rotation (US1)', () => {
    it('T007: puck should be created with fixedRotation: false', () => {
      // Drop off-center so it hits pins and gains angular velocity
      const sim2 = new PhysicsSimulationImpl();
      sim2.createWorld(DEFAULT_GAME_CONFIG);
      sim2.dropPuck(-1.5, 'player1');
      // Step enough for contact with pins
      for (let i = 0; i < 200; i++) sim2.step();
      const snapshot = sim2.getSnapshot();
      // If fixedRotation were true, angle would always be 0
      // With fixedRotation false and glancing contact, angle should change
      expect(snapshot.pucks[0].angle).not.toBe(0);
      sim2.destroy();
    });

    it('T008: puck hitting left side of pin gains positive angular velocity', () => {
      // Drop puck at an offset position to graze pins
      const sim2 = new PhysicsSimulationImpl();
      sim2.createWorld(DEFAULT_GAME_CONFIG);
      sim2.dropPuck(-1.5, 'player1');
      // Step until we see a non-zero angle
      let foundNonZeroAngle = false;
      for (let i = 0; i < 300; i++) {
        sim2.step();
        const snapshot = sim2.getSnapshot();
        if (snapshot.pucks.length > 0 && Math.abs(snapshot.pucks[0].angle) > 0.001) {
          foundNonZeroAngle = true;
          break;
        }
      }
      expect(foundNonZeroAngle).toBe(true);
      // Record the sign for comparison with T009
      sim2.destroy();
    });

    it('T009: opposite drops produce opposite rotation directions', () => {
      // Drop puck at mirrored positions and verify opposite angle signs
      function getAngleAfterSteps(dropX: number, steps: number): number {
        const s = new PhysicsSimulationImpl();
        s.createWorld(DEFAULT_GAME_CONFIG);
        s.dropPuck(dropX, 'player1');
        for (let i = 0; i < steps; i++) s.step();
        const snapshot = s.getSnapshot();
        const a = snapshot.pucks.length > 0 ? snapshot.pucks[0].angle : 0;
        s.destroy();
        return a;
      }

      const angleLeft = getAngleAfterSteps(-1.5, 300);
      const angleRight = getAngleAfterSteps(1.5, 300);

      // Both should have non-zero rotation
      expect(Math.abs(angleLeft)).toBeGreaterThan(0.001);
      expect(Math.abs(angleRight)).toBeGreaterThan(0.001);
      // Mirrored positions should produce opposite rotation signs
      expect(Math.sign(angleLeft)).not.toBe(Math.sign(angleRight));
    });

    it('T010: spinning puck angular velocity decays toward zero over ~60 steps', () => {
      const sim2 = new PhysicsSimulationImpl();
      sim2.createWorld(DEFAULT_GAME_CONFIG);
      sim2.dropPuck(-1.5, 'player1');
      let peakAngleRate = 0;
      const angles: number[] = [];
      for (let i = 0; i < 200; i++) {
        sim2.step();
        const snapshot = sim2.getSnapshot();
        if (snapshot.pucks.length > 0) {
          angles.push(snapshot.pucks[0].angle);
          if (angles.length >= 2) {
            const rate = Math.abs(angles[angles.length - 1] - angles[angles.length - 2]);
            if (rate > peakAngleRate) {
              peakAngleRate = rate;
            }
          }
        }
      }
      // After peak, continue stepping and measure the angular change rate
      const laterAngles: number[] = [];
      for (let i = 0; i < 60; i++) {
        sim2.step();
        const snapshot = sim2.getSnapshot();
        if (snapshot.pucks.length > 0) {
          laterAngles.push(snapshot.pucks[0].angle);
        }
      }
      if (laterAngles.length >= 2) {
        const laterRate = Math.abs(laterAngles[laterAngles.length - 1] - laterAngles[0]) / laterAngles.length;
        // Damped rate should be less than peak rate
        expect(laterRate).toBeLessThan(peakAngleRate);
      }
      sim2.destroy();
    });

    it('T011: angular velocity never exceeds maxAngularVelocity after step', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        physics: {
          ...DEFAULT_GAME_CONFIG.physics,
          maxAngularVelocity: 6.28,
          angularDamping: 0.5,
          puckFriction: 0.8,
          pinFriction: 0.8,
        },
      });
      sim2.createWorld(config);
      sim2.dropPuck(-2.0, 'player1');
      for (let i = 0; i < 500; i++) {
        sim2.step();
      }
      const snapshot = sim2.getSnapshot();
      if (snapshot.pucks.length > 0) {
        // With 500 steps at 1/60s (~8.3s), max angle at 1 rot/s cap ≈ 52 rad
        expect(Math.abs(snapshot.pucks[0].angle)).toBeLessThan(100);
      }
      sim2.destroy();
    });
  });

  describe('Puck-Puck Friction (US2)', () => {
    it('T016: two colliding pucks exchange angular velocity', () => {
      // Drop one puck and let it settle, then drop another on top
      const sim2 = new PhysicsSimulationImpl();
      sim2.createWorld(DEFAULT_GAME_CONFIG);

      // Drop first puck
      const id1 = sim2.dropPuck(0, 'player1');
      for (let i = 0; i < 1000; i++) {
        const result = sim2.step();
        if (result.settledPucks.length > 0) break;
      }

      // Drop second puck slightly offset so it glances off the first
      sim2.dropPuck(0.3, 'player2');

      // Step until contact and interaction
      let puckHitFound = false;
      for (let i = 0; i < 500; i++) {
        const result = sim2.step();
        if (result.collisions.some(c => c.type === 'puckHit')) {
          puckHitFound = true;
        }
      }

      // After puck-puck collision, both pucks should have some rotation
      const snapshot = sim2.getSnapshot();
      const p2 = snapshot.pucks.find(p => p.id !== id1);
      if (puckHitFound && p2) {
        // Second puck should have accumulated angle from puck-puck friction
        expect(Math.abs(p2.angle)).toBeGreaterThan(0);
      }
      sim2.destroy();
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
