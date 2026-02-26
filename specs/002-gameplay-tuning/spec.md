# Feature Specification: Gameplay Tuning — Board Layout, Particles & Out-of-Bounds

**Feature Branch**: `002-gameplay-tuning`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "When the puck goes out of the field, the round should be terminated. Reduce the collision particle effects. Ensure pins are not aligned otherwise the puck may just predictably fall down (no fun). Reduce the number of pins by a ratio of 2, and adjust the puck size accordingly. Reduce the number of buckets accordingly."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 — Out-of-Bounds Puck Ends the Round (Priority: P1)

A player drops or shoves the puck. The puck flies upward off the top edge of the board (e.g., after a strong shove). The system detects that the puck has left through the top and immediately ends the round, awarding zero points for that turn. The player is shown a brief "Out of Bounds" notification before play continues with the next turn. Side and bottom walls physically prevent escape in those directions.

**Why this priority**: This is a gameplay-correctness issue. Without it, a puck that escapes the board leaves the game in a stuck or undefined state, breaking the session for all players.

**Independent Test**: Can be tested by launching a puck with extreme force so it clears the board boundary. Validates that the round resolves and the game continues.

**Acceptance Scenarios**:

1. **Given** a puck is in play, **When** the puck's position moves entirely outside the board boundaries, **Then** the round ends immediately with zero points awarded for that turn.
2. **Given** a puck has gone out of bounds, **When** the round ends, **Then** the system displays a brief "Out of Bounds" notification to all players.
3. **Given** an out-of-bounds round has ended, **When** the notification dismisses, **Then** the game advances to the next turn as normal (next player or next round).
4. **Given** a puck is near the board edge but still partially inside, **When** the puck's center is still within bounds, **Then** the round continues normally (no false trigger).

---

### User Story 2 — Halved Pin Count with Staggered Layout (Priority: P2)

The board has roughly half as many pin rows as before (6 rows instead of 12). Pins remain arranged in a staggered (offset) pattern so that no two consecutive rows have pins directly above one another. This ensures the puck bounces unpredictably rather than falling straight down, preserving the fun and randomness of Plinko.

**Why this priority**: Reducing pin density is the core layout change requested. The staggered arrangement is essential to prevent the puck from sliding straight through, which would make the game boring.

**Independent Test**: Can be tested by visually inspecting the board layout and dropping multiple pucks from the same position — the landing buckets should vary meaningfully.

**Acceptance Scenarios**:

1. **Given** the game board is rendered, **When** a player views the board, **Then** the board displays 6 rows of pins (half the original 12).
2. **Given** the board layout, **When** inspecting any two consecutive rows, **Then** the pins in the lower row are horizontally offset from the pins in the row above (staggered pattern).
3. **Given** a puck is dropped from the same position multiple times, **When** observing the outcomes, **Then** the puck lands in different buckets across attempts, demonstrating unpredictable bouncing.

---

### User Story 3 — Reduced Bucket Count (Priority: P2)

The number of scoring buckets at the bottom of the board is reduced proportionally to match the halved pin count. With fewer pins, fewer buckets keep the board balanced so pucks still have a realistic chance of reaching each bucket. The scoring values are re-distributed symmetrically, maintaining a high-value center and lower-value edges.

**Why this priority**: Bucket count must match the new pin layout for balanced scoring. Without this change, many outer buckets would become unreachable or excessively rare.

**Independent Test**: Can be tested by verifying bucket count on the rendered board and confirming scores remain symmetric and balanced.

**Acceptance Scenarios**:

1. **Given** the game board is rendered, **When** a player views the buckets, **Then** 5 buckets are displayed (down from 9).
2. **Given** the bucket layout, **When** inspecting the score values, **Then** scores are symmetric with the highest value in the center and decreasing toward the edges.
3. **Given** a puck lands in a bucket, **When** the score is awarded, **Then** it matches the value assigned to that bucket.

---

### User Story 4 — Adjusted Puck Size (Priority: P2)

The puck size is proportionally adjusted to match the new lower pin density. With fewer, more spread-out pins, the puck needs to be proportionally scaled so it still meaningfully interacts with the pins and fits the visual aesthetic of the board.

