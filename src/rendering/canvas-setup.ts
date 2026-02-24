import { LayoutCalculator, type LayoutResult } from './layout';

/**
 * Responsive canvas setup with device pixel ratio handling.
 * Manages canvas sizing and viewport-fit scaling.
 */
export class CanvasSetup {
  private canvas: HTMLCanvasElement;
  private layoutCalc: LayoutCalculator;
  private currentLayout: LayoutResult | null = null;
  private boardWidth: number;
  private boardHeight: number;

  constructor(canvas: HTMLCanvasElement, boardWidth: number, boardHeight: number) {
    this.canvas = canvas;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.layoutCalc = new LayoutCalculator();
  }

  /**
   * Compute and apply responsive dimensions to the canvas element.
   * Call on init and on resize.
   */
  apply(): LayoutResult {
    const dpr = window.devicePixelRatio || 1;
    const layout = this.layoutCalc.compute({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: dpr,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
    });

    // Set physical canvas size for high-DPI rendering
    this.canvas.width = layout.canvasWidth;
    this.canvas.height = layout.canvasHeight;

    // Set CSS display size
    this.canvas.style.width = `${layout.cssWidth}px`;
    this.canvas.style.height = `${layout.cssHeight}px`;

    // Center canvas
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${Math.round((window.innerWidth - layout.cssWidth) / 2)}px`;
    this.canvas.style.top = `${Math.round((window.innerHeight - layout.cssHeight) / 2)}px`;

    this.currentLayout = layout;
    return layout;
  }

  /** Get the current layout result. */
  getLayout(): LayoutResult | null {
    return this.currentLayout;
  }
}
