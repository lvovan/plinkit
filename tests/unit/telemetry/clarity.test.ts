import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @microsoft/clarity before importing the module under test
vi.mock('@microsoft/clarity', () => ({
  default: {
    init: vi.fn(),
    consentV2: vi.fn(),
    event: vi.fn(),
    setTag: vi.fn(),
  },
}));

// Provide navigator global for Node test environment
const _origNavigator = globalThis.navigator;

// Must import after mock setup
import Clarity from '@microsoft/clarity';
import {
  initTelemetry,
  trackEvent,
  setTag,
  isInitialized,
  _resetForTesting,
} from '@/telemetry/clarity';

describe('Telemetry: clarity.ts', () => {
  beforeEach(() => {
    _resetForTesting();
    // resetAllMocks clears history AND resets implementations (safe for factory vi.fn())
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    // Default: navigator.webdriver = false
    Object.defineProperty(globalThis, 'navigator', {
      value: { webdriver: false },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore original navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: _origNavigator,
      configurable: true,
      writable: true,
    });
  });

  describe('initTelemetry', () => {
    it('should skip initialization when project ID is empty', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

      initTelemetry();

      expect(Clarity.init).not.toHaveBeenCalled();
      expect(isInitialized()).toBe(false);

      vi.unstubAllEnvs();
    });

    it('should skip initialization when project ID is undefined', () => {
      // Simulate missing env var — Vite returns empty string for missing vars
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');

      initTelemetry();

      expect(Clarity.init).not.toHaveBeenCalled();
      expect(isInitialized()).toBe(false);

      vi.unstubAllEnvs();
    });

    it('should skip initialization when navigator.webdriver is true', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });

      initTelemetry();

      expect(Clarity.init).not.toHaveBeenCalled();
      expect(isInitialized()).toBe(false);

      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      vi.unstubAllEnvs();
    });

    it('should initialize Clarity with project ID and cookieless mode', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });

      initTelemetry();

      expect(Clarity.init).toHaveBeenCalledWith('test-project-id');
      expect(Clarity.consentV2).toHaveBeenCalledWith({
        ad_Storage: 'denied',
        analytics_Storage: 'denied',
      });
      expect(isInitialized()).toBe(true);

      vi.unstubAllEnvs();
    });

    it('should be a no-op on subsequent calls', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });

      initTelemetry();
      initTelemetry(); // second call

      expect(Clarity.init).toHaveBeenCalledTimes(1);

      vi.unstubAllEnvs();
    });

    it('should not throw when Clarity.init fails', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      vi.mocked(Clarity.init).mockImplementation(() => { throw new Error('blocked'); });

      expect(() => initTelemetry()).not.toThrow();
      expect(isInitialized()).toBe(false);

      vi.unstubAllEnvs();
    });
  });

  describe('trackEvent', () => {
    it('should be a no-op when not initialized', () => {
      trackEvent('game_start');
      expect(Clarity.event).not.toHaveBeenCalled();
    });

    it('should call Clarity.event when initialized', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      initTelemetry();

      trackEvent('game_start');

      expect(Clarity.event).toHaveBeenCalledWith('game_start');

      vi.unstubAllEnvs();
    });

    it('should not throw when Clarity.event fails', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      initTelemetry();
      vi.mocked(Clarity.event).mockImplementation(() => { throw new Error('failed'); });

      expect(() => trackEvent('game_start')).not.toThrow();

      vi.unstubAllEnvs();
    });
  });

  describe('setTag', () => {
    it('should be a no-op when not initialized', () => {
      setTag('playerCount', '4');
      expect(Clarity.setTag).not.toHaveBeenCalled();
    });

    it('should call Clarity.setTag when initialized', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      initTelemetry();

      setTag('playerCount', '4');

      expect(Clarity.setTag).toHaveBeenCalledWith('playerCount', '4');

      vi.unstubAllEnvs();
    });

    it('should accept string array values', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      initTelemetry();

      setTag('tags', ['a', 'b']);

      expect(Clarity.setTag).toHaveBeenCalledWith('tags', ['a', 'b']);

      vi.unstubAllEnvs();
    });

    it('should not throw when Clarity.setTag fails', () => {
      vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'test-project-id');
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
      initTelemetry();
      vi.mocked(Clarity.setTag).mockImplementation(() => { throw new Error('failed'); });

      expect(() => setTag('key', 'value')).not.toThrow();

      vi.unstubAllEnvs();
    });
  });
});
