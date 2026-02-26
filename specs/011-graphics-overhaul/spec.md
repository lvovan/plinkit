# Feature Specification: Graphics Overhaul — Wood Theme & Visual Polish

**Feature Branch**: `011-graphics-overhaul`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: User description: "Update graphics: wood pattern board, thicker wood dividers, refined puck art, collision effects at collision point, bucket width repartition low:20% medium:20% high:20%"

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

### User Story 1 — Wood-Themed Board (Priority: P1)

As a player, when the game loads I see a board surface with a warm wood-grain pattern reminiscent of real Plinko game boards, replacing the current flat navy background. The wood motif immediately conveys a tactile, physical-game feel and sets the visual tone for the entire experience.

**Why this priority**: The board is the largest visible surface and defines the game's overall aesthetic. Every other visual element sits on top of it, so updating the board first establishes the wood theme that dividers and pucks will complement.

**Independent Test**: Launch the game and visually confirm the board area displays a wood-grain pattern. No gameplay changes are required — this is purely a visual upgrade.

**Acceptance Scenarios**:

1. **Given** the game is loaded, **When** the player views the board, **Then** the board area displays a procedural wood-grain pattern with natural colour variation (warm browns and tans)
2. **Given** the game is loaded, **When** the player views the board on different screen sizes, **Then** the wood-grain pattern scales proportionally without visible tiling seams or distortion
3. **Given** the wood-themed board is rendered, **When** the player observes the board, **Then** pegs, dividers, buckets and pucks remain clearly distinguishable against the wood background

---

### User Story 2 — Thicker Wood-Style Dividers (Priority: P2)

As a player, the bucket dividers at the bottom of the board appear as solid, slightly thicker wooden posts rather than thin white lines. They visually match the board's wood theme and look like the physical divider walls found on real Plinko boards.

**Why this priority**: Dividers are a key visual element at the scoring zone. Giving them visible thickness and a wood finish reinforces the theme and improves readability of bucket boundaries.

**Independent Test**: Start a game and visually inspect the dividers between buckets. Confirm they appear as thick wooden posts with grain/shading, clearly separating each bucket.

**Acceptance Scenarios**:

1. **Given** the game is loaded, **When** the player views the bucket area, **Then** each divider appears as a visible rectangular post with a wood-grain appearance
2. **Given** the dividers are rendered, **When** compared to the previous design, **Then** each divider is noticeably thicker (wider) than the former 2-pixel lines
3. **Given** the dividers are rendered with the new style, **When** a puck passes near a divider, **Then** collisions with the divider still behave correctly (the physics body matches the visual width)

---

### User Story 3 — Refined Puck Art (Priority: P2)

As a player, each puck has a flat, solid-colour appearance reminiscent of a real hockey puck — no 3D radial gradients, no specular highlights, just a clean disc with a drop shadow and pattern overlay for visual distinction.

**Why this priority**: Pucks are the primary interactive element. A flat, clean disc style is easier to read at a glance and pairs well with the wood board theme.

**Independent Test**: Drop pucks for each player colour and confirm they render as flat solid-colour discs with a drop shadow, visible pattern overlay, and a darker outline. There should be no radial highlight or specular gloss.

**Acceptance Scenarios**:

1. **Given** a puck is on the board, **When** the player observes it, **Then** the puck displays a flat solid fill of its player colour with no radial gradient or specular highlight
2. **Given** pucks of different player colours are on the board, **When** the player compares them, **Then** each colour retains its distinctiveness with the flat fill style
3. **Given** a puck has a pattern overlay (stripes, dots, or rings), **When** rendered, **Then** the overlay is clearly visible on the flat-colour surface

---

### User Story 4 — Collision Effects at Contact Point (Priority: P3)

As a player, when a puck bounces off a peg, the visual flash/spark effect appears exactly at the point where the two objects touched, rather than at the puck's centre. This makes impacts feel more precise and satisfying.

**Why this priority**: Correctly positioned collision effects improve juice and perceived realism. Dependent on knowing the contact point from the physics engine, making it slightly more complex.

**Independent Test**: Drop a puck and observe collisions with pegs. The flash effect should appear at the edge of the puck closest to the peg, not in the puck's centre.

**Acceptance Scenarios**:

1. **Given** a puck is falling, **When** it collides with a peg, **Then** the collision flash appears at the point of contact between the puck edge and the peg surface
2. **Given** a puck collides at different angles with different pegs, **When** each collision occurs, **Then** the flash consistently appears at the correct contact point for that specific collision angle
3. **Given** a puck collides with a bucket divider, **When** the collision occurs, **Then** the flash also appears at the contact point with the divider, not at the puck centre

---

### User Story 5 — Bucket Width Redistribution (Priority: P3)

As a player, the scoring buckets at the bottom of the board are evenly distributed so that low-score, medium-score and high-score buckets each occupy 20% of the total board width (with the remaining width used symmetrically). This changes the risk-reward balance of the game.

**Why this priority**: Bucket sizing directly affects gameplay balance and scoring distribution. It is a config change with visual knock-on effects (label sizing, divider placement) but lower visual impact than the wood theme work.

**Independent Test**: Launch the game, measure bucket widths visually and confirm that the low, medium, and high score buckets each occupy approximately equal proportions of the board.

