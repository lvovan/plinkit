import type { Player } from '@/types/index';

/**
 * Scoreboard overlay showing all players with names, puck colors,
 * running scores, and highlighted leader.
 */
export class ScoreboardOverlay {
  private container: HTMLElement;
  private el: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'scoreboard';
    this.el.style.cssText = `
      position: absolute; top: 8px; right: 8px; background: rgba(22, 33, 62, 0.9);
      padding: 8px 12px; border-radius: 8px; pointer-events: auto; z-index: 50;
      min-width: 140px; font-size: 0.9rem;
    `;
    this.container.appendChild(this.el);
  }

  update(players: Player[]): void {
    if (!this.el) this.show();

    const maxScore = Math.max(...players.map(p => p.score), 0);

    this.el!.innerHTML = players.map(p => {
      const isLeader = p.score > 0 && p.score === maxScore;
      return `
        <div style="display:flex; align-items:center; gap:6px; padding:4px 0;
          ${isLeader ? 'font-weight:bold; color:#ffd700;' : 'color:#e0e0e0;'}">
          <span style="width:14px; height:14px; border-radius:50%;
            background:${p.puckStyle.color}; flex-shrink:0;"></span>
          <span style="flex:1;">${this.escapeHtml(p.name)}</span>
          <span>${p.score.toLocaleString()}</span>
        </div>
      `;
    }).join('');
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
