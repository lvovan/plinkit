# Feature Specification: Multi-Player Plinko Game

**Feature Branch**: `001-multiplayer-plinko`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description of a browser-based, local, turn-by-turn couch-competitive Plinko game for up to 4 players with realistic deterministic physics, shove mechanics, and cross-device support.

## Clarifications

### Session 2026-02-24

- Q: Do pucks persist on the board as physics objects after a turn, or is the board cleared? → A: Pucks persist on the board and participate in physics — new pucks can collide with previously dropped pucks.
- Q: What options does the results screen offer after a winner is declared? → A: "Play Again" (same players, new game) + "New Players" (back to registration) + "Quit".
- Q: What board size and bucket scoring should the game use? → A: 12 rows of pins, 9 buckets, classic Plinko symmetric scoring (highest value center, lowest at edges).
- Q: When does the shove window close during a puck's fall? → A: Shoves are allowed only while the puck is in the top two-thirds of the board (rows 1–9 of 12).
- Q: How should the game communicate shove availability to the active player? → A: Shove counter (e.g., "2/2 remaining") on screen plus a visible horizontal line or shading marking the shove-zone boundary at row 9.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Core Plinko Drop (Priority: P1)

A single player opens the game in a browser, sees a Plinko board filled with
rows of pins and scoring buckets at the bottom, positions a puck horizontally
along the top of the board, and releases it. The puck falls through the pin
field under realistic gravity, bouncing off pins, and lands in a scoring
bucket. The bucket's point value is displayed.

**Why this priority**: Without a functional physics-driven puck drop onto a
visible board with scoring, no other feature has meaning. This is the atomic
unit of gameplay and the foundation every other story builds on.

**Independent Test**: Load the game in a browser, drop a single puck from
several horizontal positions, and confirm the puck obeys gravity, bounces
off pins realistically, lands in a bucket, and the correct score is shown.

**Acceptance Scenarios**:

1. **Given** the game board is displayed with pins and buckets, **When** a
   player selects a horizontal position and releases a puck, **Then** the
   puck falls under gravity, collides with pins, and comes to rest in a
   bucket.
2. **Given** a puck has landed in a bucket, **When** the puck settles,
   **Then** the bucket's fixed score value is displayed to the player.
3. **Given** the same horizontal drop position, identical initial
   conditions, and identical set of previously dropped pucks on the board,
   **When** the puck is dropped multiple times, **Then** the physics
   simulation produces the same trajectory and final bucket every time
   (determinism).
4. **Given** a mobile device in portrait mode or a desktop in landscape
   mode, **When** the board is rendered, **Then** the entire board, pins,
   and buckets are visible without scrolling or clipping.

---

### User Story 2 — Multi-Player Session & Turns (Priority: P2)

Two to four players gather around a single device. Before starting, each
player enters their name on a registration screen. The game assigns each
player a uniquely colored and patterned puck. Players then take turns: the
active player is highlighted, drops their puck, and play advances to the
next player. After a configurable number of rounds (default 5), the game
totals each player's score and declares a winner.

**Why this priority**: Multiplayer turn structure is what makes Plinkit a
*game* rather than a toy. Registration, turn order, score accumulation,
and winner declaration are the minimum for competitive play.

**Independent Test**: Register 2–4 players, play through all rounds, and
confirm turns alternate correctly, scores accumulate, and the correct
winner is declared.

**Acceptance Scenarios**:

1. **Given** the game is on the registration screen, **When** 2 to 4
   players each enter a name, **Then** each player is assigned a visually
   distinct puck (unique color and pattern) and the game is ready to start.
2. **Given** registration is complete, **When** the game starts, **Then**
   no additional players can join the session.
3. **Given** it is a player's turn, **When** the active player is shown,
   **Then** the UI clearly highlights whose turn it is by name, puck color,
   and a visual indicator.
4. **Given** a player completes their drop, **When** the puck settles in a
   bucket, **Then** that bucket's score is added to the player's running
   total and play advances to the next player.
5. **Given** all players have completed all rounds, **When** final scores
   are tallied, **Then** the player with the highest total score is
   declared the winner and a results screen is shown.
6. **Given** the results screen is displayed, **When** a player selects
   "Play Again", **Then** the game resets to round 1 with the same
   players (names and puck assignments preserved), scores zeroed, and the
   board cleared of pucks.
7. **Given** the results screen is displayed, **When** a player selects
   "New Players", **Then** the game returns to the registration screen
   with all prior session data discarded.