**Why this priority**: If the puck is unchanged while pin density halves, the puck-to-gap ratio shifts dramatically, affecting physics and feel.

**Independent Test**: Can be tested by dropping a puck and confirming it collides with pins naturally and doesn't pass through gaps without any interaction.

**Acceptance Scenarios**:

1. **Given** the board has the new pin layout, **When** a puck is dropped, **Then** the puck has a visually proportionate size relative to the pin spacing.
2. **Given** the adjusted puck, **When** it falls through the pin field, **Then** it collides with pins at a similar frequency as the original layout (i.e., doesn't fall straight through large gaps).

---

### User Story 5 — Reduced Collision Particle Effects (Priority: P3)

When the puck collides with a pin, the visual particle burst is smaller and less distracting. The effect should still be visible (confirming the collision happened) but should feel subtle rather than explosive.

**Why this priority**: This is a visual polish request. It improves aesthetics but doesn't affect gameplay mechanics. The game functions correctly regardless of particle intensity.

**Independent Test**: Can be tested by observing pin-hit visual effects during gameplay and confirming they are noticeably smaller and less numerous than before.

**Acceptance Scenarios**:

1. **Given** a puck collides with a pin, **When** the collision particle effect plays, **Then** the particle count is noticeably reduced compared to the current effect.
2. **Given** a puck collides with a pin, **When** the collision effect plays, **Then** a brief visual indicator is still visible (effect is not completely removed).
3. **Given** a puck collides with multiple pins in sequence, **When** all effects play, **Then** the screen is not overwhelmed with particle clutter.

---

### Edge Cases

- What happens when the puck is exactly on the top board boundary (center on the edge line)? The puck must be fully above the top boundary for out-of-bounds to trigger.
- What happens if the puck goes out of bounds upward during a shove animation? The out-of-bounds check takes priority and ends the round.
- What happens if the puck exits upward and re-enters the field (e.g., fast upward shove near the top)? As long as the puck returns within bounds, play continues; out-of-bounds only triggers if the puck doesn't return within a brief grace period (e.g., 0.5 seconds fully above the top edge).
- Can the puck escape through the sides or bottom? No — physical walls prevent this. Out-of-bounds detection only applies to the top edge.
- What happens with the staggered pin layout if the board width changes? The stagger offset is always relative to pin spacing, so the pattern scales with the board.
- What happens to existing saved game configurations? The new defaults apply to new games; any stored configuration overrides are respected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect when the puck has left the playing field through the **top edge** (above the board). Side and bottom walls remain in place and physically contain the puck.
- **FR-002**: When the puck goes out of bounds, the system MUST immediately end the current round and award zero points for that turn.
- **FR-003**: The system MUST display a brief "Out of Bounds" notification visible to all players when an out-of-bounds event occurs.
- **FR-004**: The system MUST allow a short grace period (approximately 0.5 seconds) before declaring out-of-bounds, to account for brief exits near edges.
- **FR-005**: The board MUST display 6 rows of pins (reduced from 12).
- **FR-005a**: Pin spacing MUST be increased from 1.0 to approximately 2.0 world units to maintain ~80% board-width coverage with the reduced pin count.
- **FR-005b**: The default number of pins per row MUST be 6 (even rows display 6 pins, odd rows display 5 in the staggered pattern).
- **FR-006**: Pins MUST be arranged in a staggered (offset) pattern where odd-numbered rows are horizontally shifted relative to even-numbered rows, ensuring no pin is directly below another.
- **FR-007**: The board MUST display 5 scoring buckets (reduced from 9).
- **FR-008**: Bucket scores MUST be symmetric with the highest value in the center (e.g., [100, 1000, 10000, 1000, 100]).
- **FR-009**: The puck size MUST be proportionally adjusted so the puck-to-pin-spacing ratio remains similar to the original layout (pin spacing increases from 1.0 to ~2.0, so puck radius scales accordingly from 0.25 to ~0.5).
- **FR-009a**: The pin radius MUST be reduced by 60% (from 0.30 to 0.12 world units) to create more open space between pins, giving pucks a less obstructed path and a more dynamic, varied fall trajectory.
- **FR-009b**: Puck-to-puck collision restitution MUST be 50% higher than the effective pin-to-puck restitution. The system MUST override the contact restitution in a pre-solve handler when both colliding bodies are pucks.
- **FR-010**: Pin-hit collision particle effects MUST be reduced from 6 particles to 2–3 particles per collision.
- **FR-011**: Pin-hit collision particle effects MUST still produce a visible indicator (not completely removed).
- **FR-012**: The shove zone limit MUST be recalculated proportionally for the new 6-row pin layout.

### Key Entities

- **Board Layout**: Defines pin rows, bucket count, pin spacing, pin radius, puck radius, bucket scores, and board dimensions. This feature modifies the default values for pin rows (12→6), bucket count (9→5), bucket scores, and puck radius.
- **Puck**: The player's game piece dropped through the pin field. Its radius is being adjusted to match the new board density.
- **Pin**: A fixed obstacle on the board. Pin arrangement (staggered pattern) is preserved but row count is halved. Pin radius is reduced by 60% (0.30→0.12) for a more open board.
- **Bucket**: A scoring zone at the bottom of the board. Count is reduced from 9 to 5 with redistributed scores.
- **Particle Effect**: A visual burst on collision. The pin-hit effect is reduced in intensity.
- **Out-of-Bounds Zone**: The area outside the board's playable boundaries. A new detection mechanism triggers round termination when the puck enters this zone.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pucks that leave the playing field trigger an out-of-bounds round termination with zero points.
- **SC-002**: Players see the "Out of Bounds" notification within 1 second of the puck exiting the field.
- **SC-003**: The board displays exactly 6 rows of pins and 5 buckets.
- **SC-004**: No two consecutive pin rows have pins in vertically aligned positions (stagger is present in every adjacent row pair).
- **SC-005**: Pucks dropped from the same position land in at least 2 different buckets across 10 drops, demonstrating meaningful randomness.
- **SC-006**: Pin-hit particle effects produce 2–3 particles per collision (reduced from 6).
- **SC-007**: Pin-hit particle effects remain visible to players (not fully suppressed).
- **SC-008**: The game session completes all rounds without freezing or entering an undefined state when out-of-bounds events occur.

## Clarifications

### Session 2026-02-24

- Q: With bucketCount reduced from 9 to 5, even rows have only 5 pins. At pinSpacing=1.0 they span just 4 world units (40% of the 10-unit board). Should pinSpacing increase to maintain board coverage? → A: Increase pinSpacing to ~2.0 to maintain current board coverage ratio.
- Q: The board has physical left, right, and bottom walls. Should those walls be removed so out-of-bounds can happen on all sides, or only detect out-of-bounds above the top edge? → A: Keep existing walls; out-of-bounds only possible through the top (puck flies upward off-screen).
- Q: The current pinHit particle effect emits 6 particles per collision. How aggressively should this be reduced? → A: Reduce to 2–3 particles (subtle but clearly visible spark).

## Assumptions

- The board dimensions (width: 10 world units, height: 14 world units) remain unchanged; only internal layout changes.
- Pin spacing MUST increase from 1.0 to approximately 2.0 world units so that the pin field continues to span ~80% of the board width, matching the original coverage ratio.
- The "Out of Bounds" notification is a simple transient overlay (consistent with existing notification patterns in the game), dismissed automatically after approximately 2 seconds.
- Bucket scores for 5 buckets are redistributed as a symmetric array (e.g., [100, 1000, 10000, 1000, 100]), maintaining the high-center, low-edge pattern from the original 9-bucket layout.
- The shove zone row limit scales proportionally from row 9 (of 12) to approximately row 4-5 (of 6), keeping roughly the top 75% of the pin field as the shove zone.
- The grace period for out-of-bounds detection (0.5 seconds) prevents false triggers from pucks momentarily flying above the top edge but still ensures timely round termination.
- Existing left, right, and bottom walls are retained; they physically prevent the puck from leaving those edges. Out-of-bounds detection is only needed for the top edge (no wall there).
