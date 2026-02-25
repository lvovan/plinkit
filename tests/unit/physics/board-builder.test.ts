import { describe, it, expect, beforeEach } from 'vitest';
import { BoardBuilder } from '@/physics/board-builder';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { computePinPositions, computeBucketBoundaries } from '@/config/board-geometry';

describe('BoardBuilder', () => {
  let builder: BoardBuilder;

  beforeEach(() => {
    builder = new BoardBuilder();
  });

  describe('build()', () => {
    it('should create the correct number of pin bodies', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      // 6 rows: even rows (0,2,4) have 5 pins, odd rows (1,3,5) have 4 pins
      // 3 even rows × 5 + 3 odd rows × 4 = 15 + 12 = 27
      const expectedPins = 3 * 5 + 3 * 4;
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

  describe('Pin layout (T015-T018)', () => {
    it('should produce exactly 6 rows of pins with new config (T015)', () => {
      const pins = computePinPositions(DEFAULT_GAME_CONFIG.boardLayout);
      const rows = new Set(pins.map(p => p.row));
      expect(rows.size).toBe(6);
      expect(Math.max(...rows)).toBe(5); // rows 0-5
    });

    it('should have no vertically aligned pins in consecutive rows (T016)', () => {
      const pins = computePinPositions(DEFAULT_GAME_CONFIG.boardLayout);

      // Group pins by row
      const pinsByRow = new Map<number, number[]>();
      for (const pin of pins) {
        if (!pinsByRow.has(pin.row)) pinsByRow.set(pin.row, []);
        pinsByRow.get(pin.row)!.push(pin.x);
      }

      // Check each consecutive row pair for vertical alignment
      const rowNumbers = [...pinsByRow.keys()].sort((a, b) => a - b);
      for (let i = 0; i < rowNumbers.length - 1; i++) {
        const currentRowXs = pinsByRow.get(rowNumbers[i])!;
        const nextRowXs = pinsByRow.get(rowNumbers[i + 1])!;

        for (const x1 of currentRowXs) {
          for (const x2 of nextRowXs) {
            // No pin in consecutive rows should share the same X (within tolerance)
            expect(Math.abs(x1 - x2)).toBeGreaterThan(0.01);
          }
        }
      }
    });

    it('should have 5 pins in even rows and 4 pins in odd rows (T017)', () => {
      const pins = computePinPositions(DEFAULT_GAME_CONFIG.boardLayout);

      const pinsByRow = new Map<number, number>();
      for (const pin of pins) {
        pinsByRow.set(pin.row, (pinsByRow.get(pin.row) ?? 0) + 1);
      }

      for (const [row, count] of pinsByRow) {
        if (row % 2 === 0) {
          expect(count).toBe(5);
        } else {
          expect(count).toBe(4);
        }
      }
    });

    it('should produce 27 total pins (T018)', () => {
      const board = builder.build(DEFAULT_GAME_CONFIG);
      // 3 even rows × 5 + 3 odd rows × 4 = 15 + 12 = 27
      expect(board.pins.length).toBe(27);
    });
  });

  describe('Bucket layout (T019)', () => {
    it('should produce 5 buckets with correct scores (T019)', () => {
      const buckets = computeBucketBoundaries(DEFAULT_GAME_CONFIG.boardLayout);
      expect(buckets.length).toBe(5);
      const expectedScores = [100, 1000, 10000, 1000, 100];
      for (let i = 0; i < buckets.length; i++) {
        expect(buckets[i].score).toBe(expectedScores[i]);
      }
    });
  });
});
