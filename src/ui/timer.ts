/**
 * Timer countdown UI overlay.
 * Displays seconds remaining with color warning at ≤5s.
 */
export class TimerOverlay {
  private container: HTMLElement;
  private el: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(seconds: number): void {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'timer-overlay';
      this.el.style.cssText = `
        position: absolute; top: 8px; left: 8px;
        background: rgba(22, 33, 62, 0.9); padding: 6px 14px; border-radius: 8px;
        pointer-events: none; z-index: 50; font-size: 1.2rem; font-weight: bold;
      `;
      this.container.appendChild(this.el);
    }
    this.update(seconds);
  }

  update(seconds: number): void {
    if (!this.el) return;
    this.el.textContent = `⏱ ${seconds}s`;
    this.el.style.color = seconds <= 5 ? '#e63946' : '#ffd700';
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}
