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
  const { pinRows, bucketCount, pinSpacing, boardHeight } = layout;

  // Vertical spacing: pins are distributed in the middle portion of the board
  // Leave room at top for drop zone and bottom for buckets
  const topMargin = 2.0;   // world units above first row (drop zone)
  const bottomMargin = 2.0; // world units below last row (bucket zone)
  const usableHeight = boardHeight - topMargin - bottomMargin;
  const rowSpacing = usableHeight / (pinRows - 1);

  for (let row = 0; row < pinRows; row++) {
    // Number of pins per row: alternate between bucketCount and bucketCount-1
    const pinsInRow = row % 2 === 0 ? bucketCount : bucketCount - 1;
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
 * Buckets span the full board width, evenly divided.
 */
export function computeBucketBoundaries(layout: BoardLayout): BucketBoundary[] {
  const { bucketCount, bucketScores, boardWidth } = layout;
  const bucketWidth = boardWidth / bucketCount;
  const halfBoard = boardWidth / 2;

  const buckets: BucketBoundary[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const leftX = -halfBoard + i * bucketWidth;
    const rightX = leftX + bucketWidth;
    buckets.push({
      index: i,
      leftX,
      rightX,
      centerX: (leftX + rightX) / 2,
      score: bucketScores[i],
    });
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
  const topMargin = 2.0;
  const bottomMargin = 2.0;
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
  const topMargin = 2.0;
  return layout.boardHeight / 2 - topMargin / 2;
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
