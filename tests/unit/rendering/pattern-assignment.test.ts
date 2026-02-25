import { describe, it, expect } from 'vitest';
import { PUCK_PALETTE } from '@/types/index';
import type { PuckPattern } from '@/types/index';

describe('Puck Pattern Assignment', () => {
  /**
   * T014: Round-robin pattern assignment.
   * Player 0→stripes, 1→dots, 2→rings, 3→stripes (cycles back).
   */
  it('should assign patterns in round-robin order: stripes→dots→rings→stripes', () => {
    const expectedPatterns: PuckPattern[] = ['stripes', 'dots', 'rings', 'stripes'];

    for (let i = 0; i < expectedPatterns.length; i++) {
      expect(PUCK_PALETTE[i].pattern).toBe(expectedPatterns[i]);
    }
  });

  it('should have exactly 4 palette entries', () => {
    expect(PUCK_PALETTE.length).toBe(4);
  });

  /**
   * T015: No puck in PUCK_PALETTE has 'solid' pattern.
   */
  it('should not contain any solid pattern', () => {
    for (const entry of PUCK_PALETTE) {
      expect(entry.pattern).not.toBe('solid');
    }
  });

  it('should only contain valid non-solid patterns', () => {
    const validPatterns: PuckPattern[] = ['stripes', 'dots', 'rings'];
    for (const entry of PUCK_PALETTE) {
      expect(validPatterns).toContain(entry.pattern);
    }
  });

  /**
   * T016: All players have visually distinct color+pattern combinations.
   */
  it('should have unique color+pattern combos for each palette entry', () => {
    const combos = PUCK_PALETTE.map(p => `${p.color}-${p.pattern}`);
    const uniqueCombos = new Set(combos);
    expect(uniqueCombos.size).toBe(PUCK_PALETTE.length);
  });

  it('should have unique colors for each palette entry', () => {
    const colors = PUCK_PALETTE.map(p => p.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(PUCK_PALETTE.length);
  });

  it('should have human-readable labels matching the pattern', () => {
    for (const entry of PUCK_PALETTE) {
      // Label should contain the pattern name (capitalized)
      const patternCapitalized = entry.pattern.charAt(0).toUpperCase() + entry.pattern.slice(1);
      expect(entry.label).toContain(patternCapitalized);
    }
  });
});
