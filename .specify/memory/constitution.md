<!--
  Sync Impact Report
  ==================
  Version change: N/A (template) → 1.0.0
  Modified principles: N/A (initial ratification)
  Added sections:
    - Core Principles (5 principles defined)
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed (dynamic reference)
    - .specify/templates/spec-template.md ✅ no changes needed (generic)
    - .specify/templates/tasks-template.md ✅ no changes needed (generic)
  Follow-up TODOs: None
-->

# Plinkit Constitution

## Core Principles

### I. Browser-Only, Zero Backend (NON-NEGOTIABLE)

- The entire game MUST run as a client-side Single Page Application.
  No server-side logic, no backend APIs, no databases for gameplay.
- All game state MUST live exclusively in the browser runtime.
- Network calls for core gameplay are FORBIDDEN. Asset loading
  from a static host is permitted; dynamic server interaction is not.
- The game MUST be deployable as static files to any CDN or
  file-based host.

**Rationale**: Eliminates infrastructure cost and latency. Ensures
the game works offline after initial load and keeps the stack simple.

### II. Physics Realism

- The game MUST use a real physics simulation engine — not ad-hoc
  movement or collision code.
- Physics behavior MUST feel natural and predictable to players:
  gravity, collisions, bounce, and friction MUST behave as users
  expect from the real world.
- Physics MUST produce consistent results across devices and frame
  rates via fixed-timestep simulation.
- Physics parameters (gravity, restitution, mass) MUST be tunable
  without code changes (configuration-driven).

**Rationale**: Realistic physics is the core differentiator of
Plinkit. Inconsistent or fake-feeling physics undermines the entire
game experience.

### III. Cross-Device Responsive Play

- The game MUST be fully playable on mobile devices (touch input)
  and large screens (keyboard, mouse, or gamepad input).
- UI layout MUST adapt to screen size using responsive design;
  no horizontal scrolling, no clipped game areas.
- Local multiplayer ("couch play") MUST support multiple players
  sharing a single device or screen.
- Touch targets MUST be at minimum 44×44 CSS pixels for mobile.
- The game MUST render at 60 fps on mid-range mobile devices
  (2022-era budget phones).

**Rationale**: Couch play is the primary use case. The game fails
if any player's device cannot run it smoothly or if controls feel
awkward on their screen size.

### IV. All-Ages Fun & Accessibility

- The game MUST be enjoyable and intuitive for both adults and
  children (ages 6+).
- Controls MUST be learnable without reading instructions; use
  visual affordances and onboarding cues.
- All visual content and themes MUST be appropriate for all ages —
  no violence, mature themes, or exclusionary language.
- Color choices MUST maintain a contrast ratio of at least 4.5:1
  for essential UI elements (WCAG AA).
- The game MUST NOT require precise text reading to play.

**Rationale**: A couch-play party game only succeeds if everyone
in the room — kids and adults alike — can jump in immediately.

### V. Test-First for Game Logic

- All game logic, physics integration, scoring, and state
  management MUST have automated tests written before
  implementation (Red-Green-Refactor).
- Unit tests MUST cover physics calculations, collision outcomes,
  scoring rules, and game state transitions.
- Integration tests MUST cover complete game flows (start game →
  play round → determine winner).
- Visual/rendering code is exempt from TDD but MUST have manual
  test scenarios documented.

**Rationale**: Physics and scoring bugs in a competitive game
destroy trust and fun. Automated tests catch regressions that
playtesting alone misses.

## Technology Constraints

- **Language**: TypeScript in strict mode (`strict: true`). No
  `any` types except in third-party type shims.
- **Rendering**: Canvas-based or WebGL rendering. DOM-based game
  rendering is NOT permitted for the game surface (UI overlays
  may use DOM).
- **Physics Engine**: A proven 2D physics library (e.g., Matter.js,
  Planck.js, or Rapier WASM). Hand-rolled physics is FORBIDDEN.
- **Bundle Size**: Total initial bundle MUST NOT exceed 1 MB
  gzipped. Lazy-load non-critical assets.
- **Offline Capable**: After first load, the game MUST work with
  no network via service worker or equivalent caching.
- **Browser Support**: Latest two major versions of Chrome, Safari,
  Firefox, and Edge. No IE support.
- **No Native Dependencies**: The build MUST NOT depend on native
  binaries beyond the Node.js toolchain. WASM modules are
  permitted.

## Development Workflow

- **Branching**: Feature branches off `main`. Merge via pull
  request with at least one approval.
- **Mobile-First**: Design and test on mobile viewports first,
  then scale up to large screens.
- **Performance Budget**: Every PR MUST verify that the game holds
  60 fps on the target baseline device. Frame-rate regressions
  block merge.
- **Asset Pipeline**: Game assets (sprites, sounds) MUST be
  version-controlled or fetched from a reproducible build step.
  No manually-placed binary blobs in `src/`.
- **Commit Hygiene**: Each commit MUST represent a single logical
  change. Commit messages follow Conventional Commits format.

## Governance

- This constitution is the highest-authority document for Plinkit.
  All implementation decisions, code reviews, and feature designs
  MUST comply with the principles above.
- Amendments require:
  1. A written proposal describing the change and rationale.
  2. Review and approval before merging.
  3. A migration plan if existing code is affected.
- Versioning follows Semantic Versioning (MAJOR.MINOR.PATCH):
  - MAJOR: Principle removal or backward-incompatible redefinition.
  - MINOR: New principle, section addition, or material expansion.
  - PATCH: Clarifications, wording fixes, non-semantic refinements.
- All PRs and code reviews MUST verify compliance with this
  constitution. Violations MUST be resolved before merge.
- Added complexity MUST be justified against the Simplicity bias
  inherent in Principles I and IV.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
