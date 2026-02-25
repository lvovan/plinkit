import type { Player } from '@/types/index';

const ROW_HEIGHT = 36; // px per scoreboard row

/**
 * Unified Game HUD — single upper-left panel containing:
 *   1. Toggle buttons row (SFX, music, animation)
 *   2. Turn indicator (player name + color swatch + countdown timer)
 *   3. Scoreboard (ranked player list with animated transitions)
 *
 * Positioned absolutely in the upper-left corner of the overlay container.
 * Uses `pointer-events: auto` only on interactive children.
 */
export class GameHUD {
  private container: HTMLElement;

  /** Root wrapper for the entire HUD */
  private el: HTMLElement | null = null;

  // -- Toggle section --
  private toggleRow: HTMLElement | null = null;
  private sfxToggleBtn: HTMLButtonElement | null = null;
  private musicToggleBtn: HTMLButtonElement | null = null;
  private animToggleBtn: HTMLButtonElement | null = null;

  // -- Turn indicator section --
  private turnSection: HTMLElement | null = null;

  // -- Scoreboard section --
  private scoreSection: HTMLElement | null = null;
  private rowMap = new Map<string, HTMLElement>();
  private scoreSpanMap = new Map<string, HTMLElement>();
  /** Previous display order (player IDs) for stable tie-breaking */
  private previousOrder: string[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // ================================================================
  //  Lifecycle
  // ================================================================

  /** Create the root HUD element (idempotent). */
  private ensureRoot(): HTMLElement {
    if (this.el) return this.el;
    this.el = document.createElement('div');
    this.el.className = 'game-hud';
    this.el.style.cssText = `
      position: absolute; top: 8px; left: 8px;
      display: flex; flex-direction: column; gap: 6px;
      pointer-events: none; z-index: 60;
    `;
    this.container.appendChild(this.el);
    return this.el;
  }

  // ================================================================
  //  1. Toggle Buttons
  // ================================================================

  initAudioToggles(onToggleSfx: () => void, onToggleMusic: () => void): void {
    const root = this.ensureRoot();

    this.toggleRow = document.createElement('div');
    this.toggleRow.className = 'hud-toggle-row';
    this.toggleRow.style.cssText = `
      display: flex; gap: 6px; pointer-events: auto;
    `;

    this.sfxToggleBtn = this.createToggleButton('🔊', 'Toggle sound effects', 'sfx-toggle');
    this.sfxToggleBtn.addEventListener('click', onToggleSfx);

    this.musicToggleBtn = this.createToggleButton('🎵', 'Toggle music', 'music-toggle');
    this.musicToggleBtn.addEventListener('click', onToggleMusic);

    this.toggleRow.appendChild(this.sfxToggleBtn);
    this.toggleRow.appendChild(this.musicToggleBtn);
    root.appendChild(this.toggleRow);
  }

  initAnimationToggle(onToggle: (enabled: boolean) => void): void {
    if (!this.toggleRow) return;

    this.animToggleBtn = this.createToggleButton('🌤️', 'Toggle background animation', 'anim-toggle');
    this.animToggleBtn.addEventListener('click', () => {
      const muted = this.animToggleBtn!.classList.toggle('muted');
      onToggle(!muted);
      this.updateAnimationToggleState(!muted);
    });

    this.toggleRow.appendChild(this.animToggleBtn);
  }

  updateAudioToggleState(sfxMuted: boolean, musicMuted: boolean): void {
    if (this.sfxToggleBtn) {
      this.sfxToggleBtn.textContent = sfxMuted ? '🔇' : '🔊';
      this.sfxToggleBtn.classList.toggle('muted', sfxMuted);
    }
    if (this.musicToggleBtn) {
      this.musicToggleBtn.textContent = musicMuted ? '🎵' : '🎵';
      this.musicToggleBtn.classList.toggle('muted', musicMuted);
    }
  }

  updateAnimationToggleState(animationEnabled: boolean): void {
    if (this.animToggleBtn) {
      this.animToggleBtn.textContent = animationEnabled ? '🌤️' : '🌤️';
      this.animToggleBtn.classList.toggle('muted', !animationEnabled);
    }
  }

  // ================================================================
  //  2. Turn Indicator + Timer
  // ================================================================

  showTurnIndicator(player: Player, _timerSeconds: number): void {
    this.hideTurnIndicator();
    const root = this.ensureRoot();

    this.turnSection = document.createElement('div');
    this.turnSection.className = 'hud-turn-section';
    this.turnSection.style.cssText = `
      background: rgba(22, 33, 62, 0.9); padding: 6px 12px; border-radius: 8px;
      pointer-events: none; font-size: 0.85rem; color: #e0e0e0;
    `;
    this.turnSection.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="width:14px; height:14px; border-radius:50%;
          background:${player.puckStyle.color}; flex-shrink:0;"></span>
        <span><strong>${this.escapeHtml(player.name)}</strong> — Your Turn!</span>
      </div>
      <div class="timer-display" style="font-size:1.3rem; font-weight:bold; margin-top:2px;"></div>
    `;

    // Insert after toggle row (before scoreboard if present)
    if (this.scoreSection) {
      root.insertBefore(this.turnSection, this.scoreSection);
    } else {
      root.appendChild(this.turnSection);
    }
  }

  updateTimer(secondsRemaining: number): void {
    if (!this.turnSection) return;
    const timerEl = this.turnSection.querySelector('.timer-display') as HTMLElement | null;
    if (timerEl) {
      timerEl.textContent = `${secondsRemaining}s`;
      timerEl.style.color = secondsRemaining <= 5 ? '#e63946' : '#ffd700';
    }
  }

  hideTurnIndicator(): void {
    if (this.turnSection) {
      this.turnSection.remove();
      this.turnSection = null;
    }
  }

  // ================================================================
  //  3. Scoreboard
  // ================================================================

  showScoreboard(): void {
    if (this.scoreSection) return;
    const root = this.ensureRoot();

    this.scoreSection = document.createElement('div');
    this.scoreSection.className = 'scoreboard';
    this.scoreSection.style.cssText = `
      background: rgba(22, 33, 62, 0.9); padding: 8px 12px; border-radius: 8px;
      pointer-events: auto; min-width: 140px; font-size: 0.9rem;
      position: relative;
    `;
    root.appendChild(this.scoreSection);
  }

  updateScoreboard(players: Player[]): void {
    if (!this.scoreSection) this.showScoreboard();

    const maxScore = Math.max(...players.map(p => p.score), 0);

    // Sort descending by score, stable tie-breaking by previous order
    const sorted = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const prevA = this.previousOrder.indexOf(a.id);
      const prevB = this.previousOrder.indexOf(b.id);
      if (prevA !== -1 && prevB !== -1) return prevA - prevB;
      return players.indexOf(a) - players.indexOf(b);
    });

    // Set container height for absolute positioning
    this.scoreSection!.style.height = `${sorted.length * ROW_HEIGHT}px`;

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const isLeader = p.score > 0 && p.score === maxScore;
      let row = this.rowMap.get(p.id);

      if (!row) {
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
        this.scoreSection!.appendChild(row);
        this.rowMap.set(p.id, row);
      } else {
        const scoreSpan = this.scoreSpanMap.get(p.id);
        if (scoreSpan) scoreSpan.textContent = p.score.toLocaleString();
      }

      row.style.transform = `translateY(${i * ROW_HEIGHT}px)`;

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

    this.previousOrder = sorted.map(p => p.id);
  }

  hideScoreboard(): void {
    if (this.scoreSection) {
      this.scoreSection.remove();
      this.scoreSection = null;
      this.rowMap.clear();
      this.scoreSpanMap.clear();
      this.previousOrder = [];
    }
  }

  // ================================================================
  //  Aggregate hide
  // ================================================================

  hideGameplay(): void {
    this.hideTurnIndicator();
    this.hideScoreboard();
  }

  // ================================================================
  //  Helpers
  // ================================================================

  private createToggleButton(emoji: string, label: string, cls: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `audio-toggle-btn ${cls}`;
    btn.setAttribute('aria-label', label);
    btn.textContent = emoji;
    return btn;
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
