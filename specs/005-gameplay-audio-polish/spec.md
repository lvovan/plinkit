# Feature Specification: Gameplay Audio Polish — Unlimited Shoves, Puck Patterns & Sound

**Feature Branch**: `005-gameplay-audio-polish`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "The number of shoves should now be unlimited. Pucks must have a pattern drawn on them to enable users to see the effect of rotations. Add sound effects (drop, bounce on pins, scoring), and a suspenseful yet playful background music (town fair style)."

## Clarifications

### Session 2026-02-25

- Q: How should audio assets (SFX sprite sheet + background music) be produced? → A: Programmatically synthesize all audio at runtime using the native Web Audio API with a thin custom wrapper — no pre-recorded files or external libraries needed.
- Q: Should music and SFX have separate mute controls or a single unified toggle? → A: Two separate toggles — one for music, one for sound effects.
- Q: Should puck pattern assignment be automatic or player-chosen? → A: Automatic round-robin (Player 1 = stripes, Player 2 = dots, etc.).
- Q: When should background music begin playing? → A: Gameplay music starts when the first puck is dropped. A separate calm, lobby-style track plays during start/registration menus and end-score screens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Unlimited Shoves (Priority: P1)

A player drops a puck and wants to influence its path as it falls through the board. Previously limited to two shoves per turn, the player can now shove the puck as many times as they wish while it is in the shove-eligible zone. The shove counter UI is removed since there is no longer a finite count to display. The player keeps swiping to nudge the puck until it exits the shove zone or lands in a bucket.

**Why this priority**: Unlimited shoves fundamentally changes the gameplay dynamic, giving players more agency and making each turn more engaging. This is the simplest change with the highest gameplay impact.

**Independent Test**: Can be fully tested by dropping a puck and performing more than two shoves in a single turn — all shoves should apply force. Delivers immediate gameplay value without any other changes.

**Acceptance Scenarios**:

1. **Given** a puck is in the shove-eligible zone, **When** the player performs a 3rd, 4th, or any subsequent shove gesture, **Then** each shove applies force to the puck just as the 1st and 2nd shove do.
2. **Given** a puck is in the shove-eligible zone, **When** the player looks at the screen, **Then** no shove counter or remaining-shove indicator is displayed.
3. **Given** a puck has exited the shove-eligible zone (fallen below the shove zone row limit), **When** the player performs a shove gesture, **Then** no force is applied.
4. **Given** the turn timer has expired (timed-out drop), **When** the player attempts a shove, **Then** no force is applied (existing timeout behavior preserved).

---

### User Story 2 — Visible Puck Rotation Patterns (Priority: P2)

When a player drops a puck, it displays a visible pattern (stripes, dots, or rings) that rotates with the puck's physics. This makes every bounce, spin, and shove visually apparent. No puck should use the "solid" pattern, ensuring rotation is always perceivable. Each player's puck is visually distinct through its assigned pattern and color.

**Why this priority**: Pattern rendering on pucks is the primary visual feedback that makes rotation physics tangible to players. Without a pattern, rotation is invisible and the physics feel wasted.

**Independent Test**: Can be tested by dropping a puck and observing that it displays a non-solid pattern that visibly spins when the puck collides with pins or receives a shove.

**Acceptance Scenarios**:

1. **Given** a new game starts, **When** pucks are assigned to players, **Then** every puck has a non-solid pattern (stripes, dots, or rings) — no puck uses the "solid" pattern.
2. **Given** a puck with a stripes pattern, **When** the puck hits a pin and gains angular velocity, **Then** the stripe pattern visibly rotates in sync with the physics rotation.
3. **Given** a puck is in the pre-drop ghost state, **When** the player positions it, **Then** the ghost puck shows the pattern at a neutral angle (0°) with reduced opacity.
4. **Given** two players are playing, **When** their pucks are on the board, **Then** each player's pucks are distinguishable by a combination of color and pattern.

---

### User Story 3 — Sound Effects (Priority: P2)

As a player interacts with the game, audible feedback accompanies key moments: a satisfying "clunk" when the puck drops, a light percussive tap on each pin bounce, and a celebratory sound when the puck lands in a scoring bucket. Each sound effect enhances the tactile feel of gameplay. Sounds are short, distinct, and do not overlap in an unpleasant way when many pin bounces occur in quick succession.

