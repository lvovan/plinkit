/**
 * Visual effects — board shake, score pop animations, collision flashes, slash effects,
 * growth pop animation, and negative score flash.
 */

import type { CollisionFlash, SlashEffect, ScoreBreakdown } from '@/types/index';

export interface ShakeEffect {
  intensity: number;
  endTime: number;
}

export interface ScorePopEffect {
  x: number;
  y: number;
  breakdown: ScoreBreakdown;
  startTime: number;
  duration: number;
}

/** T038: Growth pop animation — scale-up with overshoot */
export interface GrowthPopEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

/** T052: Negative score flash — red "-X" text with fade */
export interface NegativeScoreFlash {
  x: number;
  y: number;
  amount: number;
  startTime: number;
  duration: number;
}

export interface ScoreDeltaEffect {
  x: number;
  y: number;
  deltaText: string;
  color: string;
  startTime: number;
  duration: number;
}

/**
 * Manages visual effects like board shake, score pop animations,
 * collision flashes, and slash effects.
 */
export class EffectsManager {
  private shake: ShakeEffect = { intensity: 0, endTime: 0 };
  private scorePops: ScorePopEffect[] = [];
  private scoreDeltas: ScoreDeltaEffect[] = [];
  private collisionFlashes: CollisionFlash[] = [];
  private slashEffects: SlashEffect[] = [];
  private growthPops: GrowthPopEffect[] = [];
  private negativeFlashes: NegativeScoreFlash[] = [];

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

  /** Trigger a score pop animation at the given position with full breakdown. */
  triggerScorePop(x: number, y: number, breakdown: ScoreBreakdown): void {
    this.scorePops.push({
      x, y, breakdown,
      startTime: performance.now(),
      duration: 1800,
    });
  }

  /** Add a radial flash at the collision point with multiplier text. */
  addCollisionFlash(x: number, y: number, multiplierText: string): void {
    this.collisionFlashes.push({
      x, y, multiplierText,
      startTime: performance.now(),
      duration: 250,
    });
  }

  /** Add a slash effect along the shove direction. */
  addSlashEffect(
    originX: number, originY: number,
    directionX: number, directionY: number,
    magnitude: number,
  ): void {
    this.slashEffects.push({
      originX, originY, directionX, directionY, magnitude,
      startTime: performance.now(),
      duration: 400,
    });
  }

