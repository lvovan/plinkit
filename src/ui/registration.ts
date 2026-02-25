import type { PlayerRegistration } from '@/types/contracts';
import { PUCK_PALETTE } from '@/types/index';

const STORAGE_KEY = 'plinkit_player_names';

/** Load saved player names from localStorage. Returns empty array on failure. */
function loadSavedNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return []; // silent degradation — localStorage unavailable or corrupted
  }
}

/** Save player names to localStorage. Fails silently. */
function saveNames(names: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // silent degradation — storage full or unavailable
  }
}

/**
 * Registration screen overlay.
 * Shown during the registration phase to collect player names.
 */
export class RegistrationOverlay {
  private container: HTMLElement;
  private overlay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show the registration form and return a promise that resolves
   * with the player registrations when the user clicks Start.
   */
  show(maxPlayers: number): Promise<PlayerRegistration[]> {
    return new Promise((resolve) => {
      this.overlay = document.createElement('div');
      this.overlay.className = 'registration-overlay';
      this.overlay.innerHTML = `
        <div class="reg-panel">
          <h1>🎯 Plinkit!</h1>
          <h2>Player Registration</h2>
          <div class="player-inputs"></div>
          <div class="reg-controls">
            <button class="btn add-player-btn" type="button">+ Add Player</button>
            <button class="btn start-btn" type="button" disabled>Start Game</button>
          </div>
          <p class="reg-attribution">©️ Luc Vo Van, 2026 – Built with AI</p>
        </div>
      `;

      this.applyStyles(this.overlay);

      const inputsDiv = this.overlay.querySelector('.player-inputs')!;
      const addBtn = this.overlay.querySelector('.add-player-btn') as HTMLButtonElement;
      const startBtn = this.overlay.querySelector('.start-btn') as HTMLButtonElement;

      // Start with 2 player inputs
      let playerCount = 0;
      const addInput = () => {
        if (playerCount >= maxPlayers) return;
        playerCount++;
        const idx = playerCount - 1;
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `
          <span class="puck-preview" style="background:${PUCK_PALETTE[idx].color}"></span>
          <input type="text" class="player-name" placeholder="Player ${playerCount}" maxlength="16" data-index="${idx}" />
        `;
        inputsDiv.appendChild(row);

        if (playerCount >= maxPlayers) {
          addBtn.style.display = 'none';
        }
        updateStartBtn();
      };

      const updateStartBtn = () => {
        const inputs = this.overlay!.querySelectorAll('.player-name') as NodeListOf<HTMLInputElement>;
        const filledCount = Array.from(inputs).filter(i => i.value.trim().length > 0).length;
        startBtn.disabled = filledCount < 1;
      };

      // Add 1 initial input (more can be added)
      addInput();

      // Pre-fill with saved names from localStorage
      const savedNames = loadSavedNames();
      if (savedNames.length > 0) {
        // Add additional inputs for extra saved names
        for (let i = 1; i < savedNames.length && playerCount < maxPlayers; i++) {
          addInput();
        }
        // Fill in saved values
        const inputs = this.overlay!.querySelectorAll('.player-name') as NodeListOf<HTMLInputElement>;
        savedNames.forEach((name, i) => {
          if (i < inputs.length) {
            inputs[i].value = name;
          }
        });
        updateStartBtn();
      }

      // Event listeners
      addBtn.addEventListener('click', addInput);
      inputsDiv.addEventListener('input', updateStartBtn);

      startBtn.addEventListener('click', () => {
        const inputs = this.overlay!.querySelectorAll('.player-name') as NodeListOf<HTMLInputElement>;
        const registrations: PlayerRegistration[] = [];
        const allNames: string[] = [];

        inputs.forEach((input, i) => {
          const name = input.value.trim();
          allNames.push(name);
          if (name.length > 0) {
            registrations.push({
              name,
              puckStyle: PUCK_PALETTE[i],
            });
          }
        });

        if (registrations.length >= 1) {
          saveNames(allNames);
          this.hide();
          resolve(registrations);
        }
      });

      this.container.appendChild(this.overlay);
    });
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private applyStyles(el: HTMLElement): void {
    el.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; background: rgba(0,0,0,0.85); z-index: 100;
      pointer-events: auto;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .reg-panel { background: #16213e; padding: 2rem; border-radius: 12px;
        max-width: 400px; width: 90%; text-align: center; }
      .reg-panel h1 { font-size: 2rem; margin-bottom: 0.25rem; }
      .reg-panel h2 { font-size: 1rem; color: #aaa; margin-bottom: 1.5rem; }
      .player-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
      .puck-preview { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; }
      .player-name { flex: 1; padding: 0.6rem 0.8rem; border: 1px solid #333;
        border-radius: 6px; background: #0f3460; color: #fff; font-size: 1rem;
        min-height: 44px; }
      .reg-controls { display: flex; gap: 0.75rem; margin-top: 1rem; justify-content: center; }
      .btn { padding: 0.6rem 1.2rem; border: none; border-radius: 6px;
        font-size: 1rem; cursor: pointer; min-height: 44px; min-width: 44px; }
      .add-player-btn { background: #333; color: #ccc; }
      .start-btn { background: #e63946; color: #fff; font-weight: bold; }
      .start-btn:disabled { opacity: 0.4; cursor: default; }
      .reg-attribution { margin-top: 1.5rem; font-size: 0.75rem; color: #888;
        text-align: center; word-wrap: break-word; overflow-wrap: break-word; }
    `;
    el.appendChild(style);
  }
}
