import type { BoardLayout, PhysicsConfig, AutoShoveConfig, AutoShoveEvent, ScoreRevocationEvent } from '@/types/index';
import type { PuckBody } from './board-builder';
import { getBucketIndexAtX, computeBucketBoundaries } from '@/config/board-geometry';

/** Ticks a puck must be below velocity threshold in the bucket zone to settle */
const BUCKET_SETTLE_TICKS = 30; // 0.5 s at 60 fps

/** Auto-shove direction offsets: alternating left, right, straight down */
const DIRECTION_OFFSETS = [-0.4, 0.4, 0.0];

/** Compute auto-shove direction unit vector for a given attempt index */
function autoShoveDirection(attempt: number): { x: number; y: number } {
  const hx = DIRECTION_OFFSETS[attempt % 3];
  const hy = -1.0;
  const mag = Math.sqrt(hx * hx + hy * hy);
  return { x: hx / mag, y: hy / mag };
}

/** Result from checkSettled: either settled in bucket, auto-shove needed, or nothing */
export type SettleResult =
  | { type: 'settled'; bucketIndex: number }
  | { type: 'autoShove'; event: AutoShoveEvent }
  | null;

/**
 * Detects when a puck has settled into a bucket.
 * Uses velocity threshold, awake state, and stall timeout.
 * Also detects stuck pucks above the bucket zone for auto-shove.
 */
export class BucketDetector {
  private boardLayout: BoardLayout;
  private physicsConfig: PhysicsConfig;
  private autoShoveConfig: AutoShoveConfig | null;
  /** Tick when a puck first appeared to stall (velocity < threshold) */
  private stalledTimers: Map<string, number> = new Map();
  /** Per-puck auto-shove stall tick counter */
  private autoShoveStallStart: Map<string, number> = new Map();
  /** Per-puck auto-shove attempt counter */
  private autoShoveAttempts: Map<string, number> = new Map();

  constructor(boardLayout: BoardLayout, physicsConfig: PhysicsConfig, autoShoveConfig?: AutoShoveConfig) {
    this.boardLayout = boardLayout;
    this.physicsConfig = physicsConfig;
    this.autoShoveConfig = autoShoveConfig ?? null;
  }

  /**
   * Check if a puck has settled in a bucket or needs an auto-shove.
   * Returns SettleResult: settled bucket, auto-shove event, or null.
   */
  checkSettled(
    puck: PuckBody,
    currentTick: number,
    _shoveZoneY: number,
  ): SettleResult {
    const body = puck.body;
    const vel = body.getLinearVelocity();
    const speed = vel.length();
    const pos = body.getPosition();
    const threshold = this.physicsConfig.stalledVelocityThreshold;

    // If the physics engine has put the body to sleep it is definitely settled
    if (!body.isAwake()) {
      return { type: 'settled', bucketIndex: this.assignBucket(pos.x) };
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
        return { type: 'settled', bucketIndex: this.assignBucket(pos.x) };
      }
      return null;
    }

    // Auto-shove detection: puck above bucket zone with low velocity
    const autoShoveThreshold = this.physicsConfig.autoShoveVelocityThreshold;
    if (this.autoShoveConfig && pos.y > bucketRegionTop && speed < autoShoveThreshold) {
      if (!this.autoShoveStallStart.has(puck.id)) {
        this.autoShoveStallStart.set(puck.id, currentTick);
      }
      const stallTicks = currentTick - this.autoShoveStallStart.get(puck.id)!;
      if (stallTicks >= this.autoShoveConfig.stallTicks) {
        const attempts = this.autoShoveAttempts.get(puck.id) ?? 0;
        if (attempts >= this.autoShoveConfig.maxAttempts) {
          // All attempts exhausted — fallback to nearest bucket
          return { type: 'settled', bucketIndex: this.assignBucket(pos.x) };
        }
        // Emit auto-shove event
        this.autoShoveAttempts.set(puck.id, attempts + 1);
        this.autoShoveStallStart.delete(puck.id); // reset stall timer for next attempt
        return {
          type: 'autoShove',
          event: {
            puckId: puck.id,
            attemptIndex: attempts,
            direction: autoShoveDirection(attempts),
          },
        };
      }
      return null;
    } else if (speed >= autoShoveThreshold) {
      // Puck is moving above threshold — clear auto-shove stall timer
      this.autoShoveStallStart.delete(puck.id);
    }

