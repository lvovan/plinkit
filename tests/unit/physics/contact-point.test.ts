import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

describe('Contact point extraction', () => {
  let sim: PhysicsSimulationImpl;

  beforeEach(() => {
    sim = new PhysicsSimulationImpl();
    sim.createWorld(DEFAULT_GAME_CONFIG);
  });

  afterEach(() => {
    sim.destroy();
  });

  it('should populate contactX/contactY from WorldManifold on collision', () => {
    // Drop a puck and run until a collision with a pin occurs
    sim.dropPuck(0, 'player1');

    let contactEvent: { contactX: number; contactY: number; x: number; y: number } | null = null;
    for (let i = 0; i < 600; i++) {
      const result = sim.step();
      const pinHit = result.collisions.find(c => c.type === 'pinHit');
      if (pinHit) {
        contactEvent = pinHit;
        break;
      }
    }

    expect(contactEvent).not.toBeNull();
    if (contactEvent) {
      // contactX/contactY should be finite numbers
      expect(Number.isFinite(contactEvent.contactX)).toBe(true);
      expect(Number.isFinite(contactEvent.contactY)).toBe(true);

      // Contact point should differ from puck centre for circle-circle collision
      // (contact is on the surface, puck centre is inside)
      const distFromCentre = Math.sqrt(
        (contactEvent.contactX - contactEvent.x) ** 2 +
        (contactEvent.contactY - contactEvent.y) ** 2,
      );
      expect(distFromCentre).toBeGreaterThan(0);
    }
  });
});
