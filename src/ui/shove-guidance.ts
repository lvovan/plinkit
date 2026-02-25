/**
 * "Did you know?" shove guidance popup.
 * Shown at most once per browser session, at the end of Round 1
 * if no player performed a shove during that round.
 */

/** Session-scoped flag — resets on page reload */
let guidanceShownThisSession = false;

/** Check if guidance has already been shown this session */
export function wasGuidanceShown(): boolean {
  return guidanceShownThisSession;
}

/**
 * Show the shove guidance popup overlay.
 * Returns a Promise that resolves when the user dismisses it.
 */
export function showShoveGuidance(container: HTMLElement): Promise<void> {
  guidanceShownThisSession = true;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; background: rgba(0,0,0,0.85); z-index: 200;
      pointer-events: auto;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: #16213e; padding: 2rem; border-radius: 12px;
      max-width: 360px; width: 85%; text-align: center; color: #fff;
    `;

    const title = document.createElement('h2');
    title.textContent = '💡 Did you know?';
    title.style.cssText = 'font-size: 1.4rem; margin-bottom: 1rem;';

    const body = document.createElement('p');
    body.textContent =
      'While your puck is falling, flick it to change its direction! ' +
      'This can help you aim for higher-scoring buckets.';
    body.style.cssText = 'font-size: 0.95rem; color: #ccc; line-height: 1.5; margin-bottom: 1.5rem;';

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Got it!';
    dismissBtn.style.cssText = `
      padding: 0.7rem 2rem; border: none; border-radius: 6px;
      background: #e63946; color: #fff; font-size: 1rem; font-weight: bold;
      cursor: pointer; min-height: 44px; min-width: 44px;
    `;

    dismissBtn.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });

    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(dismissBtn);
    overlay.appendChild(panel);
    container.appendChild(overlay);
  });
}
