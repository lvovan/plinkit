# Research: Gameplay Variety & Polish

**Feature Branch**: `008-gameplay-variety`  
**Date**: 2026-02-25  
**Status**: Complete

---

## R-001: Dynamic Pin Layout — Spacing & Passability Constraints

### Decision
Pin layout randomization uses rows in [5, 9] and pins-per-row in [4, 6]. Pin spacing is computed dynamically per round instead of using the fixed `pinSpacing: 2.0`. A new `pinsPerRow` field on `BoardLayout` decouples pin count from `bucketCount`.

### Key Parameters
| Parameter | Current value | Dynamic value |
|-----------|---------------|---------------|
| `pinRows` | 6 (fixed) | 5–9 (random per round) |
| pins per even row | `bucketCount` = 5 | `pinsPerRow` = 4–6 (random per round) |
| pins per odd row | `bucketCount - 1` = 4 | `pinsPerRow - 1` = 3–5 |
| `pinSpacing` | 2.0 (fixed) | `min(2.0, (boardWidth - 2*(pinRadius + puckRadius)) / (pinsPerRow - 1))` |
| `pinRadius` | 0.30 | unchanged |
| `puckRadius` | 0.50 | unchanged |
| `boardWidth` | 10.0 | unchanged |

### Passability Constraint

A puck (radius 0.50) must fit between adjacent pins (radius 0.30 each). The minimum center-to-center distance is:

$$d_{\min} = 2 \times (\text{pinRadius} + \text{puckRadius}) = 2 \times (0.30 + 0.50) = 1.60 \text{ units}$$

With a 0.10 safety margin: **1.70 units minimum spacing**.

### Horizontal Spacing per `pinsPerRow`

Given `boardWidth = 10.0` and margins of `pinRadius + puckRadius = 0.80` on each side:

$$\text{usableWidth} = 10.0 - 2 \times 0.80 = 8.40$$

| pinsPerRow | Spacing = usableWidth / (n−1) | ≥ 1.70? |
|------------|-------------------------------|---------|
| 4 | 8.40 / 3 = **2.80** | ✅ |
| 5 | 8.40 / 4 = **2.10** | ✅ |
| 6 | 8.40 / 5 = **1.68** | ⚠️ marginal |

For `pinsPerRow = 6`, spacing is 1.68 — below the 1.70 safety threshold but above the hard minimum of 1.60. Decision: **allow 1.68 as it clears the hard minimum**. The 0.08 gap beyond puck diameter provides sufficient clearance for normal gameplay; occasional tight squeezes add variety.

### Diagonal Passability (Row-to-Row)

Staggered rows offset by half the horizontal spacing. The diagonal distance between a pin in row N and its neighbor in row N+1:

$$d_{\text{diag}} = \sqrt{(\text{spacing}/2)^2 + \text{rowSpacing}^2}$$

Row spacing = `(boardHeight - topMargin - bottomMargin) / (pinRows - 1)`:

| pinRows | rowSpacing (margins=2.0 each) | rowSpacing (margins=1.5 each) |
|---------|-------------------------------|-------------------------------|
| 5 | 10.0 / 4 = 2.50 | 11.0 / 4 = 2.75 |
| 6 | 10.0 / 5 = 2.00 | 11.0 / 5 = 2.20 |
| 7 | 10.0 / 6 = 1.67 | 11.0 / 6 = 1.83 |
| 8 | 10.0 / 7 = 1.43 | 11.0 / 7 = 1.57 |
| 9 | 10.0 / 8 = 1.25 | 11.0 / 8 = 1.375 |

For the densest valid layout (9 rows, 6 pins/row, spacing=1.68):

$$d_{\text{diag}} = \sqrt{(0.84)^2 + (1.25)^2} = \sqrt{0.706 + 1.563} = \sqrt{2.269} = 1.507$$

This is below 1.60 minimum. **Solution**: reduce margins from 2.0 to 1.5 for layouts with ≥ 8 rows:

$$d_{\text{diag}} = \sqrt{(0.84)^2 + (1.375)^2} = \sqrt{0.706 + 1.891} = \sqrt{2.597} = 1.611$$

This passes the hard minimum of 1.60. Decision: **use dynamic margins** — `topMargin = bottomMargin = pinRows >= 8 ? 1.5 : 2.0`.

