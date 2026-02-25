import { describe, it, expect, beforeEach } from 'vitest';
import { BoardBuilder } from '@/physics/board-builder';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { computePinPositions } from '@/config/board-geometry';

describe('BoardBuilder', () => {
  let builder: BoardBuilder;

  beforeEach(() => {
    builder = new BoardBuilder();
  });

  describe('build()', () => {
    it('should create the correct number of pin bodies', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      // 12 rows: even rows have 9 pins, odd rows have 8 pins
      // 6 even rows × 9 + 6 odd rows × 8 = 54 + 48 = 102
      const expectedPins = 6 * 9 + 6 * 8;
      expect(board.pins.length).toBe(expectedPins);
    });

    it('should create left and right boundary walls', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      // At minimum: left wall, right wall, bottom floor
      expect(board.walls.length).toBeGreaterThanOrEqual(3);
    });

    it('should create bucket divider bodies', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      // 9 buckets → 10 dividers (including outer edges) or 8 inner dividers
      // We need at least bucketCount - 1 inner dividers
      expect(board.bucketWalls.length).toBeGreaterThanOrEqual(
        DEFAULT_GAME_CONFIG.boardLayout.bucketCount - 1
      );
    });

    it('should set the correct shove zone Y coordinate', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      expect(typeof board.shoveZoneY).toBe('number');
      // Shove zone should be somewhere in the middle of the board
      const halfH = DEFAULT_GAME_CONFIG.boardLayout.boardHeight / 2;
      expect(board.shoveZoneY).toBeLessThan(halfH);
      expect(board.shoveZoneY).toBeGreaterThan(-halfH);
    });

    it('should create a Planck.js world with the configured gravity', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      const gravity = board.world.getGravity();
      expect(gravity.x).toBe(DEFAULT_GAME_CONFIG.physics.gravity.x);
      expect(gravity.y).toBe(DEFAULT_GAME_CONFIG.physics.gravity.y);
    });

    it('should start with zero pucks', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      expect(board.pucks.length).toBe(0);
    });
  });

  describe('pin staggering (en quinconce)', () => {
    it('should offset odd-row pins by half pin-spacing relative to even rows', () => {
      const layout = DEFAULT_GAME_CONFIG.boardLayout;
      const pins = computePinPositions(layout);

      // Collect x positions for row 0 (even) and row 1 (odd)
      const row0 = pins.filter(p => p.row === 0).map(p => p.x).sort((a, b) => a - b);
      const row1 = pins.filter(p => p.row === 1).map(p => p.x).sort((a, b) => a - b);

      // Even row should have bucketCount pins, odd row bucketCount - 1
      expect(row0.length).toBe(layout.bucketCount);
      expect(row1.length).toBe(layout.bucketCount - 1);

      // Each odd-row pin should sit halfway between two adjacent even-row pins
      for (let i = 0; i < row1.length; i++) {
        const midpoint = (row0[i] + row0[i + 1]) / 2;
        expect(row1[i]).toBeCloseTo(midpoint, 5);
      }
    });

    it('should NOT have vertically aligned pins between consecutive rows', () => {
      const pins = computePinPositions(DEFAULT_GAME_CONFIG.boardLayout);
      const row0xs = new Set(pins.filter(p => p.row === 0).map(p => Math.round(p.x * 1000)));
      const row1xs = pins.filter(p => p.row === 1).map(p => Math.round(p.x * 1000));

      // No odd-row x should match any even-row x
      for (const x of row1xs) {
        expect(row0xs.has(x)).toBe(false);
      }
    });
  });
});
