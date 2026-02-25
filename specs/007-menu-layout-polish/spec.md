# Feature Specification: Menu System & Layout Polish

**Feature Branch**: `007-menu-layout-polish`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Menu System & Layout — Welcome experience, in-game UI layout, gameplay visual & audio effects, collision feedback, scoreboard behavior, and background art."

## Clarifications

### Session 2026-02-25

- Q: Should SFX (pin hits, bucket lands) also pitch-shift/slow during slow-motion, or stay at normal speed? → A: SFX pitch-shift/slow proportionally (same factor as physics/music)
- Q: Where should the countryside background art come from (static asset, procedural, or CSS gradient)? → A: Procedural canvas generation (gradient sky, rolling hills, simple shapes) with subtle animation, plus a toggle button near the sound controls to disable animation

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scoreboard Ranked Display with Animated Transitions (Priority: P1)

When players earn points during a game, the scoreboard must display all players sorted by score in descending order (highest score at the top). When a rank change occurs — e.g., Player B overtakes Player A — the affected player row must animate smoothly into its new vertical position rather than snapping instantly. The animation timing and easing must follow the game's existing global animation system, not a hard-coded fixed duration. The scoreboard is part of the unified upper-left HUD panel, positioned below the turn indicator / countdown timer within that panel.

**Why this priority**: The scoreboard is visible throughout the entire game. Unsorted scores force players to scan the full list to find their ranking, and instant reordering is visually jarring in a competitive context. This directly impacts every second of every play session.

**Independent Test**: Start a 3–4 player game, play several rounds, and observe the scoreboard. Verify scores are always sorted highest-first, positioned within the unified HUD panel in the upper-left, and when a player overtakes another, their row slides smoothly to the new position.

**Acceptance Scenarios**:

1. **Given** a 4-player game in progress, **When** any player's score updates, **Then** the scoreboard re-sorts all players by score descending (ties preserve previous relative order).
2. **Given** a scoreboard update causes a rank change, **When** the new scores are rendered, **Then** the affected player rows animate vertically to their new positions using the game's global animation easing and timing.
3. **Given** a scoreboard update with no rank change, **When** the score value changes, **Then** the score number updates in place without any positional animation.
4. **Given** the game is running, **When** the player views the screen, **Then** the scoreboard is positioned within the unified HUD panel in the upper-left corner, below the turn indicator and timer.

---

### User Story 2 — In-Game UI Layout: Unified HUD Panel (Priority: P1)

All in-game HUD elements — sound control buttons (SFX toggle, music toggle, animation toggle), turn indicator with countdown timer, and scoreboard — must be combined into a single unified panel component positioned in the upper-left corner of the gameplay screen. The panel renders as a vertical stack: toggle buttons row at top, turn indicator and timer in the middle, and scoreboard at the bottom. This unified component must never overlap the playfield (canvas board area). All elements must remain accessible and stable across all supported screen sizes.

**Why this priority**: A single unified HUD component simplifies layout management, eliminates cross-element overlap risks, and provides a clean, predictable placement for all game status information.

**Independent Test**: Load the game on multiple devices or window sizes. Confirm all HUD elements (toggles, turn indicator, timer, scoreboard) appear in a single coherent panel in the upper-left corner, with no overlap on the game board.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** the player looks at the screen, **Then** all HUD elements (SFX, music, animation toggles, turn indicator, timer, scoreboard) are visible in a single unified panel in the upper-left corner.
2. **Given** any supported screen size (mobile 320px wide through ultra-wide 3440px), **When** the UI renders, **Then** the unified HUD panel remains in the upper-left corner and does not overlap the playfield.
3. **Given** the audio toggles are in the HUD panel, **When** the player taps/clicks them, **Then** they toggle mute state correctly with clear visual feedback.
4. **Given** a turn is active, **When** the player views the HUD panel, **Then** the countdown timer and turn indicator are visible within the same panel as the scoreboard.

---

### User Story 3 — Welcome Experience with Attribution (Priority: P2)

The registration/welcome popup must include a subtitle anchored at the very bottom edge of the component displaying: "©️ Luc Vo Van, 2026 – Built with AI". This subtitle must remain visible and properly scaled on all screen sizes, including mobile and ultra-wide displays. It must never be cut off, overlap input fields, or become unreadable.

**Why this priority**: Attribution and branding establish ownership and professionalism. It's important but non-blocking for gameplay.

