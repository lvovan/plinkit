# Feature Specification: Persistent Puck Growth & Board Standardization

**Feature Branch**: `010-persistent-puck-growth`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "The number of staggered rows should be fixed to 5, with no randomization. No pins should block entry to the buckets — the bottom pin row must be at least 1.25× puck radius above the tallest bucket divider, and the entire pin grid is translated up by the bucket divider height (1.5 world units). The non-shoving line should be at the 4th row (counting from the top). Bucket widths are explicitly distributed: 25% / 20% / 10% / 20% / 25% for the 100 / 1000 / 10000 / 1000 / 100 point buckets. Score multipliers reset each turn. All pucks are persistent. When two pucks from the same player touch one another, they each grow by 20% surface area (with 'popping' animation potentially causing bounces to neighboring pucks)."

## Clarifications

### Session 2026-02-25

- Q: Should there be a maximum puck size cap to prevent pucks from blocking pin passages? → A: Yes — cap at ~1.59× original surface area (max radius ≈ 0.631 world units), derived from the minimum diagonal pin gap in the 5-row layout. This allows exactly 2 full 20% growth events per puck; a 3rd growth is partially applied up to the cap or rejected.
- Q: Should a dedicated sound effect accompany the puck growth animation? → A: Yes — a short "pop" sound effect plays alongside the visual animation to distinguish growth from regular bounces.
- Q: Is scoring finalized on first bucket entry, or can it be reversed if a puck is knocked out? → A: Score is revocable — if a puck is knocked out of a bucket by a growth event or collision, the score is subtracted from the owning player.
- Q: Can a player's score go negative due to revocable scoring? → A: No — scores are clamped at zero; subtraction never takes a player below 0.
- Q: Should the player receive visual feedback when a score is subtracted? → A: Yes — a brief negative score flash (e.g., "-1000" in red near the scoreboard) is shown when a puck is knocked out of a bucket.

## User Scenarios & Testing *(mandatory)*
### User Story 1 — Fixed 5-Row Board Layout (Priority: P1)

Every game session uses a consistent board with exactly 5 staggered rows of pins. The layout never changes between rounds — players always see the same 5-row arrangement. This removes the per-round randomization of pin count that was previously in place, giving players a stable, learnable board where skill and familiarity are rewarded. The pin grid is vertically offset upward by the bucket divider height (1.5 world units) to ensure no pins block bucket entry, and the bottom pin row sits at least 1.25× puck radius above the tallest bucket divider.

**Why this priority**: A fixed board layout is the foundational change that all other mechanics in this feature depend on. The shove-zone boundary (row 4), puck persistence behavior, and same-player puck growth all assume a predictable, consistent board. Without this, placement strategy and growth mechanics cannot be meaningfully learned or exploited.

**Independent Test**: Start a game with 2+ players, play through 3 or more rounds, and confirm that every round displays the same 5-row staggered pin grid with no variation in row count or pin arrangement. Verify no pins overlap or block bucket entry.

**Acceptance Scenarios**:

1. **Given** a new game session starts, **When** the board is rendered, **Then** exactly 5 staggered rows of pins are displayed.
2. **Given** a round ends and a new round begins, **When** the board is regenerated, **Then** the pin layout is identical to the previous round (same 5-row arrangement, same pin positions).
3. **Given** any game session with any number of players, **When** the board is displayed, **Then** no randomization of pin count or arrangement occurs — the layout is deterministic and fixed.
4. **Given** the board is rendered, **When** the bottom pin row is examined, **Then** no pins overlap with or block the entry to any bucket — the bottom row sits at least 1.25× puck radius above the top of the tallest bucket divider.

---

### User Story 2 — Same-Player Puck Growth on Contact (Priority: P1)

When a newly dropped puck or an existing puck belonging to the same player comes into contact with another puck owned by that same player, both pucks grow by 20% surface area. A satisfying "popping" animation plays on each growing puck. The expansion can physically push neighboring pucks (from any player) that are close enough, potentially causing chain reactions. This mechanic rewards players who cluster their drops strategically, creating growing obstacles that disrupt opponents and dominate board real estate.

**Why this priority**: This is the headline mechanic of the feature — it introduces a strategic layer where players think about puck placement relative to their own previous pucks. Without growth, persistent pucks are passive obstacles; with growth, they become active tools for area control and opponent disruption.

