import type { SpriteMap } from '@/types/contracts';

/**
 * Audio sprite map configuration.
 * Maps sound names to offset/duration pairs within the audio sprite sheet.
 * 
 * These values should be updated to match the actual audio sprite sheet
 * once final audio assets are produced.
 */
export const AUDIO_SPRITE_MAP: SpriteMap = {
  drop:       { offset: 0.0,  duration: 0.4 },
  pinHit:     { offset: 0.5,  duration: 0.15 },
  shove:      { offset: 0.8,  duration: 0.3 },
  bucketLand: { offset: 1.2,  duration: 0.5 },
  winner:     { offset: 1.8,  duration: 2.0 },
  tick:       { offset: 4.0,  duration: 0.1 },
  timeout:    { offset: 4.2,  duration: 0.6 },
};

/** URL to the audio sprite sheet (OGG with MP3 fallback) */
export const AUDIO_SPRITE_URL = 'assets/audio/sprites.ogg';
export const AUDIO_SPRITE_URL_FALLBACK = 'assets/audio/sprites.mp3';