**Why this priority**: Sound effects are equally important as visual patterns — they complete the sensory feedback loop and make the game feel polished and responsive.

**Independent Test**: Can be tested by dropping a puck with the sound on, verifying that a drop sound plays on release, pin-hit taps play on bounces (rate-limited to avoid cacophony), and a scoring sound plays on bucket landing.

**Acceptance Scenarios**:

1. **Given** the player releases a puck from the drop zone, **When** the puck begins falling, **Then** a "drop" sound plays once.
2. **Given** a puck is falling through the pin field, **When** the puck collides with a pin, **Then** a short pin-hit sound plays, with rate-limiting so rapid bounces do not create an unpleasant audio blast.
3. **Given** the player shoves a puck, **When** the shove force is applied, **Then** a "shove" whoosh sound plays.
4. **Given** a puck lands in a scoring bucket, **When** the bucket landing is detected, **Then** a celebratory scoring sound plays.
5. **Given** the player has muted sound effects via the SFX toggle, **When** any game event occurs, **Then** no sound effects play (background music is unaffected).

---

### User Story 4 — Background Music (Priority: P3)

The game features two distinct music tracks. A calm, ambient lobby track plays during the registration/start screen and the end-score/results screen, setting a relaxed mood. When the first puck is dropped and active gameplay begins, the music crossfades to an upbeat town-fair, carnival-style track — suspenseful yet playful — evoking the atmosphere of a fairground game. When the game ends and the results screen appears, the music transitions back to the calm lobby track. Both tracks loop seamlessly. Players can mute or unmute music independently of sound effects.

**Why this priority**: Background music elevates the overall atmosphere but is not essential for core gameplay feedback. It depends on the audio system being functional (Story 3).

**Independent Test**: Can be tested by starting the game (hearing calm lobby music), dropping a puck (hearing carnival gameplay music), and finishing a game (hearing lobby music return on results screen). Muting should silence the music.

**Acceptance Scenarios**:

1. **Given** the game is on the registration/start screen and the player has interacted with the page, **When** the screen loads, **Then** a calm, ambient lobby music track plays.
2. **Given** the lobby music is playing, **When** the first puck of a round is dropped, **Then** the music transitions to the upbeat town-fair gameplay track.
3. **Given** the gameplay music is playing, **When** the game ends and the results screen appears, **Then** the music transitions back to the calm lobby track.
4. **Given** either music track is playing, **When** the track reaches its end, **Then** the music loops back to the start seamlessly without audible gap or pop.
5. **Given** the player toggles the music mute button, **When** music is muted, **Then** background music is silenced but sound effects continue playing.
6. **Given** the player toggles the SFX mute button, **When** SFX is muted, **Then** sound effects are silenced but background music continues playing.
7. **Given** both toggles are muted, **When** the player unmutes each independently, **Then** only the unmuted category resumes.
8. **Given** the game is in any state (lobby, playing, results), **When** no player action is occurring, **Then** the appropriate music track continues playing.

---

### Edge Cases

- What happens when a puck receives dozens of rapid shoves? Each shove gesture applies force normally; the physics engine's existing force-magnitude cap and angular-velocity cap prevent the puck from exceeding safe velocity bounds.
- What happens if the audio file fails to load? The game remains fully playable without audio. Sound-related features degrade gracefully — no errors interrupt gameplay.
- What happens when many pucks hit pins simultaneously (multiplayer)? Pin-hit sounds are rate-limited (existing mechanism caps overlapping sounds) so audio does not become overwhelming.
- What if the browser does not support autoplay for background music? Music should be triggered only after the first user interaction, following standard browser autoplay policies.
- What pattern does a puck get if only two pattern types exist for more than two players? Patterns can repeat across players as long as the combination of color and pattern is unique per player.

## Requirements *(mandatory)*

### Functional Requirements

**Unlimited Shoves**

- **FR-001**: The game MUST allow unlimited shove gestures per turn while the puck is within the shove-eligible zone.
- **FR-002**: The shove counter UI element MUST be removed from the game display.
- **FR-003**: The existing shove-zone boundary and force-magnitude cap MUST remain unchanged — only the count limit is removed.
- **FR-004**: Shoves MUST still be blocked when the turn timer has expired (timed-out drop behavior preserved).

