# Feature Specification: Round Persistence & Audio Tuning

**Feature Branch**: `009-round-persistence-audio`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Pin layout randomization only before P1 turn, pucks persist between rounds with auto-repositioning, music at 30% of SFX volume"

## Clarifications

### Session 2026-02-25

- Q: How should puck repositioning after pin relocation be presented to the player? → A: Animated settling — the physics engine runs visibly for a short time so players see pucks being pushed to new positions.
- Q: When a puck is repositioned by pin relocation, should its bounce multiplier be recalculated? → A: Keep original bounce multiplier — only the bucket assignment changes after repositioning.
- Q: When puck repositioning causes score changes, should there be visible feedback? → A: Score delta indicators — brief floating "+X" / "−X" labels appear near repositioned pucks showing the score change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pucks Persist Between Rounds (Priority: P1)

As a player, I want my pucks to remain on the board across rounds so that the board accumulates pucks throughout the game, creating increasingly complex and strategic drop decisions.

Currently, all pucks are removed at each round transition and the physics world is rebuilt from scratch. With this change, pucks dropped in earlier rounds stay on the board as collidable objects for the remainder of the game. This transforms the game from isolated rounds into a continuous, evolving board state where earlier drops influence later strategy.

**Why this priority**: This is the core mechanic change that fundamentally alters gameplay. Without persistent pucks, the other changes (pin relocating, score recounting) have no purpose.

**Independent Test**: Can be fully tested by playing a 3-round, 2-player game and verifying that pucks from round 1 are still visible and collidable in rounds 2 and 3. Delivers strategic depth by making the board state accumulate over time.

**Acceptance Scenarios**:

1. **Given** a 2-player game in round 1, **When** both players have dropped their pucks and round 2 begins, **Then** all pucks from round 1 remain visible on the board and physically collidable.
2. **Given** a board with pucks from prior rounds, **When** a new puck is dropped, **Then** it can collide with and bounce off existing pucks from earlier rounds.
3. **Given** a game with 3+ rounds completed, **When** looking at the board, **Then** all pucks from all prior rounds are displayed with each player's distinct visual style.
4. **Given** a tie-breaker round begins, **When** the tie-breaker starts, **Then** all pucks from prior rounds are cleared and players start with a fresh board.

---

### User Story 2 - Pin Randomization Only Before Player 1's Turn (Priority: P2)

As a player, I want the pin layout to only change after every player has had their turn (i.e., at the start of a new round, before Player 1 drops), so that all players within a round face the same board layout and the game feels fair.

Currently, pin layout randomizes at every round transition. This change ensures that within a single round, all players face an identical pin arrangement. The layout only re-randomizes once all players have completed their turns, right before the next round begins.

**Why this priority**: Fairness is critical — all players in a round must play the same pin layout. This depends on persistent pucks (P1) because pin relocation triggers puck repositioning.

**Independent Test**: Can be fully tested by playing a 2-player, 2-round game and verifying that both players in round 1 see the same pin layout, then the layout changes at the start of round 2.

**Acceptance Scenarios**:

