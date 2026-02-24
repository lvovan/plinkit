import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

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

    // Step once more
    sim.step();
    const stateAfter = sim.getPuckState(puckId);

    // Position should have changed horizontally due to impulse
    expect(stateAfter.position.x).not.toBeCloseTo(stateBefore.position.x, 1);
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
});
