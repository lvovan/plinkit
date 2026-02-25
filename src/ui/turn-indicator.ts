import type { Player } from '@/types/index';

/**
 * Turn indicator overlay showing whose turn it is.
 */
export class TurnIndicatorOverlay {
  private container: HTMLElement;
  private el: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(player: Player, _timerSeconds: number): void {
    this.hide();
    this.el = document.createElement('div');
    this.el.className = 'turn-indicator';
    this.el.style.cssText = `
      position: absolute; top: 8px; right: 8px;
      background: rgba(22, 33, 62, 0.9); padding: 8px 20px; border-radius: 8px;
      pointer-events: none; z-index: 50; text-align: center;
      font-size: 0.9rem; color: #e0e0e0;
    `;
    this.el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
        <span style="width:16px; height:16px; border-radius:50%;
          background:${player.puckStyle.color};"></span>
        <span><strong>${this.escapeHtml(player.name)}</strong> — Your Turn!</span>
      </div>
      <div class="timer-display" style="font-size:1.5rem; font-weight:bold; margin-top:4px;"></div>
    `;
    this.container.appendChild(this.el);
  }

  updateTimer(secondsRemaining: number): void {
    if (!this.el) return;
    const timerEl = this.el.querySelector('.timer-display');
    if (timerEl) {
      timerEl.textContent = `${secondsRemaining}s`;
      (timerEl as HTMLElement).style.color = secondsRemaining <= 5 ? '#e63946' : '#ffd700';
    }
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
