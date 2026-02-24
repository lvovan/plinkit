import type { Player } from '@/types/index';
import type { ResultsAction } from '@/types/contracts';

/**
 * Results screen overlay showing winner, rankings, and action buttons.
 */
export class ResultsOverlay {
  private container: HTMLElement;
  private overlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(players: Player[], winner: Player | Player[], isTieBreaker = false): Promise<ResultsAction> {
    return new Promise((resolve) => {
      this.overlay = document.createElement('div');
      this.overlay.className = 'results-overlay';
      this.overlay.style.cssText = `
        position: absolute; inset: 0; display: flex; align-items: center;
        justify-content: center; background: rgba(0,0,0,0.85); z-index: 100;
        pointer-events: auto;
      `;

      const isCoWinners = Array.isArray(winner);
      let winnerText: string;
      let subText = '';

      if (isCoWinners) {
        const names = (winner as Player[]).map(w => w.name).join(' & ');
        if (isTieBreaker) {
          winnerText = `🤝 Co-Winners: ${names}!`;
          subText = 'Tie-breaker rounds exhausted — sharing the victory!';
        } else {
          winnerText = `🏆 Co-Winners: ${names}!`;
        }
      } else {
        winnerText = `🏆 ${(winner as Player).name} Wins!`;
        if (isTieBreaker) {
          subText = 'Decided by tie-breaker!';
        }
      }

      // Sort players by score descending
      const ranked = [...players].sort((a, b) => b.score - a.score);

      this.overlay.innerHTML = `
        <div style="background:#16213e; padding:2rem; border-radius:12px;
          max-width:400px; width:90%; text-align:center;">
          <h1 style="font-size:1.8rem; margin-bottom:0.5rem; color:#ffd700;">${winnerText}</h1>
          ${subText ? `<p style="font-size:0.95rem; color:#a0c4ff; margin-bottom:0.5rem;">${subText}</p>` : ''}
          <div style="margin:1rem 0;">
            ${ranked.map((p, i) => `
              <div style="display:flex; align-items:center; gap:8px; padding:6px 0;
                color:${i === 0 ? '#ffd700' : '#e0e0e0'};">
                <span style="width:20px; text-align:right;">#${i + 1}</span>
                <span style="width:16px; height:16px; border-radius:50%;
                  background:${p.puckStyle.color};"></span>
                <span style="flex:1; text-align:left;">${this.escapeHtml(p.name)}</span>
                <span style="font-weight:bold;">${p.score.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap; margin-top:1rem;">
            <button class="result-btn" data-action="playAgain"
              style="padding:0.6rem 1rem; border:none; border-radius:6px;
              background:#2a9d8f; color:#fff; font-size:1rem; cursor:pointer;
              min-height:44px; min-width:44px;">Play Again</button>
            <button class="result-btn" data-action="newPlayers"
              style="padding:0.6rem 1rem; border:none; border-radius:6px;
              background:#457b9d; color:#fff; font-size:1rem; cursor:pointer;
              min-height:44px; min-width:44px;">New Players</button>
            <button class="result-btn" data-action="quit"
              style="padding:0.6rem 1rem; border:none; border-radius:6px;
              background:#666; color:#fff; font-size:1rem; cursor:pointer;
              min-height:44px; min-width:44px;">Quit</button>
          </div>
        </div>
      `;

      this.overlay.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.result-btn') as HTMLElement | null;
        if (btn) {
          const action = btn.dataset.action as ResultsAction;
          this.hide();
          resolve(action);
        }
      });

      this.container.appendChild(this.overlay);
    });
  }

  showFarewell(): void {
    this.hide();
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; background: rgba(0,0,0,0.9); z-index: 100;
      font-size: 2rem; color: #ffd700;
    `;
    el.textContent = 'Thanks for playing Plinkit! 🎯';
    this.container.appendChild(el);
    this.overlay = el;
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
