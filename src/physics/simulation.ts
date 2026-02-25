import * as planck from 'planck';
import type { GameConfig, ShoveVector, AutoShoveEvent, GrowthEvent } from '@/types/index';
import type {
  PhysicsSimulation,
  PhysicsStepResult,
  PuckState,
  PhysicsSnapshot,
  CollisionEvent,
  SettledPuckEvent,
  OutOfBoundsEvent,
} from '@/types/contracts';
import { BoardBuilder, type Board, type PuckBody } from './board-builder';
import { BucketDetector } from './bucket-detector';
<<<<<<< 010-persistent-puck-growth
import { processGrowthQueue } from './puck-growth';
=======
import {
  computePinPositions,
  computeBucketBoundaries,
  computeShoveZoneY,
} from '@/config/board-geometry';
>>>>>>> main

let nextPuckId = 0;

function generatePuckId(): string {
  return `puck_${++nextPuckId}`;
}

/**
 * PhysicsSimulation implementation wrapping Planck.js.
 * Provides deterministic, fixed-timestep simulation.
 */
export class PhysicsSimulationImpl implements PhysicsSimulation {
  private board: Board | null = null;
  private config: GameConfig | null = null;
  private tick = 0;
  private bucketDetector: BucketDetector | null = null;
  private pendingCollisions: CollisionEvent[] = [];
  private oobTimers: Map<string, number> = new Map();
  /** Auto-shove events from the last step() call */
  private pendingAutoShoves: AutoShoveEvent[] = [];
  /** Pending same-player puck-puck contacts for growth processing */
  private pendingGrowthEvents: GrowthEvent[] = [];

  createWorld(config: GameConfig): void {
    this.config = config;
    this.tick = 0;
    this.oobTimers.clear();
    nextPuckId = 0;

    const builder = new BoardBuilder();
    this.board = builder.build(config);
    this.bucketDetector = new BucketDetector(config.boardLayout, config.physics, config.autoShove);

    // Set up collision listener
    this.board.world.on('begin-contact', (contact: planck.Contact) => {
      this.handleCollision(contact);
    });
  }

  dropPuck(x: number, playerId: string): string {
    if (!this.board || !this.config) {
      throw new Error('World not created');
    }

    const id = generatePuckId();
    const { boardLayout, physics: physicsConfig } = this.config;

    // Drop from top of board
    const dropY = boardLayout.boardHeight / 2 - 1.0;

    // Clamp x to board bounds
    const halfW = boardLayout.boardWidth / 2;
    const clampedX = Math.max(-halfW + boardLayout.puckRadius, Math.min(halfW - boardLayout.puckRadius, x));

    const body = this.board.world.createBody({
      type: 'dynamic',
      position: planck.Vec2(clampedX, dropY),
      fixedRotation: false,
      angularDamping: physicsConfig.angularDamping,
      bullet: false,
    });

    body.createFixture({
      shape: new planck.Circle(boardLayout.puckRadius),
      density: physicsConfig.puckDensity,
      restitution: physicsConfig.puckRestitution,
      friction: physicsConfig.puckFriction,
    });

    body.setUserData({ type: 'puck', id });

    const puckBody: PuckBody = {
      id,
      body,
      playerId,
      turnIndex: this.board.pucks.length,
      isSettled: false,
      settledInBucket: null,
      createdAtTick: this.tick,
<<<<<<< 010-persistent-puck-growth
      currentRadius: boardLayout.puckRadius,
      growthCount: 0,
      lastScoredBucket: null,
      scoreAwarded: 0,
=======
      bounceMultiplier: 1.0,
>>>>>>> main
    };

    this.board.pucks.push(puckBody);
    return id;
  }

  applyShove(puckId: string, vector: ShoveVector): boolean {
    if (!this.board || !this.config) return false;

    const puck = this.board.pucks.find(p => p.id === puckId);
    if (!puck || puck.isSettled) return false;

    // Check shove zone
    const pos = puck.body.getPosition();
    if (pos.y < this.board.shoveZoneY) return false;

    // Cap force magnitude
    const mag = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
    const maxForce = this.config.shoveConfig.maxForceMagnitude;

    let dx = vector.dx;
    let dy = vector.dy;
    if (mag > maxForce) {
      const scale = maxForce / mag;
      dx *= scale;
      dy *= scale;
    }

    // Apply impulse at off-center point for spin
    const center = puck.body.getWorldCenter();
    const puckRadius = this.config.boardLayout.puckRadius;
    const offsetFraction = this.config.shoveConfig.shoveOffsetFraction;

    if (mag > 0 && offsetFraction > 0) {
      const offset = puckRadius * offsetFraction;
      // Perpendicular to impulse direction (to the "right")
      const perpX = (-dy / mag) * offset;
      const perpY = (dx / mag) * offset;
      puck.body.applyLinearImpulse(
        planck.Vec2(dx, dy),
        planck.Vec2(center.x + perpX, center.y + perpY),
      );
    } else {
      puck.body.applyLinearImpulse(
        planck.Vec2(dx, dy),
        center,
      );
    }

    return true;
  }