**Independent Test**: Open the app fresh (or trigger a "New Players" flow). Verify the copyright line is visible at the bottom of the registration overlay on mobile, desktop, and ultra-wide viewports.

**Acceptance Scenarios**:

1. **Given** the registration overlay is displayed, **When** the player views the popup, **Then** a subtitle reading "©️ Luc Vo Van, 2026 – Built with AI" is visible at the bottom edge of the overlay.
2. **Given** a mobile device with a narrow viewport (320px width), **When** the registration overlay renders, **Then** the subtitle text is fully visible, legible, and does not overflow or overlap other elements.
3. **Given** an ultra-wide display (3440px width), **When** the registration overlay renders, **Then** the subtitle remains anchored at the bottom of the overlay, properly centered, and proportionally scaled.

---

### User Story 4 — Collision Multiplier Popup Format (Priority: P2)

When a puck collides and triggers a multiplier popup, the displayed text must use the format "×N" (multiplication sign prefix, e.g., "×3", "×1.2") — not a trailing "x". The multiplier value must reflect the current bounce multiplier at the time of collision.

**Why this priority**: Visual polish that's noticed every collision. Incorrect formatting looks unprofessional but doesn't break gameplay.

**Independent Test**: Drop a puck into a dense pin area and observe collision popups. Verify they read "×1.0", "×1.2", "×3.5" etc., with the multiplication sign before the number and no trailing character.

**Acceptance Scenarios**:

1. **Given** a puck hits a pin, **When** the collision flash displays, **Then** the multiplier text uses the format "×N.N" (e.g., "×1.0", "×2.5") with no trailing "x" or "×".
2. **Given** the bounce multiplier is at its cap, **When** a collision occurs, **Then** the popup shows the capped value in the same "×N.N" format.

---

### User Story 5 — Slow-Motion Effect Below the Shove Line (Priority: P3)

When the puck crosses below the shove line (the boundary below which shoves are no longer allowed), a brief slow-motion effect activates. This effect reduces the physics simulation speed and synchronizes the music to slow down proportionally. UI elements — scoreboard, timer, score popups, HUD animations — must not be affected by the slow-motion. The effect is brief and dramatic, adding visual weight to the moment the puck enters the final descent.

**Why this priority**: A cinematic polish feature that enhances dramatic tension. High-impact for feel, but the game is fully playable without it.

**Independent Test**: Drop a puck and watch it cross the shove line. Verify the puck visibly slows down for a brief moment, the music pitch/tempo dips correspondingly, and the timer and scoreboard continue at normal speed.

**Acceptance Scenarios**:

1. **Given** a puck is falling, **When** it crosses below the shove line, **Then** the physics simulation speed reduces for a brief dramatic moment (the puck and pins visibly slow down).
2. **Given** slow-motion is active, **When** the player observes the music and sound effects, **Then** both music playback and SFX pitch-shift proportionally to match the physics slowdown.
3. **Given** slow-motion is active, **When** the player looks at the timer, scoreboard, and score popups, **Then** they continue to update and animate at normal speed, unaffected by the slowdown.
4. **Given** the slow-motion duration elapses, **When** normal speed resumes, **Then** the physics and music smoothly return to their original speed (no abrupt snap).

---

### User Story 6 — Countryside Background Art (Priority: P3)

The game must display a procedurally generated countryside/landscape background behind the board area, rendered on the canvas at startup. The scene includes a gradient sky, rolling hills, and simple tree/bush shapes. The background includes subtle animation (e.g., drifting clouds, swaying elements) that adds life without distracting from gameplay. A toggle button positioned near the sound control buttons (upper-left corner) allows the player to disable the background animation. The procedural approach avoids external asset dependencies, keeps the bundle small, scales to any resolution, and matches the game's synthesized aesthetic.

**Why this priority**: Aesthetic polish. The current solid-color background is functional but visually flat. Procedural background art creates atmosphere but is purely cosmetic.

**Independent Test**: Load the game and observe the visual background behind and around the board. Verify a countryside/landscape scene is visible with subtle animation, scales with the window, and can be toggled off via its button.

**Acceptance Scenarios**:

