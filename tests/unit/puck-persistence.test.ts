import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { createGameConfig } from '@/config/game-config';
import type { GameConfig } from '@/types/index';
import type { PuckBody } from '@/physics/board-builder';

describe('Puck Persistence (US1)', () => {
  let sim: PhysicsSimulationImpl;
  let config: GameConfig;

  beforeEach(() => {
    config = createGameConfig();
    sim = new PhysicsSimulationImpl();
    sim.createWorld(config);
  });

  // T014: pucks are NOT cleared during round transition
  it('should NOT clear pucks when rebuildBoard is called (round transition)', () => {
    sim.dropPuck(-1, 'player1');
    sim.dropPuck(0, 'player2');
    sim.dropPuck(1, 'player1');

    expect(sim.getAllPucks()).toHaveLength(3);

    // Simulate round transition: rebuildBoard instead of clearPucks
    sim.rebuildBoard(config);

    expect(sim.getAllPucks()).toHaveLength(3);
    const snapshot = sim.getSnapshot();
    expect(snapshot.pucks).toHaveLength(3);
  });

  // T015: pucks ARE cleared on tie-breaker start
  it('should clear pucks when clearPucks is called (tie-breaker)', () => {
    sim.dropPuck(0, 'player1');
    sim.dropPuck(1, 'player2');

    expect(sim.getAllPucks()).toHaveLength(2);

    // Tie-breaker path calls clearPucks
    sim.clearPucks();

    expect(sim.getAllPucks()).toHaveLength(0);
    const snapshot = sim.getSnapshot();
    expect(snapshot.pucks).toHaveLength(0);
  });

  // T016: pucks ARE cleared on play-again and new-players
  it('should clear pucks when clearPucks is called (play-again / new-players)', () => {
    sim.dropPuck(-1, 'player1');
    sim.dropPuck(0, 'player2');

    // Play-again / new-players both call clearPucks + createWorld
    sim.clearPucks();
    sim.createWorld(config);

    expect(sim.getAllPucks()).toHaveLength(0);
  });

  // T017: puckStyleMap entries persist across round transitions
  // This is tested at the orchestration level. We verify puck IDs are stable
  // so the style map lookups remain valid.
  it('should preserve puck IDs across rebuildBoard for stable style map lookups', () => {
    const id1 = sim.dropPuck(-1, 'player1');
    const id2 = sim.dropPuck(1, 'player2');

    const styleMap = new Map<string, string>();
    styleMap.set(id1, 'red');
    styleMap.set(id2, 'blue');

    sim.rebuildBoard(config);

    const pucks = sim.getAllPucks();
    expect(pucks[0].id).toBe(id1);
    expect(pucks[1].id).toBe(id2);
    // Style map lookups still work
    expect(styleMap.get(pucks[0].id)).toBe('red');
    expect(styleMap.get(pucks[1].id)).toBe('blue');
  });

  // T018 is an integration test — will be in tests/integration/round-transition.test.ts
});
