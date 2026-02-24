import type { Player, PuckStyle } from '@/types/index';

let nextPlayerId = 0;

/**
 * Create a Player from registration data.
 * Validates name length (1–16 characters).
 */
export function createPlayer(
  name: string,
  puckStyle: PuckStyle,
  turnOrder: number,
): Player {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 16) {
    throw new RangeError(`Player name must be 1–16 characters, got "${trimmed}" (${trimmed.length})`);
  }

  return {
    id: `player_${++nextPlayerId}`,
    name: trimmed,
    puckStyle,
    score: 0,
    turnOrder,
    isActive: true,
  };
}

/** Reset the ID counter (useful for testing) */
export function resetPlayerIds(): void {
  nextPlayerId = 0;
}