### Combination Validation Summary

All 15 (rows × pins) combinations pass with dynamic margins. The tightest is (9, 6) at diagonal 1.611 — safe above the 1.60 hard minimum.

### Rationale
Dynamic spacing is necessary because fixed `pinSpacing: 2.0` would place 6 pins per row across 10.0 units of board width, requiring 10+ units of horizontal space. The formula adapts to any valid combination while maintaining playability.

### Alternatives Considered
1. **Fixed pinSpacing with fewer valid combos**: would limit variety to only 4–5 pins/row.
2. **Wider board for denser layouts**: rejected — board size is a constitutional constant, changing it affects all rendering.
3. **Non-uniform pin spacing per row**: added complexity with minimal gameplay benefit.

---

## R-002: Auto-Shove Impulse Mechanics

### Decision
When a puck is stuck (velocity < 0.1 u/s for 3 seconds above the bucket zone), apply an automatic impulse of magnitude 1.5 in a downward-biased direction. Retry up to 3 times with alternating directions before falling back to nearest-bucket assignment.

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Velocity threshold | 0.1 u/s | 10× the settle threshold (0.01), catches stuck pucks earlier while avoiding false positives on slowly decelerating pucks |
| Stall duration | 3 seconds (180 ticks at 60fps) | Pucks clearing pins take 1–2s; 3s strongly indicates genuine stall |
| Impulse magnitude | 1.5 | 30% of manual shove max (5.0). Produces Δv ≈ 1.91 u/s on a 0.785 kg puck — enough to dislodge from pin wedge but not enough to catapult off-board |
| Max retries | 3 | Worst case total time: 12s (3s × 3 retries + snap), comparable to existing 10s timeout |
| Warning visual | 0.3s puck pulse before impulse | Starts at 2.7s into stall so impulse fires at exactly 3.0s |

### Puck Mass Derivation

Planck.js circle body mass = π × r² × density = π × 0.25 × 1.0 ≈ **0.785 kg**

### Velocity change from impulse

$$\Delta v = \frac{\text{impulse}}{m} = \frac{1.5}{0.785} \approx 1.91 \text{ u/s}$$

This is sufficient to escape a pin wedge (pin gap ≈ 1.4 units at spacing 2.0) but well below terminal velocity under gravity -10.

### Direction Strategy: Alternating Downward-Biased

Pure downward `(0, -1)` fails when puck is symmetrically wedged between pins at the same height. Each attempt uses a different angle to break symmetry:

| Attempt | Direction (unit vector) | Angle from vertical |
|---------|------------------------|---------------------|
| 0 | (-0.37, -0.93) | ~22° left |
| 1 | (+0.37, -0.93) | ~22° right |
| 2 | (0, -1) | straight down |

```typescript
const DIRECTION_OFFSETS = [-0.4, 0.4, 0.0]; // horizontal components
function autoShoveDirection(attempt: number): { x: number; y: number } {
  const hx = DIRECTION_OFFSETS[attempt % 3];
  const hy = -1.0;
  const mag = Math.sqrt(hx * hx + hy * hy);
  return { x: hx / mag, y: hy / mag };
}
```

### Audio Cue

A distinct low "thunk" sound (~150 Hz, 100ms decay), separate from the manual shove sound. Plays at impulse moment, not during the warning visual.

### Integration Point

Auto-shove detection belongs in `BucketDetector.checkSettled()`. The flow:
1. Speed < 0.1 u/s for 180 ticks AND puck is above `bucketRegionTop` → emit `AutoShoveEvent`
2. `PhysicsSimulation` applies the impulse (owns the Planck.js world)
3. Reset stall timer, increment attempt counter per puck
4. After 3 failed attempts → fall through to existing `assignBucket()`

### Config Type

```typescript
interface AutoShoveConfig {
  velocityThreshold: number;   // 0.1 u/s
  stallTicks: number;          // 180 (3s at 60fps)
  impulseMagnitude: number;    // 1.5
  maxAttempts: number;         // 3
  warningDurationMs: number;   // 300ws (visual cue lead-in)
}
```

### Alternatives Considered
1. **Random direction each attempt**: less predictable break-out pattern; alternating is more systematic.
2. **Impulse toward nearest gap**: requires gap detection logic, adds complexity for marginal benefit.
3. **Increasing impulse per retry**: risk of OOB on later attempts; fixed magnitude is safer.

