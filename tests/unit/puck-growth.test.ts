import { describe, it, expect, beforeEach } from 'vitest';
import { computeGrownRadius, resizePuckFixture, processGrowthQueue } from '@/physics/puck-growth';
import { DEFAULT_GAME_CONFIG, DEFAULT_GROWTH_CONFIG } from '@/config/game-config';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import type { GrowthEvent } from '@/types/index';

const growthConfig = DEFAULT_GROWTH_CONFIG;

describe('Puck Growth Logic', () => {
  // T023: computeGrownRadius returns currentRadius × √1.2 for 20% area increase
  describe('computeGrownRadius()', () => {
    it('should return currentRadius × √1.2 for 20% surface area increase', () => {
      const currentRadius = 0.5;
      const result = computeGrownRadius(currentRadius, growthConfig);
      const expected = currentRadius * Math.sqrt(growthConfig.surfaceAreaGrowthFactor);
      expect(result).toBeCloseTo(expected, 6);
    });

    // T024: Clamps at maxPuckRadius (0.631)
    it('should clamp at maxPuckRadius when growth would exceed cap', () => {
      const currentRadius = 0.6; // close to cap
      const result = computeGrownRadius(currentRadius, growthConfig);
      expect(result).toBe(growthConfig.maxPuckRadius);
    });

    // T025: Returns maxPuckRadius when already at cap
    it('should return maxPuckRadius when already at cap', () => {
      const result = computeGrownRadius(growthConfig.maxPuckRadius, growthConfig);
      expect(result).toBe(growthConfig.maxPuckRadius);
    });

    it('should handle growth from base radius correctly', () => {
      const baseRadius = DEFAULT_GAME_CONFIG.boardLayout.puckRadius; // 0.5
      const grown = computeGrownRadius(baseRadius, growthConfig);
      // √1.2 ≈ 1.0954, so 0.5 × 1.0954 ≈ 0.5477
      expect(grown).toBeCloseTo(0.5 * Math.sqrt(1.2), 4);
      expect(grown).toBeLessThanOrEqual(growthConfig.maxPuckRadius);
    });
  });

  // T029: resizePuckFixture destroys old fixture and creates new one with correct radius
  describe('resizePuckFixture()', () => {
    let sim: PhysicsSimulationImpl;

    beforeEach(() => {
      sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);
    });

    it('should destroy old fixture and create new fixture with correct radius', () => {
      sim.dropPuck(0, 'player1');
      const board = sim.getBoard()!;
      const puck = board.pucks[0];

      const oldRadius = puck.currentRadius;
      const newRadius = computeGrownRadius(oldRadius, growthConfig);

      resizePuckFixture(puck, newRadius, DEFAULT_GAME_CONFIG.physics);

      expect(puck.currentRadius).toBe(newRadius);
      // Verify the body's fixture has the new radius
      const fixture = puck.body.getFixtureList();
      expect(fixture).not.toBeNull();
      const shape = fixture!.getShape() as { m_radius: number };
      expect(shape.m_radius).toBeCloseTo(newRadius, 4);
    });

    it('should wake the body after resizing', () => {
      sim.dropPuck(0, 'player1');
      const board = sim.getBoard()!;
      const puck = board.pucks[0];

      // Put body to sleep first
      puck.body.setAwake(false);
      expect(puck.body.isAwake()).toBe(false);

      const newRadius = computeGrownRadius(puck.currentRadius, growthConfig);
      resizePuckFixture(puck, newRadius, DEFAULT_GAME_CONFIG.physics);

      expect(puck.body.isAwake()).toBe(true);
    });
  });

  // processGrowthQueue tests
  describe('processGrowthQueue()', () => {
    let sim: PhysicsSimulationImpl;

    beforeEach(() => {
      sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);
    });

    // T026: Does not trigger growth for cross-player puck contacts
    it('should not grow pucks for cross-player contacts', () => {
      sim.dropPuck(-1, 'player1');
      sim.dropPuck(1, 'player2');
      const board = sim.getBoard()!;
      const puckA = board.pucks[0];
      const puckB = board.pucks[1];
      const oldRadiusA = puckA.currentRadius;
      const oldRadiusB = puckB.currentRadius;

      // Create a cross-player growth event (different players)
      const events: GrowthEvent[] = [{
        puckIdA: puckA.id,
        puckIdB: puckB.id,
        playerId: 'player1', // mismatch — puckB belongs to player2
        chainDepth: 0,
      }];

      const result = processGrowthQueue(events, board.pucks, growthConfig, DEFAULT_GAME_CONFIG.physics);

      // No growth should occur
      expect(puckA.currentRadius).toBe(oldRadiusA);
      expect(puckB.currentRadius).toBe(oldRadiusB);
      expect(result.length).toBe(0);
    });

    // T027: Caps chain depth at maxChainDepth (10)
    it('should cap chain depth at maxChainDepth', () => {
      sim.dropPuck(-1, 'player1');
      sim.dropPuck(1, 'player1');
      const board = sim.getBoard()!;

      // Create an event at the depth cap
      const events: GrowthEvent[] = [{
        puckIdA: board.pucks[0].id,
        puckIdB: board.pucks[1].id,
        playerId: 'player1',
        chainDepth: growthConfig.maxChainDepth, // at cap, should NOT process
      }];

      const result = processGrowthQueue(events, board.pucks, growthConfig, DEFAULT_GAME_CONFIG.physics);
      expect(result.length).toBe(0);
    });

    // T028: Grows both pucks in a same-player contact pair
    it('should grow both pucks in a same-player contact pair', () => {
      sim.dropPuck(-1, 'player1');
      sim.dropPuck(1, 'player1');
      const board = sim.getBoard()!;
      const puckA = board.pucks[0];
      const puckB = board.pucks[1];
      const oldRadiusA = puckA.currentRadius;
      const oldRadiusB = puckB.currentRadius;

      const events: GrowthEvent[] = [{
        puckIdA: puckA.id,
        puckIdB: puckB.id,
        playerId: 'player1',
        chainDepth: 0,
      }];

      const result = processGrowthQueue(events, board.pucks, growthConfig, DEFAULT_GAME_CONFIG.physics);

      // Both pucks should have grown
      const expectedRadiusA = computeGrownRadius(oldRadiusA, growthConfig);
      const expectedRadiusB = computeGrownRadius(oldRadiusB, growthConfig);
      expect(puckA.currentRadius).toBeCloseTo(expectedRadiusA, 4);
      expect(puckB.currentRadius).toBeCloseTo(expectedRadiusB, 4);
      expect(puckA.growthCount).toBe(1);
      expect(puckB.growthCount).toBe(1);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    // T030: One puck at cap and one below — only below-cap puck grows
    it('should only grow the below-cap puck when one is already at max', () => {
      sim.dropPuck(-1, 'player1');
      sim.dropPuck(1, 'player1');
      const board = sim.getBoard()!;
      const puckA = board.pucks[0];
      const puckB = board.pucks[1];

      // Set puckA to max radius
      puckA.currentRadius = growthConfig.maxPuckRadius;
      const oldRadiusB = puckB.currentRadius;

      const events: GrowthEvent[] = [{
        puckIdA: puckA.id,
        puckIdB: puckB.id,
        playerId: 'player1',
        chainDepth: 0,
      }];

      const result = processGrowthQueue(events, board.pucks, growthConfig, DEFAULT_GAME_CONFIG.physics);

      // puckA stays at cap
      expect(puckA.currentRadius).toBe(growthConfig.maxPuckRadius);
      // puckB grows
      expect(puckB.currentRadius).toBeCloseTo(computeGrownRadius(oldRadiusB, growthConfig), 4);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});
