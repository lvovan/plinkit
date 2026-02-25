/**
 * SFX factory functions using native Web Audio API synthesis.
 * Each function creates fire-and-forget OscillatorNode + GainNode combinations
 * that self-destruct after playing. No persistent state needed.
 *
 * Recipes from research.md — all durations and frequencies tuned for
 * a playful Plinko game feel.
 */

/**
 * Helper: pitch-shift a frequency by timeScale.
 * freq × timeScale^0.5 — proportional pitch shift during slow-motion.
 */
function pitchShift(freq: number, timeScale?: number): number {
  if (!timeScale || timeScale === 1.0) return freq;
  return freq * Math.pow(timeScale, 0.5);
}

/**
 * Helper: stretch a duration by 1/timeScale for slow-motion.
 */
function stretchDuration(duration: number, timeScale?: number): number {
  if (!timeScale || timeScale === 1.0) return duration;
  return duration / timeScale;
}

/**
 * Drop sound: sine sweep 200→60 Hz with fast decay.
 * ~200ms, percussive "clunk" feel.
 */
export function playDrop(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const dur = stretchDuration(0.2, timeScale);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitchShift(200, timeScale), now);
  osc.frequency.exponentialRampToValueAtTime(pitchShift(60, timeScale), now + stretchDuration(0.15, timeScale));

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + dur);
}

/**
 * Pin hit: short triangle/sine ping at ~800–1200 Hz.
 * ~50ms, with optional ±15% pitch variation for natural feel.
 */
export function playPinHit(
  ctx: AudioContext,
  destination: AudioNode,
  pitchVariation?: number,
  timeScale?: number,
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const dur = stretchDuration(0.06, timeScale);

  const baseFreq = 1000;
  let freq = baseFreq;
  if (pitchVariation) {
    const variation = pitchVariation;
    freq = baseFreq * (1 + (Math.random() * 2 - 1) * variation);
  }
  freq = pitchShift(freq, timeScale);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + stretchDuration(0.05, timeScale));

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + dur);
}

/**
 * Shove whoosh: white noise through bandpass filter with frequency sweep.
 * ~200ms, creates a "whoosh" effect.
 */
export function playShove(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const duration = stretchDuration(0.2, timeScale);

  // Create white noise buffer
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.linearRampToValueAtTime(3000, now + duration * 0.7);
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.linearRampToValueAtTime(0.01, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(now);
  source.stop(now + duration);
}

/**
 * Bucket land: rising pentatonic arpeggio (C5→E5→G5→C6).
 * ~300ms, celebratory chime feel.
 */
export function playBucketLand(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  // C pentatonic arpeggio: C5=523, E5=659, G5=784, C6=1047
  const notes = [523, 659, 784, 1047].map(f => pitchShift(f, timeScale));
  const noteInterval = stretchDuration(0.07, timeScale);
  const noteDuration = stretchDuration(0.12, timeScale);

  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startTime = now + i * noteInterval;
    osc.frequency.setValueAtTime(notes[i], startTime);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + noteDuration);
  }
}

/**
 * Winner fanfare: major chord arpeggio (C4→E4→G4→C5) + sustained chord.
 * ~1500ms total.
 */
export function playWinner(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  // C major arpeggio → sustained chord
  const arpeggioNotes = [262, 330, 392, 523].map(f => pitchShift(f, timeScale));
  const arpeggioInterval = stretchDuration(0.15, timeScale);
  const totalDur = stretchDuration(1.5, timeScale);

  // Arpeggio phase
  for (let i = 0; i < arpeggioNotes.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startTime = now + i * arpeggioInterval;
    osc.frequency.setValueAtTime(arpeggioNotes[i], startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.setValueAtTime(0.2, startTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + totalDur);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(now + totalDur);
  }

  // Sustained chord (all notes together)
  const chordStart = now + arpeggioNotes.length * arpeggioInterval;
  for (const freq of arpeggioNotes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, chordStart);

    gain.gain.setValueAtTime(0.12, chordStart);
    gain.gain.exponentialRampToValueAtTime(0.01, now + totalDur);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(chordStart);
    osc.stop(now + totalDur);
  }
}

/**
 * Tick: short sine blip at ~1000 Hz.
 * ~20ms, used for timer countdown.
 */
