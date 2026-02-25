# Feature Specification: Puck Rotation & Friction Physics

**Feature Branch**: `004-puck-rotation-friction`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "Pins must be positioned so as to be staggered between rows. The puck must start its fall based on where the player clicks/touches on the X-axis. The puck physics must include a rotation behavior with friction (on the pins and other already dropped pucks from previous rounds)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Puck Rotation on Pin Contact (Priority: P1) 🎯 MVP

When a puck hits a pin during its descent, it must visibly spin based on the angle and speed of impact. The spin direction and speed are determined by the contact — a glancing hit off the left side of a pin should induce clockwise spin, and vice versa. This makes each drop feel physical and unique.

**Why this priority**: Rotation on pin contact is the core mechanic that transforms the puck from a sliding circle into a believable physical object. Without it, the remaining stories have no visible effect.

**Independent Test**: Drop a puck so it grazes pins on alternating sides. Observe that the puck's surface pattern (stripes, dots, rings) rotates visibly in the direction consistent with the contact side.

**Acceptance Scenarios**:

1. **Given** a puck is falling, **When** it strikes the left side of a pin, **Then** the puck spins clockwise (positive angular velocity) at a rate proportional to the contact speed.
2. **Given** a puck is falling, **When** it strikes the right side of a pin, **Then** the puck spins counter-clockwise (negative angular velocity).
3. **Given** a puck is spinning, **When** it falls freely (no contact), **Then** its spin decays gradually due to angular damping, never stopping instantaneously.
4. **Given** a puck has settled in a bucket, **When** the puck is at rest, **Then** its final rotation angle is preserved and rendered correctly.

---

### User Story 2 — Puck-Puck Friction & Spin Transfer (Priority: P2)

When a falling puck collides with a previously dropped puck from an earlier round, friction between the two surfaces transfers angular momentum. A spinning puck hitting a stationary one can cause the stationary puck to start spinning, and the collision deflects the falling puck in a way that feels consistent with real physics.

**Why this priority**: Puck-puck interaction already exists (bodies collide), but without rotation the collisions feel flat. This story builds on US1 to make multi-puck boards more dynamic and strategic.

**Independent Test**: Drop a puck that lands on top of or grazes a settled puck from a previous turn. Observe that (a) the falling puck's spin changes on impact, and (b) the settled puck may shift or start spinning slightly if the impact is strong enough.

**Acceptance Scenarios**:

1. **Given** a spinning puck collides with a settled puck, **When** friction is present between them, **Then** angular momentum transfers — the settled puck gains some spin and the falling puck's spin changes.
2. **Given** two pucks collide at high speed, **When** the contact has a tangential component, **Then** both pucks deflect with spin consistent with the friction interaction.
3. **Given** a puck is resting in a bucket and another puck lands on it, **When** the collision occurs, **Then** the resting puck may be nudged but remains influenced by bucket walls and gravity.

---

### User Story 3 — Visual Rotation Rendering (Priority: P3)

The puck's pattern (stripes, dots, or rings) must rotate on screen to reflect the puck's physical angle. Players should see the pattern spinning as the puck bounces down the board. The "solid" pattern has no visible rotation cue, but still rotates physically.

**Why this priority**: Without visual feedback, the rotation physics are invisible and meaningless to the player. This story makes the physics tangible. It is P3 rather than P1 because the physics must work first before rendering matters.

**Independent Test**: Drop a puck with the "stripes" pattern. Observe that the vertical lines tilt and rotate as the puck spins through pin collisions.

**Acceptance Scenarios**:

1. **Given** a puck with the "stripes" pattern, **When** it spins due to a pin collision, **Then** the stripe lines visually rotate at the same rate as the physics angle.
2. **Given** a puck with the "dots" pattern, **When** it spins, **Then** the dot positions rotate around the puck center.
3. **Given** a puck with the "rings" pattern, **When** it spins, **Then** the concentric rings appear unchanged (rotationally symmetric, matching expected behavior).
4. **Given** a puck with the "solid" pattern, **When** it spins, **Then** no visual change is seen (solid fill is rotationally symmetric).

---

### Edge Cases

- A puck dropped perfectly centered on a pin (direct vertical hit) should receive minimal spin (nearly zero tangential component).
- Extremely rapid spin (many successive glancing contacts) is prevented by capping angular velocity at a configurable maximum (FR-015).
- A shove applied to a spinning puck should combine linear and angular momentum naturally.
- Ghost puck (pre-drop indicator) must NOT rotate — it remains at a fixed angle of 0.

