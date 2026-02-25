# Feature Specification: Gameplay Variety & Polish

**Feature Branch**: `008-gameplay-variety`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Pin layout & round variability, anti-stuck mechanism, player name persistence, first-round shove guidance, proportional bucket visuals, coin sound effect."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Dynamic Pin Layout Per Round (Priority: P1)

Each round presents a fresh pin arrangement so that no two rounds feel the same. When a new round starts, the board regenerates with a randomly chosen number of pin rows (between 5 and 9) and pins per row (between 4 and 6). All players in that round see and play against the exact same layout, keeping the round fair.

**Why this priority**: Round-to-round variety is the core value proposition of this feature set. Without it, repeated rounds feel monotonous. Varying the pin grid directly affects puck physics paths, making every round a unique challenge.

**Independent Test**: Start a game with 2 players, play through 3+ rounds, and confirm that the pin grid visibly changes between rounds while remaining identical for both players within each round.

**Acceptance Scenarios**:

1. **Given** a game session with multiple rounds, **When** a new round begins, **Then** the pin layout (row count and pins-per-row count) is different from the previous round.
2. **Given** a new round starts, **When** Player 1 and Player 2 take their turns, **Then** both players see and interact with the identical pin arrangement for that round.
3. **Given** a round with 5 pin rows and 4 pins per row, **When** the puck is dropped, **Then** it interacts correctly with the reduced grid and lands in a valid bucket.
4. **Given** a round with 9 pin rows and 6 pins per row, **When** the puck is dropped, **Then** it interacts correctly with the denser grid and lands in a valid bucket.

---

### User Story 2 — Auto-Shove for Stuck Pucks (Priority: P1)

If a puck becomes stuck at any position on the board (e.g., wedged between pins, resting on top of another puck, or trapped against a wall), the game automatically applies an impulse to free it. This ensures the game never enters a blocked state where a player must wait indefinitely for their turn to end.

**Why this priority**: A stuck puck blocks the entire game flow. The existing stall detection assigns the puck to the nearest bucket after a 10-second timeout, but it does not attempt to dislodge the puck first. An auto-shove applied before the fallback bucket assignment keeps the game flowing naturally.

**Independent Test**: Drop a puck and observe that if it becomes visually stuck (near-zero velocity outside the bucket zone), a visible nudge is applied within a few seconds to unstick it.

**Acceptance Scenarios**:

1. **Given** a puck is on the board and has near-zero velocity for a configurable threshold duration (e.g., 3 seconds), **When** the stall is detected outside the bucket zone, **Then** an automatic downward impulse is applied to the puck to dislodge it.
2. **Given** an auto-shove has been applied, **When** the puck is still stuck after the nudge, **Then** additional auto-shoves are applied (up to a maximum retry count) before the existing fallback (assign to nearest bucket) activates.
3. **Given** an auto-shove fires, **When** the player views the board, **Then** a subtle visual and/or audio cue indicates that the puck was nudged automatically.

---

### User Story 3 — Coin Sound on Bucket Score (Priority: P2)

When a puck lands in a bucket and earns points, a satisfying coin/cash-register sound effect plays in addition to the existing bucket-land arpeggio. The coin sound reinforces the feeling of earning points and gives immediate audio feedback.

**Why this priority**: Audio feedback significantly improves the perception of reward. The existing bucket-land arpeggio is celebratory but lacks the visceral "you earned something" feel of a coin sound. Adding this is a small, self-contained enhancement with high impact on game feel.

**Independent Test**: Drop a puck, let it land in any bucket, and confirm that a coin sound plays alongside the existing bucket-land sound.

**Acceptance Scenarios**:

1. **Given** a puck settles into a bucket, **When** the score is awarded, **Then** a coin-like sound effect plays.
2. **Given** SFX are muted, **When** a puck lands in a bucket, **Then** no coin sound plays.
3. **Given** slow-motion is active, **When** a puck lands in a bucket during slow-motion, **Then** the coin sound respects the current time scale (pitch-shifted and time-stretched).

---

### User Story 4 — Proportional Bucket Visuals (Priority: P2)

Bucket score labels and their visual containers are rendered with proportional sizing — higher-scoring buckets appear visually larger while lower-scoring side buckets appear smaller. This gives players an immediate visual sense of which buckets are most valuable without needing to read scores.

**Why this priority**: Visual hierarchy makes the board more readable at a glance. Currently all buckets are equally sized, making the center jackpot bucket indistinguishable from side buckets at a distance.

**Independent Test**: Start a game and verify that the center (high-value) bucket is visibly wider/taller than the side (low-value) buckets. Score labels should scale proportionally.