8. **Given** the results screen is displayed, **When** a player selects
   "Quit", **Then** a farewell/thank-you message is shown and no further
   interaction is available (player may close the tab).

---

### User Story 3 — Shove Mechanic (Priority: P3)

After releasing their puck, the active player can perform up to two
directional "shoves" to influence the puck's trajectory while it is in
flight. On mobile, the player does a finger flick on the screen; on
desktop, the player does a mouse flick. The direction and speed of the
flick gesture determine the direction and intensity of the force applied
to the puck. Shoves are deterministic — the same flick vector always
produces the same force.

**Why this priority**: Shoves transform Plinko from pure luck into a
skill-based competitive game. Without shoves, player agency is limited
to horizontal positioning alone.

**Independent Test**: Drop a puck and perform 0, 1, or 2 shoves with
varying flick directions. Confirm the puck trajectory changes
proportionally to the flick vector, that a third shove is blocked, and
that replaying the same inputs yields the same result.

**Acceptance Scenarios**:

1. **Given** a player has released their puck and it is still in motion
   within the top two-thirds of the board (rows 1–9), **When** the player
   performs a directional flick gesture, **Then** a force proportional to
   the flick's direction and speed is applied to the puck, visibly
   altering its trajectory.
2. **Given** a player has already used two shoves in the current turn,
   **When** the player attempts a third flick, **Then** the input is
   ignored and no force is applied.
3. **Given** identical drop position and identical flick vectors, **When**
   the turn is simulated, **Then** the puck follows the exact same path
   and lands in the same bucket every time.
4. **Given** a desktop device, **When** the player performs a mouse flick,
   **Then** the shove is calculated from the mouse movement vector.
5. **Given** a mobile device, **When** the player performs a finger flick,
   **Then** the shove is calculated from the touch movement vector.
6. **Given** a shove is applied, **When** the force is calculated, **Then**
   the force intensity is capped at a maximum value to prevent unrealistic
   puck movement.
7. **Given** the puck is in the shove zone (rows 1–9), **When** the
   player views the UI, **Then** a shove counter (e.g., "Shoves: 2/2")
   is displayed and a visible boundary line marks the shove-zone limit
   at row 9.
8. **Given** the puck crosses below row 9, **When** the shove window
   closes, **Then** the shove counter updates to indicate no shoves
   are available.

---

### User Story 4 — Turn Timer (Priority: P4)

Each player has 15 seconds from the start of their turn to position and
release their puck. A visible countdown timer shows remaining time. If the
timer expires before the player releases, the puck is automatically
released from its last horizontal position. After a timeout-triggered
release, no shoves are allowed for that turn.

**Why this priority**: The timer keeps the game pace lively and prevents
stalling in a couch-play setting. It matters once multiplayer (P2) is
in place.

**Independent Test**: Start a turn, do not release the puck, wait 15
seconds, and confirm the puck auto-drops from its last position with no
shove opportunity.

**Acceptance Scenarios**:

1. **Given** it is a player's turn, **When** the turn begins, **Then** a
   15-second countdown timer is visibly displayed.
2. **Given** the countdown is active, **When** the player releases the puck
   before time expires, **Then** the timer stops and normal play continues
   (shoves are allowed).
3. **Given** the countdown reaches zero without the player releasing,
   **When** the timer expires, **Then** the puck is immediately released
   from its current horizontal position.
4. **Given** the puck was auto-released due to timeout, **When** the puck
   is in flight, **Then** no shove inputs are accepted for that turn.

---

### User Story 5 — Tie-Breaker Rounds (Priority: P5)

After the final round, if two or more players share the highest score,
a tie-breaker round is automatically initiated. Only the tied players
participate. Each tied player gets one drop (with shoves allowed). If a
tie persists after the tie-breaker round, additional rounds continue
until a single winner emerges.

**Why this priority**: A competitive game must produce a clear winner.
Tie-breakers ensure every session ends decisively.

**Independent Test**: Set up a game where two players finish with equal
scores, confirm a tie-breaker round starts with only those players, and
confirm it repeats until a winner emerges.

**Acceptance Scenarios**:

1. **Given** all regular rounds are complete, **When** two or more players
   are tied for the highest score, **Then** the game announces a
   tie-breaker and only the tied players participate.
2. **Given** a tie-breaker round, **When** each tied player completes their
   drop, **Then** scores from the tie-breaker are added to their totals
   and a new check for a single leader is performed.
3. **Given** the tie persists after a tie-breaker round, **When** scores
   are still equal, **Then** another tie-breaker round is initiated with
   the still-tied players.
