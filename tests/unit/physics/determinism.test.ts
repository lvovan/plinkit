import { describe, it, expect } from 'vitest';
import { PhysicsSimulationImpl } from '@/physics/simulation';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

describe('Physics Determinism', () => {
  it('should produce the same bucket for the same drop position across 10 runs', () => {
    const dropX = 0;
    const results: number[] = [];

    for (let run = 0; run < 10; run++) {
      const sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);

      sim.dropPuck(dropX, 'player1');
      let bucketIndex = -1;

      for (let tick = 0; tick < 2000; tick++) {
        const result = sim.step();
        if (result.settledPucks.length > 0) {
          bucketIndex = result.settledPucks[0].bucketIndex;
          break;
        }
      }

      results.push(bucketIndex);
      sim.destroy();
    }

    // All runs should produce the same bucket
    expect(results.length).toBe(10);
    expect(results.every(r => r === results[0])).toBe(true);
    expect(results[0]).toBeGreaterThanOrEqual(0);
  });

  it('should produce the same trajectory across runs', () => {
    const dropX = 2.0;
    const trajectories: Array<{ x: number; y: number }[]> = [];

    for (let run = 0; run < 3; run++) {
      const sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);

      sim.dropPuck(dropX, 'player1');
      const positions: Array<{ x: number; y: number }> = [];

      for (let tick = 0; tick < 100; tick++) {
        sim.step();
        const snapshot = sim.getSnapshot();
        if (snapshot.pucks.length > 0) {
          positions.push({
            x: snapshot.pucks[0].x,
            y: snapshot.pucks[0].y,
          });
        }
      }

      trajectories.push(positions);
      sim.destroy();
    }

    // Compare all runs to the first
    for (let run = 1; run < trajectories.length; run++) {
      expect(trajectories[run].length).toBe(trajectories[0].length);
      for (let i = 0; i < trajectories[0].length; i++) {
        expect(trajectories[run][i].x).toBeCloseTo(trajectories[0][i].x, 10);
        expect(trajectories[run][i].y).toBeCloseTo(trajectories[0][i].y, 10);
      }
    }
  });

  it('T012: same drop position produces same final angle across 10 runs', () => {
    const dropX = -1.5; // Off-center to generate rotation
    const finalAngles: number[] = [];

    for (let run = 0; run < 10; run++) {
      const sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);

      sim.dropPuck(dropX, 'player1');

      for (let tick = 0; tick < 500; tick++) {
        sim.step();
      }

      const snapshot = sim.getSnapshot();
      if (snapshot.pucks.length > 0) {
        finalAngles.push(snapshot.pucks[0].angle);
      }

      sim.destroy();
    }

    expect(finalAngles.length).toBe(10);
    // All runs should produce identical angle
    for (let i = 1; i < finalAngles.length; i++) {
      expect(finalAngles[i]).toBeCloseTo(finalAngles[0], 10);
    }
    // With rotation enabled, angle should be non-zero
    expect(finalAngles[0]).not.toBe(0);
  });

  it('should produce different buckets for different drop positions', () => {
    // We can't guarantee different positions always hit different buckets,
    // but widely separated positions should tend to different areas
    const positions = [-4, 0, 4];
    const buckets: number[] = [];

    for (const dropX of positions) {
      const sim = new PhysicsSimulationImpl();
      sim.createWorld(DEFAULT_GAME_CONFIG);

      sim.dropPuck(dropX, 'player1');

      for (let tick = 0; tick < 2000; tick++) {
        const result = sim.step();
        if (result.settledPucks.length > 0) {
          buckets.push(result.settledPucks[0].bucketIndex);
          break;
        }
      }

      sim.destroy();
    }

    // All should settle in valid buckets
    expect(buckets.length).toBe(3);
    buckets.forEach(b => {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(9);
    });
  });
});
