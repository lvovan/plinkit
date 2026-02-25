/**
 * First-round tutorial indicator.
 *
 * Shows an animated hand (touch device) or mouse cursor (pointer device)
 * near the top of the board to teach the player how to position the puck.
 * The indicator appears once per game session (first round only) and
 * auto-dismisses as soon as the player interacts with the canvas.
 */

const INDICATOR_SIZE = 48; // px — icon diameter
const SWAY_DURATION_MS = 1400; // one full left-right cycle
const SWAY_AMPLITUDE_PX = 60; // horizontal travel each direction

/**
 * Detect whether the primary input is a coarse pointer (touch) or fine (mouse).
 * Falls back to touch if matchMedia is unavailable.
 */
function isTouchDevice(): boolean {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches;
  }
  return 'ontouchstart' in window;
}

export class TutorialIndicator {
  private el: HTMLElement | null = null;
  private container: HTMLElement;
  private animFrameId = 0;
  private startTime = 0;
  private dismissed = false;
  /** Track how many game sessions have started so we only show on the first round. */
  private shownThisSession = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show the tutorial indicator for the current turn.
   * @param roundNumber  Current round (1-based). Only shows on round 1.
   * @param turnNumber   Current turn within the round (1-based). Only shows on turn 1.
   * @param isFirstGame  Whether this is the first game of the session (not a replay).
   */
  show(roundNumber: number, turnNumber: number, isFirstGame: boolean): void {
    // Only show on the very first turn of the very first round of the first game
    if (roundNumber !== 1 || turnNumber !== 1 || !isFirstGame) return;
    if (this.shownThisSession) return;
    this.shownThisSession = true;

    this.dismissed = false;

    // Create the indicator element
    this.el = document.createElement('div');
    this.el.className = 'tutorial-indicator';
    this.el.setAttribute('aria-hidden', 'true');

    const isTouch = isTouchDevice();
    const icon = isTouch ? '👆' : '🖱️';
    const label = isTouch ? 'Drag to position' : 'Click & drag to aim';

    this.el.style.cssText = `
      position: absolute;
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      pointer-events: none;
      z-index: 80;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;

    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = `
      font-size: ${INDICATOR_SIZE}px;
      line-height: 1;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      will-change: transform;
    `;
    iconSpan.textContent = icon;

    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = `
      font-size: 0.85rem;
      color: #e0e0e0;
      background: rgba(22, 33, 62, 0.8);
      padding: 4px 12px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
    `;
    labelSpan.textContent = label;

    this.el.appendChild(iconSpan);
    this.el.appendChild(labelSpan);
    this.container.appendChild(this.el);

    // Fade in after a short delay
    requestAnimationFrame(() => {
      if (this.el) this.el.style.opacity = '1';
    });

    // Start sway animation
    this.startTime = performance.now();
    this.animateFrame(iconSpan);
  }

  /**
   * Dismiss the indicator with a fade-out.
   * Called automatically when the player interacts.
   */
  dismiss(): void {
    if (this.dismissed || !this.el) return;
    this.dismissed = true;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }

    this.el.style.opacity = '0';
    const el = this.el;
    setTimeout(() => {
      el.remove();
    }, 400); // matches transition duration
    this.el = null;
  }

  /** Whether the indicator is currently visible. */
  isVisible(): boolean {
    return this.el !== null && !this.dismissed;
  }

  /** Reset state for a brand new game session (new players). */
  reset(): void {
    this.dismiss();
    this.shownThisSession = false;
  }

  private animateFrame = (iconSpan: HTMLElement): void => {
    if (this.dismissed) return;

    const elapsed = performance.now() - this.startTime;
    // Sine wave for smooth left-right sway
    const progress = (elapsed % SWAY_DURATION_MS) / SWAY_DURATION_MS;
    const offsetX = Math.sin(progress * Math.PI * 2) * SWAY_AMPLITUDE_PX;
    iconSpan.style.transform = `translateX(${offsetX}px)`;

    this.animFrameId = requestAnimationFrame(() => this.animateFrame(iconSpan));
  };
}
