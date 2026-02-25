import * as planck from 'planck';
import type { GameConfig } from '@/types/index';
import {
  computePinPositions,
  computeBucketBoundaries,
  computeShoveZoneY,
  getBoardWalls,
  BUCKET_DIVIDER_HEIGHT,
} from '@/config/board-geometry';

/** Runtime board object holding all Planck.js bodies */
export interface Board {
  world: planck.World;
  pins: planck.Body[];
  walls: planck.Body[];
  bucketWalls: planck.Body[];
  pucks: PuckBody[];
  shoveZoneY: number;
}

export interface PuckBody {
  id: string;
  body: planck.Body;
  playerId: string;
  turnIndex: number;
  isSettled: boolean;
  settledInBucket: number | null;
  createdAtTick: number;
  /** Current collision radius (starts at puckRadius, grows up to maxPuckRadius) */
  currentRadius: number;
  /** Number of growth events applied */
  growthCount: number;
  /** Which bucket score was last awarded (for revocation tracking) */
  lastScoredBucket: number | null;
  /** Score currently attributed to this puck (0 if not in bucket or revoked) */
  scoreAwarded: number;
  /** Bounce multiplier at settlement. Default 1.0. Preserved across rounds for score recalculation. */
  bounceMultiplier: number;
}

/**
 * Builds the Planck.js physics world from game configuration.
 * Creates pin bodies, walls, and bucket dividers.
 */
export class BoardBuilder {
  build(config: GameConfig): Board {
    const { boardLayout, physics: physicsConfig, shoveConfig } = config;

    // Create world with configured gravity
    const world = new planck.World({
      gravity: planck.Vec2(physicsConfig.gravity.x, physicsConfig.gravity.y),
      allowSleep: true,
    });

    // Create pins
    const pinPositions = computePinPositions(boardLayout);
    const pins: planck.Body[] = [];
    for (const pos of pinPositions) {
      const pin = world.createBody({
        type: 'static',
        position: planck.Vec2(pos.x, pos.y),
      });
      pin.createFixture({
        shape: new planck.Circle(boardLayout.pinRadius),
        restitution: physicsConfig.pinRestitution,
        friction: physicsConfig.pinFriction,
      });
      pin.setUserData({ type: 'pin', row: pos.row, col: pos.col });
      pins.push(pin);
    }

    // Create boundary walls
    const wallDefs = getBoardWalls(boardLayout);
    const walls: planck.Body[] = [];

    // Left wall
    const leftWall = world.createBody({ type: 'static' });
    leftWall.createFixture({
      shape: new planck.Edge(
        planck.Vec2(wallDefs.left[0].x, wallDefs.left[0].y),
        planck.Vec2(wallDefs.left[1].x, wallDefs.left[1].y),
      ),
      restitution: 0.3,
      friction: 0.1,
    });
    leftWall.setUserData({ type: 'wall', side: 'left' });
    walls.push(leftWall);

    // Right wall
    const rightWall = world.createBody({ type: 'static' });
    rightWall.createFixture({
      shape: new planck.Edge(
        planck.Vec2(wallDefs.right[0].x, wallDefs.right[0].y),
        planck.Vec2(wallDefs.right[1].x, wallDefs.right[1].y),
      ),
      restitution: 0.3,
      friction: 0.1,
    });
    rightWall.setUserData({ type: 'wall', side: 'right' });
    walls.push(rightWall);

    // Bottom wall (floor)
    const bottomWall = world.createBody({ type: 'static' });
    bottomWall.createFixture({
      shape: new planck.Edge(
        planck.Vec2(wallDefs.bottom[0].x, wallDefs.bottom[0].y),
        planck.Vec2(wallDefs.bottom[1].x, wallDefs.bottom[1].y),
      ),
      restitution: 0.2,
      friction: 0.5,
    });
    bottomWall.setUserData({ type: 'wall', side: 'bottom' });
    walls.push(bottomWall);

    // Create bucket dividers
    const buckets = computeBucketBoundaries(boardLayout);
    const bucketWalls: planck.Body[] = [];
    const halfH = boardLayout.boardHeight / 2;
    const bucketHeight = BUCKET_DIVIDER_HEIGHT;
    const bucketBottom = -halfH;
    const bucketTop = bucketBottom + bucketHeight;

    // Create inner dividers (between buckets)
    for (let i = 1; i < buckets.length; i++) {
      const x = buckets[i].leftX;
      const divider = world.createBody({ type: 'static' });
      divider.createFixture({
        shape: new planck.Edge(
          planck.Vec2(x, bucketBottom),
          planck.Vec2(x, bucketTop),
        ),
        restitution: 0.2,
        friction: 0.3,
      });
      divider.setUserData({ type: 'bucketDivider', index: i });
      bucketWalls.push(divider);
    }

    // Compute shove zone
    const shoveZoneY = computeShoveZoneY(boardLayout, shoveConfig.shoveZoneRowLimit);

    return {
      world,
      pins,
      walls,
      bucketWalls,
      pucks: [],
      shoveZoneY,
    };
  }
}
