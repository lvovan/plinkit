import type { BoardLayout, PinPosition, BucketBoundary, Vec2 } from '@/types/index';

/**
 * Compute pin positions in a staggered Plinko layout.
 *
 * Pins are arranged in rows. Even-numbered rows (0, 2, 4...) have pins at
 * integer spacing. Odd-numbered rows are offset by half the pin spacing.
 * The board is horizontally centered at x=0.
 */
export function computePinPositions(layout: BoardLayout): PinPosition[] {
  const pins: PinPosition[] = [];
  const { pinRows, boardHeight, boardWidth, pinRadius, puckRadius } = layout;

  // Use pinsPerRow if available, fallback to bucketCount for backwards compatibility
  const pinsPerRow = layout.pinsPerRow ?? layout.bucketCount;

  // Dynamic margins: reduce for dense layouts (≥8 rows) to maintain diagonal passability
  const margin = pinRows >= 8 ? 1.5 : 2.0;
  const topMargin = margin;
  const bottomMargin = margin;
  const usableHeight = boardHeight - topMargin - bottomMargin;
  const rowSpacing = usableHeight / (pinRows - 1);

  // Dynamic horizontal spacing: fit pinsPerRow within boardWidth with edge clearance
  const edgeMargin = pinRadius + puckRadius; // 0.80 each side
  const usableWidth = boardWidth - 2 * edgeMargin;
  const pinSpacing = pinsPerRow > 1
    ? Math.min(2.0, usableWidth / (pinsPerRow - 1))
    : 0;

  for (let row = 0; row < pinRows; row++) {
    // Number of pins per row: alternate between pinsPerRow and pinsPerRow-1
    // Odd rows have one fewer pin; centering them naturally places pins
    // halfway between the even-row pins (staggered / "en quinconce").
    const pinsInRow = row % 2 === 0 ? pinsPerRow : pinsPerRow - 1;
    const rowWidth = (pinsInRow - 1) * pinSpacing;

    // Y position: top of play area down to bottom
    // In Planck.js, positive Y is up, so top row is highest Y
    const y = boardHeight / 2 - topMargin - row * rowSpacing;

    for (let col = 0; col < pinsInRow; col++) {
      const x = -rowWidth / 2 + col * pinSpacing;
      pins.push({ x, y, row, col });
    }
  }

  return pins;
}

/**
 * Compute bucket boundary positions across the bottom of the board.
 * Bucket widths are proportional to log₁₀(score) — higher-scoring buckets are wider.
 */
export function computeBucketBoundaries(layout: BoardLayout): BucketBoundary[] {
  const { bucketCount, bucketScores, boardWidth } = layout;
  const halfBoard = boardWidth / 2;
  const MIN_BUCKET_WIDTH = 1.2; // minimum width for puck to fit

  // Compute log₁₀ weights for proportional widths
  const weights = bucketScores.map(s => Math.log10(Math.max(1, s)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Initial proportional widths
  let widths = weights.map(w => (w / totalWeight) * boardWidth);

  // Clamp to minimum width and redistribute excess
  let deficit = 0;
  for (let i = 0; i < widths.length; i++) {
    if (widths[i] < MIN_BUCKET_WIDTH) {
      deficit += MIN_BUCKET_WIDTH - widths[i];
      widths[i] = MIN_BUCKET_WIDTH;
    }
  }

  // Redistribute deficit proportionally from buckets above minimum
  if (deficit > 0) {
    const aboveMin = widths.filter(w => w > MIN_BUCKET_WIDTH);
    const aboveTotal = aboveMin.reduce((a, b) => a + b, 0);
    if (aboveTotal > 0) {
      widths = widths.map(w =>
        w > MIN_BUCKET_WIDTH ? w - deficit * (w / aboveTotal) : w,
      );
    }
  }

  const buckets: BucketBoundary[] = [];
  let currentX = -halfBoard;
  for (let i = 0; i < bucketCount; i++) {
    const leftX = currentX;
    const rightX = leftX + widths[i];
    buckets.push({
      index: i,
      leftX,
      rightX,
      centerX: (leftX + rightX) / 2,
      score: bucketScores[i],
    });
    currentX = rightX;
  }

  return buckets;
}

/**
 * Compute the Y coordinate of the shove-zone boundary.
 * Shoves are allowed only while the puck is above this Y position
 * (i.e., in pin rows 1 through shoveZoneRowLimit).
 */
export function computeShoveZoneY(
  layout: BoardLayout,
  shoveZoneRowLimit: number,
): number {
  const { pinRows, boardHeight } = layout;
  const margin = pinRows >= 8 ? 1.5 : 2.0;
  const topMargin = margin;
  const bottomMargin = margin;
  const usableHeight = boardHeight - topMargin - bottomMargin;
  const rowSpacing = usableHeight / (pinRows - 1);

  // Row index is 0-based; shoveZoneRowLimit is 1-based row number
  // The boundary is at the Y position of the row at index (shoveZoneRowLimit - 1)
  const y = boardHeight / 2 - topMargin - (shoveZoneRowLimit - 1) * rowSpacing;
  return y;
}

/**
 * Get the drop zone Y position (above the first pin row).
 */
export function getDropZoneY(layout: BoardLayout): number {
  const margin = layout.pinRows >= 8 ? 1.5 : 2.0;
  return layout.boardHeight / 2 - margin / 2;
}

/**
 * Determine which bucket a puck at position x belongs to.
 * Returns the bucket index (0-based), or -1 if out of bounds.
 */
export function getBucketIndexAtX(layout: BoardLayout, x: number): number {
  const buckets = computeBucketBoundaries(layout);
  for (const bucket of buckets) {
    if (x >= bucket.leftX && x < bucket.rightX) {
      return bucket.index;
    }
  }
  // Edge case: if exactly at rightmost edge, assign to last bucket
  if (x >= buckets[buckets.length - 1].rightX - 0.001) {
    return buckets.length - 1;
  }
  // Out of bounds — find nearest bucket
  const halfBoard = layout.boardWidth / 2;
  if (x < -halfBoard) return 0;
  return layout.bucketCount - 1;
}

/**
 * Get the wall/boundary positions for the board.
 */
export function getBoardWalls(layout: BoardLayout): {
  left: Vec2[];
  right: Vec2[];
  bottom: Vec2[];
} {
  const halfW = layout.boardWidth / 2;
  const halfH = layout.boardHeight / 2;

  return {
    left: [
      { x: -halfW, y: -halfH },
      { x: -halfW, y: halfH },
    ],
    right: [
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
    ],
    bottom: [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
    ],
  };
}
