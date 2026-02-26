import { describe, it, expect } from 'vitest';
import { DEFAULT_BOARD_LAYOUT } from '@/config/game-config';

describe('Bucket width configuration', () => {
  const bucketWidths = DEFAULT_BOARD_LAYOUT.bucketWidths!;

  it('should have exactly 5 buckets', () => {
    expect(bucketWidths).toHaveLength(5);
  });

  it('should have all bucket widths equal to 0.20', () => {
    for (const w of bucketWidths) {
      expect(w).toBe(0.20);
    }
  });

  it('should have bucket width fractions summing to 1.0', () => {
    const sum = bucketWidths.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
