import type { Renderer, RenderState, ParticleType } from '@/types/contracts';
import type { BoardLayout } from '@/types/index';
import { EffectsManager } from './effects';

/**
 * Canvas 2D renderer for the Plinko board.
 * Draws pins, pucks, bucket dividers, bucket score labels,
 * and the shove zone boundary.
 */
export class CanvasRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private layout: BoardLayout | null = null;

  // Coordinate transform: world → canvas
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  // Shake effect state
  private shakeIntensity = 0;
  private shakeEndTime = 0;

  // Particles
  private particles: Particle[] = [];

  // Effects manager for flashes, slashes, score pops
  private effects: EffectsManager | null = null;

  /** Set the effects manager for rendering visual effects. */
  setEffectsManager(effects: EffectsManager): void {
    this.effects = effects;
  }

  init(canvas: HTMLCanvasElement, layout: BoardLayout): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.layout = layout;
    this.computeTransform();
  }

  resize(): void {
    if (!this.canvas || !this.layout) return;
    // Match CSS size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.computeTransform();
  }

  private computeTransform(): void {
    if (!this.canvas || !this.layout) return;
    const rect = this.canvas.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;

    // Fit board to canvas with some padding
    const padFraction = 0.05;
    const availW = canvasW * (1 - 2 * padFraction);
    const availH = canvasH * (1 - 2 * padFraction);

    const scaleX = availW / this.layout.boardWidth;
    const scaleY = availH / this.layout.boardHeight;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = canvasW / 2;
    this.offsetY = canvasH / 2;
  }

  /** Convert world coordinates to canvas pixels */
  private worldToCanvas(wx: number, wy: number): { x: number; y: number } {
    return {
      x: this.offsetX + wx * this.scale,
      y: this.offsetY - wy * this.scale, // flip Y: world up → canvas down
    };
  }

  /** Convert world size to canvas pixels */
  private worldToPixels(size: number): number {
    return size * this.scale;
  }

  drawFrame(state: RenderState): void {
    if (!this.ctx || !this.canvas || !this.layout) return;
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();

    // Apply shake offset
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0 && performance.now() < this.shakeEndTime) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    } else {
      this.shakeIntensity = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-shakeX, -shakeY, rect.width, rect.height);

    // Draw board background
    const boardTL = this.worldToCanvas(-this.layout.boardWidth / 2, this.layout.boardHeight / 2);
    const boardW = this.worldToPixels(this.layout.boardWidth);
    const boardH = this.worldToPixels(this.layout.boardHeight);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(boardTL.x, boardTL.y, boardW, boardH);

    // Draw shove zone boundary line
    if (state.shoveZoneY !== undefined) {
      const left = this.worldToCanvas(-this.layout.boardWidth / 2, state.shoveZoneY);
      const right = this.worldToCanvas(this.layout.boardWidth / 2, state.shoveZoneY);
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw pins
    for (const pin of state.pins) {
      const pos = this.worldToCanvas(pin.x, pin.y);
      const r = this.worldToPixels(pin.radius);
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#909090';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw bucket dividers and labels
    for (const bucket of state.buckets) {
      const left = this.worldToCanvas(bucket.x, -this.layout.boardHeight / 2 + 1.5);
      const bottom = this.worldToCanvas(bucket.x, -this.layout.boardHeight / 2);
      const w = this.worldToPixels(bucket.width);

      // Divider walls
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
      // Right edge
      ctx.beginPath();
      ctx.moveTo(left.x + w, left.y);
      ctx.lineTo(bottom.x + w, bottom.y);
      ctx.stroke();

      // Score label
      const centerX = left.x + w / 2;
      const labelY = bottom.y - 4;
      ctx.fillStyle = '#ffd700';
      ctx.font = `${Math.max(10, this.worldToPixels(0.35))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.formatScore(bucket.score), centerX, labelY);
    }

    // Draw ghost puck and guide line (drop indicator)
    if (state.dropIndicator && this.layout) {
      const topOfBoardY = this.layout.boardHeight / 2;
      const ghostPos = this.worldToCanvas(state.dropIndicator.x, topOfBoardY);
      const ghostR = this.worldToPixels(this.layout.puckRadius);

      // T020: Dashed vertical guide line from ghost puck downward
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = state.dropIndicator.style.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 10]);
      const guideBottom = this.worldToCanvas(state.dropIndicator.x, -topOfBoardY);
      ctx.beginPath();
      ctx.moveTo(ghostPos.x, ghostPos.y + ghostR);
      ctx.lineTo(guideBottom.x, guideBottom.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // T019: Ghost puck at 40% opacity
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = state.dropIndicator.style.color;
      ctx.beginPath();
      ctx.arc(ghostPos.x, ghostPos.y, ghostR, 0, Math.PI * 2);
      ctx.fill();
      this.drawPuckPattern(ctx, ghostPos.x, ghostPos.y, ghostR, state.dropIndicator.style.pattern, 0);
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ghostPos.x, ghostPos.y, ghostR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw pucks
    for (const puck of state.pucks) {
      const pos = this.worldToCanvas(puck.x, puck.y);
      const r = this.worldToPixels(puck.radius);

      // Main fill
      ctx.fillStyle = puck.style.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Pattern overlay
      this.drawPuckPattern(ctx, pos.x, pos.y, r, puck.style.pattern, puck.angle);

      // Outline
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw particles
    this.updateParticles(ctx);

    // Render effects (collision flashes, slashes, score pops)
    if (this.effects) {
      this.effects.renderEffects(
        ctx,
        (wx: number, wy: number) => this.worldToCanvas(wx, wy),
        (size: number) => this.worldToPixels(size),
      );
    }

    ctx.restore();
  }

  shake(intensity: number, durationMs: number): void {
    this.shakeIntensity = intensity;
    this.shakeEndTime = performance.now() + durationMs;
  }

  emitParticles(x: number, y: number, type: ParticleType): void {
    // Only emit particles for bucket landings — collision/shove particles removed
    if (type !== 'bucketLand') return;
    const count = 15;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 30 + Math.random() * 50;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        color: '#ffd700',
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (1 / 60);
      p.y += p.vy * (1 / 60);
      p.vy += 50 * (1 / 60); // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Particles use screen coords directly (emitted in world coords, convert)
      const pos = this.worldToCanvas(p.x, p.y);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private drawPuckPattern(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    pattern: string,
    angle: number = 0,
  ): void {
    ctx.save();
    // Clip to circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Apply rotation transform around puck center
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 1;

    switch (pattern) {
      case 'stripes':
        for (let dx = -r; dx <= r; dx += r * 0.4) {
          ctx.beginPath();
          ctx.moveTo(dx, -r);
          ctx.lineTo(dx, r);
          ctx.stroke();
        }
        break;
      case 'dots':
        for (let dx = -r * 0.5; dx <= r * 0.5; dx += r * 0.5) {
          for (let dy = -r * 0.5; dy <= r * 0.5; dy += r * 0.5) {
            ctx.fillStyle = '#ffffff33';
            ctx.beginPath();
            ctx.arc(dx, dy, r * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'rings':
        ctx.strokeStyle = '#ffffff33';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  private formatScore(score: number): string {
    if (score >= 10000) return `${score / 1000}K`;
    if (score >= 1000) return `${score / 1000}K`;
    return String(score);
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}