**Acceptance Scenarios**:

1. **Given** the game board is rendered, **When** the player views the bucket area, **Then** bucket widths are visually proportional to their score values (highest-value bucket is widest, lowest-value buckets are narrowest).
2. **Given** buckets with scores [100, 1000, 10000, 1000, 100], **When** the board is displayed, **Then** the center bucket is noticeably larger than the side buckets.
3. **Given** a puck lands in a visually larger bucket, **When** the score is calculated, **Then** the score matches the bucket's displayed value (visual size corresponds to actual score).

---

### User Story 5 — Player Name Persistence (Priority: P3)

Returning players can start a new game without retyping their names. When a player enters their name during registration, it is saved to browser storage. On subsequent visits, the registration form pre-fills with previously used names, which the player can accept, edit, or clear.

**Why this priority**: Quality-of-life improvement for repeat players. Not critical for first-time play but reduces friction in subsequent sessions. Lower priority because the current name entry is already fast (short names, no validation beyond 1 character).

**Independent Test**: Register with names "Alice" and "Bob", complete or quit the game, reload the page, and confirm that the registration form pre-fills with "Alice" and "Bob".

**Acceptance Scenarios**:

1. **Given** a player registers with the name "Alice", **When** the game ends and a new session starts (or the page is reloaded), **Then** the first player input field is pre-filled with "Alice".
2. **Given** multiple players registered in a previous session, **When** a new registration form appears, **Then** all previously used names are pre-filled in order.
3. **Given** pre-filled names are displayed, **When** the player edits or clears a name field, **Then** the edited name is used and the updated name is saved for next time.
4. **Given** the player clears browser storage (localStorage), **When** the registration form appears, **Then** no names are pre-filled.

---

### User Story 6 — First-Round Shove Guidance Popup (Priority: P3)

If no player performs any shove action during the entire first round, a small "Did you know?" popup appears at the end of that round. The popup briefly explains how to perform a shove (flick gesture) and how it influences the puck's trajectory. This ensures players discover the shove mechanic even if the existing tutorial indicator was insufficient.

**Why this priority**: The existing tutorial indicator shows how to position and drop the puck but doesn't prominently teach the shove mechanic. Many first-time players may miss it entirely. However, this is a secondary teaching moment — the game is fully playable without shoves.

**Independent Test**: Start a game with 2 players, complete Round 1 without performing any shove (just drop the puck), and verify that a "Did you know?" popup appears after the last turn of Round 1.

**Acceptance Scenarios**:

1. **Given** Round 1 has ended, **When** no player performed a shove during any turn in Round 1, **Then** a "Did you know?" popup appears explaining the shove mechanic.
2. **Given** Round 1 has ended, **When** at least one player performed a shove during Round 1, **Then** no popup appears.
3. **Given** the popup is displayed, **When** the player taps/clicks to dismiss it, **Then** the popup closes and Round 2 begins.
4. **Given** the popup was shown in a previous game in the same browser session, **When** a new game starts and Round 1 ends without shoves, **Then** the popup is NOT shown again (shown at most once per browser session).

---

### Edge Cases

- What happens if the dynamic pin layout generates a configuration where pucks consistently get stuck?
  The auto-shove mechanism (US2) acts as a safety net regardless of layout. Additionally, the layout generation must ensure minimum spacing between pins so that pucks can physically pass through gaps.
- What happens if localStorage is full or unavailable (e.g., private browsing)?
  Player name persistence degrades gracefully — the registration form works normally without pre-filled names, and no errors are shown.
- What happens if a round has very few pins (5 rows × 4 per row) and pucks fall straight through with few bounces?
  This is an acceptable gameplay outcome — fewer bounces means lower multipliers, adding strategic variety across rounds.
- What happens if the auto-shove accidentally launches the puck out of bounds?
  The existing out-of-bounds handling assigns 0 points for the turn. The auto-shove impulse should be small enough to dislodge without catapulting.
- What happens if the shove guidance popup would overlap with a tie-breaker or game-end screen?
  The popup is only shown at the end of Round 1 during normal play and must not appear during tie-breaker rounds or game-end results.

## Requirements *(mandatory)*

### Functional Requirements

**Dynamic Pin Layout**

