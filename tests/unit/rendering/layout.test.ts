import { describe, it, expect } from 'vitest';
import { LayoutCalculator } from '@/rendering/layout';

describe('LayoutCalculator', () => {
  describe('landscape layout', () => {
    it('should compute dimensions for landscape viewport', () => {
      const calc = new LayoutCalculator();
      const result = calc.compute({
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 1,
        boardWidth: 10,
        boardHeight: 14,
      });

      expect(result.orientation).toBe('landscape');
      expect(result.canvasWidth).toBeGreaterThan(0);
      expect(result.canvasHeight).toBeGreaterThan(0);
      expect(result.scale).toBeGreaterThan(0);
    });

    it('should maintain aspect ratio in landscape', () => {
      const calc = new LayoutCalculator();
      const result = calc.compute({
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 1,
        boardWidth: 10,
        boardHeight: 14,
      });

      // Board should fit within the canvas
      expect(result.canvasWidth).toBeLessThanOrEqual(1920);
      expect(result.canvasHeight).toBeLessThanOrEqual(1080);
    });
  });

  describe('portrait layout', () => {
    it('should compute dimensions for portrait viewport', () => {
      const calc = new LayoutCalculator();
      const result = calc.compute({
        viewportWidth: 390,
        viewportHeight: 844,
        devicePixelRatio: 3,
        boardWidth: 10,
        boardHeight: 14,
      });

      expect(result.orientation).toBe('portrait');
      expect(result.canvasWidth).toBeGreaterThan(0);
      expect(result.canvasHeight).toBeGreaterThan(0);
    });
  });

  describe('scale factor', () => {
    it('should account for device pixel ratio', () => {
      const calc = new LayoutCalculator();
      const result1x = calc.compute({
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 1,
        boardWidth: 10,
        boardHeight: 14,
      });

      const result2x = calc.compute({
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 2,
        boardWidth: 10,
        boardHeight: 14,
      });

      // 2x DPR should produce approximately double the internal canvas dimensions
      expect(result2x.canvasWidth).toBeCloseTo(result1x.canvasWidth * 2, -1);
      expect(result2x.canvasHeight).toBeCloseTo(result1x.canvasHeight * 2, -1);
    });

    it('should calculate correct scale for world-to-canvas mapping', () => {
      const calc = new LayoutCalculator();
      const result = calc.compute({
        viewportWidth: 1000,
        viewportHeight: 1400,
        devicePixelRatio: 1,
        boardWidth: 10,
        boardHeight: 14,
      });

      // The board fits exactly in 1000x1400 (same aspect ratio)
      expect(result.scale).toBeCloseTo(100, 0);
    });
  });

  describe('touch targets', () => {
    it('should ensure minimum touch target size of 44 CSS pixels', () => {
      const calc = new LayoutCalculator();
      const result = calc.compute({
        viewportWidth: 390,
        viewportHeight: 844,
        devicePixelRatio: 3,
        boardWidth: 10,
        boardHeight: 14,
      });

      expect(result.minTouchTargetPx).toBeGreaterThanOrEqual(44);
    });
  });

  describe('resize recalculation', () => {
    it('should produce different dimensions for different viewports', () => {
      const calc = new LayoutCalculator();
      const result1 = calc.compute({
        viewportWidth: 1920,
        viewportHeight: 1080,
        devicePixelRatio: 1,
        boardWidth: 10,
        boardHeight: 14,
      });

      const result2 = calc.compute({
        viewportWidth: 768,
        viewportHeight: 1024,
        devicePixelRatio: 2,
        boardWidth: 10,
        boardHeight: 14,
      });

      expect(result1.canvasWidth).not.toBe(result2.canvasWidth);
    });
  });
});