    // Fallback: anywhere on the board, use the full stall timeout
    if (speed < threshold) {
      if (!this.stalledTimers.has(puck.id)) {
        this.stalledTimers.set(puck.id, currentTick);
      }
      const startTick = this.stalledTimers.get(puck.id)!;
      const elapsedMs = (currentTick - startTick) * (this.physicsConfig.fixedTimestep * 1000);
      if (elapsedMs >= this.physicsConfig.stalledTimeoutMs) {
        return { type: 'settled', bucketIndex: this.assignBucket(pos.x) };
      }
    } else {
      this.stalledTimers.delete(puck.id);
    }

    return null;
  }

  /**
   * Get the auto-shove stall progress for a puck (0.0–1.0).
   * Used by renderer for warning visual.
   */
  getAutoShoveProgress(puckId: string, currentTick: number): number {
    if (!this.autoShoveConfig) return 0;
    const startTick = this.autoShoveStallStart.get(puckId);
    if (startTick === undefined) return 0;
    const elapsed = currentTick - startTick;
    return Math.min(1.0, elapsed / this.autoShoveConfig.stallTicks);
  }

  /**
   * T049: Check if any settled pucks have been displaced out of their bucket.
   * A settled puck is "displaced" when:
   * 1. It was marked as settled (isSettled=true, settledInBucket >= 0)
   * 2. It has been woken up (body.isAwake())
   * 3. Its current position is in a different bucket or above the bucket zone
   *
   * Returns score revocation events for displaced pucks.
   */
  checkDisplacement(pucks: PuckBody[]): ScoreRevocationEvent[] {
    const revocations: ScoreRevocationEvent[] = [];
    const boardBottom = -this.boardLayout.boardHeight / 2;
    const bucketRegionTop = boardBottom + 3.5;

    for (const puck of pucks) {
      // Only check pucks that were settled in a valid bucket and have a score
      if (!puck.isSettled || puck.settledInBucket === null || puck.settledInBucket < 0) continue;
      if (puck.scoreAwarded <= 0) continue;

      const pos = puck.body.getPosition();
      const vel = puck.body.getLinearVelocity();
      const speed = vel.length();

      // Check if the puck has been moved out of its bucket:
      // Either it's awake with significant velocity, or it's in a different position
      if (puck.body.isAwake() && speed > this.physicsConfig.stalledVelocityThreshold * 5) {
        // Check if it has left its original bucket
        const currentBucket = this.assignBucket(pos.x);

        // If above bucket zone or in a different bucket, it's displaced
        if (pos.y > bucketRegionTop || currentBucket !== puck.settledInBucket) {
          revocations.push({
            puckId: puck.id,
            playerId: puck.playerId,
            revokedScore: puck.scoreAwarded,
            fromBucket: puck.settledInBucket,
            x: pos.x,
            y: pos.y,
          });

          // Reset settlement state
          puck.isSettled = false;
          puck.settledInBucket = null;
          puck.lastScoredBucket = null;
          puck.scoreAwarded = 0;

          // Clear stall timers for this puck so it can re-settle
          this.stalledTimers.delete(puck.id);
          this.autoShoveStallStart.delete(puck.id);
          this.autoShoveAttempts.delete(puck.id);
        }
      }
    }

    return revocations;
  }

  private assignBucket(x: number): number {
    const idx = getBucketIndexAtX(this.boardLayout, x);
    // Clamp to valid range
    return Math.max(0, Math.min(this.boardLayout.bucketCount - 1, idx));
  }

  reset(): void {
    this.stalledTimers.clear();
    this.autoShoveStallStart.clear();
    this.autoShoveAttempts.clear();
  }

  /**
   * Validates that bucket boundaries configuration is valid.
   * Returns true if configuration is correct.
   */
  static validateConfig(layout: BoardLayout): boolean {
    if (layout.bucketCount < 2) return false;
    if (layout.bucketScores.length !== layout.bucketCount) return false;

    const boundaries = computeBucketBoundaries(layout);
    if (boundaries.length !== layout.bucketCount) return false;

    return true;
  }
}
