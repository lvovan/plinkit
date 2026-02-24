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
