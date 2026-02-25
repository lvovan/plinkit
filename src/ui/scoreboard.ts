import type { Player } from '@/types/index';

const ROW_HEIGHT = 36; // px per scoreboard row

/**
 * Scoreboard overlay showing all players with names, puck colors,
 * running scores, and highlighted leader.
 * Uses persistent DOM elements keyed by player ID with CSS transform
 * transitions for smooth rank-change animations.
 */
export class ScoreboardOverlay {
  private container: HTMLElement;
  private el: HTMLElement | null = null;
  private rowMap = new Map<string, HTMLElement>();
  private scoreSpanMap = new Map<string, HTMLElement>();
  /** Previous display order (player IDs) for stable tie-breaking */
  private previousOrder: string[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'scoreboard';
    this.el.style.cssText = `
      position: absolute; top: 90px; right: 8px; background: rgba(22, 33, 62, 0.9);
      padding: 8px 12px; border-radius: 8px; pointer-events: auto; z-index: 50;
      min-width: 140px; font-size: 0.9rem;
    `;
    this.container.appendChild(this.el);
  }

  update(players: Player[]): void {
    if (!this.el) this.show();

    const maxScore = Math.max(...players.map(p => p.score), 0);

    // Sort descending by score, stable tie-breaking by previous order
    const sorted = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Stable: preserve previous relative order for ties
      const prevA = this.previousOrder.indexOf(a.id);
      const prevB = this.previousOrder.indexOf(b.id);
      if (prevA !== -1 && prevB !== -1) return prevA - prevB;
      // Fall back to array order for new players
      return players.indexOf(a) - players.indexOf(b);
    });

    // Set container height for absolute positioning
    this.el!.style.position = 'relative';
    this.el!.style.height = `${sorted.length * ROW_HEIGHT}px`;

    // Create or update row elements
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const isLeader = p.score > 0 && p.score === maxScore;
      let row = this.rowMap.get(p.id);

      if (!row) {
        // Create new row
        row = document.createElement('div');
        row.setAttribute('data-player-id', p.id);
        row.style.cssText = `
          display: flex; align-items: center; gap: 6px;
          padding: 4px 0; position: absolute; left: 0; right: 0;
          transition: transform 300ms ease; will-change: transform;
        `;

        const swatch = document.createElement('span');
        swatch.style.cssText = `width:14px; height:14px; border-radius:50%;
          background:${p.puckStyle.color}; flex-shrink:0;`;

        const nameSpan = document.createElement('span');
        nameSpan.style.flex = '1';
        nameSpan.textContent = this.escapeHtml(p.name);

        const scoreSpan = document.createElement('span');
        scoreSpan.textContent = p.score.toLocaleString();
        this.scoreSpanMap.set(p.id, scoreSpan);

        row.appendChild(swatch);
        row.appendChild(nameSpan);
        row.appendChild(scoreSpan);
        this.el!.appendChild(row);
        this.rowMap.set(p.id, row);
      } else {
        // Update score text
        const scoreSpan = this.scoreSpanMap.get(p.id);
        if (scoreSpan) scoreSpan.textContent = p.score.toLocaleString();
      }

      // Position via transform
      row.style.transform = `translateY(${i * ROW_HEIGHT}px)`;

      // Leader highlight
      if (isLeader) {
        row.style.fontWeight = 'bold';
        row.style.color = '#ffd700';
      } else {
        row.style.fontWeight = '';
        row.style.color = '#e0e0e0';
      }
    }

    // Remove rows for players no longer present
    for (const [id, row] of this.rowMap) {
      if (!sorted.find(p => p.id === id)) {
        row.remove();
        this.rowMap.delete(id);
        this.scoreSpanMap.delete(id);
      }
    }

    // Record order for next stable sort
    this.previousOrder = sorted.map(p => p.id);
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
      this.rowMap.clear();
      this.scoreSpanMap.clear();
      this.previousOrder = [];
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