**Puck Patterns**

- **FR-005**: Every puck MUST be assigned a non-solid pattern (stripes, dots, or rings) so that rotation is always visible.
- **FR-006**: The puck pattern MUST rotate in real-time to match the puck's physics rotation angle.
- **FR-007**: Each player's puck MUST be automatically assigned a visually distinct combination of color and pattern via round-robin (Player 1 = stripes, Player 2 = dots, Player 3 = rings, then cycling). No player selection UI is needed.
- **FR-008**: Ghost pucks (pre-drop preview) MUST display the assigned pattern at angle 0° with reduced opacity.

**Sound Effects**

- **FR-009**: A "drop" sound effect MUST play when a puck is released into the board.
- **FR-010**: A "pin hit" sound effect MUST play when a puck collides with a pin, subject to rate-limiting to prevent audio overload.
- **FR-011**: A "shove" sound effect MUST play when a shove force is applied to a puck.
- **FR-012**: A "bucket land" / scoring sound effect MUST play when a puck lands in a scoring bucket.
- **FR-013**: All sound effects MUST be silenced when the player has muted SFX via the dedicated SFX toggle.
- **FR-014**: All sound effects MUST be programmatically synthesized at runtime using the native Web Audio API — no pre-recorded audio files or external audio libraries are required.

**Background Music**

- **FR-015**: The game MUST play two distinct looping music tracks: a calm lobby track (for registration and results screens) and an upbeat town-fair / carnival gameplay track (during active play).
- **FR-016**: Both music tracks MUST loop seamlessly without audible gaps, pops, or clicks.
- **FR-017**: The game MUST provide two separate mute toggles: one for background music and one for sound effects, each operating independently.
- **FR-018**: Music MUST not auto-play before user interaction, complying with browser autoplay policies.
- **FR-019**: Both music tracks MUST be programmatically composed and played at runtime using the native Web Audio API — no pre-recorded music files or external audio libraries are required.
- **FR-020**: The music MUST transition from the lobby track to the gameplay track when the first puck of a round is dropped, and transition back to the lobby track when the results screen appears.

### Key Entities

- **Shove**: A player-initiated force applied to a puck. No longer has a per-turn count; still constrained by zone boundaries, force caps, and turn-timer state.
- **Puck Pattern**: A visual overlay (stripes, dots, or rings) drawn on a puck that rotates with the puck's physics angle. Automatically assigned per player via round-robin; every puck must have one.
- **Sound Effect**: A short audio clip triggered by a game event (drop, pin hit, shove, bucket land). Subject to rate-limiting and mute state.
- **Background Music**: Two looping audio tracks providing ambient atmosphere: a calm lobby track for menus/results and an upbeat town-fair gameplay track for active play. Independent from sound effects in content but shares a dedicated mute toggle.

## Assumptions

- The existing shove-zone boundary (top N rows of the board) and force-magnitude cap provide sufficient safeguards against physics instability even with unlimited shoves.
- The existing rate-limiting mechanism (max 4 sounds per 50ms window) is adequate for preventing audio overload with unlimited shoves and frequent pin collisions.
- All audio (sound effects and background music) will be programmatically synthesized at runtime using the native Web Audio API with a thin custom wrapper — no pre-recorded audio files or external libraries are needed. The current audio directory remains empty by design.
- The three non-solid patterns (stripes, dots, rings) are sufficient to differentiate players when combined with player colors, for up to at least 6 distinct player identities (3 patterns × multiple colors).
- Background music volume will be set at a lower level relative to sound effects so it does not mask gameplay audio feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can perform 10 or more shoves in a single turn without any shove being rejected (other than zone/timer constraints).
- **SC-002**: 100% of pucks on the board display a visible non-solid pattern that rotates when the puck spins.
- **SC-003**: Drop, pin-hit, shove, and bucket-land sound effects play within 100ms of their triggering event.
- **SC-004**: Background music loops continuously for at least 5 minutes of gameplay without audible gaps or interruptions.
- **SC-005**: Muting the SFX toggle silences only sound effects; muting the music toggle silences only background music; each operates independently.
- **SC-006**: The game remains playable and responsive with no frame-rate degradation when a player performs rapid successive shoves.
