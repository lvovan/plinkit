/**
 * Procedural wood-grain pattern generator using OffscreenCanvas.
 * Pre-renders a tileable wood texture that can be drawn via ctx.drawImage().
 */
export class WoodPatternGenerator {
  private canvas: OffscreenCanvas | null = null;

  /** Base wood colour. */
  private readonly baseColor = '#8B5E3C';
  /** Dark tint for grain lines and edges. */
  private readonly darkColor = '#5C3A1E';
  /** Light tint for highlights. */
  private readonly lightColor = '#A97B50';
  /** Grain line dark variants. */
  private readonly grainDarks = ['#4A2E14', '#6B4226'];

  /**
   * Generate a wood-grain pattern at the given pixel dimensions.
   * Call once on init and again on resize.
   */
  generate(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // 1. Vertical linear gradient base
    const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, this.darkColor);
    baseGrad.addColorStop(0.45, this.baseColor);
    baseGrad.addColorStop(0.7, this.lightColor);
    baseGrad.addColorStop(1, this.darkColor);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Horizontal grain lines (200–400 random lines)
    const grainCount = 200 + Math.floor(Math.random() * 200);
    for (let i = 0; i < grainCount; i++) {
      const y = Math.random() * height;
      const alpha = 0.03 + Math.random() * 0.09; // 0.03–0.12
      const lineWidth = 0.5 + Math.random() * 1.5;
      const color = this.grainDarks[Math.floor(Math.random() * this.grainDarks.length)];

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      // Slightly wavy grain line
      const startX = 0;
      const amplitude = 1 + Math.random() * 3;
      const frequency = 0.005 + Math.random() * 0.01;
      ctx.moveTo(startX, y);
      for (let x = 0; x <= width; x += 4) {
        const dy = Math.sin(x * frequency + i) * amplitude;
        ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;

    // 3. Wood knots (2–4 radial gradients)
    const knotCount = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < knotCount; k++) {
      const kx = Math.random() * width;
      const ky = Math.random() * height;
      const kr = 15 + Math.random() * 30;

      const knotGrad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      knotGrad.addColorStop(0, '#4A2E14');
      knotGrad.addColorStop(0.4, '#5C3A1E');
      knotGrad.addColorStop(1, 'transparent');

      ctx.globalAlpha = 0.3 + Math.random() * 0.3;
      ctx.fillStyle = knotGrad;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }

  /** Return the offscreen canvas for use with drawImage(). */
  getCanvas(): OffscreenCanvas | null {
    return this.canvas;
  }
}
