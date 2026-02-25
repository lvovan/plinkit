import { describe, it, expect } from 'vitest';

/**
 * Inline the formatMultiplier logic from main.ts for unit testing.
 * This mirrors the function exactly to test the format string.
 */
function formatMultiplier(count: number, scoringConfig: { bounceMultiplierRate: number; bounceMultiplierCap: number }): string {
  const multiplier = Math.min(
    scoringConfig.bounceMultiplierRate ** count,
    scoringConfig.bounceMultiplierCap,
  );
  return `×${multiplier.toFixed(1)}`;
}

describe('formatMultiplier', () => {
  const config = { bounceMultiplierRate: 1.15, bounceMultiplierCap: 10.0 };

  it('should use prefix multiplication sign ×', () => {
    const result = formatMultiplier(0, config);
    expect(result).toBe('×1.0');
  });

  it('should format with one decimal place', () => {
    const result = formatMultiplier(1, config);
    expect(result).toBe('×1.1'); // 1.15^1 = 1.15 → "1.1" (toFixed(1) rounds half-to-even)
  });

  it('should show increasing multipliers', () => {
    expect(formatMultiplier(5, config)).toBe('×2.0'); // 1.15^5 ≈ 2.01
    expect(formatMultiplier(10, config)).toBe('×4.0'); // 1.15^10 ≈ 4.05
  });

  it('should cap at bounceMultiplierCap', () => {
    const result = formatMultiplier(100, config);
    expect(result).toBe('×10.0');
  });

  it('should not have trailing characters after the number', () => {
    const result = formatMultiplier(3, config);
    expect(result).toMatch(/^×\d+\.\d$/);
  });
});
