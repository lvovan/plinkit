import type { BoardLayout, PhysicsConfig } from '@/types/index';
import type { PuckBody } from './board-builder';
import { getBucketIndexAtX, computeBucketBoundaries } from '@/config/board-geometry';

/** Ticks a puck must be below velocity threshold in the bucket zone to settle */
const BUCKET_SETTLE_TICKS = 30; // 0.5 s at 60 fps

/**
 * Detects when a puck has settled into a bucket.
 * Uses velocity threshold, awake state, and stall timeout.
 */
export class BucketDetector {
  private boardLayout: BoardLayout;
  private physicsConfig: PhysicsConfig;
  /** Tick when a puck first appeared to stall (velocity < threshold) */
  private stalledTimers: Map<string, number> = new Map();

  constructor(boardLayout: BoardLayout, physicsConfig: PhysicsConfig) {
    this.boardLayout = boardLayout;
    this.physicsConfig = physicsConfig;
  }

  /**
   * Check if a puck has settled in a bucket.
   * Returns bucket index if settled, null otherwise.
   */
  checkSettled(
    puck: PuckBody,
    currentTick: number,
    _shoveZoneY: number,
  ): number | null {
    const body = puck.body;
    const vel = body.getLinearVelocity();
    const speed = vel.length();
    const pos = body.getPosition();
    const threshold = this.physicsConfig.stalledVelocityThreshold;

    // If the physics engine has put the body to sleep it is definitely settled
    if (!body.isAwake()) {
      return this.assignBucket(pos.x);
    }

    // Below the pin field we use a short timer (0.5 s) so pucks that are
    // essentially resting in a bucket are recognised quickly.
    const boardBottom = -this.boardLayout.boardHeight / 2;
    const bucketRegionTop = boardBottom + 3.5; // generous margin above dividers

    if (pos.y <= bucketRegionTop && speed < threshold) {
      if (!this.stalledTimers.has(puck.id)) {
        this.stalledTimers.set(puck.id, currentTick);
      }
      const elapsed = currentTick - this.stalledTimers.get(puck.id)!;
      if (elapsed >= BUCKET_SETTLE_TICKS) {
        return this.assignBucket(pos.x);
      }
      return null;
    }

    // Fallback: anywhere on the board, use the full stall timeout
    if (speed < threshold) {
      if (!this.stalledTimers.has(puck.id)) {
        this.stalledTimers.set(puck.id, currentTick);
      }
      const startTick = this.stalledTimers.get(puck.id)!;
      const elapsedMs = (currentTick - startTick) * (this.physicsConfig.fixedTimestep * 1000);
      if (elapsedMs >= this.physicsConfig.stalledTimeoutMs) {
        return this.assignBucket(pos.x);
      }
    } else {
      this.stalledTimers.delete(puck.id);
    }

    return null;
  }

  private assignBucket(x: number): number {
    const idx = getBucketIndexAtX(this.boardLayout, x);
    // Clamp to valid range
    return Math.max(0, Math.min(this.boardLayout.bucketCount - 1, idx));
  }

  reset(): void {
    this.stalledTimers.clear();
  }

  /**
   * Validates that bucket boundaries configuration is valid.
   * Returns true if configuration is correct.
   */
  static validateConfig(layout: BoardLayout): boolean {
    if (layout.bucketCount < 2) return false;
    if (layout.bucketScores.length !== layout.bucketCount) return false;

    const boundaries = computeBucketBoundaries(layout);
    if (boundaries.length !== layout.bucketCount - 1) return false;

    return true;
  }
}