  step(timeScale?: number): PhysicsStepResult {
    if (!this.board || !this.config) {
      throw new Error('World not created');
    }

    this.tick++;
    this.pendingCollisions = [];
    this.pendingAutoShoves = [];
    this.pendingGrowthEvents = [];

    // Step the world
    const { fixedTimestep, velocityIterations, positionIterations, maxAngularVelocity } = this.config.physics;
    const effectiveTimestep = fixedTimestep * (timeScale ?? 1.0);
    this.board.world.step(effectiveTimestep, velocityIterations, positionIterations);

    // Clamp angular velocity for all pucks
    for (const puck of this.board.pucks) {
      const w = puck.body.getAngularVelocity();
      if (Math.abs(w) > maxAngularVelocity) {
        puck.body.setAngularVelocity(Math.sign(w) * maxAngularVelocity);
      }
    }

    // Process growth queue: same-player puck contacts → resize fixtures
    const growthEvents: GrowthEvent[] = [];
    if (this.pendingGrowthEvents.length > 0) {
      const processed = processGrowthQueue(
        this.pendingGrowthEvents,
        this.board.pucks,
        this.config.growth,
        this.config.physics,
      );
      growthEvents.push(...processed);
    }

    // Check for settled pucks
    const settledPucks: SettledPuckEvent[] = [];
    const outOfBoundsPucks: OutOfBoundsEvent[] = [];
    const topBoundaryY = this.config.boardLayout.boardHeight / 2;
    const puckRadius = this.config.boardLayout.puckRadius;
    const OOB_GRACE_TICKS = 30; // 0.5s at 60 fps

    for (const puck of this.board.pucks) {
      if (puck.isSettled) continue;

      const pos = puck.body.getPosition();

      // Out-of-bounds check: puck center fully above top boundary
      if (pos.y > topBoundaryY + puckRadius) {
        if (!this.oobTimers.has(puck.id)) {
          this.oobTimers.set(puck.id, this.tick);
        }
        if (this.tick - this.oobTimers.get(puck.id)! >= OOB_GRACE_TICKS) {
          puck.isSettled = true;
          puck.settledInBucket = -1;
          outOfBoundsPucks.push({
            puckId: puck.id,
            position: { x: pos.x, y: pos.y },
          });
          this.oobTimers.delete(puck.id);
        }
        continue; // Skip bucket detection for OOB puck
      } else {
        // Puck returned in-bounds — reset timer
        this.oobTimers.delete(puck.id);
      }

      const settled = this.bucketDetector!.checkSettled(
        puck,
        this.tick,
        this.board.shoveZoneY,
      );

      if (settled !== null) {
        if (settled.type === 'settled') {
          puck.isSettled = true;
          puck.settledInBucket = settled.bucketIndex;
          // T051: Track bucket score for revocation
          puck.lastScoredBucket = settled.bucketIndex;
          settledPucks.push({
            puckId: puck.id,
            bucketIndex: settled.bucketIndex,
          });
        } else if (settled.type === 'autoShove') {
          this.pendingAutoShoves.push(settled.event);
        }
      }
    }

    // T050: Check for settled pucks displaced out of their buckets
    const scoreRevocations = this.bucketDetector!.checkDisplacement(this.board.pucks);

    return {
      tick: this.tick,
      collisions: [...this.pendingCollisions],
      settledPucks,
      outOfBoundsPucks,
      growthEvents,
      scoreRevocations,
    };
  }

  /** Get auto-shove events from the last step() call */
  getAutoShoveEvents(): AutoShoveEvent[] {
    return this.pendingAutoShoves;
  }

  /** Apply an auto-shove impulse to a stuck puck */
  applyAutoShove(event: AutoShoveEvent): void {
    if (!this.board || !this.config) return;

    const puck = this.board.pucks.find(p => p.id === event.puckId);
    if (!puck || puck.isSettled) return;

    const magnitude = this.config.autoShove.impulseMagnitude;
    const ix = event.direction.x * magnitude;
    const iy = event.direction.y * magnitude;
    const center = puck.body.getWorldCenter();

    puck.body.applyLinearImpulse(
      planck.Vec2(ix, iy),
      center,
    );

    // Wake the body in case it was sleeping
    puck.body.setAwake(true);
  }

  /** Get auto-shove stall progress for rendering warning visual */
  getAutoShoveProgress(puckId: string): number {
    if (!this.bucketDetector) return 0;
    return this.bucketDetector.getAutoShoveProgress(puckId, this.tick);
  }

  getPuckState(puckId: string): PuckState {
    if (!this.board) throw new Error('World not created');

    const puck = this.board.pucks.find(p => p.id === puckId);
    if (!puck) throw new Error(`Puck ${puckId} not found`);

    const pos = puck.body.getPosition();
    return {
      isSettled: puck.isSettled,
      bucketIndex: puck.settledInBucket,
      position: { x: pos.x, y: pos.y },
      isInShoveZone: !puck.isSettled && pos.y > this.board.shoveZoneY,
    };
  }

