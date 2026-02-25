import type { Player } from '@/types/index';
import type { PlayerRegistration, ResultsAction, UIOverlayManager } from '@/types/contracts';
import { RegistrationOverlay } from './registration';
import { ScoreboardOverlay } from './scoreboard';
import { TurnIndicatorOverlay } from './turn-indicator';
import { ResultsOverlay } from './results';

/**
 * Coordinates all UI overlays — show/hide by game phase.
 */
export class OverlayManager implements UIOverlayManager {
  private registration: RegistrationOverlay;
  private scoreboard: ScoreboardOverlay;
  private turnIndicator: TurnIndicatorOverlay;
  private results: ResultsOverlay;
  private shoveCounterEl: HTMLElement | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.registration = new RegistrationOverlay(container);
    this.scoreboard = new ScoreboardOverlay(container);
    this.turnIndicator = new TurnIndicatorOverlay(container);
    this.results = new ResultsOverlay(container);
  }

  async showRegistration(maxPlayers: number): Promise<PlayerRegistration[]> {
    this.hideAll();
    return this.registration.show(maxPlayers);
  }

  updateScoreboard(players: Player[]): void {
    this.scoreboard.update(players);
  }

  showTurnIndicator(player: Player, timerSeconds: number): void {
    this.turnIndicator.show(player, timerSeconds);
  }

  updateTimer(secondsRemaining: number): void {
    this.turnIndicator.updateTimer(secondsRemaining);
  }

  updateShoveCounter(remaining: number, total: number): void {
    if (!this.shoveCounterEl) {
      this.shoveCounterEl = document.createElement('div');
      this.shoveCounterEl.style.cssText = `
        position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
        background: rgba(22, 33, 62, 0.9); padding: 6px 16px; border-radius: 8px;
        pointer-events: none; z-index: 50; font-size: 0.85rem; color: #e0e0e0;
      `;
      this.container.appendChild(this.shoveCounterEl);
    }
    this.shoveCounterEl.textContent = `Shoves: ${remaining}/${total}`;
  }

  async showResults(players: Player[], winner: Player | Player[], isTieBreaker = false): Promise<ResultsAction> {
    this.turnIndicator.hide();
    this.hideShoveCounter();
    return this.results.show(players, winner, isTieBreaker);
  }

  showFarewell(): void {
    this.hideAll();
    this.results.showFarewell();
  }

  showOutOfBounds(): void {
    const el = document.createElement('div');
    el.textContent = 'Out of Bounds!';
    el.style.cssText = `
      position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(220, 38, 38, 0.92); color: #fff; padding: 16px 32px;
      border-radius: 12px; font-size: 1.4rem; font-weight: bold;
      pointer-events: none; z-index: 100; text-align: center;
      animation: fadeInOut 2s ease-in-out forwards;
    `;
    // Inject keyframes if not already present
    if (!document.getElementById('oob-keyframes')) {
      const style = document.createElement('style');
      style.id = 'oob-keyframes';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          75% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  hideAll(): void {
    this.registration.hide();
    this.scoreboard.hide();
    this.turnIndicator.hide();
    this.results.hide();
    this.hideShoveCounter();
  }

  private hideShoveCounter(): void {
    if (this.shoveCounterEl) {
      this.shoveCounterEl.remove();
      this.shoveCounterEl = null;
    }
  }
}