- **FR-001**: At the start of each round (including tie-breaker rounds), the game MUST generate a new pin layout with a randomly selected row count between 5 and 9 (inclusive) and pins-per-row count between 4 and 6 (inclusive).
- **FR-002**: Within a single round, all players MUST play against the identical pin layout.
- **FR-003**: The generated layout MUST ensure that the minimum gap between adjacent pins is large enough for a puck to pass through (puck diameter < pin gap).
- **FR-004**: Bucket count and bucket scores MUST remain constant across rounds (only the pin grid changes).
- **FR-005**: The board's physics world MUST be rebuilt with the new pin positions at each round transition (existing pucks are cleared between rounds as part of the current game flow during tie-breakers; within regular rounds, pucks persist per existing behavior).

**Auto-Shove for Stuck Pucks**

- **FR-006**: The game MUST detect a stuck puck when it has near-zero velocity (below the existing stalled velocity threshold) for a configurable duration (default: 3 seconds) while positioned above the bucket settling zone.
- **FR-007**: When a stuck puck is detected above the bucket zone, the game MUST apply a small downward impulse to dislodge it rather than immediately assigning it to the nearest bucket.
- **FR-008**: The auto-shove MUST be retried up to a configurable maximum number of attempts (default: 3) if the puck remains stuck after the first nudge.
- **FR-009**: If the puck remains stuck after all auto-shove retries, the existing fallback behavior (assign to nearest bucket after stall timeout) MUST activate.
- **FR-010**: Each auto-shove event MUST produce a subtle audio cue to inform the player.

**Coin Sound Effect**

- **FR-011**: A coin-like sound effect MUST play each time a puck settles into a bucket and earns points.
- **FR-012**: The coin sound MUST respect the SFX mute toggle and slow-motion time scale, consistent with other game sounds.

**Proportional Bucket Visuals**

- **FR-013**: Bucket visual widths MUST be proportional to their score values, with higher-scoring buckets rendered wider and lower-scoring buckets rendered narrower.
- **FR-014**: The total bucket area MUST still span the full board width (proportional sizing redistributes space, not adds space).
- **FR-015**: Bucket score labels MUST scale with their container size to remain readable.

**Player Name Persistence**

- **FR-016**: When a player submits the registration form, all entered player names MUST be saved to browser localStorage.
- **FR-017**: When the registration form is shown, previously saved names MUST be pre-filled into the name input fields (in the same order they were saved).
- **FR-018**: If localStorage is unavailable or throws an error, the registration form MUST function normally without persistence (silent degradation).

**First-Round Shove Guidance**

- **FR-019**: If no shove was performed by any player during Round 1, a "Did you know?" popup MUST appear after the last turn of Round 1 before Round 2 begins.
- **FR-020**: The popup MUST briefly explain how to perform a shove (flick gesture on a falling puck) and its effect on trajectory.
- **FR-021**: The popup MUST be dismissible with a single tap or click.
- **FR-022**: The popup MUST appear at most once per browser session (tracked via a session-level flag, not localStorage).

### Key Entities

- **Round Layout**: A per-round configuration specifying pin row count, pins-per-row count, and the resulting computed pin positions. Shared by all players in that round.
- **Auto-Shove Event**: A system-triggered impulse applied to a stuck puck, with tracking of retry count and timestamps.
- **Saved Player Names**: An ordered list of player display names stored in browser localStorage under a well-known key.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across 5 consecutive rounds, at least 3 rounds have a visibly different pin arrangement (different row count or pins-per-row count).
- **SC-002**: A puck stuck between pins is dislodged by auto-shove within 5 seconds (3-second detection + impulse application), preventing indefinite stalling.
- **SC-003**: 100% of bucket landings produce both the existing bucket-land sound and the new coin sound effect.
- **SC-004**: The center (highest-value) bucket is visually at least 1.5× wider than the outermost (lowest-value) buckets.
- **SC-005**: Returning players see their previously entered names pre-filled in the registration form within 1 second of the form appearing.
- **SC-006**: First-time players who did not shove during Round 1 see the guidance popup, achieving awareness of the shove mechanic before Round 2.

## Assumptions

- The bucket score values (`[100, 1000, 10000, 1000, 100]`) and bucket count (5) remain unchanged. Only pin layout varies per round.
- The existing stall timeout (10 seconds) remains as the ultimate fallback after auto-shove retries are exhausted.
- The coin sound is synthesized using the Web Audio API (consistent with all other game sounds) — no external audio files are loaded.
- Player name persistence uses the key `plinkit_player_names` in localStorage.
- The "Did you know?" popup uses the same overlay/modal pattern as existing UI elements (registration, results).
- Proportional bucket widths affect only the visual rendering; the physics bucket boundaries are adjusted to match so puck scoring is consistent with what the player sees.
- Pin spacing constraints ensure the puck radius is smaller than the gap between any two adjacent pins in the generated layout.
