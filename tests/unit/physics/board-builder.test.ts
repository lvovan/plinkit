import { describe, it, expect, beforeEach } from 'vitest';
import { BoardBuilder } from '@/physics/board-builder';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';

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
});
