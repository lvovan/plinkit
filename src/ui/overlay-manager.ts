import type { Player } from '@/types/index';
import type { PlayerRegistration, ResultsAction, UIOverlayManager } from '@/types/contracts';
import { RegistrationOverlay } from './registration';
import { GameHUD } from './game-hud';
import { ResultsOverlay } from './results';

/**
 * Coordinates all UI overlays — show/hide by game phase.
 * Delegates toggle buttons, turn indicator, and scoreboard to a unified GameHUD.
 */
export class OverlayManager implements UIOverlayManager {
  private registration: RegistrationOverlay;
  private hud: GameHUD;
  private results: ResultsOverlay;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.registration = new RegistrationOverlay(container);
    this.hud = new GameHUD(container);
    this.results = new ResultsOverlay(container);
  }

  async showRegistration(maxPlayers: number): Promise<PlayerRegistration[]> {
    this.hideAll();
    return this.registration.show(maxPlayers);
  }

  updateScoreboard(players: Player[]): void {
    this.hud.updateScoreboard(players);
  }

  showTurnIndicator(player: Player, timerSeconds: number): void {
    this.hud.showTurnIndicator(player, timerSeconds);
  }

  updateTimer(secondsRemaining: number): void {
    this.hud.updateTimer(secondsRemaining);
  }

  async showResults(players: Player[], winner: Player | Player[], isTieBreaker = false): Promise<ResultsAction> {
    this.hud.hideTurnIndicator();
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
    this.hud.hideGameplay();
    this.results.hide();
  }

  initAudioToggles(onToggleSfx: () => void, onToggleMusic: () => void): void {
    this.hud.initAudioToggles(onToggleSfx, onToggleMusic);
  }

  updateAudioToggleState(sfxMuted: boolean, musicMuted: boolean): void {
    this.hud.updateAudioToggleState(sfxMuted, musicMuted);
  }

  initAnimationToggle(onToggle: (enabled: boolean) => void): void {
    this.hud.initAnimationToggle(onToggle);
  }

  updateAnimationToggleState(animationEnabled: boolean): void {
    this.hud.updateAnimationToggleState(animationEnabled);
  }
}
