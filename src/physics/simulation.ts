import * as planck from 'planck';
import type { GameConfig, ShoveVector, AutoShoveEvent } from '@/types/index';
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
          settledPucks.push({
            puckId: puck.id,
            bucketIndex: settled.bucketIndex,
          });
        } else if (settled.type === 'autoShove') {
          this.pendingAutoShoves.push(settled.event);
        }
      }
    }

    return {
      tick: this.tick,
      collisions: [...this.pendingCollisions],
      settledPucks,
      outOfBoundsPucks,
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
  }
}
