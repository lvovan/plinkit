/**
 * Telemetry wrapper for Microsoft Clarity.
 *
 * Provides a fail-safe interface — all public functions are no-ops
 * when Clarity is not initialized (missing project ID, test env,
 * blocked by ad blocker, or SDK load failure).
 *
 * Never throws. Never sets cookies.
 */

import Clarity from '@microsoft/clarity';

let _initialized = false;

/**
 * Initialize the telemetry system.
 *
 * Reads the Clarity project ID from `import.meta.env.VITE_CLARITY_PROJECT_ID`.
 * Skips initialization if:
 *   - Project ID is empty/missing
 *   - Running in a test environment (navigator.webdriver === true)
 *   - Clarity SDK fails to load
 *
 * Configures cookieless mode (no cookies set).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initTelemetry(): void {
  if (_initialized) return;

  try {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    if (!projectId) return;

    // Skip in automated test environments (Playwright sets navigator.webdriver)
    if (navigator.webdriver) return;

    Clarity.init(projectId);

    // Cookieless mode — deny all cookie storage
    Clarity.consentV2({
      ad_Storage: 'denied',
      analytics_Storage: 'denied',
    });

    _initialized = true;
  } catch {
    // Clarity init failed (blocked, offline, etc.) — silently continue
  }
}

/**
 * Send a named event to Clarity for session filtering and replay tagging.
 *
 * No-op if telemetry is not initialized.
 * Never throws — all errors are silently swallowed.
 */
export function trackEvent(name: string): void {
  if (!_initialized) return;
  try {
    Clarity.event(name);
  } catch {
    // Non-critical — swallow
  }
}

/**
 * Attach a key-value tag to the current Clarity session.
 *
 * Tags persist for the session and can be used for filtering in the dashboard.
 * Values are always strings (numbers should be stringified by the caller).
 *
 * No-op if telemetry is not initialized.
 * Never throws.
 */
export function setTag(key: string, value: string | string[]): void {
  if (!_initialized) return;
  try {
    Clarity.setTag(key, value);
  } catch {
    // Non-critical — swallow
  }
}

/**
 * Check whether telemetry was successfully initialized.
 */
export function isInitialized(): boolean {
  return _initialized;
}

/**
 * @internal Reset initialization state — for testing only.
 */
export function _resetForTesting(): void {
  _initialized = false;
}
