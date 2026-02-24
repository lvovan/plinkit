/**
 * Layout calculator for responsive canvas sizing.
 * Handles portrait (mobile) vs landscape (desktop) orientations
 * with device pixel ratio support.
 */

export interface LayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  boardWidth: number;
  boardHeight: number;
}

export interface LayoutResult {
  orientation: 'portrait' | 'landscape';
  /** Canvas element width in physical pixels (for rendering) */
  canvasWidth: number;
  /** Canvas element height in physical pixels (for rendering) */
  canvasHeight: number;
  /** CSS width for the canvas element */
  cssWidth: number;
  /** CSS height for the canvas element */
  cssHeight: number;
  /** Scale factor: physical pixels per world unit */
  scale: number;
  /** Offset X for centering the board */
  offsetX: number;
  /** Offset Y for centering the board */
  offsetY: number;
  /** Minimum touch target size in CSS pixels */
  minTouchTargetPx: number;
}

export class LayoutCalculator {
  /**
   * Compute layout dimensions given viewport and board parameters.
   * Board fills available space while maintaining aspect ratio.
   */
  compute(input: LayoutInput): LayoutResult {
    const { viewportWidth, viewportHeight, devicePixelRatio, boardWidth, boardHeight } = input;
    const dpr = devicePixelRatio;

    const orientation: 'portrait' | 'landscape' = viewportWidth >= viewportHeight
      ? 'landscape'
      : 'portrait';

    // Determine available CSS space (leave some margin)
    const margin = 0; // use full viewport
    const availableW = viewportWidth - margin * 2;
    const availableH = viewportHeight - margin * 2;

    // Board aspect ratio
    const boardAspect = boardWidth / boardHeight;
    const viewAspect = availableW / availableH;

    let cssWidth: number;
    let cssHeight: number;

    if (viewAspect > boardAspect) {
      // Viewport is wider than board — fit to height
      cssHeight = availableH;
      cssWidth = cssHeight * boardAspect;
    } else {
      // Viewport is taller than board — fit to width
      cssWidth = availableW;
      cssHeight = cssWidth / boardAspect;
    }

    // Physical canvas dimensions (for high-DPI rendering)
    const canvasWidth = Math.round(cssWidth * dpr);
    const canvasHeight = Math.round(cssHeight * dpr);

    // Scale: physical pixels per world unit
    const scale = canvasWidth / boardWidth;

    // Offset for centering
    const offsetX = (canvasWidth - boardWidth * scale) / 2;
    const offsetY = (canvasHeight - boardHeight * scale) / 2;

    return {
      orientation,
      canvasWidth,
      canvasHeight,
      cssWidth: Math.round(cssWidth),
      cssHeight: Math.round(cssHeight),
      scale,
      offsetX,
      offsetY,
      minTouchTargetPx: 44,
    };
  }
}