---

## R-003: Proportional Bucket Width Mapping

### Decision
Use **log₁₀(score)** as the weight for each bucket width (higher score → wider bucket, per spec FR-013). Physics divider positions match visual boundaries exactly.

### Why log₁₀ (not linear)

Linear mapping (`width ∝ score`) gives extreme ratios:

| Bucket | Score | Linear width | Problem |
|--------|-------|-------------|---------|
| 0 | 100 | 0.082 | Far below puck diameter |
| 2 | 10000 | 8.197 | Dominates entire board |

Log-scale compresses the range to a playable spread.

### Formula

$$w_i = \frac{\log_{10}(\text{score}_i)}{\sum_j \log_{10}(\text{score}_j)} \times \text{boardWidth}$$

### Computed Widths (scores: [100, 1000, 10000, 1000, 100])

| Bucket | Score | log₁₀ | Weight | Width (units) |
|--------|-------|-------|--------|---------------|
| 0 | 100 | 2 | 2/14 | **1.429** |
| 1 | 1000 | 3 | 3/14 | **2.143** |
| 2 | 10000 | 4 | 4/14 | **2.857** |
| 3 | 1000 | 3 | 3/14 | **2.143** |
| 4 | 100 | 2 | 2/14 | **1.429** |
| **Total** | | **14** | | **10.000** |

Ratio of widest to narrowest: 2.857 / 1.429 = **2.0×** (exceeds SC-004 requirement of ≥ 1.5×).

### Minimum Width Check

Narrowest bucket = 1.429 units. Puck diameter = 1.0 unit. Minimum safe width = 1.2 units (puck + 0.1 clearance each side). **1.429 > 1.2 ✅ — no clamping needed for current scores.**

A safety clamp should still exist for future-proofing:

```typescript
const MIN_BUCKET_WIDTH = 1.2;
```

### Physics Boundaries Must Match Visual

Per spec assumption: *"physics bucket boundaries are adjusted to match so puck scoring is consistent with what the player sees."* Dividers in `board-builder.ts` are placed from `computeBucketBoundaries()` output — updating that function is sufficient.

### Impact on `computeBucketBoundaries()`

Replace the equal-width calculation:
```typescript
// Before: const bucketWidth = boardWidth / bucketCount;
// After:
const weights = bucketScores.map(s => Math.log10(s));
const totalWeight = weights.reduce((a, b) => a + b, 0);
const widths = weights.map(w => (w / totalWeight) * boardWidth);
```

Return type and downstream consumers (`board-builder.ts`, `renderer.ts`, `main.ts`) unchanged.

### Alternatives Considered
1. **Inverse-log (higher score → narrower)**: contradicts spec FR-013 "higher-scoring buckets rendered wider".
2. **Linear score mapping**: extreme ratios make side buckets impossibly narrow.
3. **Visual-only proportionality (physics stays equal)**: rejected — spec assumption explicitly requires physics to match visuals.

---

## R-004: Coin Sound Synthesis Recipe

### Decision
Two-oscillator sine wave synthesis at inharmonic ratio (2400 Hz + 3800 Hz) producing a bright metallic "ding" lasting ~150ms.

### Design Rationale

| Property | Choice | Rationale |
|----------|--------|-----------|
| Oscillator type | `sine` × 2 | Cleanest bell/coin tone; two sines at non-integer ratio = metallic shimmer |
| Fundamental | 2400 Hz | Well above `playBucketLand` range (523–1047 Hz), no masking |
| Overtone | 3800 Hz | Ratio ≈ 1.583:1 (inharmonic = metallic quality, like a real coin) |
| Duration | ~150 ms | Percussive, complementary to bucketLand's 300ms arpeggio |
| Envelope | Instant attack → exponential decay | "Ding" character |
| Gain | Fundamental 0.3, overtone 0.15 | Overtone adds shimmer without overpowering |

### Frequency Collision Check

| Function | Frequencies |
|----------|------------|
| `playDrop` | 200→60 Hz |
| `playPinHit` | ~1000 Hz ±15% |
| `playBucketLand` | 523, 659, 784, 1047 Hz |
| `playJackpotBucket` | 523–3136 Hz |
| **`playCoinDing`** | **2400, 3800 Hz — no conflicts** |

