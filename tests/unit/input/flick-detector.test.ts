import { describe, it, expect } from 'vitest';
import { FlickDetector } from '@/input/flick-detector';

describe('FlickDetector', () => {
  it('should detect a fast flick above minimum speed', () => {
    const detector = new FlickDetector({ minFlickSpeed: 200, sampleWindowMs: 80, quantizationPrecision: 0.001 });
    const now = performance.now();

    detector.addSample(100, 100, now);
    detector.addSample(200, 80, now + 40);
    detector.addSample(300, 60, now + 80);

    const result = detector.computeFlick();
    expect(result).not.toBeNull();
    expect(result!.dx).toBeGreaterThan(0); // moved right
    expect(result!.dy).not.toBe(0); // moved up (in screen coords)
  });

  it('should reject a slow gesture below minimum speed', () => {
    const detector = new FlickDetector({ minFlickSpeed: 200, sampleWindowMs: 80, quantizationPrecision: 0.001 });
    const now = performance.now();

    // Very slow movement: 10px over 80ms = 125 px/s (below 200 threshold)
    detector.addSample(100, 100, now);
    detector.addSample(105, 98, now + 40);
    detector.addSample(110, 96, now + 80);

    const result = detector.computeFlick();
    expect(result).toBeNull();
  });

  it('should quantize vectors to configured precision', () => {
    const detector = new FlickDetector({ minFlickSpeed: 0, sampleWindowMs: 80, quantizationPrecision: 0.01 });
    const now = performance.now();

    detector.addSample(100, 100, now);
    detector.addSample(200, 50, now + 50);

    const result = detector.computeFlick();
    expect(result).not.toBeNull();
    // Check quantization: the result should be a multiple of 0.01
    const dxStr = result!.dx.toString();
    const parts = dxStr.split('.');
    if (parts.length > 1) {
      expect(parts[1].length).toBeLessThanOrEqual(2);
    }
  });

  it('should reject zero-magnitude flicks', () => {
    const detector = new FlickDetector({ minFlickSpeed: 200, sampleWindowMs: 80, quantizationPrecision: 0.001 });
    const now = performance.now();

    // No movement
    detector.addSample(100, 100, now);
    detector.addSample(100, 100, now + 80);

    const result = detector.computeFlick();
    expect(result).toBeNull();
  });

  it('should prune samples outside the window', () => {
    const detector = new FlickDetector({ minFlickSpeed: 0, sampleWindowMs: 80, quantizationPrecision: 0.001 });
    const now = performance.now();

    // Old sample outside window
    detector.addSample(0, 0, now - 200);
    detector.addSample(100, 100, now);
    detector.addSample(200, 100, now + 40);

    const result = detector.computeFlick();
    // Should only use samples within the 80ms window of the latest
    expect(result).not.toBeNull();
  });

  it('should reset samples', () => {
    const detector = new FlickDetector({ minFlickSpeed: 200, sampleWindowMs: 80, quantizationPrecision: 0.001 });
    const now = performance.now();

    detector.addSample(100, 100, now);
    detector.addSample(300, 50, now + 50);
    detector.reset();

    const result = detector.computeFlick();
    expect(result).toBeNull();
  });
});