1. **Given** a 2-player game, **When** Player 1 completes their turn and it becomes Player 2's turn within the same round, **Then** the pin layout remains unchanged.
2. **Given** all players have completed their turns in a round, **When** the next round begins (Player 1's turn), **Then** a new randomized pin layout is generated.
3. **Given** a 4-player game in round 1, **When** Players 1 through 4 each take their turn, **Then** all four players play against the exact same pin arrangement.
4. **Given** a game just started, **When** Player 1 takes the very first turn, **Then** a randomized pin layout is already in place from game initialization.

---

### User Story 3 - Automatic Puck Repositioning After Pin Relocation (Priority: P3)

As a player, I want pucks that overlap with newly placed pins to be automatically nudged to a stable, non-overlapping position so that the board remains physically valid after pin randomization.

When the pin layout changes at a round boundary, some existing pucks may now overlap with the new pin positions. The system must detect these overlaps and push the affected pucks to the nearest valid stable position. The repositioning is presented as a visible animated settling sequence: the physics engine runs in real-time so players can see pucks sliding and bouncing to their new positions. After repositioning, each puck's bucket assignment must be rechecked and scores recalculated.

**Why this priority**: This is a necessary consequence of combining persistent pucks (P1) with pin randomization (P2). Without auto-repositioning, pucks could clip through pins, causing visual glitches and physics instability.

**Independent Test**: Can be tested by setting up a board with settled pucks, triggering a pin layout change that places pins where pucks currently rest, and verifying pucks are pushed to stable positions with scores updated.

**Acceptance Scenarios**:

1. **Given** a puck is settled in a position where a new pin will be placed, **When** the pin layout changes, **Then** the puck is pushed to the nearest non-overlapping stable position.
2. **Given** multiple pucks overlap with new pin positions, **When** the pin layout changes, **Then** all affected pucks are repositioned without overlapping each other or any pins.
3. **Given** pucks are repositioned after a layout change, **When** the repositioning completes, **Then** each puck's bucket assignment is rechecked based on its new position and player scores are recalculated accordingly.
4. **Given** a puck repositioning causes the puck to move into a different bucket, **When** scores are recalculated, **Then** the scoreboard reflects the updated totals for all affected players.
5. **Given** pucks are repositioned, **When** the process completes, **Then** all pucks are in physically stable positions (not floating, not overlapping pins or other pucks).
6. **Given** a puck's bucket assignment changes due to repositioning, **When** the settling animation completes, **Then** a brief floating score delta indicator ("+X" or "−X") appears near the affected puck showing the change in that puck's score contribution.

---

### User Story 4 - Music Volume Relative to Sound Effects (Priority: P4)

As a player, I want the music to play at 30% of the sound effects volume so that background music is present but never drowns out game feedback sounds like puck drops, pin hits, and bucket landings.

**Why this priority**: This is a simple audio tuning change that improves the overall game feel. It is independent of the other stories and has minimal risk.

**Independent Test**: Can be tested by starting the game with both music and SFX enabled and verifying that the music is noticeably quieter than sound effects — specifically that the music volume is 30% of the SFX volume level.

**Acceptance Scenarios**:

1. **Given** the game is running with default audio settings, **When** both music and SFX are playing, **Then** the music volume is exactly 30% of the SFX volume.
2. **Given** the SFX volume is at its default level, **When** music starts playing, **Then** the music is clearly audible but significantly quieter than sound effects.

---

### Edge Cases

- What happens when a puck is repositioned and pushed off the board entirely (e.g., the new layout is so different the puck cannot find a valid stable position)? The puck should be treated as out-of-bounds — removed from the board with its score contribution set to zero.
- What happens when a chain reaction occurs during repositioning (puck A is pushed into puck B, which is pushed into puck C)? The system must resolve all cascading collisions until every puck reaches a stable position.
- What happens when a puck sits exactly on the boundary between the old bucket zone and a new bucket zone after repositioning? The puck's center position determines its bucket assignment.
- What happens during a tie-breaker? All persistent pucks from prior rounds are cleared, and the tie-breaker begins with a fresh board and fresh pin layout.
- What happens if all pin positions in the new layout create overlaps with existing pucks? The system must still resolve to a physically valid state, even if pucks cascade significantly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST retain all pucks on the board across round transitions. Pucks dropped in any round remain visible and collidable for all subsequent rounds.
- **FR-002**: The system MUST only clear pucks when starting a tie-breaker round, starting a new game ("play again"), or returning to the player setup screen ("new players").
- **FR-003**: The system MUST NOT re-randomize the pin layout between individual player turns within the same round. All players in a round face the same pin arrangement.
- **FR-004**: The system MUST re-randomize the pin layout at the start of each new round, before Player 1's turn.
- **FR-005**: After re-randomizing the pin layout, the system MUST detect all pucks that overlap with newly placed pins and automatically reposition them to the nearest non-overlapping stable position via a visible animated settling sequence (physics engine runs in real-time).
- **FR-006**: After repositioning pucks, the system MUST re-evaluate each repositioned puck's bucket assignment and recalculate all player scores accordingly. The puck's original bounce multiplier from the player's drop MUST be preserved; only the bucket assignment changes.
- **FR-007**: The repositioning process MUST resolve all cascading collisions (puck-to-puck and puck-to-pin) until every puck on the board is in a stable, non-overlapping state.
- **FR-008**: If a puck cannot be repositioned to a valid on-board position, the system MUST treat it as out-of-bounds and remove it from the board, setting its score contribution to zero.
- **FR-009**: The music volume MUST be set to exactly 30% of the sound effects volume level.
- **FR-010**: The game initialization MUST generate a randomized pin layout before the first turn of the game.
- **FR-011**: When puck repositioning causes a puck's bucket assignment to change, the system MUST display a brief floating score delta indicator ("+X" or "−X") near the affected puck to communicate the score change to players.

### Key Entities

- **Puck**: A player's dropped game piece. Has an owning player, visual style, physical position, settled status, and bucket assignment. Persists on the board across rounds until game end or tie-breaker.
- **Pin**: A static obstacle on the board arranged in a grid layout. Position is randomized at the start of each round. Defined by row count, pins per row, spacing, and radius.
- **Board Layout**: The configuration of pins on the board for a given round, including row count (5–9), pins per row (4–6), spacing, and pin radius.
- **Bucket**: A scoring zone at the bottom of the board. Each bucket has an assigned point value. A puck's bucket assignment is determined by where it settles.
- **Round**: A cycle in which every player gets exactly one turn. Pin layout is fixed for the duration of a round.
- **Player Score**: The sum of bucket values for all of a player's settled pucks currently on the board. Recalculated whenever puck positions change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a multi-round game, 100% of pucks from prior rounds remain visible and collidable on the board throughout the game.
- **SC-002**: All players within a single round play against an identical pin layout — zero layout changes occur between turns within a round.
- **SC-003**: After a pin layout change, all pucks reach a physically stable state (no overlaps with pins or other pucks) before the next player's turn begins.
- **SC-004**: After puck repositioning, player scores accurately reflect the current bucket assignment of every puck on the board.
- **SC-005**: Music volume is perceptibly quieter than sound effects, at exactly 30% of the SFX level.
- **SC-006**: Puck repositioning completes within 2 seconds so that the round transition feels seamless to players.
- **SC-007**: When scores change due to puck repositioning, floating score delta indicators are displayed near affected pucks, giving players clear feedback about what changed.

## Assumptions

- The existing pin randomization ranges (5–9 rows, 4–6 pins per row) remain unchanged.
- The existing scoring formula (bucket value × bounce multiplier) remains unchanged; only which bucket a puck is assigned to may change after repositioning. The bounce multiplier earned during the player's original drop is preserved through repositioning.
- The existing puck visual styles (color, pattern, label) remain unchanged.
- Puck repositioning uses the physics engine's collision resolution to push pucks to stable positions (simulating settling) rather than teleporting them.
- The existing mute toggles for music and SFX continue to function independently.
- "30% of SFX volume" means music_volume = sfx_volume × 0.30. If the SFX volume is 0.7, then music volume should be 0.21.
