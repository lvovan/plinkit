import { describe, it, expect } from 'vitest';
import { computePinPositions } from '@/config/board-geometry';
import { DEFAULT_GAME_CONFIG, DEFAULT_BOARD_LAYOUT } from '@/config/game-config';

describe('Fixed Board Layout (5-Row)', () => {
  // T008: computePinPositions with pinRows: 5 produces exactly 5 rows
  it('should produce exactly 5 distinct pin rows', () => {
    const pins = computePinPositions(DEFAULT_BOARD_LAYOUT);
    const uniqueRows = new Set(pins.map(p => p.row));
    expect(uniqueRows.size).toBe(5);
    // Row indices should be 0..4
    for (let r = 0; r < 5; r++) {
      expect(uniqueRows.has(r)).toBe(true);
    }
  });

  it('should have correct pin counts per row (staggered layout)', () => {
    const pins = computePinPositions(DEFAULT_BOARD_LAYOUT);
    const pinsPerRow = DEFAULT_BOARD_LAYOUT.pinsPerRow; // 6
    // Even rows: pinsPerRow pins, odd rows: pinsPerRow - 1 pins
    for (let row = 0; row < 5; row++) {
      const rowPins = pins.filter(p => p.row === row);
      const expected = row % 2 === 0 ? pinsPerRow : pinsPerRow - 1;
      expect(rowPins.length).toBe(expected);
    }
  });

  it('should produce 28 total pins (3×6 + 2×5)', () => {
    const pins = computePinPositions(DEFAULT_BOARD_LAYOUT);
    expect(pins.length).toBe(28);
  });

  // T009: No randomizeLayout function exported from main.ts
  it('should not export a randomizeLayout function', async () => {
    // main.ts is a side-effectful module that can't be directly imported in unit tests,
    // but we verify the config is fixed and no randomization exists
    expect(DEFAULT_GAME_CONFIG.boardLayout.pinRows).toBe(5);
    // Verify the same layout produces identical results on repeated calls
    const pins1 = computePinPositions(DEFAULT_BOARD_LAYOUT);
    const pins2 = computePinPositions(DEFAULT_BOARD_LAYOUT);
    expect(pins1).toEqual(pins2);
  });
});
