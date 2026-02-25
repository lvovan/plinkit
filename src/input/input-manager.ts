import type { InputManager } from '@/types/contracts';

/**
 * Basic input manager for puck positioning and release.
 * Handles pointer events (mouse + touch) on the game canvas.
 */
export class BasicInputManager implements InputManager {
  private canvas: HTMLCanvasElement | null = null;
  private dropPositionCb: ((x: number) => void) | null = null;
  private releaseCb: (() => void) | null = null;
  private flickCb: ((vector: { dx: number; dy: number }) => void) | null = null;
  private flickEnabled = false;
  private isDragging = false;

  /** World-space transform: how to convert canvas pixel X → world X */
  private worldWidth = 10;  // default board width
  private boardHeight = 14; // default board height

  /** Flick detection state */
  private pointerHistory: Array<{ x: number; y: number; t: number }> = [];
  private flickSampleWindowMs = 80;

  setWorldWidth(width: number): void {
    this.worldWidth = width;
  }

  setBoardHeight(height: number): void {
    this.boardHeight = height;
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    // Prevent default touch behaviors (scroll, zoom)
    canvas.style.touchAction = 'none';
  }

  detach(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas = null;
  }

  onDropPositionChange(cb: (x: number) => void): void {
    this.dropPositionCb = cb;
  }

  onRelease(cb: () => void): void {
    this.releaseCb = cb;
  }

  onFlick(cb: (vector: { dx: number; dy: number }) => void): void {
    this.flickCb = cb;
  }

  setFlickEnabled(enabled: boolean): void {
    this.flickEnabled = enabled;
  }

  /** Convert canvas pixel X to world X (centered at 0).
   *  Mirrors the renderer's padding + aspect-ratio fitting so that
   *  pointer position maps to the correct world coordinate. */
  private canvasToWorldX(canvasX: number): number {
    if (!this.canvas) return 0;
    const rect = this.canvas.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;

    // Match renderer's computeTransform: 5% padding, fit-to-aspect
    const padFraction = 0.05;
    const availW = canvasW * (1 - 2 * padFraction);
    const availH = canvasH * (1 - 2 * padFraction);
    const scaleX = availW / this.worldWidth;
    const scaleY = availH / this.boardHeight;
    const scale = Math.min(scaleX, scaleY);

    // The board is centered in the canvas; offsetX = canvasW / 2
    const offsetX = canvasW / 2;
    const pixelX = canvasX - rect.left;
    return (pixelX - offsetX) / scale;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.pointerHistory = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    const worldX = this.canvasToWorldX(e.clientX);
    this.dropPositionCb?.(worldX);

    // Capture pointer for reliable tracking
    this.canvas?.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const worldX = this.canvasToWorldX(e.clientX);
    this.dropPositionCb?.(worldX);

    // Track for flick detection
    const now = performance.now();
    this.pointerHistory.push({ x: e.clientX, y: e.clientY, t: now });
    // Keep only samples within the window
    const cutoff = now - this.flickSampleWindowMs;
    this.pointerHistory = this.pointerHistory.filter(s => s.t >= cutoff);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Check for flick gesture
    if (this.flickEnabled && this.pointerHistory.length >= 2) {
      const oldest = this.pointerHistory[0];
      const newest = this.pointerHistory[this.pointerHistory.length - 1];
      const dt = (newest.t - oldest.t) / 1000; // seconds

      if (dt > 0.001) {
        const dx = (newest.x - oldest.x) / dt;
        const dy = (newest.y - oldest.y) / dt;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed >= 200) { // minFlickSpeed
          this.flickCb?.({ dx: dx / 1000, dy: -dy / 1000 }); // flip Y for world coords
        }
      }
    }

    this.releaseCb?.();
    this.pointerHistory = [];

    // Release pointer
    this.canvas?.releasePointerCapture(e.pointerId);
  };
}
