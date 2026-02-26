import type { Renderer, RenderState, ParticleType } from '@/types/contracts';
import type { BoardLayout } from '@/types/index';
import { EffectsManager } from './effects';
import { BackgroundManager } from './background';
import { WoodPatternGenerator } from './wood-pattern';
import { BUCKET_DIVIDER_WIDTH, BUCKET_DIVIDER_HEIGHT } from '@/config/board-geometry';

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

  // Background manager for procedural countryside art
  public background = new BackgroundManager();

  // Wood pattern generator for board background
  private woodPattern = new WoodPatternGenerator();

  /** Set the effects manager for rendering visual effects. */
  setEffectsManager(effects: EffectsManager): void {
    this.effects = effects;
  }

  init(canvas: HTMLCanvasElement, layout: BoardLayout): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.layout = layout;
    this.computeTransform();
    const rect = canvas.getBoundingClientRect();
    this.background.init(Math.round(rect.width), Math.round(rect.height));
    // Generate wood pattern at board pixel dimensions
    const boardW = this.worldToPixels(layout.boardWidth);
    const boardH = this.worldToPixels(layout.boardHeight);
    this.woodPattern.generate(Math.round(boardW), Math.round(boardH));
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
    this.background.setSize(Math.round(rect.width), Math.round(rect.height));
    // Regenerate wood pattern at new board pixel dimensions
    const boardW = this.worldToPixels(this.layout.boardWidth);
    const boardH = this.worldToPixels(this.layout.boardHeight);
    this.woodPattern.generate(Math.round(boardW), Math.round(boardH));
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

    // Draw procedural background
    this.background.update(1 / 60);
    this.background.composite(ctx, rect.width, rect.height);

    // Draw board background (wood pattern)
    const boardTL = this.worldToCanvas(-this.layout.boardWidth / 2, this.layout.boardHeight / 2);
    const boardW = this.worldToPixels(this.layout.boardWidth);
    const boardH = this.worldToPixels(this.layout.boardHeight);
    const woodCanvas = this.woodPattern.getCanvas();
    if (woodCanvas) {
      ctx.drawImage(woodCanvas, boardTL.x, boardTL.y, boardW, boardH);
    } else {
      // Fallback if wood pattern not generated yet
      ctx.fillStyle = '#8B5E3C';
      ctx.fillRect(boardTL.x, boardTL.y, boardW, boardH);
    }

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

    // Draw pins (dark wooden pegs, darker than board surface)
    for (const pin of state.pins) {
      const pos = this.worldToCanvas(pin.x, pin.y);
      const r = this.worldToPixels(pin.radius);

      // 3D radial gradient: dark wood highlight → dark wood base → very dark edge
      const pegGrad = ctx.createRadialGradient(
        pos.x - r * 0.3, pos.y - r * 0.3, r * 0.05,
        pos.x, pos.y, r,
      );
      pegGrad.addColorStop(0, '#6b4226');   // lighter dark wood (highlight)
      pegGrad.addColorStop(0.55, '#3e2415'); // mid dark wood
      pegGrad.addColorStop(1, '#1e0f07');    // very dark edge
      ctx.fillStyle = pegGrad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle specular highlight
      const specGrad = ctx.createRadialGradient(
        pos.x - r * 0.25, pos.y - r * 0.3, 0,
        pos.x - r * 0.25, pos.y - r * 0.3, r * 0.5,
      );
      specGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Dark outline
      ctx.strokeStyle = '#1a0a04';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw bucket dividers and labels
    for (const bucket of state.buckets) {
      const dividerH = this.worldToPixels(BUCKET_DIVIDER_HEIGHT);
      const dividerW = this.worldToPixels(BUCKET_DIVIDER_WIDTH);
      const bucketW = this.worldToPixels(bucket.width);

      // Left divider post (wood-gradient filled rectangle)
      const leftTop = this.worldToCanvas(bucket.x, -this.layout.boardHeight / 2 + BUCKET_DIVIDER_HEIGHT);
      const leftPostX = leftTop.x - dividerW / 2;

      // Horizontal wood gradient for divider post
      const divGrad = ctx.createLinearGradient(leftPostX, 0, leftPostX + dividerW, 0);
      divGrad.addColorStop(0, '#5a3a1a');
      divGrad.addColorStop(0.5, '#a07828');
      divGrad.addColorStop(1, '#5a3a1a');
      ctx.fillStyle = divGrad;
      ctx.fillRect(leftPostX, leftTop.y, dividerW, dividerH);

      // Dark outline for divider post
      ctx.strokeStyle = '#3a2510';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftPostX, leftTop.y, dividerW, dividerH);

      // Right divider post
      const rightPostX = leftTop.x + bucketW - dividerW / 2;
      const divGradR = ctx.createLinearGradient(rightPostX, 0, rightPostX + dividerW, 0);
      divGradR.addColorStop(0, '#5a3a1a');
      divGradR.addColorStop(0.5, '#a07828');
      divGradR.addColorStop(1, '#5a3a1a');
      ctx.fillStyle = divGradR;
      ctx.fillRect(rightPostX, leftTop.y, dividerW, dividerH);
      ctx.strokeStyle = '#3a2510';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rightPostX, leftTop.y, dividerW, dividerH);

      // Score label — font size scales with bucket width for proportional layouts
      const bottom = this.worldToCanvas(bucket.x, -this.layout.boardHeight / 2);
      const centerX = leftTop.x + bucketW / 2;
      const labelY = bottom.y - 4;
      ctx.fillStyle = '#ffd700';
      const fontSize = Math.max(10, Math.min(this.worldToPixels(0.45), bucketW * 0.22));
      ctx.font = `bold ${fontSize}px sans-serif`;
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

      // Auto-shove warning pulse: glow when stall progress > 90% (last 0.3s)
      if (puck.autoShoveProgress && puck.autoShoveProgress > 0.9) {
        const pulsePhase = (puck.autoShoveProgress - 0.9) * 10; // 0–1
        const pulseAlpha = 0.3 + 0.4 * Math.sin(pulsePhase * Math.PI * 6); // rapid pulse
        ctx.save();
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Drop shadow (offset circle behind puck)
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(pos.x + r * 0.08, pos.y + r * 0.12, r * 1.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Flat solid-colour fill (hockey-puck style — no radial gradient or specular)
      ctx.fillStyle = puck.style.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Pattern overlay (reduced alpha so patterns don’t overpower the flat fill)
      ctx.save();
      ctx.globalAlpha = 0.35;
      this.drawPuckPattern(ctx, pos.x, pos.y, r, puck.style.pattern, puck.angle);
      ctx.restore();

      // Outline — darker tint of base colour for definition on wood background
      ctx.strokeStyle = this.darkenColour(puck.style.color, 0.35);
      ctx.lineWidth = 2;
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

  /** Parse a CSS hex colour into RGB components (0-255). */
  private parseHex(hex: string): { r: number; g: number; b: number } {
    const c = hex.replace('#', '');
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16),
    };
  }

  /** Darken a hex colour by the given factor (0–1). */
  private darkenColour(hex: string, factor: number): string {
    const { r, g, b } = this.parseHex(hex);
    const dr = Math.round(r * (1 - factor));
    const dg = Math.round(g * (1 - factor));
    const db = Math.round(b * (1 - factor));
    return `rgb(${dr},${dg},${db})`;
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