  getSnapshot(): PhysicsSnapshot {
    if (!this.board) return { pucks: [] };

    return {
      pucks: this.board.pucks.map(puck => {
        const pos = puck.body.getPosition();
        return {
          id: puck.id,
          x: pos.x,
          y: pos.y,
          angle: puck.body.getAngle(),
          settled: puck.isSettled,
        };
      }),
    };
  }

  clearPucks(): void {
    if (!this.board) return;

    for (const puck of this.board.pucks) {
      this.board.world.destroyBody(puck.body);
    }
    this.board.pucks = [];
    this.oobTimers.clear();
  }

  rebuildBoard(config: GameConfig): void {
    if (!this.board) {
      throw new Error('World not created — call createWorld() first');
    }

    this.config = config;
    const { boardLayout, physics: physicsConfig, shoveConfig } = config;

    // Destroy old pins
    for (const pin of this.board.pins) {
      this.board.world.destroyBody(pin);
    }
    this.board.pins = [];

    // Destroy old bucket walls
    for (const wall of this.board.bucketWalls) {
      this.board.world.destroyBody(wall);
    }
    this.board.bucketWalls = [];

    // Create new pins
    const pinPositions = computePinPositions(boardLayout);
    for (const pos of pinPositions) {
      const pin = this.board.world.createBody({
        type: 'static',
        position: planck.Vec2(pos.x, pos.y),
      });
      pin.createFixture({
        shape: new planck.Circle(boardLayout.pinRadius),
        restitution: physicsConfig.pinRestitution,
        friction: physicsConfig.pinFriction,
      });
      pin.setUserData({ type: 'pin', row: pos.row, col: pos.col });
      this.board.pins.push(pin);
    }

    // Create new bucket dividers
    const buckets = computeBucketBoundaries(boardLayout);
    const halfH = boardLayout.boardHeight / 2;
    const bucketHeight = 1.5;
    const bucketBottom = -halfH;
    const bucketTop = bucketBottom + bucketHeight;

    for (let i = 1; i < buckets.length; i++) {
      const x = buckets[i].leftX;
      const divider = this.board.world.createBody({ type: 'static' });
      divider.createFixture({
        shape: new planck.Edge(
          planck.Vec2(x, bucketBottom),
          planck.Vec2(x, bucketTop),
        ),
        restitution: 0.2,
        friction: 0.3,
      });
      divider.setUserData({ type: 'bucketDivider', index: i });
      this.board.bucketWalls.push(divider);
    }

    // Recompute shoveZoneY
    this.board.shoveZoneY = computeShoveZoneY(boardLayout, shoveConfig.shoveZoneRowLimit);

    // Rebuild BucketDetector
    this.bucketDetector = new BucketDetector(boardLayout, physicsConfig, config.autoShove);

    // Wake all pucks so they interact with new geometry
    for (const puck of this.board.pucks) {
      puck.body.setAwake(true);
    }
  }

  getAllPucks(): PuckBody[] {
    if (!this.board) return [];
    return this.board.pucks;
  }

  destroy(): void {
    if (this.board) {
      // Planck.js worlds don't have an explicit destroy, but we null it out
      this.board = null;
    }
    this.config = null;
    this.bucketDetector = null;
    this.oobTimers.clear();
    this.tick = 0;
  }

  /** Internal: get the board for rendering access */
  getBoard(): Board | null {
    return this.board;
  }

  private handleCollision(contact: planck.Contact): void {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();
    const dataA = bodyA.getUserData() as { type: string; id?: string } | null;
    const dataB = bodyB.getUserData() as { type: string; id?: string } | null;

    if (!dataA || !dataB) return;

    // Determine which body is the puck
    let puckData: { type: string; id?: string } | null = null;
    let otherData: { type: string; id?: string } | null = null;
    let puckBody: planck.Body | null = null;

    if (dataA.type === 'puck') {
      puckData = dataA;
      otherData = dataB;
      puckBody = bodyA;
    } else if (dataB.type === 'puck') {
      puckData = dataB;
      otherData = dataA;
      puckBody = bodyB;
    }

    if (!puckData || !puckBody || !puckData.id) return;

    const pos = puckBody.getPosition();
    let collisionType: CollisionEvent['type'] = 'wallHit';
    if (otherData?.type === 'pin') collisionType = 'pinHit';
    else if (otherData?.type === 'puck') collisionType = 'puckHit';

    this.pendingCollisions.push({
      type: collisionType,
      puckId: puckData.id,
      x: pos.x,
      y: pos.y,
    });

    // T034: Detect same-player puck-puck contacts for growth
    if (dataA.type === 'puck' && dataB.type === 'puck' && dataA.id && dataB.id && this.board) {
      const puckA = this.board.pucks.find(p => p.id === dataA.id);
      const puckB = this.board.pucks.find(p => p.id === dataB.id);
      if (puckA && puckB && puckA.playerId === puckB.playerId) {
        this.pendingGrowthEvents.push({
          puckIdA: puckA.id,
          puckIdB: puckB.id,
          playerId: puckA.playerId,
          chainDepth: 0,
        });
      }
    }
  }
}
