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
  private container: HTMLElement;
  private sfxToggleBtn: HTMLButtonElement | null = null;
  private musicToggleBtn: HTMLButtonElement | null = null;

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

  async showResults(players: Player[], winner: Player | Player[], isTieBreaker = false): Promise<ResultsAction> {
    this.turnIndicator.hide();
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
  }

  initAudioToggles(onToggleSfx: () => void, onToggleMusic: () => void): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-toggles';

    this.sfxToggleBtn = document.createElement('button');
    this.sfxToggleBtn.className = 'audio-toggle-btn sfx-toggle';
    this.sfxToggleBtn.setAttribute('aria-label', 'Toggle sound effects');
    this.sfxToggleBtn.textContent = '🔊';
    this.sfxToggleBtn.addEventListener('click', onToggleSfx);

    this.musicToggleBtn = document.createElement('button');
    this.musicToggleBtn.className = 'audio-toggle-btn music-toggle';
    this.musicToggleBtn.setAttribute('aria-label', 'Toggle music');
    this.musicToggleBtn.textContent = '🎵';
    this.musicToggleBtn.addEventListener('click', onToggleMusic);

    wrapper.appendChild(this.sfxToggleBtn);
    wrapper.appendChild(this.musicToggleBtn);
    this.container.appendChild(wrapper);
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
}
