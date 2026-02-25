/**
 * Puck growth logic — same-player puck contacts trigger surface area growth.
 *
 * Growth formula: newRadius = min(currentRadius × √growthFactor, maxPuckRadius)
 * where growthFactor default is 1.20 (20% surface area increase).
 *
 * Chain reactions: growth can trigger new contacts → more growth, capped at maxChainDepth.
 */

import * as planck from 'planck';
import type { GrowthConfig, GrowthEvent, PhysicsConfig } from '@/types/index';
import type { PuckBody } from './board-builder';

/**
 * T031: Compute the grown radius after a single growth event.
 * Surface area grows by growthFactor (default 1.20 = 20%).
 * Since area ∝ r², newR = r × √growthFactor.
 * Clamped at maxPuckRadius.
 */
export function computeGrownRadius(
  currentRadius: number,
  config: GrowthConfig,
): number {
  const newRadius = currentRadius * Math.sqrt(config.surfaceAreaGrowthFactor);
  return Math.min(newRadius, config.maxPuckRadius);
}

/**
 * T032: Destroy old fixture and create a new CircleShape with the given radius.
 * Preserves density, restitution, and friction from physics config.
 * Wakes the body to ensure physics engine processes the change.
 */
export function resizePuckFixture(
  puck: PuckBody,
  newRadius: number,
  physicsConfig: PhysicsConfig,
): void {
  const body = puck.body;

  // Destroy all existing fixtures
  let fixture = body.getFixtureList();
  while (fixture) {
    const next = fixture.getNext();
    body.destroyFixture(fixture);
    fixture = next;
  }

  // Create new fixture with updated radius
  body.createFixture({
    shape: new planck.Circle(newRadius),
    density: physicsConfig.puckDensity,
    restitution: physicsConfig.puckRestitution,
    friction: physicsConfig.puckFriction,
  });

  // Update tracked radius
  puck.currentRadius = newRadius;

  // Wake the body so the engine detects new contacts
  body.setAwake(true);
}

/**
 * T033: Process a queue of growth events with chain-reaction support.
 *
 * For each event:
 * 1. Verify both pucks belong to the same player
 * 2. Check chain depth hasn't exceeded maxChainDepth
 * 3. Grow each puck that isn't already at the cap
 * 4. Track which pucks grew (for potential chain reactions)
 *
 * Returns the list of actually-executed growth events for visual/audio feedback.
 */
export function processGrowthQueue(
  events: GrowthEvent[],
  pucks: PuckBody[],
  config: GrowthConfig,
  physicsConfig: PhysicsConfig,
): GrowthEvent[] {
  const processed: GrowthEvent[] = [];
  const puckMap = new Map(pucks.map(p => [p.id, p]));

  for (const event of events) {
    // Skip events at or beyond the chain depth cap
    if (event.chainDepth >= config.maxChainDepth) {
      continue;
    }

    const puckA = puckMap.get(event.puckIdA);
    const puckB = puckMap.get(event.puckIdB);

    if (!puckA || !puckB) continue;

    // Verify both pucks belong to the same player
    if (puckA.playerId !== puckB.playerId) continue;

    let anyGrew = false;

    // Grow puck A if below cap
    if (puckA.currentRadius < config.maxPuckRadius) {
      const newRadiusA = computeGrownRadius(puckA.currentRadius, config);
      if (newRadiusA > puckA.currentRadius) {
        resizePuckFixture(puckA, newRadiusA, physicsConfig);
        puckA.growthCount++;
        anyGrew = true;
      }
    }

    // Grow puck B if below cap
    if (puckB.currentRadius < config.maxPuckRadius) {
      const newRadiusB = computeGrownRadius(puckB.currentRadius, config);
      if (newRadiusB > puckB.currentRadius) {
        resizePuckFixture(puckB, newRadiusB, physicsConfig);
        puckB.growthCount++;
        anyGrew = true;
      }
    }

    if (anyGrew) {
      processed.push(event);
    }
  }

  return processed;
}