**Independent Test**: Drop two pucks for the same player in positions where they will come to rest near each other. Confirm that when the second puck touches the first, both visibly grow and a popping animation plays. Verify that nearby pucks from other players are pushed away by the expansion.

**Acceptance Scenarios**:

1. **Given** a player has a puck resting on the board, **When** that player's next puck comes into contact with the resting puck, **Then** both pucks grow by 20% surface area each.
2. **Given** two same-player pucks touch, **When** the growth occurs, **Then** a "popping" animation plays on each growing puck, clearly indicating the growth event.
3. **Given** a same-player puck growth event occurs, **When** neighboring pucks (from any player) are within range of the expanded pucks, **Then** those neighboring pucks are physically pushed outward by the expansion.
4. **Given** a growth-induced push moves a neighboring same-player puck into contact with yet another same-player puck, **When** that new contact occurs, **Then** a chain-reaction growth event is triggered (both touching pucks grow by an additional 20% surface area each).
5. **Given** two pucks from different players come into contact, **When** the collision occurs, **Then** no growth happens — growth is exclusive to same-player puck pairs.
6. **Given** a puck has already grown multiple times through successive contacts, **When** it touches another same-player puck again, **Then** both pucks grow by 20% of their current surface area (growth is cumulative and compounds), up to the maximum size cap.
7. **Given** a puck has reached the maximum size cap (~1.59× original surface area), **When** it touches another same-player puck, **Then** the capped puck does not grow further, but the other puck still grows if it is below the cap.

---

### User Story 3 — Score Multiplier Reset Per Turn (Priority: P2)

At the start of each player's turn, the bounce multiplier resets to its base value (1.0×). The multiplier then accumulates based purely on the bounces that occur during that single puck drop. This ensures each turn's score is self-contained — a player cannot carry over multiplier benefits from a previous turn, keeping scoring fair and per-turn performance the sole factor.

**Why this priority**: Fair, per-turn scoring is essential for competitive integrity. If multipliers carried over, early-round luck would compound into late-round dominance. Resetting each turn keeps every drop equally consequential.

**Independent Test**: Play a 2-player game. On Player 1's first turn, note the final multiplier. On Player 1's second turn, confirm the multiplier starts at 1.0× regardless of the previous turn's bounces.

**Acceptance Scenarios**:

1. **Given** a player's turn begins, **When** the bounce multiplier is initialized, **Then** the multiplier starts at 1.0× regardless of what happened in any previous turn.
2. **Given** a puck bounces 10 times during a turn and lands with a 3.0× multiplier, **When** the same player's next turn begins, **Then** the multiplier resets to 1.0× before the new puck is dropped.
3. **Given** a player's puck is dropped, **When** it bounces off pins, walls, or other pucks during the drop, **Then** the multiplier accumulates normally using only bounces from this current drop.

---

### User Story 4 — Shove-Zone Boundary at Row 4 (Priority: P2)

The shove zone — the area where players are allowed to apply shove impulses to the active puck — extends from the top of the board down to the 4th row of pins (inclusive). Below the 4th row, shoves are disabled. A visible boundary line or shading marks the transition, making it clear where shove control ends. This replaces the previous configurable shove zone with a fixed boundary tied to the standardized 5-row layout.

**Why this priority**: The shove zone defines a critical strategic trade-off — players have influence over puck trajectory in the upper portion of the board but must rely on physics for the final descent. Fixing it at row 4 (of 5) gives players control over 80% of the pin rows, which is generous enough to feel impactful while still leaving the final row as an unpredictable "luck zone."

**Independent Test**: Drop a puck and attempt to shove it at various vertical positions. Confirm shoves work above and at row 4, and are rejected below row 4. Verify the shove-zone boundary is visually indicated.

**Acceptance Scenarios**:

1. **Given** a puck is falling through the board above or at row 4, **When** the player performs a shove gesture, **Then** the shove impulse is applied to the puck.
2. **Given** a puck has passed below row 4 (row 5), **When** the player attempts a shove gesture, **Then** the shove is rejected and no impulse is applied.
3. **Given** the board is displayed, **When** the player looks at the board, **Then** a visible horizontal line or shading boundary marks the shove cutoff at row 4.

---

### User Story 5 — Persistent Pucks Across Rounds (Priority: P2)

All pucks dropped throughout the game remain on the board as physical objects. They do not disappear between turns or rounds. Pucks that have landed in buckets stay in their buckets; pucks resting on pins or other pucks stay where they are. As the game progresses, the board becomes increasingly crowded, changing puck trajectories, creating new bounce opportunities, enabling more same-player puck contacts, and making later rounds more chaotic and exciting.

