export interface FlickConfig {
  minFlickSpeed: number;          // px/s
  sampleWindowMs: number;         // ms
  quantizationPrecision: number;  // e.g. 0.001
}

interface Sample {
  x: number;
  y: number;
  t: number; // ms timestamp
}

/**
 * Detects flick gestures from a stream of pointer samples.
 * Uses a ring-buffer of recent samples within a configurable time window.
 */
export class FlickDetector {
  private config: FlickConfig;
  private samples: Sample[] = [];

  constructor(config: FlickConfig) {
    this.config = config;
  }

  /**
   * Add a pointer sample (screen coordinates, timestamp in ms).
   */
  addSample(x: number, y: number, t: number): void {
    this.samples.push({ x, y, t });
    // Prune old samples
    const cutoff = t - this.config.sampleWindowMs;
    this.samples = this.samples.filter(s => s.t >= cutoff);
  }

  /**
   * Compute a flick vector from the current samples.
   * Returns { dx, dy } in px/s quantized, or null if no valid flick.
   */
  computeFlick(): { dx: number; dy: number } | null {
    if (this.samples.length < 2) return null;

    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const dt = (newest.t - oldest.t) / 1000; // seconds

    if (dt <= 0.001) return null;

    const dx = (newest.x - oldest.x) / dt; // px/s
    const dy = (newest.y - oldest.y) / dt;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed < this.config.minFlickSpeed) return null;

    // Quantize
    const p = this.config.quantizationPrecision;
    const qDx = Math.round(dx * (1 / p)) * p;
    const qDy = Math.round(dy * (1 / p)) * p;

    // Reject zero after quantization
    if (qDx === 0 && qDy === 0) return null;

    return { dx: qDx, dy: qDy };
  }

  reset(): void {
    this.samples = [];
  }
}