1. **Given** the game is loaded, **When** the player views the screen, **Then** a procedurally generated countryside/landscape background is visible behind and around the game board, featuring gradient sky, rolling hills, and simple vegetation shapes.
2. **Given** the background is displayed, **When** the board and game elements render, **Then** the background does not distract from or obscure pins, pucks, buckets, or score popups.
3. **Given** any supported screen size, **When** the window is resized, **Then** the background scales gracefully without visible tiling artifacts or distortion.
4. **Given** the background animation is active, **When** the player observes the background, **Then** subtle animations (e.g., drifting clouds) are visible but do not compete with gameplay elements for attention.
5. **Given** the animation toggle button is visible near the sound controls, **When** the player clicks/taps it, **Then** the background animation stops (background remains visible as a static scene) and the button reflects the disabled state.
6. **Given** the background animation has been disabled, **When** the player clicks/taps the toggle again, **Then** the animation resumes.

---

### User Story 7 — First-Round Tutorial Indicator (Priority: P2)

On the first round of each new game session (not replays), an animated visual indicator must appear guiding the player on how to position the puck. The indicator must display a hand icon (👆) on touch devices or a mouse cursor icon (🖱️) on pointer/mouse devices, detected automatically. The indicator animates with a horizontal sway motion to demonstrate the drag-to-position gesture. It auto-dismisses as soon as the player interacts with the canvas (pointer down or puck drop) — no manual dismissal action is required.

**Why this priority**: First-time players may not immediately understand the drag-to-position mechanic. A brief, non-intrusive tutorial reduces confusion without interrupting the flow for returning players.

**Independent Test**: Start a brand new game. On the first player's first turn, verify the animated indicator appears near the top of the board with an appropriate icon for the device. Touch the canvas or move the mouse — verify the indicator fades out immediately. Start a second round and verify it does not reappear.

**Acceptance Scenarios**:

1. **Given** a new game starts (first game or "New Players" flow), **When** the first player's first turn begins, **Then** an animated tutorial indicator appears near the top of the board.
2. **Given** the tutorial indicator is visible, **When** the device is a touch device, **Then** the indicator shows a hand icon (👆) with "Drag to position" text.
3. **Given** the tutorial indicator is visible, **When** the device uses a mouse/trackpad, **Then** the indicator shows a mouse cursor icon (🖱️) with "Click & drag to aim" text.
4. **Given** the tutorial indicator is visible, **When** the player touches or clicks the canvas, **Then** the indicator fades out automatically within ~400ms.
5. **Given** the tutorial was shown on round 1, **When** subsequent rounds begin, **Then** the indicator does not reappear.
6. **Given** a "Play Again" replay, **When** the first turn begins, **Then** the tutorial does not appear (it only shows once per session for new players).
7. **Given** a "New Players" session reset, **When** the first turn begins, **Then** the tutorial appears again.

---

### User Story 8 — Victory Sound Effect for Center Bucket (Priority: P2)

When a puck lands in the center (highest-scoring) bucket, a special victory/jackpot sound effect must play in addition to the normal bucket-land chime. The sound must be synthesized (no audio files), use a triumphant rising arpeggio with a sparkle shimmer, and pitch-shift proportionally during slow-motion like all other SFX.

**Why this priority**: The center bucket is the jackpot — the most exciting and rewarding outcome. A distinct victory sound reinforces this excitement and makes the rare center-bucket hit feel special.

**Independent Test**: Drop pucks deliberately aiming for the center bucket. Verify that landing in the center bucket produces an additional bright, celebratory sound on top of the standard bucket-land chime. Verify that landing in any other bucket plays only the standard chime.

**Acceptance Scenarios**:

1. **Given** a puck settles in the center (highest-scoring) bucket, **When** the bucket-land event fires, **Then** both the normal bucket-land sound and a special jackpot sound play.
2. **Given** a puck settles in any non-center bucket, **When** the bucket-land event fires, **Then** only the normal bucket-land sound plays (no jackpot sound).
3. **Given** slow-motion is active when the puck lands in the center bucket, **When** the jackpot sound plays, **Then** it pitch-shifts proportionally to match the current timeScale.

---

### Edge Cases

