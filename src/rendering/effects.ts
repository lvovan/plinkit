/**
 * Visual effects — board shake and score pop animations.
 */

export interface ShakeEffect {
  intensity: number;
  endTime: number;
}

export interface ScorePopEffect {
  x: number;
  y: number;
  score: number;
  startTime: number;
  duration: number;
}

/**
 * Manages visual effects like board shake and score pop animations.
 */
export class EffectsManager {
  private shake: ShakeEffect = { intensity: 0, endTime: 0 };
  private scorePops: ScorePopEffect[] = [];

  /** Trigger a board shake effect. */
  triggerShake(intensity: number, durationMs: number): void {
    this.shake.intensity = intensity;
    this.shake.endTime = performance.now() + durationMs;
  }

  /** Get the current shake offset (random x/y within intensity). Returns [0,0] if no shake active. */
  getShakeOffset(): { x: number; y: number } {
    if (performance.now() > this.shake.endTime) {
      return { x: 0, y: 0 };
    }
    return {
      x: (Math.random() - 0.5) * 2 * this.shake.intensity,
      y: (Math.random() - 0.5) * 2 * this.shake.intensity,
    };
  }

  /** Trigger a score pop animation at the given position. */
  triggerScorePop(x: number, y: number, score: number): void {
    this.scorePops.push({
      x, y, score,
      startTime: performance.now(),
      duration: 1200,
    });
  }

  /** Get active score pop effects for rendering. Removes expired ones. */
  getActiveScorePops(): ScorePopEffect[] {
    const now = performance.now();
    this.scorePops = this.scorePops.filter(p => now - p.startTime < p.duration);
    return this.scorePops;
  }

  /** Render score pop effects onto a canvas context. */
  renderScorePops(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    for (const pop of this.getActiveScorePops()) {
      const elapsed = now - pop.startTime;
      const progress = elapsed / pop.duration;
      const alpha = 1 - progress;
      const yOffset = progress * -40; // float upward

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `bold ${16 + progress * 8}px sans-serif`;
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.strokeText(`+${pop.score.toLocaleString()}`, pop.x, pop.y + yOffset);
      ctx.fillText(`+${pop.score.toLocaleString()}`, pop.x, pop.y + yOffset);
      ctx.restore();
    }
  }

  /** Clear all active effects. */
  clear(): void {
    this.shake = { intensity: 0, endTime: 0 };
    this.scorePops.length = 0;
  }
}