4. **Given** a tie-breaker round resolves the tie, **When** one player has
   the highest total, **Then** that player is declared the winner and the
   results screen is shown.

---

### User Story 6 — Visual & Audio Feedback (Priority: P6)

The game provides entertaining but not overly flashy effects throughout
gameplay. Puck drops are animated smoothly. Pin collisions produce subtle
bounce effects. Shoves trigger a board-shake animation. Bucket landings
produce a satisfying impact effect. The active player's turn is indicated
with a highlight. A shove counter and shove-zone boundary line keep
players informed of shove availability. Audio cues accompany key events
(drop, collision, shove, bucket landing, winner announcement). Effects
are consistent across desktop and mobile.

**Why this priority**: Feedback is what makes a functional game feel *fun*.
It is important but builds on top of working game mechanics (P1–P5).

**Independent Test**: Play a full turn and verify that each event (drop,
pin hit, shove, bucket landing) triggers an appropriate visual and audio
effect. Repeat on mobile and desktop to confirm consistency.

**Acceptance Scenarios**:

1. **Given** a puck is released, **When** it begins to fall, **Then** a
   smooth drop animation plays.
2. **Given** a puck strikes a pin, **When** contact occurs, **Then** a
   visual collision effect and audio cue are triggered.
3. **Given** a player performs a shove, **When** the flick is registered,
   **Then** a board-shake visual effect and shove audio cue play.
4. **Given** a puck lands in a bucket, **When** it comes to rest, **Then**
   a landing impact visual and audio effect play, and the score value
   animates into view.
5. **Given** the game is played on a mobile device, **When** any effect
   triggers, **Then** it looks and sounds the same as on a desktop device.
6. **Given** effects are playing, **When** the game is running on a
   mid-range mobile device, **Then** the frame rate remains at or above
   60 fps.

---

### User Story 7 — Responsive Device Adaptation (Priority: P7)

On desktop and large screens, the game renders in landscape orientation
with mouse-based controls. On mobile devices, the game renders in
portrait orientation optimized for Plinko's vertical board shape, with
touch-based controls. The layout adapts to screen size so the full board,
UI elements, and player information are always visible without scrolling.
Touch targets on mobile meet minimum size requirements for comfortable
use by adults and children.

**Why this priority**: Cross-device play is a core principle (Constitution
§III) and essential for couch play. However, the game must work correctly
on at least one device before optimizing for all screen sizes.

**Independent Test**: Open the game on a phone (portrait) and a laptop
(landscape). Confirm the board, pins, buckets, player info, and controls
are fully visible and usable on both without scrolling.

**Acceptance Scenarios**:

1. **Given** a desktop browser window, **When** the game loads, **Then**
   the layout is landscape-oriented with mouse and keyboard controls.
2. **Given** a mobile device, **When** the game loads, **Then** the layout
   is portrait-oriented with touch controls.
3. **Given** any screen size, **When** the board is rendered, **Then** the
   entire board, all pins, all buckets, the score display, and the turn
   indicator are visible without horizontal or vertical scrolling.
4. **Given** a mobile device, **When** a player interacts with UI elements,
   **Then** all touch targets are at least 44×44 CSS pixels.
5. **Given** a browser window is resized, **When** the dimensions change,
   **Then** the game layout adapts responsively without requiring a reload.

---

### Edge Cases

- What happens when a player enters an empty name during registration?
  The game MUST require at least one non-whitespace character per name.
- What happens when only one player registers?
  The game MUST require at least 2 players to start a competitive session.
- What happens if a puck gets stuck between pins (or between pins and
  a previously dropped puck) and does not reach a bucket within a
  reasonable time? The game MUST detect a stalled puck (e.g., near-zero
  velocity for 3+ seconds) and apply a small nudge to dislodge it, or
  force it into the nearest bucket.
- What happens if accumulated pucks in a bucket physically block new
  pucks from entering? The bucket MUST be wide enough or pucks small
  enough that visual stacking does not prevent a new puck from landing
  and scoring; if a puck rests on top of other pucks above the bucket
  rim, it still scores for that bucket.
- What happens if a player's puck lands in a bucket that already contains
  that same player's puck from a previous round? Each turn is scored
  independently — the puck still lands and the bucket score is awarded
  regardless of prior occupancy (see Assumptions).
- What happens if the browser tab loses focus mid-turn? The game MUST
  pause the turn timer and physics simulation while the tab is hidden,
  resuming when focus returns.
- What happens if tie-breaker rounds continue indefinitely? After 10
  consecutive tie-breaker rounds, the game MUST declare co-winners rather
  than loop forever.
