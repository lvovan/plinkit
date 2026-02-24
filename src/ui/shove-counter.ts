/**
 * Shove counter UI overlay showing remaining/total shoves.
 * Also displays the shove zone boundary information.
 */
export class ShoveCounterOverlay {
  private container: HTMLElement;
  private el: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(remaining: number, total: number): void {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'shove-counter';
      this.el.style.cssText = `
        position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
        background: rgba(22, 33, 62, 0.9); padding: 6px 16px; border-radius: 8px;
        pointer-events: none; z-index: 50; font-size: 0.85rem; color: #e0e0e0;
      `;
      this.container.appendChild(this.el);
    }
    this.update(remaining, total);
  }

  update(remaining: number, total: number): void {
    if (!this.el) return;
    this.el.textContent = `Shoves: ${remaining}/${total}`;
    this.el.style.color = remaining === 0 ? '#e63946' : '#e0e0e0';
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}