export function playTick(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const dur = stretchDuration(0.03, timeScale);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitchShift(1000, timeScale), now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + stretchDuration(0.02, timeScale));

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + dur);
}

/**
 * Timeout: square wave at ~150 Hz with slight vibrato via LFO.
 * ~500ms, "buzzer" feel for turn expiration.
 */
export function playTimeout(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const dur = stretchDuration(0.5, timeScale);

  // Main tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(pitchShift(150, timeScale), now);

  // LFO for vibrato
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(8, now); // 8 Hz vibrato
  lfoGain.gain.setValueAtTime(10, now); // ±10 Hz depth
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.setValueAtTime(0.2, now + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + dur);
  lfo.stop(now + dur);
}

/**
 * Jackpot bucket: triumphant rising arpeggio + sparkle shimmer.
 * Plays when the puck lands in the center (highest-scoring) bucket.
 * ~800ms, bright celebratory cascade with harmonic overtones.
 */
export function playJackpotBucket(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;

  // Rapid rising arpeggio: C5→E5→G5→B5→C6→E6
  const notes = [523, 659, 784, 988, 1047, 1319].map(f => pitchShift(f, timeScale));
  const noteInterval = stretchDuration(0.06, timeScale);
  const noteDuration = stretchDuration(0.25, timeScale);

  // Rising arpeggio with increasing brightness
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * noteInterval;

    osc.type = i < 3 ? 'sine' : 'triangle'; // brighter on upper notes
    osc.frequency.setValueAtTime(notes[i], startTime);

    const volume = 0.18 + i * 0.02; // crescendo
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + noteDuration);
  }

  // Sparkle shimmer: high-frequency sine blips
  const shimmerStart = now + notes.length * noteInterval;
  const shimmerFreqs = [2093, 2637, 3136, 2093].map(f => pitchShift(f, timeScale)); // C7, E7, G7, C7
  const shimmerInterval = stretchDuration(0.05, timeScale);
  const shimmerDuration = stretchDuration(0.15, timeScale);

  for (let i = 0; i < shimmerFreqs.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = shimmerStart + i * shimmerInterval;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(shimmerFreqs[i], t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + shimmerDuration);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + shimmerDuration);
  }
}

/**
 * AutoShove: low "thunk" at ~150 Hz.
 * ~100ms, distinct from manual shove sound. Indicates auto-nudge of stuck puck.
 */
export function playAutoShove(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const dur = stretchDuration(0.1, timeScale);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitchShift(150, timeScale), now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + dur);
}

/**
 * CoinDing: metallic "ding" with two inharmonic sine tones.
 * 2400 Hz + 3800 Hz (ratio ~1.583:1), ~150ms.
 * Plays alongside bucketLand for satisfying score feedback.
 */
export function playCoinDing(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const dur = stretchDuration(0.15, timeScale);

  // Layer 1: fundamental "ding" at 2400 Hz
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(pitchShift(2400, timeScale), now);
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + dur);
  osc1.connect(gain1);
  gain1.connect(destination);
  osc1.start(now);
  osc1.stop(now + dur);

  // Layer 2: inharmonic overtone at 3800 Hz — faster decay for metallic timbre
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(pitchShift(3800, timeScale), now);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + stretchDuration(0.1, timeScale));
  osc2.connect(gain2);
  gain2.connect(destination);
  osc2.start(now);
  osc2.stop(now + dur);
}

/**
 * T041: Puck growth pop sound — sine sweep 200→800 Hz + noise burst.
 * ~60ms, bubbly "pop" feel with brief white noise for texture.
 */
export function playPuckGrowth(ctx: AudioContext, destination: AudioNode, timeScale?: number): void {
  const now = ctx.currentTime;
  const dur = stretchDuration(0.06, timeScale);

  // Layer 1: sine sweep 200→800 Hz
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitchShift(200, timeScale), now);
  osc.frequency.exponentialRampToValueAtTime(pitchShift(800, timeScale), now + dur * 0.8);
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + dur);

  // Layer 2: brief noise burst for texture
  const bufferSize = Math.ceil(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.15;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.2, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + dur);
  noise.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(now);
  noise.stop(now + dur);
}