## Clarifications

### Session 2026-02-25

- Q: Should settled pucks freeze their angle permanently (FR-005) or react to new collisions (US2)? → A: Settled pucks rest at their final angle but react to new collisions (angle can change).
- Q: How quickly should spin decay in free fall (SC-003)? → A: ~1 second — spin decays noticeably within a single board traversal.
- Q: Should puck spin have an explicit maximum angular velocity? → A: Yes — cap at a readable limit (~2 rotations/sec), tunable in config.
- Q: Should shoves induce rotation directly? → A: Shove applied slightly off-center — produces a small spin on every shove.
- Q: Should rotation influence scoring? → A: No — rotation is purely a visual/physics enhancement with zero effect on scoring.

## Requirements *(mandatory)*

### Functional Requirements

**Physics**

- **FR-001**: Pucks MUST have rotational freedom — the physics body must not constrain rotation.
- **FR-002**: Pin-puck friction MUST impart angular velocity to the puck proportional to the tangential contact speed.
- **FR-003**: Puck-puck friction MUST transfer angular momentum between colliding pucks.
- **FR-004**: Pucks MUST have angular damping so that spin decays gradually in free fall rather than persisting indefinitely.
- **FR-005**: Settled pucks MUST retain their final rotation angle while undisturbed; subsequent collisions from other pucks MAY change their angle and spin.

**Rendering**

- **FR-006**: The puck's visual pattern (stripes, dots, rings) MUST rotate to reflect the puck's current physics angle.
- **FR-007**: The "solid" pattern need not display any rotation cue (it is rotationally symmetric).
- **FR-008**: The ghost puck (drop indicator) MUST always render at angle 0 (no rotation preview).

**Configuration**

- **FR-009**: Pin friction, puck friction, and angular damping MUST be configurable through the existing physics configuration, enabling tuning without code changes.

**Existing Behavior Preservation**

- **FR-010**: Staggered pin layout (quinconce) MUST be maintained — even rows have one more pin than odd rows, both horizontally centered.
- **FR-011**: Puck drop position MUST be determined by the player's click/touch X-axis position, as currently implemented.
- **FR-012**: Shove mechanics MUST continue to work — shove forces are applied slightly off the puck's center of mass, producing both a lateral impulse and a small rotational spin on each shove.
- **FR-013**: Bounce-based scoring (exponential multiplier) MUST remain unchanged. Rotation has no effect on scoring — it is purely a visual and physics enhancement.
- **FR-014**: Deterministic physics MUST be preserved — identical inputs must produce identical puck paths and rotation sequences.
- **FR-015**: Puck angular velocity MUST be capped at a configurable maximum (~2 full rotations per second by default) to keep patterns visually readable.

### Key Entities

- **Puck**: Gains rotational state (angle, angular velocity). Transitions from non-rotating to free-rotating. The angle must be available for rendering.
- **Pin**: Existing static obstacle. Its friction value directly influences how much spin pucks acquire on contact. No structural change.
- **PhysicsConfig**: Extended with angular damping parameter for puck bodies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A puck dropped to graze a pin visually spins — the pattern rotation is perceptible to the player within the first 2 pin contacts.
- **SC-002**: Two pucks colliding show different post-collision spin directions, confirming friction-based angular momentum transfer.
- **SC-003**: A spinning puck's rotation decays noticeably within ~1 second of free fall (no contact), confirming angular damping is effective and visible during a typical board traversal.
- **SC-004**: All existing tests continue to pass — no regression in scoring, state machine, or collision event detection.
- **SC-005**: Physics determinism is maintained — dropping a puck from the same position with the same shoves produces the same final angle and bucket landing across 10 consecutive runs.

## Assumptions

- Friction values will need tuning during implementation. Reasonable starting values: puck friction 0.3–0.5, pin friction 0.2–0.4, angular damping 1.0–3.0. Exact values will be determined through playtesting.
- The physics engine natively supports rotation, angular velocity, friction-based torque, and angular damping on dynamic bodies — no custom physics logic is needed beyond enabling these features.
- The puck's angle is already tracked internally; the change is primarily about enabling rotation and propagating the angle to the visual layer.
- The `rings` and `solid` patterns are rotationally symmetric — rotation will not be visually apparent for these patterns, which is acceptable.