**Why this priority**: Puck persistence is the enabling condition for the same-player growth mechanic. Without persistent pucks, there are no resting same-player pucks to collide with. Persistence also transforms the board into a dynamic, evolving playing field that gets more interesting as the game progresses.

**Independent Test**: Play a 2-player game for 3+ rounds. After each turn, confirm the dropped puck remains visible on the board. After multiple rounds, confirm the board shows all previously dropped pucks and new pucks interact physically with them.

**Acceptance Scenarios**:

1. **Given** a puck has landed in a bucket or come to rest on the board, **When** the next player's turn begins, **Then** the previous puck is still visible and physically present on the board.
2. **Given** multiple rounds have been played, **When** a new puck is dropped, **Then** it physically collides with and bounces off all previously dropped pucks that are in its path.
3. **Given** the board has many persistent pucks, **When** a new puck is dropped, **Then** the game continues to run smoothly without visual or gameplay degradation.
4. **Given** a puck has scored by landing in a bucket, **When** a later collision or growth event pushes the puck out of that bucket, **Then** the bucket's score is subtracted from the owning player's total.

---

### Edge Cases

- What happens when a puck grows so large that it overlaps a pin? Growth is capped at ~1.59× original surface area (max radius ~0.631), ensuring the puck always fits between the minimum diagonal pin gap (~1.263 edge-to-edge). If minor overlap occurs due to positioning, the physics simulation resolves it naturally by pushing the puck away.
- What happens if a chain-reaction growth cascades across many pucks? Growth events should be processed sequentially within a single simulation step to prevent infinite loops; a maximum chain depth (e.g., 10 events per drop) should be enforced.
- What happens if a growing puck pushes another puck off the board or out of a bucket? The displaced puck is recaptured by normal physics (walls, bucket boundaries) and settles into a new valid position. If the puck was scored in a bucket and is knocked out, the score for that bucket is subtracted from the owning player. If the puck later lands in a different bucket, it scores the new bucket's value.
- What happens when the board is extremely crowded with large persistent pucks and a new puck cannot pass through? The existing auto-shove and stall-detection mechanisms handle stuck pucks; pucks will be nudged or assigned to the nearest bucket after the timeout.
- What happens if two same-player pucks contact each other while both are in motion (e.g., during a chain-reaction push)? Growth triggers on any same-player puck-to-puck contact, regardless of whether the pucks are moving or stationary.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board MUST display exactly 5 staggered rows of pins in every round, with no randomization of row count or pin arrangement.
- **FR-001a**: The entire pin grid MUST be vertically offset upward by the bucket divider height (1.5 world units) so that no pins block entry to the buckets.
- **FR-001b**: The bottom pin row MUST be positioned at least 1.25× puck radius above the top of the tallest bucket divider.
- **FR-002**: The shove zone MUST extend from the top of the board down to and including the 4th row of pins. Shove inputs below row 4 MUST be rejected.
- **FR-003**: A visible boundary (line or shading) MUST be rendered at the 4th row to indicate where the shove zone ends.
- **FR-003a**: Bucket widths MUST follow the explicit distribution: 25% (100 pts) / 20% (1000 pts) / 10% (10000 pts) / 20% (1000 pts) / 25% (100 pts) of the total board width.
- **FR-004**: The bounce score multiplier MUST reset to 1.0× at the start of each player's turn.
- **FR-005**: The bounce multiplier MUST accumulate only from bounces occurring during the current puck drop, with no carry-over from previous turns.
- **FR-006**: All dropped pucks MUST persist on the board as physical objects across turns and rounds for the entire game session.
- **FR-007**: Persistent pucks MUST participate in the physics simulation, affecting the trajectory of newly dropped pucks.
- **FR-008**: When two pucks belonging to the same player come into contact, both pucks MUST grow by 20% surface area.
- **FR-009**: A "popping" animation and a dedicated short "pop" sound effect MUST play on each puck that grows due to a same-player contact event.
- **FR-010**: Puck growth MUST physically displace neighboring pucks that are within range of the expanded surface area.
- **FR-011**: Growth MUST be able to chain-react — if a growth-induced push causes a new same-player puck contact, that contact MUST also trigger growth.
- **FR-012**: Chain-reaction growth MUST be capped at a maximum depth (e.g., 10 events per drop) to prevent runaway cascades.
- **FR-013**: Pucks from different players MUST NOT trigger growth when they contact each other.
- **FR-014**: Growth MUST be cumulative — a puck that has grown previously grows by 20% of its current surface area on each subsequent same-player contact, subject to the size cap.
- **FR-015**: Puck growth MUST be capped so that the grown puck's radius never exceeds half the minimum pin-edge gap (~0.631 world units, or ~1.59× original surface area). Growth events that would exceed the cap MUST be partially applied (grow to cap) or rejected for the puck that has reached the cap.
- **FR-016**: Bucket scoring MUST be revocable — if a puck that previously scored in a bucket is knocked out of that bucket by a collision or growth event, the bucket's score MUST be subtracted from the owning player's total. If the displaced puck subsequently lands in a different bucket, it scores the new bucket's value.
- **FR-017**: A player's total score MUST never go below zero. Score subtractions that would reduce the total below zero MUST clamp to zero.
- **FR-018**: When a puck is knocked out of a bucket and its score is revoked, a brief negative score indicator (e.g., "-1000" in red) MUST be displayed near the scoreboard to inform the affected player.