- What happens if a player performs a flick gesture before releasing the
  puck? Pre-release flicks MUST be ignored; shoves are only accepted after
  the puck is in flight.
- What happens if a player flicks in a direction with zero magnitude
  (tap without movement)? The input MUST be ignored and the shove count
  not incremented.
- What happens if a player attempts a shove after the puck has passed
  below row 9? The input MUST be ignored regardless of remaining shove
  count; the UI SHOULD indicate that the shove window has closed.

## Requirements *(mandatory)*

### Functional Requirements

**Registration & Session**

- **FR-001**: The game MUST support 2 to 4 players per session.
- **FR-002**: Each player MUST enter a display name during registration
  (minimum 1 non-whitespace character, maximum 16 characters).
- **FR-003**: Each player MUST be automatically assigned a visually
  distinct puck with a unique color and pattern from a preset palette.
- **FR-004**: Once the game starts, no additional players may join the
  active session.
- **FR-005**: The number of rounds per game MUST be configurable before
  the session starts (default: 5 rounds).
- **FR-005a**: The results screen MUST offer three actions: "Play Again"
  (restart with same players, scores zeroed, board cleared), "New Players"
  (return to registration, all session data discarded), and "Quit"
  (display farewell message, end session).

**Board & Physics**

- **FR-006**: The game MUST display a Plinko board with 12 rows of
  evenly spaced pins and 9 scoring buckets at the bottom. Pins in
  alternating rows are offset by half the pin spacing (standard
  staggered Plinko layout).
- **FR-007**: The physics simulation MUST be deterministic — identical
  inputs (drop position, shove vectors) MUST always produce identical
  outcomes.
- **FR-008**: The simulation MUST use a fixed-timestep update loop
  decoupled from the rendering frame rate.
- **FR-009**: Physics parameters (gravity, restitution, friction, puck
  mass) MUST be defined in configuration, not hard-coded.
- **FR-010**: The puck MUST interact with pins via realistic collision
  response (bounce angle, energy loss).
- **FR-010a**: Previously dropped pucks MUST remain on the board as
  active physics bodies for the remainder of the game. New pucks MUST
  collide with prior pucks realistically.
- **FR-010b**: The deterministic simulation MUST account for the
  positions of all previously settled pucks when computing a new
  drop's trajectory.

**Turn Mechanics**

- **FR-011**: Players MUST take turns in registration order, cycling
  through all players once per round.
- **FR-012**: The active player MUST be able to select a horizontal drop
  position along the top of the board before releasing the puck.
- **FR-013**: A visible 15-second countdown timer MUST begin when a
  player's turn starts.
- **FR-014**: If the timer expires, the puck MUST be auto-released from
  its last horizontal position.
- **FR-015**: After a timeout-triggered release, shove inputs MUST be
  disabled for that turn.

**Shove Mechanic**

- **FR-016**: After releasing the puck and while it is in motion within
  the top two-thirds of the board (rows 1–9 of 12), the player MUST be
  able to perform up to 2 directional shoves per turn. Once the puck
  passes below row 9, shove inputs MUST be ignored regardless of how
  many shoves remain.
- **FR-017**: Shove direction and intensity MUST be derived from the
  vector of the player's flick gesture (mouse on desktop, touch on
  mobile).
- **FR-018**: Shove force MUST be capped at a configurable maximum to
  prevent unrealistic puck movement.
- **FR-019**: A third or subsequent shove attempt within the same turn
  MUST be silently ignored.
- **FR-019a**: During the active player's turn, the UI MUST display a
  shove counter showing remaining shoves (e.g., "Shoves: 2/2"). The
  counter MUST update immediately when a shove is consumed or when the
  shove window closes.
- **FR-019b**: The board MUST display a visible horizontal line or
  shaded region marking the shove-zone boundary at row 9. This
  indicator MUST be visible at all times during gameplay so players
  can anticipate when the shove window ends.

**Scoring**

- **FR-020**: Each bucket MUST have a fixed, predetermined score value
  displayed on the bucket, following classic Plinko symmetric scoring:
  the center bucket has the highest value, with values decreasing
  symmetrically toward the edges (e.g., 100 – 500 – 1 000 – 5 000 –
  10 000 – 5 000 – 1 000 – 500 – 100). Exact values are configurable
  but MUST maintain the symmetric high-center/low-edge pattern.
- **FR-021**: When a puck comes to rest in a bucket, the bucket's score
  value MUST be added to the player's cumulative total.