### Layering with `playBucketLand`

The coin ding sits a full octave+ above bucketLand's range, "sparkling" on top of the arpeggio. Its 150ms duration finishes before the arpeggio completes, creating a satisfying layered effect.

### Implementation

```typescript
export function playCoinDing(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const dur = stretchDuration(0.15, timeScale);

  // Layer 1: fundamental "ding" at 2400 Hz
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(pitchShift(2400, timeScale), now);
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + dur);
  osc1.connect(gain1);
  gain1.connect(destination);
  osc1.start(now);
  osc1.stop(now + dur);

  // Layer 2: inharmonic overtone at 3800 Hz — faster decay for metallic timbre
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(pitchShift(3800, timeScale), now);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + stretchDuration(0.1, timeScale));
  osc2.connect(gain2);
  gain2.connect(destination);
  osc2.start(now);
  osc2.stop(now + dur);
}
```

### Alternatives Considered
1. **Single triangle wave**: fixed harmonics sound "buzzy", not metallic.
2. **FM synthesis**: more complex node graph for marginal improvement; two sines achieve the target timbre.
3. **Lower frequencies (800–1200 Hz)**: would overlap with `playPinHit` and `playBucketLand`.

---

## R-005: Player Name Persistence (localStorage)

### Decision
Store player names in `localStorage` under key `plinkit_player_names` as a JSON-serialized string array. Load on registration form open, save on form submit.

### Storage Schema

```json
{
  "key": "plinkit_player_names",
  "value": "[\"Alice\",\"Bob\"]"
}
```

### Read/Write Pattern

```typescript
const STORAGE_KEY = 'plinkit_player_names';

function loadSavedNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(n => typeof n === 'string') : [];
  } catch {
    return []; // silent degradation per FR-018
  }
}

function saveNames(names: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // silent degradation — storage full or unavailable
  }
}
```

### Integration Point

In `registration.ts`:
- On mount: call `loadSavedNames()`, pre-fill inputs with returned names
- On submit: call `saveNames()` with the current input values (including empty strings for cleared slots)

### Edge Cases
- **Private browsing**: `localStorage.setItem` may throw → caught silently
- **Storage full**: same catch-all
- **Corrupted data**: `JSON.parse` wrapped in try/catch, malformed data returns `[]`

### Alternatives Considered
1. **sessionStorage**: doesn't persist across tabs/sessions — defeats the purpose.
2. **IndexedDB**: overkill for a string array; localStorage is simpler and sufficient.
3. **Cookies**: size limits, sent with requests (irrelevant for SPA but bad practice).

---

## R-006: First-Round Shove Guidance Popup

### Decision
Track shove events during Round 1 via a boolean flag. If no shove occurred by end of Round 1, show a dismissible DOM overlay popup. Track "shown" state with a session-scoped variable (not localStorage, per FR-022).

### Trigger Conditions

1. `currentRound === 1` AND round just completed
2. `shoveOccurredInRound1 === false`
3. `guidanceShownThisSession === false`
4. NOT a tie-breaker round
5. NOT during game-end results display

### Tracking Shove Events

The existing `applyShove()` in `simulation.ts` fires on every manual shove. Hook into this to set `shoveOccurredInRound1 = true` during Round 1.

### Popup Content

```
"Did you know?"
"While your puck is falling, flick it to change its direction!
This can help you aim for higher-scoring buckets."

[Got it!]
```

### Implementation Pattern

Follow the same overlay pattern as `registration.ts` and `tutorial-indicator.ts`:
- Create a DOM overlay div with `position: fixed`, `z-index: 1000`
- ≥ 44px touch target on dismiss button (per constitution cross-device requirement)
- Overlay captures click/touch on dismiss button → removes overlay → resumes game flow

### Session Scoping

```typescript
let guidanceShownThisSession = false; // module-level, resets on page reload
```

This matches FR-022: "at most once per browser session".

### Alternatives Considered
1. **localStorage for "shown" tracking**: spec explicitly says session-scoped, not persistent.
2. **Inline tooltip instead of overlay**: less visible, might be missed.
3. **Show during Round 1 turns**: interrupts gameplay; end-of-round is a natural pause point.
