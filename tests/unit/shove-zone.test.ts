import { describe, it, expect } from 'vitest';
import { computeShoveZoneY, computePinPositions } from '@/config/board-geometry';
import { DEFAULT_BOARD_LAYOUT, DEFAULT_SHOVE_CONFIG } from '@/config/game-config';

describe('Shove Zone Boundary (Row 4)', () => {
  // T014: computeShoveZoneY with 5 rows and shoveZoneRowLimit: 4 returns correct Y
  it('should return the Y coordinate at pin row 4 (1-based)', () => {
    const shoveZoneY = computeShoveZoneY(DEFAULT_BOARD_LAYOUT, DEFAULT_SHOVE_CONFIG.shoveZoneRowLimit);
    
    // Row 4 (1-based) = row index 3 (0-based)
    const pins = computePinPositions(DEFAULT_BOARD_LAYOUT);
    const row3Pins = pins.filter(p => p.row === 3);
    
    // The shove zone Y should match the Y position of row 3 (index)
    expect(row3Pins.length).toBeGreaterThan(0);
    const expectedY = row3Pins[0].y;
    expect(shoveZoneY).toBeCloseTo(expectedY, 5);
  });

  it('should place shove zone below the top half of the board', () => {
    const shoveZoneY = computeShoveZoneY(DEFAULT_BOARD_LAYOUT, DEFAULT_SHOVE_CONFIG.shoveZoneRowLimit);
    // Should be in the lower portion of the board (below center)
    expect(shoveZoneY).toBeLessThan(DEFAULT_BOARD_LAYOUT.boardHeight / 2);
  });

  it('shoveZoneRowLimit should be 4 in default config', () => {
    expect(DEFAULT_SHOVE_CONFIG.shoveZoneRowLimit).toBe(4);
  });
});