### Key Entities

- **Puck**: A player-owned physics object on the board. Key attributes: owning player, current surface area (base + accumulated growth, capped at ~1.59× base), current radius (capped at ~0.631), position, velocity. Pucks persist for the entire game session and may grow through same-player contacts up to the size cap.
- **Growth Event**: An occurrence triggered when two same-player pucks touch. Attributes: the two participating pucks, the resulting size increase for each, any chain-reaction events spawned.
- **Shove Zone**: The vertical region of the board (rows 1–4 of 5) where shove inputs are accepted. Defined by a fixed boundary at row 4.
- **Bounce Multiplier**: A per-turn scoring factor that starts at 1.0× and increases with each bounce during a single puck drop. Resets at the start of every turn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players see the identical 5-row pin layout in 100% of rounds across all game sessions — no variation occurs. No pins block bucket entry.
- **SC-002**: The shove zone is correctly enforced at row 4 — 100% of shove attempts below the boundary are rejected, and the boundary is visible to all players.
- **SC-003**: Bounce multipliers start at exactly 1.0× at the beginning of every turn, with zero carry-over from previous turns verifiable via score breakdowns.
- **SC-004**: All pucks from previous turns remain visible and physically interactive on the board throughout the entire game session.
- **SC-005**: When two same-player pucks touch, both visibly grow, a popping animation plays, and a dedicated "pop" sound effect is heard within 0.5 seconds of contact.
- **SC-006**: Puck growth physically displaces nearby pucks in at least 80% of cases where neighboring pucks are within contact range.
- **SC-007**: Chain-reaction growth events resolve completely within 3 seconds, with no infinite loops or game freezes.
- **SC-008**: Players can complete a full 5-round, 4-player game session with persistent pucks and growth mechanics without experiencing game-blocking bugs or performance issues.
- **SC-009**: When a puck is knocked out of a bucket, a negative score indicator is visibly displayed within 0.5 seconds, and the player's scoreboard total updates accordingly (never dropping below zero).

## Assumptions

- The existing number of pins per row remains unchanged (currently 5 in even rows, 4 in odd rows). The row count is fixed to 5.
- The existing bucket count (5 buckets) and scoring values remain unchanged. Bucket widths are explicitly set to 25% / 20% / 10% / 20% / 25% of board width.
- The bounce multiplier rate (1.15× per bounce) and cap (10.0×) remain unchanged; only the reset-per-turn behavior is new.
- The existing auto-shove and stall-detection mechanisms continue to function as-is to handle stuck pucks on a crowded board.
- Bucket scoring is revocable: a puck knocked out of a bucket loses its score, and a puck pushed into a new bucket earns the new bucket's value. A player's total score can decrease mid-game as a result, but is clamped at zero (never goes negative).
- The "popping" animation is a visual expansion effect (scale-up with overshoot/spring) accompanied by a dedicated short "pop" sound effect to distinguish growth events from regular bounce collisions.
- Growth is triggered by any contact between same-player pucks, whether during an active drop or as a result of a chain reaction from another growth event.
- The puck size cap (~1.59× original surface area, max radius ~0.631) is derived from the minimum diagonal pin-edge gap in the 5-row layout. This allows exactly 2 full 20% growth events per puck.
- The pin grid is vertically offset upward by the bucket divider height (1.5 world units) to ensure clear, unobstructed bucket entry.