- What happens if all players are exactly tied at the scoreboard? They should maintain their previous relative order (stable sort).
- What happens if the puck is already past the shove line on the first physics frame (e.g., dropped below it)? The slow-motion should still trigger once briefly.
- What happens if the copyright subtitle text is longer than the overlay width on very narrow screens? It should wrap gracefully or scale down, never overflow or clip.
- What happens if the player resizes the browser window during a slow-motion sequence? The slow-motion timing and music should continue unaffected.
- What happens if two pucks cross the shove line at the same time (from previous rounds' settled pucks acting as obstacles)? Only the active puck should trigger slow-motion, and it should trigger at most once per turn.
- What happens if the turn timer expires before the player interacts on the first turn? The tutorial indicator should dismiss when the auto-drop fires.
- What happens if the puck lands in the center bucket during slow-motion? Both the bucket-land and jackpot sounds should play, with the jackpot sound pitch-shifted by the current timeScale.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scoreboard MUST display player scores sorted in descending order (highest score at top).
- **FR-001a**: The scoreboard MUST be positioned within the unified upper-left HUD panel, below the turn indicator / countdown timer section.
- **FR-002**: When a rank change occurs in the scoreboard, the affected player rows MUST animate smoothly to their new vertical positions using the game's global animation timing and easing.
- **FR-003**: Rank ties in the scoreboard MUST preserve the previous relative order of tied players (stable sort).
- **FR-004**: All in-game HUD elements (SFX toggle, music toggle, animation toggle, turn indicator, countdown timer, and scoreboard) MUST be contained within a single unified panel component positioned in the upper-left corner of the screen.
- **FR-004a**: The unified HUD panel MUST render as a vertical stack: toggle buttons row at top, turn indicator and timer in the middle, scoreboard at bottom.
- **FR-005**: The unified HUD panel MUST NOT overlap the playfield (canvas board area) on any supported screen size.
- **FR-006**: The registration/welcome overlay MUST display the subtitle "©️ Luc Vo Van, 2026 – Built with AI" anchored at the bottom edge of the component.
- **FR-007**: The welcome subtitle MUST remain visible, legible, and properly scaled on all screen sizes from 320px mobile to ultra-wide displays.
- **FR-008**: Collision multiplier popups MUST display in the format "×N.N" (multiplication sign prefix followed by the numeric value) — no trailing "x" or "×".
- **FR-009**: When the active puck crosses below the shove line, a brief slow-motion effect MUST activate, reducing physics simulation speed.
- **FR-010**: During slow-motion, music playback and sound effects (pin hits, bucket lands, etc.) MUST slow and pitch-shift proportionally to match the physics speed reduction.
- **FR-011**: During slow-motion, all UI elements (timer, scoreboard, score popups, HUD) MUST continue to operate at normal speed.
- **FR-012**: The slow-motion effect MUST trigger at most once per turn for the active puck.
- **FR-013**: After slow-motion ends, physics speed and music playback MUST smoothly return to their original values (no abrupt transitions).
- **FR-014**: A procedurally generated countryside/landscape background MUST be rendered on the canvas behind the game board area (gradient sky, rolling hills, simple vegetation shapes).
- **FR-015**: The background art MUST NOT distract from or obscure gameplay elements (pins, pucks, buckets, score popups).
- **FR-016**: The background MUST scale appropriately for all supported screen sizes without visible tiling or distortion.
- **FR-017**: The background MUST include subtle animation (e.g., drifting clouds, swaying elements) that runs continuously by default.
- **FR-018**: An animation toggle button MUST be positioned near the sound control buttons in the upper-left corner, allowing the player to enable or disable background animation.
- **FR-019**: When background animation is disabled, the background MUST remain visible as a static scene (only animation stops, not the background itself).
- **FR-020**: On the first round of each new game session, an animated tutorial indicator MUST appear showing the player how to position the puck, using a hand icon on touch devices and a mouse cursor on pointer devices.
- **FR-021**: The tutorial indicator MUST auto-dismiss when the player interacts with the canvas (pointer down or puck drop), without requiring an explicit dismiss action.
- **FR-022**: The tutorial indicator MUST NOT appear on subsequent rounds, replays, or any turn other than the first turn of the first round of a new session.
- **FR-023**: The tutorial indicator MUST detect device capability (touch vs mouse) using media query `(pointer: coarse)` and display the appropriate icon.
- **FR-024**: When a puck lands in the center (highest-scoring) bucket, a special victory/jackpot sound effect MUST play in addition to the normal bucket-land sound.
- **FR-025**: The jackpot sound MUST be synthesized (no audio files) and MUST pitch-shift proportionally during slow-motion, consistent with all other SFX.

### Key Entities

- **Scoreboard Row**: Represents a single player's display entry — includes player name, colored indicator, current score, and vertical position. Must support animated position transitions. Part of the unified HUD panel.
- **Slow-Motion State**: A transient game state triggered by the puck crossing the shove line — includes a time-scale factor, duration, and easing curve. Affects physics, music, and SFX but not UI.
- **Background Layer**: A procedurally generated visual layer rendered behind the board — includes gradient sky, rolling hills, and simple vegetation shapes. Supports subtle animation with a user-controlled toggle. No external image assets.
- **Unified Game HUD**: A single DOM panel component positioned in the upper-left corner containing all in-game status elements: toggle buttons (SFX, music, animation), turn indicator with player name and countdown timer, and ranked scoreboard. Must never overlap the playfield.
- **Tutorial Indicator**: A transient first-round UI element that shows an animated hand or mouse icon to teach the player the drag-to-position gesture. Auto-dismisses on interaction, only appears once per game session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Scoreboard always displays players in descending score order — verified by visual inspection at any point during gameplay.
- **SC-002**: Rank-change animations complete smoothly without visual jumps or layout shifts — no frame where two player rows occupy the same vertical position simultaneously.
- **SC-003**: All HUD elements (toggles, turn indicator, timer, scoreboard) are contained within a single unified panel in the upper-left corner on all tested screen sizes (320px, 768px, 1440px, 3440px widths) without overlapping the playfield.
- **SC-004**: The copyright subtitle is fully readable at the bottom of the registration overlay across all tested screen sizes.
- **SC-005**: 100% of collision popups display in "×N.N" format with no trailing characters — verified across 20+ collisions in a single game.
- **SC-006**: Slow-motion visibly reduces puck speed and music tempo for a brief moment when crossing the shove line — verified by observation.
- **SC-007**: Timer countdown continues at normal speed during slow-motion — verified by comparing timer values before and after the slow-motion window.
- **SC-008**: Background art is visible behind the game board and does not obscure any gameplay element — verified by visual inspection on 3+ screen sizes.
- **SC-009**: Background animation toggle button is functional and positioned near sound controls — verified by clicking it and observing animation start/stop.
- **SC-010**: Game maintains 60 fps during slow-motion sequences and background rendering (including animation) — no measurable frame-rate degradation from these features.
- **SC-011**: Tutorial indicator appears on the first turn of the first round with the correct device-appropriate icon and auto-dismisses on first canvas interaction — verified by starting a new game on both touch and mouse devices.
- **SC-012**: Tutorial indicator does not reappear on subsequent rounds or replays — verified by playing through multiple rounds and using Play Again.
- **SC-013**: Jackpot bucket sound plays distinctly when a puck lands in the center bucket — verified by landing 3+ pucks in the center bucket and confirming the additional celebratory sound.

## Assumptions

- The "game's global animation timing system" for scoreboard animations refers to using consistent easing functions and durations already established in the effects/rendering system (e.g., the 250ms collision flash duration, CSS transitions), not a specific central animation clock.
- Slow-motion duration and time-scale factor will use sensible defaults (e.g., ~0.5–1 second at 0.3× speed) that can be tuned later. Exact values are an implementation detail.
- The countryside background will be procedurally generated on the canvas (gradient sky, hills, simple shapes), not loaded from an image file. This matches the game's synthesized-audio aesthetic.
- The background animation toggle follows the same UI pattern as the sound toggles (icon button, same size, upper-left grouping).
- The shove line is the existing `shoveZoneY` boundary already computed in the physics system.
- "Supported screen sizes" means the same browser targets already defined: latest 2 versions of Chrome, Safari, Firefox, Edge on mobile and desktop.

## Scope Boundaries

### In Scope

- Scoreboard sort + rank-change animation
- Unified upper-left HUD panel containing toggle buttons, turn indicator + timer, and scoreboard
- Sound control repositioning (into unified HUD panel)
- Turn indicator / timer repositioning (into unified HUD panel)
- Unified HUD must not overlap the playfield
- Welcome overlay copyright subtitle
- Collision popup format change ("×N" prefix)
- Slow-motion physics + music + SFX sync on shove-line crossing
- Procedurally generated countryside background art with subtle animation and toggle button
- First-round tutorial indicator with device-aware icon and auto-dismiss
- Victory/jackpot sound effect for center (highest-scoring) bucket

### Out of Scope

- Game settings panel (round count, timer)
- Welcome/splash screen redesign beyond the copyright line
- Sound volume sliders (only mute toggles exist)
- New collision sound differentiation (pin vs puck vs wall)
- Scoreboard round indicator