  /** Add a floating score delta indicator at the given world position. */
  addScoreDelta(x: number, y: number, deltaText: string, color: string): void {
    this.scoreDeltas.push({
      x, y, deltaText, color,
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

  /** Get active collision flashes. Removes expired ones. */
  getActiveFlashes(): CollisionFlash[] {
    const now = performance.now();
    this.collisionFlashes = this.collisionFlashes.filter(f => now - f.startTime < f.duration);
    return this.collisionFlashes;
  }

  /** Get active slash effects. Removes expired ones. */
  getActiveSlashes(): SlashEffect[] {
    const now = performance.now();
    this.slashEffects = this.slashEffects.filter(s => now - s.startTime < s.duration);
    return this.slashEffects;
  }

  /** Add a growth pop effect at the given position. */
  addGrowthPop(x: number, y: number): void {
    this.growthPops.push({
      x, y,
      startTime: performance.now(),
      duration: 300,
    });
  }

  /** Get active growth pop effects. Removes expired ones. */
  getActiveGrowthPops(): GrowthPopEffect[] {
    const now = performance.now();
    this.growthPops = this.growthPops.filter(p => now - p.startTime < p.duration);
    return this.growthPops;
  }

  /** Add a negative score flash effect at the given position. */
  addNegativeScoreFlash(x: number, y: number, amount: number): void {
    this.negativeFlashes.push({
      x, y, amount,
      startTime: performance.now(),
      duration: 1200,
    });
  }

  /** Get active negative score flashes. Removes expired ones. */
  getActiveNegativeFlashes(): NegativeScoreFlash[] {
    const now = performance.now();
    this.negativeFlashes = this.negativeFlashes.filter(f => now - f.startTime < f.duration);
    return this.negativeFlashes;
  }

  /** Get active score delta effects. Removes expired ones. */
  getActiveScoreDeltas(): ScoreDeltaEffect[] {
    const now = performance.now();
    this.scoreDeltas = this.scoreDeltas.filter(d => now - d.startTime < d.duration);
    return this.scoreDeltas;
  }

  /**
   * Render all active visual effects (flashes, slashes, score pops).
   * Called once per frame from the render loop.
   */
  renderEffects(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
    worldToPixels: (size: number) => number,
  ): void {
    this.renderCollisionFlashes(ctx, worldToCanvas, worldToPixels);
    this.renderSlashEffects(ctx, worldToCanvas, worldToPixels);
    this.renderScorePops(ctx, worldToCanvas);
    this.renderGrowthPops(ctx, worldToCanvas, worldToPixels);
    this.renderNegativeFlashes(ctx, worldToCanvas);
    this.renderScoreDeltas(ctx, worldToCanvas);
  }

  /** Render collision flash effects — radial gradient + multiplier text. */
  private renderCollisionFlashes(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
    worldToPixels: (size: number) => number,
  ): void {
    const now = performance.now();
    for (const flash of this.getActiveFlashes()) {
      const elapsed = now - flash.startTime;
      const progress = elapsed / flash.duration;
      const alpha = 1 - progress;
      const pos = worldToCanvas(flash.x, flash.y);
      const radius = worldToPixels(0.4);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);

      // Radial gradient flash
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 200, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Multiplier text above the flash point
      const fontSize = Math.max(10, worldToPixels(0.3));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ffd700'; // gold — WCAG 4.5:1 on dark bg
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const textY = pos.y - radius - 2;
      ctx.strokeText(flash.multiplierText, pos.x, textY);
      ctx.fillText(flash.multiplierText, pos.x, textY);

      ctx.restore();
    }
  }

  /** Render slash effects — tapered polyline along direction vector. */
  private renderSlashEffects(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
    worldToPixels: (size: number) => number,
  ): void {
    const now = performance.now();
    for (const slash of this.getActiveSlashes()) {
      const elapsed = now - slash.startTime;
      const progress = elapsed / slash.duration;
      const alpha = 1 - progress;

      const origin = worldToCanvas(slash.originX, slash.originY);
      const slashLength = worldToPixels(1.5 * (slash.magnitude / 5)); // scale by force
      const endX = origin.x + slash.directionX * slashLength;
      // Canvas Y is flipped: directionY positive in world = negative on canvas
      const endY = origin.y - slash.directionY * slashLength;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);

      // Tapered polyline: thick at origin, thin at endpoint
      const maxWidth = worldToPixels(0.2);
      const segments = 6;
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const x0 = origin.x + (endX - origin.x) * t0;
        const y0 = origin.y + (endY - origin.y) * t0;
        const x1 = origin.x + (endX - origin.x) * t1;
        const y1 = origin.y + (endY - origin.y) * t1;
        const width = maxWidth * (1 - t0 * 0.8); // taper to 20% at tip

        ctx.strokeStyle = `rgba(200, 255, 255, ${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /** Render score pop effects — two-line breakdown text with float-up-and-fade. */
  private renderScorePops(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
  ): void {
    const now = performance.now();
    for (const pop of this.getActiveScorePops()) {
      const elapsed = now - pop.startTime;
      const progress = elapsed / pop.duration;
      const alpha = 1 - progress;
      const yOffset = progress * -40; // float upward
      const pos = worldToCanvas(pop.x, pop.y);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';

      // Line 1: "baseScore × multiplier×" (smaller)
      const smallFont = 12 + progress * 4;
      ctx.font = `${smallFont}px sans-serif`;
      ctx.fillStyle = '#e0e0e0';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const line1 = `${pop.breakdown.baseScore.toLocaleString()} × ${pop.breakdown.multiplier.toFixed(1)}×`;
      ctx.strokeText(line1, pos.x, pos.y + yOffset - 10);
      ctx.fillText(line1, pos.x, pos.y + yOffset - 10);

      // Line 2: "= totalScore" (larger, bold)
      const largeFont = 16 + progress * 8;
      ctx.font = `bold ${largeFont}px sans-serif`;
      ctx.fillStyle = '#ffd700';
      const line2 = `= ${pop.breakdown.totalScore.toLocaleString()}`;
      ctx.strokeText(line2, pos.x, pos.y + yOffset + 8);
      ctx.fillText(line2, pos.x, pos.y + yOffset + 8);

      ctx.restore();
    }
  }

  /** Render growth pop effects — expanding ring with overshoot. */
  private renderGrowthPops(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
    worldToPixels: (size: number) => number,
  ): void {
    const now = performance.now();
    for (const pop of this.getActiveGrowthPops()) {
      const elapsed = now - pop.startTime;
      const progress = elapsed / pop.duration;
      const pos = worldToCanvas(pop.x, pop.y);

      // Overshoot animation: scale 1 → 1.4 → 1.0
      const overshoot = 1 + 0.4 * Math.sin(progress * Math.PI);
      const radius = worldToPixels(0.6) * overshoot;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha * 0.6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Render negative score flashes — red "-X" text floating up and fading. */
  private renderNegativeFlashes(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
  ): void {
    const now = performance.now();
    for (const flash of this.getActiveNegativeFlashes()) {
      const elapsed = now - flash.startTime;
      const progress = elapsed / flash.duration;
      const alpha = 1 - progress;
      const yOffset = progress * -30;
      const pos = worldToCanvas(flash.x, flash.y);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fontSize = 14 + (1 - progress) * 4;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#ff4444';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const text = `-${flash.amount.toLocaleString()}`;
      ctx.strokeText(text, pos.x, pos.y + yOffset);
      ctx.fillText(text, pos.x, pos.y + yOffset);

      ctx.restore();
    }
  }

  /** Render score delta effects — floating "+X" / "−X" text with fade-out. */
  private renderScoreDeltas(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
  ): void {
    const now = performance.now();
    for (const delta of this.getActiveScoreDeltas()) {
      const elapsed = now - delta.startTime;
      const progress = elapsed / delta.duration;
      const alpha = 1 - progress;
      const yOffset = progress * -40; // float upward
      const pos = worldToCanvas(delta.x, delta.y);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';

      const fontSize = 14 + progress * 6;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = delta.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.strokeText(delta.deltaText, pos.x, pos.y + yOffset);
      ctx.fillText(delta.deltaText, pos.x, pos.y + yOffset);

      ctx.restore();
    }
  }

  /** Clear all active effects. */
  clear(): void {
    this.shake = { intensity: 0, endTime: 0 };
    this.scorePops.length = 0;
    this.scoreDeltas.length = 0;
    this.collisionFlashes.length = 0;
    this.slashEffects.length = 0;
    this.growthPops.length = 0;
    this.negativeFlashes.length = 0;
  }
}
