/**
 * Puck settling logic after pin relocation.
 * Detects pucks overlapping new pins and prepares them for re-settling.
 */

import type { Board } from './board-builder';
import type { GameConfig } from '@/types/index';

/**
 * Detect pucks that overlap with new pin positions after a board rebuild.
 * Uses distance-based circle-circle overlap check.
 * 
 * @returns Array of puck IDs that are displaced (overlapping new pins).
 */
export function detectDisplacedPucks(board: Board, config: GameConfig): string[] {
  const { pinRadius, puckRadius } = config.boardLayout;
  const overlapThreshold = (pinRadius + puckRadius) ** 2;
  const displacedIds: string[] = [];

  for (const puck of board.pucks) {
    const puckPos = puck.body.getPosition();

    for (const pin of board.pins) {
      const pinPos = pin.getPosition();
      const dx = puckPos.x - pinPos.x;
      const dy = puckPos.y - pinPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < overlapThreshold) {
        displacedIds.push(puck.id);
        break; // No need to check more pins for this puck
      }
    }
  }

  return displacedIds;
}

/**
 * Prepare displaced pucks for re-settling.
 * Resets isSettled and settledInBucket, wakes the physics body.
 * bounceMultiplier is preserved.
 */
export function prepareSettling(board: Board, displacedPuckIds: string[]): void {
  const idSet = new Set(displacedPuckIds);

  for (const puck of board.pucks) {
    if (idSet.has(puck.id)) {
      puck.isSettled = false;
      puck.settledInBucket = null;
      puck.body.setAwake(true);
    }
  }
}
