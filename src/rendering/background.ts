/**
 * Procedural countryside background rendered on offscreen canvases.
 * Layers: sky gradient → sun glow → far hills → near hills → clouds.
 * Clouds animate with a subtle drift when animation is enabled.
 */

interface CloudEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
}

export class BackgroundManager {
  private width = 0;
  private height = 0;

  // Offscreen layers
  private skyCanvas: OffscreenCanvas | null = null;
  private skyCtx: OffscreenCanvasRenderingContext2D | null = null;
  private hillsCanvas: OffscreenCanvas | null = null;
  private hillsCtx: OffscreenCanvasRenderingContext2D | null = null;

  // Clouds (animated)
  private clouds: CloudEntity[] = [];
  private animationEnabled = true;

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.rebuild();
  }

  rebuild(): void {
    if (this.width === 0 || this.height === 0) return;
    const w = this.width;
    const h = this.height;

    // Sky layer (static)
    this.skyCanvas = new OffscreenCanvas(w, h);
    this.skyCtx = this.skyCanvas.getContext('2d')!;
    this.drawSky(this.skyCtx, w, h);

    // Hills layer (static)
    this.hillsCanvas = new OffscreenCanvas(w, h);
    this.hillsCtx = this.hillsCanvas.getContext('2d')!;
    this.drawHills(this.hillsCtx, w, h);

    // Initialize clouds
    this.initClouds(w, h);
  }

  update(dt: number): void {
    if (!this.animationEnabled) return;

    // Drift clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      // Wrap around
      if (cloud.x > this.width + cloud.width) {
        cloud.x = -cloud.width;
      }
    }
  }

  composite(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    // Draw sky
    if (this.skyCanvas) {
      ctx.drawImage(this.skyCanvas, 0, 0, canvasWidth, canvasHeight);
    }

    // Draw sun glow
    this.drawSunGlow(ctx, canvasWidth, canvasHeight);

    // Draw hills
    if (this.hillsCanvas) {
      ctx.drawImage(this.hillsCanvas, 0, 0, canvasWidth, canvasHeight);
    }

    // Draw clouds
    this.drawClouds(ctx, canvasWidth, canvasHeight);
  }

  toggleAnimation(): void {
    this.animationEnabled = !this.animationEnabled;
  }

  isAnimationEnabled(): boolean {
    return this.animationEnabled;
  }

  /** Resize and rebuild when canvas size changes */
  setSize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.rebuild();
  }

  // ---- Private rendering ----

  private drawSky(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a3e');    // deep navy top
    gradient.addColorStop(0.4, '#2d3a6e');  // mid blue
    gradient.addColorStop(0.7, '#4a6fa5');  // horizon blue
    gradient.addColorStop(1.0, '#6b8cae');  // light horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawSunGlow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Sun positioned at upper-right area
    const sunX = w * 0.8;
    const sunY = h * 0.15;
    const sunRadius = Math.min(w, h) * 0.08;

    // Outer glow
    ctx.save();
    const glow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.3, sunX, sunY, sunRadius * 3);
    glow.addColorStop(0, 'rgba(255, 220, 100, 0.3)');
    glow.addColorStop(0.5, 'rgba(255, 200, 80, 0.1)');
    glow.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Sun disc
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 230, 130, 0.8)';
    ctx.fill();
    ctx.restore();
  }

  private drawHills(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): void {
    // Far hills (lighter, higher)
    this.drawHillLayer(ctx, w, h, {
      baseY: h * 0.65,
      amplitude: h * 0.08,
      color: 'rgba(40, 70, 50, 0.6)',
      frequencies: [0.003, 0.006],
      phaseOffset: 0,
    });

    // Near hills (darker, lower)
    this.drawHillLayer(ctx, w, h, {
      baseY: h * 0.75,
      amplitude: h * 0.1,
      color: 'rgba(30, 55, 40, 0.8)',
      frequencies: [0.005, 0.01],
      phaseOffset: 2.0,
    });
  }

  private drawHillLayer(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    opts: {
      baseY: number;
      amplitude: number;
      color: string;
      frequencies: number[];
      phaseOffset: number;
    },
  ): void {
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let x = 0; x <= w; x += 2) {
      let y = opts.baseY;
      for (const freq of opts.frequencies) {
        y -= opts.amplitude * Math.sin(x * freq + opts.phaseOffset);
      }
      ctx.lineTo(x, y);
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = opts.color;
    ctx.fill();
  }

  private initClouds(w: number, h: number): void {
    this.clouds = [];
    const count = 5 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * w,
        y: h * 0.05 + Math.random() * h * 0.35,
        width: 60 + Math.random() * 120,
        height: 20 + Math.random() * 30,
        speed: 3 + Math.random() * 8,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
  }

  private drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const scaleX = w / (this.width || w);
    const scaleY = h / (this.height || h);

    ctx.save();
    for (const cloud of this.clouds) {
      const cx = cloud.x * scaleX;
      const cy = cloud.y * scaleY;
      const cw = cloud.width * scaleX;
      const ch = cloud.height * scaleY;

      ctx.globalAlpha = cloud.opacity;
      ctx.fillStyle = '#c8d8e8';

      // Cloud as overlapping ellipses
      this.drawEllipse(ctx, cx, cy, cw * 0.5, ch * 0.5);
      this.drawEllipse(ctx, cx - cw * 0.25, cy + ch * 0.1, cw * 0.35, ch * 0.4);
      this.drawEllipse(ctx, cx + cw * 0.25, cy + ch * 0.05, cw * 0.4, ch * 0.45);
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  private drawEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ): void {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