**Acceptance Scenarios**:

1. **Given** the game is loaded, **When** the player views the bucket row, **Then** low-score buckets (100 pt) each occupy 20% of the board width
2. **Given** the game is loaded, **When** the player views the bucket row, **Then** medium-score buckets (1,000 pt) each occupy 20% of the board width
3. **Given** the game is loaded, **When** the player views the bucket row, **Then** the high-score bucket (10,000 pt) occupies 20% of the board width
4. **Given** the new bucket distribution, **When** the player visually inspects the board, **Then** score labels inside each bucket are legible and correctly positioned within the resized bucket areas

---

### Edge Cases

- What happens when the wood-grain pattern is viewed at very low resolution (e.g., small mobile screens) — does it degrade gracefully or become muddy? The pattern should remain legible at any supported resolution.
- What if a collision happens exactly at the boundary between two pegs simultaneously? The contact point for each collision should be computed independently.
- How do the thicker dividers interact with pucks at extreme angles — do pucks get trapped between a divider and the board edge? Physics bodies must match the new visual width to prevent visual-physics mismatches.
- With even bucket widths, do puck landing animations and score pop-ups still fit inside narrower/wider buckets? Labels and effects must adapt to new bucket dimensions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board area MUST display a procedural wood-grain pattern with natural warm-brown colour variation, replacing the current solid-colour background
- **FR-002**: The wood-grain pattern MUST tile or scale seamlessly across the full board area with no visible repetition artefacts at any supported resolution
- **FR-003**: Bucket dividers MUST render as visibly thick rectangular posts (noticeably wider than before) with a wood-grain or wood-shaded appearance that matches the board theme
- **FR-004**: The physics collision bodies for dividers MUST match their new visual width so that puck-divider interactions are physically accurate
- **FR-005**: Pucks MUST render with a flat solid-colour fill (no radial gradient or specular highlight), a drop shadow for depth, and a darker outline for definition
- **FR-006**: Existing puck pattern overlays (stripes, dots, rings) MUST remain visible and blend with the new shading style
- **FR-007**: Each player colour MUST remain clearly distinguishable with the new puck shading applied
- **FR-008**: Collision visual effects (flashes) MUST appear at the calculated contact point between the colliding bodies, not at the puck's centre
- **FR-009**: Contact-point collision effects MUST apply to puck-peg collisions and puck-divider collisions alike
- **FR-010**: Bucket widths MUST be redistributed so that each scoring tier occupies 20% of the board width — specifically: low-score buckets at 20% each, medium-score buckets at 20% each, and the high-score bucket at 20%
- **FR-011**: Score labels within buckets MUST remain legible and correctly centred after the width redistribution
- **FR-012**: All visual changes MUST maintain smooth rendering performance without introducing noticeable frame-rate drops during normal gameplay
- **FR-013**: Pegs MUST be rendered as dark wooden pegs with a 3D radial gradient, visually darker than the board's wood-grain surface, ensuring clear contrast and a cohesive wooden aesthetic

### Key Entities

- **Board Surface**: The main play area background; currently a solid colour, to become a wood-grain pattern. Occupies the full board rectangle.
- **Peg**: Circular obstacle on the board that pucks bounce off. Rendered as a dark wooden peg (darker than the board surface) with a 3D radial gradient and subtle specular highlight.
- **Divider**: Vertical post separating buckets at the board bottom. Attributes: width (increased), height, visual style (wood grain). Has a corresponding physics body whose dimensions must match.
- **Puck**: Player-controlled token dropped from the top of the board. Attributes: colour, pattern overlay, radius. Rendered with new 3D shading.
- **Collision Effect**: Visual flash/spark triggered on impact. Key attribute: position (changed from puck centre to contact point).
- **Bucket**: Scoring zone between dividers at board bottom. Attributes: width fraction (changed to uniform 20%), score value, label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The board background is universally perceived as wood-themed by 4 out of 5 independent observers in a brief visual review
- **SC-002**: Dividers are identifiable as thick wooden posts rather than thin lines by all observers
- **SC-003**: Pucks appear three-dimensional (shaded, highlighted) to observers and each player colour is correctly identified in a blind colour-identification test
- **SC-004**: 100% of collision flash effects appear within the contact zone between colliding bodies (no flashes at puck centre)
- **SC-005**: All five buckets visually occupy equal width (each ≈ 20% of the board), confirmed by pixel measurement within a 2% tolerance
- **SC-006**: The game maintains a smooth frame rate (no perceptible stutter) during normal play with up to 4 simultaneous pucks after all visual changes are applied
- **SC-007**: Score labels inside every bucket remain fully visible and legible at the game's default resolution

## Assumptions

- The current 5-bucket, symmetric score layout (100 / 1,000 / 10,000 / 1,000 / 100) is retained; only widths change
- The wood-grain pattern is procedurally generated (not a pre-made image asset), consistent with the existing procedural background approach
- Pegs are rendered as dark wooden pegs with a 3D shaded appearance, noticeably darker than the board's wood-grain surface for clear contrast
- "20% each" for five buckets totals 100% of the board width — no margin or dead space is introduced beyond the divider width itself
- The countryside background behind the board (sky, hills, clouds) is not altered
- The existing puck growth mechanic and auto-shove warning glow are preserved unchanged
