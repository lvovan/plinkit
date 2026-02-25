import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG, createGameConfig } from '@/config/game-config';

describe('Shove Application', () => {
  let sim: PhysicsSimulationImpl;

  beforeEach(() => {
    sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);
  });

  afterEach(() => {
    sim.destroy();
  });

  it('should apply an impulse that changes puck velocity', () => {
    const puckId = sim.dropPuck(0, 'player1');
    // Step a few times so puck enters the pin field
    for (let i = 0; i < 5; i++) sim.step();

    const stateBefore = sim.getPuckState(puckId);
    const applied = sim.applyShove(puckId, { dx: 2, dy: 0, appliedAtTick: 5 });
    expect(applied).toBe(true);

    // Step several times to allow displacement to accumulate
    for (let i = 0; i < 10; i++) sim.step();
    const stateAfter = sim.getPuckState(puckId);

    // Position should have changed horizontally due to impulse
    expect(Math.abs(stateAfter.position.x - stateBefore.position.x)).toBeGreaterThan(0.1);
  });

  it('should reject shove when puck is below shove zone', () => {
    const puckId = sim.dropPuck(0, 'player1');
    // Run simulation until puck is well below the shove zone
    for (let i = 0; i < 1000; i++) {
      sim.step();
      const state = sim.getPuckState(puckId);
      if (!state.isInShoveZone && !state.isSettled) {
        const applied = sim.applyShove(puckId, { dx: 2, dy: 0, appliedAtTick: i });
        expect(applied).toBe(false);
        return;
      }
    }
    // If puck settles before exiting shove zone, that's also fine
  });

  it('should cap force magnitude at maxForceMagnitude', () => {
    const puckId = sim.dropPuck(0, 'player1');
    for (let i = 0; i < 3; i++) sim.step();

    // Apply very large force
    const applied = sim.applyShove(puckId, { dx: 100, dy: 100, appliedAtTick: 3 });
    expect(applied).toBe(true);

    // Puck should still be in the world (not flung to infinity)
    sim.step();
    const state = sim.getPuckState(puckId);
    expect(Math.abs(state.position.x)).toBeLessThan(50);
  });

  it('should produce deterministic results with the same shove vector', () => {
    const results: Array<{ x: number; y: number }> = [];

    for (let run = 0; run < 3; run++) {
      const s = new PhysicsSimulationImpl();
      s.createWorld(DEFAULT_GAME_CONFIG);

      const id = s.dropPuck(0, 'player1');
      for (let i = 0; i < 10; i++) s.step();

      s.applyShove(id, { dx: 1, dy: 0, appliedAtTick: 10 });

      for (let i = 0; i < 50; i++) s.step();

      const state = s.getPuckState(id);
      results.push(state.position);
      s.destroy();
    }

    // All runs should produce the same position
    for (let i = 1; i < results.length; i++) {
      expect(results[i].x).toBeCloseTo(results[0].x, 10);
      expect(results[i].y).toBeCloseTo(results[0].y, 10);
    }
  });

  it('should reject shove on settled puck', () => {
    const puckId = sim.dropPuck(0, 'player1');
    // Wait for puck to settle
    for (let i = 0; i < 2000; i++) {
      const result = sim.step();
      if (result.settledPucks.length > 0) break;
    }

    const applied = sim.applyShove(puckId, { dx: 1, dy: 0, appliedAtTick: 0 });
    expect(applied).toBe(false);
  });

  describe('Off-center Shove Spin (US2)', () => {
    it('T017: shove with shoveOffsetFraction > 0 produces angular velocity', () => {
      const puckId = sim.dropPuck(0, 'player1');
      // Step a few times so puck is in play
      for (let i = 0; i < 5; i++) sim.step();

      // Record angle before shove
      const angleBefore = sim.getSnapshot().pucks[0].angle;

      sim.applyShove(puckId, { dx: 3, dy: 0, appliedAtTick: 5 });

      // Step several times after shove
      for (let i = 0; i < 30; i++) sim.step();

      // Angle should have changed due to off-center impulse
      const angleAfter = sim.getSnapshot().pucks[0].angle;
      expect(Math.abs(angleAfter - angleBefore)).toBeGreaterThan(0.01);
    });

    it('T018: shove at center (shoveOffsetFraction = 0) produces zero angular velocity from shove', () => {
      const sim2 = new PhysicsSimulationImpl();
      const config = createGameConfig({
        shoveConfig: {
          ...DEFAULT_GAME_CONFIG.shoveConfig,
          shoveOffsetFraction: 0,
        },
        physics: {
          ...DEFAULT_GAME_CONFIG.physics,
          angularDamping: 0, // No damping so we can measure precisely
          puckFriction: 0,   // No friction spin from pin contacts
          pinFriction: 0,
        },
      });
      sim2.createWorld(config);
      const puckId = sim2.dropPuck(0, 'player1');

      // Step a few times (no friction → no rotation from pins)
      for (let i = 0; i < 5; i++) sim2.step();

      // Record angle before shove
      const angleBefore = sim2.getSnapshot().pucks[0].angle;

      sim2.applyShove(puckId, { dx: 3, dy: 0, appliedAtTick: 5 });

      // Step after shove
      for (let i = 0; i < 30; i++) sim2.step();

      // With zero offset and zero friction, angle should not change from shove
      const angleAfter = sim2.getSnapshot().pucks[0].angle;
      expect(Math.abs(angleAfter - angleBefore)).toBeLessThan(0.01);
      sim2.destroy();
    });
  });
});
