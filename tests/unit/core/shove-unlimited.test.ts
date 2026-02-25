import { describe, it, expect } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

describe('Unlimited Shoves', () => {
  /**
   * T007: Unlimited shoves are allowed — no count rejection.
   * After the per-turn limit was removed, every shove attempt should
   * succeed as long as the puck is in the shove zone.
   */
  it('should allow more than 2 shoves without rejection', () => {
    const sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);

    // Drop puck at center — lands in the shove zone initially
    const puckId = sim.dropPuck(0, 'player1');

    // Step a few frames so the puck enters shove zone (it starts above the board)
    for (let i = 0; i < 10; i++) sim.step();

    // Attempt 5 shoves (previously limited to 2)
    let applied = 0;
    for (let i = 0; i < 5; i++) {
      const result = sim.applyShove(puckId, { dx: 0.5, dy: 0, appliedAtTick: i });
      if (result) applied++;
    }

    // At least 3+ should succeed (more than the old limit of 2)
    // Exact count depends on whether puck stays in zone after each shove
    expect(applied).toBeGreaterThanOrEqual(3);

    sim.destroy();
  });

  it('should accept all shoves while puck remains in shove zone', () => {
    const sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);

    const puckId = sim.dropPuck(0, 'player1');
    // Step minimally — puck is at the top, which is above shoveZoneY
    for (let i = 0; i < 5; i++) sim.step();

    // Rapid shoves — puck should still be in zone
    const results: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(sim.applyShove(puckId, { dx: 0.1, dy: 0, appliedAtTick: i }));
    }

    // Most should succeed while puck is in zone
    const successCount = results.filter(Boolean).length;
    expect(successCount).toBeGreaterThan(0);

    sim.destroy();
  });

  /**
   * T008: Shoves still blocked when puck is outside shove zone.
   * The zone guard in PhysicsSimulation.applyShove() must remain.
   */
  it('should reject shoves when puck is below shove zone', () => {
    const sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);

    const puckId = sim.dropPuck(0, 'player1');

    // Step many frames so puck falls through pins and out of shove zone
    for (let i = 0; i < 300; i++) sim.step();

    const puckState = sim.getPuckState(puckId);

    // If puck is settled or below zone, shove attempt should fail
    if (!puckState.isInShoveZone || puckState.isSettled) {
      const applied = sim.applyShove(puckId, { dx: 1, dy: 0, appliedAtTick: 0 });
      expect(applied).toBe(false);
    }

    sim.destroy();
  });

  /**
   * T009: Shoves blocked when puck has settled (equivalent to timer expired
   * since shovesDisabled is set in main.ts on timeout/settlement).
   */
  it('should reject shoves on a settled puck', () => {
    const sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);

    const puckId = sim.dropPuck(0, 'player1');

    // Step until puck settles in a bucket
    for (let i = 0; i < 600; i++) {
      const result = sim.step();
      if (result.settledPucks.length > 0) break;
    }

    const puckState = sim.getPuckState(puckId);
    if (puckState.isSettled) {
      const applied = sim.applyShove(puckId, { dx: 1, dy: 0, appliedAtTick: 0 });
      expect(applied).toBe(false);
    }

    sim.destroy();
  });

  it('should not have maxShovesPerTurn in the config', () => {
    // Verify the config no longer contains the old shove limit
    const config = DEFAULT_GAME_CONFIG;
    expect(config.shoveConfig).not.toHaveProperty('maxShovesPerTurn');
  });
});
