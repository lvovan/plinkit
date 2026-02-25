# Feature Specification: Collision & Interaction Updates

**Feature Branch**: `003-collision-interaction-updates`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Collision & Interaction Updates — Remove particle effects, add collision visual cues and bounce sound, bounce-based exponential scoring, puck X-axis positioning before drop with visual helper, shove slash animation"

## Clarifications

### Session 2026-02-25

- Q: What exponential rate per bounce should be used for the scoring multiplier? → A: 1.15× per bounce (satisfies SC-003's 2× requirement at 5-bounce differential; 10× cap reached at ~17 bounces).
- Q: Should bucket landing retain particle celebration or be removed with all other particles? → A: Keep bucket-landing particles as an exception to the "remove all particles" rule.
- Q: How should the bounce multiplier be displayed to the player when a round ends? → A: Show a brief breakdown: base score × multiplier = total (e.g., "1000 × 3.2× = 3200").
- Q: What style should the collision impact cue use? → A: Radial flash (bright spot that fades) plus a small text showing the current bounce multiplier at each hit.
- Q: Should the board shake on shove be retained alongside the new slash animation? → A: Keep both; shake intensity should be proportional to shove strength.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collision Feedback Overhaul (Priority: P1)

A player drops a puck and watches it bounce down the board. Every time the puck strikes a pin, another puck, or a wall, a radial flash appears at the exact point of contact along with a small text showing the current bounce multiplier (e.g., "1.3×"), and a short, satisfying bounce sound plays. The old scattered-particle spray effects on collisions and shoves are gone — replaced by clean, precise impact indicators that feel responsive and polished. The player can clearly see and hear every collision as it happens, and watch their multiplier climb with each hit.

**Why this priority**: Collision feedback is the most frequently occurring interaction in every round. Improving it affects every single drop and provides the foundation for bounce-based scoring (Story 2). Without clear collision cues, the player cannot intuitively understand that bounces matter for their score.

**Independent Test**: Can be fully tested by dropping a puck and observing that each pin/puck/wall hit produces a visible flash at the contact point and plays a bounce sound, with no particle spray effects present.

**Acceptance Scenarios**:

1. **Given** a puck is in motion on the board, **When** the puck collides with a pin, **Then** a radial flash appears at the exact contact point with a small multiplier text (e.g., "1.3×") and a bounce sound effect plays.
2. **Given** a puck is in motion on the board, **When** the puck collides with another puck or a wall, **Then** the same radial flash, multiplier text, and bounce sound play at the contact point.
3. **Given** the game is running, **When** any collision occurs, **Then** no particle spray effects are emitted — only the radial flash and multiplier text are shown.
4. **Given** the puck is bouncing rapidly between closely-spaced pins, **When** multiple collisions happen in quick succession, **Then** each hit produces its own independent radial flash and multiplier text without visual clutter or audio distortion.

---

### User Story 2 - Bounce-Based Exponential Scoring (Priority: P2)

A player drops a puck and it bounces many times before settling in a bucket. The system counts every bounce (pin, puck, and wall collisions) during that drop and applies an exponential multiplier to the bucket's base score. A puck that barely grazes a few pins before landing earns far less than one that ricochets wildly across the board. The player immediately understands that more bounces mean significantly higher scores, adding a strategic element to puck placement and shove timing.

**Why this priority**: Scoring is core to player motivation. Introducing a bounce multiplier transforms passive watching into active engagement — players now care about every collision their puck makes, and it rewards skillful use of shoves to create more bounces.

**Independent Test**: Can be fully tested by dropping pucks, counting the visible/audible collisions, and verifying the round score reflects the exponential multiplier applied to the base bucket value.

**Acceptance Scenarios**:

1. **Given** a puck drops and bounces 3 times before settling in a bucket with base score 1000, **When** the round score is calculated, **Then** the score reflects the base value multiplied by an exponential factor based on 3 bounces, resulting in a noticeably higher score than 1000.
2. **Given** a puck drops and bounces 15 times before landing, **When** compared to another drop with 5 bounces into the same bucket, **Then** the 15-bounce drop scores significantly more (the difference grows exponentially, not linearly).
3. **Given** a puck drops and bounces 0 times (falls directly into a bucket), **When** the round score is calculated, **Then** the player receives only the base bucket score with no multiplier bonus.
4. **Given** a puck bounces during a round, **When** the round ends, **Then** the player sees a score breakdown showing base score × multiplier = total (e.g., "1000 × 3.2× = 3200").

---

### User Story 3 - Pre-Drop Puck Positioning (Priority: P3)

At the start of each round, the player sees a visual helper (such as a ghosted puck or horizontal guideline) at the top of the board indicating that they can position the puck along the horizontal axis before releasing it. The player drags left or right to choose exactly where the puck will drop. Once satisfied with the position, they release to drop the puck. This mechanic makes puck placement feel deliberate and strategic rather than arbitrary.

**Why this priority**: Puck positioning is the player's primary strategic decision each round. A clear visual indicator that horizontal aiming is available improves discoverability and the feeling of control. This builds on the existing drag-to-aim mechanic by making it more visually obvious and intentional.

**Independent Test**: Can be fully tested by starting a round and verifying a visual helper appears, moves with horizontal input, and that releasing the input drops the puck from the indicated position.

**Acceptance Scenarios**:

1. **Given** a new round begins and it is the player's turn, **When** the puck is ready to be dropped, **Then** a clear visual indicator (ghosted puck or guideline) appears at the top of the board showing the current drop position.
2. **Given** the visual helper is displayed, **When** the player drags horizontally, **Then** the indicator follows the player's input smoothly along the X axis, staying constrained to the board's horizontal bounds.
3. **Given** the player has positioned the puck using the visual helper, **When** the player releases (lifts finger / releases mouse), **Then** the puck drops from the indicated horizontal position.
4. **Given** the visual helper is displayed, **When** the player has not yet interacted, **Then** the helper defaults to the center of the board.

---

### User Story 4 - Shove Slash Animation (Priority: P4)

When a player performs a shove action on their puck, a distinct "slash" animation (inspired by Fruit Ninja-style swipe effects) appears along the shove direction. The slash is quick, visually sharp, and clearly tied to the shove gesture. It reinforces the shove action with satisfying visual feedback that feels distinct from collision cues.

**Why this priority**: Shoves are the game's most dramatic player-initiated action. A distinctive slash animation differentiates shoves from passive collisions, makes the action feel powerful, and provides clear feedback that the shove registered.

**Independent Test**: Can be fully tested by performing a shove gesture on a puck during play and verifying a slash animation appears along the swipe direction, distinct from collision cues.

**Acceptance Scenarios**:

1. **Given** a puck is in the shove zone and the player performs a shove gesture, **When** the shove is registered, **Then** a slash animation appears along the direction of the gesture and the board shakes with intensity proportional to the shove strength.
2. **Given** a shove is performed, **When** the slash animation plays, **Then** it completes quickly (under 500ms) and does not obscure ongoing gameplay.
3. **Given** a shove is performed, **When** the slash animation appears, **Then** it is visually distinct from the collision impact cues (different shape, size, or style).
4. **Given** the player has used all available shoves for the turn, **When** no more shoves are possible, **Then** no slash animation or shake appears (no misleading feedback on failed attempts).
5. **Given** a weak shove is performed, **When** compared to a strong shove, **Then** the board shake is noticeably less intense for the weaker shove.

---

### Edge Cases

- What happens when a puck collides with a pin and a wall simultaneously? Each contact point produces its own independent visual cue and sound.
- What happens when the bounce count is extremely high (e.g., 50+ bounces)? The exponential multiplier should be capped at a reasonable maximum to prevent absurd scores from destabilizing the game balance.
- What happens if the player tries to position the puck outside the board's horizontal bounds? The visual helper clamps to the leftmost/rightmost valid position.
- What happens when a shove is attempted on a puck that is not in the shove zone? No slash animation plays and the shove has no effect (consistent with existing behavior).
- What happens when multiple collisions occur in the same physics frame? Each collision generates its own independent visual cue; sounds may overlap or be mixed without distortion.
- What happens when the player drops the puck without moving the position helper? The puck drops from the default center position.

## Requirements *(mandatory)*

### Functional Requirements

#### Collision Visual Feedback

- **FR-001**: System MUST remove all existing particle spray effects from collision events (pin hits and shove actions). Bucket-landing particle effects are exempt and MUST be retained as the celebratory scoring feedback.
- **FR-002**: System MUST display a radial flash (a small bright spot that fades out) at the exact point of impact for every collision event (pin hit, puck-on-puck hit, and wall hit).
- **FR-003**: The radial flash MUST be brief (visible for no longer than 300ms) and localized to the contact point.
- **FR-003a**: Alongside each collision flash, the system MUST display a small text label showing the current bounce multiplier (e.g., "1.3×", "2.1×") at the collision point. The text MUST fade out with the flash.
- **FR-004**: System MUST support multiple simultaneous collision cues without visual clutter or performance degradation.

#### Collision Audio Feedback

- **FR-005**: System MUST play a short bounce sound effect on every collision event (pin hit, puck-on-puck hit, and wall hit).
- **FR-006**: When multiple collisions occur in rapid succession, the system MUST handle overlapping sounds gracefully (e.g., mixing without distortion or clipping, with optional volume attenuation for very rapid hits).

#### Bounce-Based Scoring

- **FR-007**: System MUST count the total number of bounces (all collision types: pin, puck, wall) that occur during each round (one puck drop).
- **FR-008**: The round score MUST be calculated as the base bucket score multiplied by an exponential factor derived from the bounce count.
- **FR-009**: A round with zero bounces MUST award only the base bucket score (multiplier of 1×).
- **FR-010**: The exponential multiplier MUST be capped at a defined maximum to prevent runaway scores from destabilizing game balance.
- **FR-011**: When a puck settles in a bucket, the system MUST display a brief score breakdown showing the base bucket score, the bounce multiplier, and the resulting total (e.g., "1000 × 3.2× = 3200").

#### Pre-Drop Puck Positioning

- **FR-012**: At the start of each round, before the puck is dropped, the system MUST display a visual helper (ghosted puck, guideline, or equivalent indicator) at the top of the board showing the current horizontal drop position.
- **FR-013**: The visual helper MUST track the player's horizontal input (drag or pointer movement) smoothly in real time.
- **FR-014**: The visual helper MUST default to the horizontal center of the board when no player input has occurred.
- **FR-015**: The visual helper MUST be constrained to the board's horizontal bounds — it cannot be positioned outside the playable area.
- **FR-016**: The puck MUST drop from the position indicated by the visual helper when the player releases their input.

#### Shove Slash Animation

- **FR-017**: When a successful shove is performed, the system MUST display a slash animation along the direction of the shove gesture.
- **FR-018**: The slash animation MUST complete within 500ms.
- **FR-019**: The slash animation MUST be visually distinct from the collision impact cues (different shape, size, and/or visual style).
- **FR-020**: The slash animation MUST NOT appear when a shove attempt fails (e.g., puck not in shove zone or shoves exhausted).
- **FR-020a**: The existing board shake effect MUST be retained on successful shoves, with shake intensity proportional to the strength (force magnitude) of the shove. A gentle shove produces a subtle shake; a strong shove produces a pronounced shake.

#### Performance

- **FR-021**: All new visual effects (collision cues, positioning helper, slash animation) MUST NOT reduce the frame rate below 60fps on a mid-range mobile device under normal gameplay conditions.

### Key Entities

- **CollisionEvent**: A record of a single collision during a round. Key attributes: collision type (pin, puck, wall), contact position (x, y), associated puck.
- **BounceCounter**: Tracks the cumulative number of bounces per round (per puck drop). Resets at the start of each new round.
- **RoundScore**: The calculated score for a single round. Composed of the base bucket score and the exponential bounce multiplier.
- **DropPositionIndicator**: The visual helper shown before puck drop. Attributes: current horizontal position, visibility state.
- **SlashEffect**: The visual effect triggered on a successful shove. Attributes: origin point, direction vector, duration.

## Assumptions

- The existing bounce sound effect (`'pinHit'` audio cue) can be reused or refined for the new unified collision sound; a single bounce sound is sufficient for all collision types (pin, puck, wall) without the need for distinct sounds per type.
- The exponential scoring formula will use a base-and-exponent pattern (`baseScore × 1.15^bounces`), with a rate of 1.15× per bounce capped at a 10× maximum multiplier (cap reached at ~17 bounces).
- The pre-drop visual helper replaces and formalizes the existing pointer-drag aiming behavior; no separate "confirm drop" button is needed — releasing the input drops the puck (consistent with current behavior).
- The "slash" animation style refers to a sharp, directional line or arc effect similar to Fruit Ninja's swipe trail, not a literal blade or weapon graphic.
- Removing particle effects means removing both the standalone `ParticleSystem` class and the inline particle rendering in the renderer — all spray-style effects across the game.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every collision (pin, puck, wall) produces a visible impact cue and audible bounce sound — 100% of collisions have audiovisual feedback.
- **SC-002**: No particle spray effects appear for collision or shove events after this update. Bucket-landing particles remain as the sole exception.
- **SC-003**: Players can see their score increase exponentially with bounce count — a drop with 10 bounces scores at least 2× more than a drop with 5 bounces into the same bucket.
- **SC-004**: Players can position their puck along the full horizontal width of the board before dropping, with the visual helper visible for the entire pre-drop phase.
- **SC-005**: The shove slash animation is visible on every successful shove and completes within 500ms.
- **SC-006**: All new effects maintain smooth gameplay at 60fps on a mid-range mobile device.
- **SC-007**: Players can intuitively discover horizontal puck positioning without external instructions — the visual helper is self-explanatory.