- **FR-022**: Each turn's score is independent — a player may score in the
  same bucket across multiple rounds.
- **FR-023**: Running scores for all players MUST be visible at all times
  during gameplay.

**Tie-Breakers**

- **FR-024**: After the final regular round, if two or more players share
  the highest score, a tie-breaker round MUST be initiated automatically.
- **FR-025**: Only the tied players MUST participate in tie-breaker rounds.
- **FR-026**: Tie-breaker rounds follow the same turn rules (timer, shoves)
  as regular rounds.
- **FR-027**: Tie-breaker rounds MUST repeat until one player leads, up to
  a maximum of 10 rounds, after which co-winners are declared.

**Feedback**

- **FR-028**: The game MUST provide visual effects for: puck drop, pin
  collision, shove application, and bucket landing.
- **FR-029**: The game MUST provide audio cues for: puck drop, pin
  collision, shove, bucket landing, and winner announcement.
- **FR-030**: Effects MUST be visually and audibly consistent across
  desktop and mobile.
- **FR-031**: Effects MUST NOT degrade frame rate below 60 fps on
  mid-range mobile devices.

**Device Adaptation**

- **FR-032**: On desktop and large screens, the game MUST render in
  landscape layout with mouse/keyboard controls.
- **FR-033**: On mobile devices, the game MUST render in portrait layout
  with touch controls.
- **FR-034**: All interactive touch targets MUST be at least 44×44 CSS
  pixels on mobile.
- **FR-035**: The full board, scores, and turn indicator MUST be visible
  without scrolling on all supported screen sizes.
- **FR-036**: The game MUST adapt layout responsively on window resize
  without requiring a page reload.

### Key Entities

- **Player**: Display name, assigned puck (color + pattern), cumulative
  score, turn order position, active/eliminated status (for tie-breakers).
- **Puck**: Owning player, color, pattern, current physics state
  (position, velocity), shoves remaining in current turn.
- **Board**: 12 rows of staggered pins, 9 buckets with classic symmetric
  scoring, pin positions, bucket positions and score values, physics
  configuration parameters.
- **Bucket**: Fixed position on the board, assigned score value, list of
  pucks currently resting in it (pucks remain as physics bodies).
- **Turn**: Active player, turn timer state, drop position, ordered list
  of shove vectors applied, resulting bucket, score earned.
- **Game Session**: List of players, round count configuration, current
  round number, current turn index, game phase (registration → play →
  tie-breaker → results → play-again / new-players / quit).

## Assumptions

- Bucket score values follow classic Plinko symmetric scoring: the
  center bucket has the highest value (e.g., 10 000), decreasing toward
  the edges (e.g., 100). Default values are 100 – 500 – 1 000 – 5 000 –
  10 000 – 5 000 – 1 000 – 500 – 100 across the 9 buckets. Exact values
  are configurable but the symmetric pattern MUST be preserved.
- The preset puck palette provides 4 visually distinct color-and-pattern
  combinations chosen for accessibility (distinguishable by color-blind
  players).
- "Mid-range mobile device" for the 60 fps target means a 2022-era budget
  smartphone (e.g., equivalent to Snapdragon 680 / Apple A13 class).
- Each turn's bucket score is always awarded — there is no "bucket
  capacity" that blocks scoring. The "one puck per player per bucket"
  capacity described in the input refers to the visual display of pucks in
  buckets, not a scoring constraint.
- Audio can be muted by the player; the game does not auto-play audio
  without user interaction (browser autoplay policy compliance).
- No game state persists between browser sessions. Closing the tab ends
  the game.
- The game does not require an internet connection after the initial page
  load (offline-capable per constitution).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new player can complete registration and begin their first
  turn within 60 seconds of opening the game.
- **SC-002**: The physics simulation is fully deterministic — replaying
  identical inputs produces identical bucket outcomes 100% of the time.
- **SC-003**: The game maintains 60 fps or higher on a 2022-era budget
  smartphone during active gameplay including effects.
- **SC-004**: A complete 4-player, 5-round game session (including
  registration and results) finishes in under 10 minutes.
- **SC-005**: 90% of first-time players (age 6+) can complete a turn
  (position, drop, and optionally shove) without external instruction.
- **SC-006**: The game is fully playable on both a mobile phone (portrait,
  touch) and a desktop browser (landscape, mouse) with no functional
  differences.
- **SC-007**: All visual and audio feedback plays within 100 ms of the
  triggering game event, so interactions feel instantaneous.
- **SC-008**: Tie-breaker rounds resolve ties correctly and terminate
  within 10 additional rounds.
