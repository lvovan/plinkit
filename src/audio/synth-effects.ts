/**
 * SFX factory functions using native Web Audio API synthesis.
 * Each function creates fire-and-forget OscillatorNode + GainNode combinations
 * that self-destruct after playing. No persistent state needed.
 *
 * Recipes from research.md — all durations and frequencies tuned for
 * a playful Plinko game feel.
 */

/**
 * Drop sound: sine sweep 200→60 Hz with fast decay.
 * ~200ms, percussive "clunk" feel.
 */
export function playDrop(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Pin hit: short triangle/sine ping at ~800–1200 Hz.
 * ~50ms, with optional ±15% pitch variation for natural feel.
 */
export function playPinHit(
  ctx: AudioContext,
  destination: AudioNode,
  pitchVariation?: number,
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const baseFreq = 1000;
  let freq = baseFreq;
  if (pitchVariation) {
    const variation = pitchVariation;
    freq = baseFreq * (1 + (Math.random() * 2 - 1) * variation);
  }

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * Shove whoosh: white noise through bandpass filter with frequency sweep.
 * ~200ms, creates a "whoosh" effect.
 */
export function playShove(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const duration = 0.2;

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
export function playBucketLand(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  // C pentatonic arpeggio: C5=523, E5=659, G5=784, C6=1047
  const notes = [523, 659, 784, 1047];
  const noteInterval = 0.07;
  const noteDuration = 0.12;

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
export function playWinner(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  // C major arpeggio → sustained chord
  const arpeggioNotes = [262, 330, 392, 523]; // C4, E4, G4, C5
  const arpeggioInterval = 0.15;

  // Arpeggio phase
  for (let i = 0; i < arpeggioNotes.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startTime = now + i * arpeggioInterval;
    osc.frequency.setValueAtTime(arpeggioNotes[i], startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.setValueAtTime(0.2, startTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(startTime);
    osc.stop(now + 1.5);
  }

  // Sustained chord (all notes together)
  const chordStart = now + arpeggioNotes.length * arpeggioInterval;
  for (const freq of [262, 330, 392, 523]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, chordStart);

    gain.gain.setValueAtTime(0.12, chordStart);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(chordStart);
    osc.stop(now + 1.5);
  }
}

/**
 * Tick: short sine blip at ~1000 Hz.
 * ~20ms, used for timer countdown.
 */
export function playTick(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

/**
 * Timeout: square wave at ~150 Hz with slight vibrato via LFO.
 * ~500ms, "buzzer" feel for turn expiration.
 */
export function playTimeout(ctx: AudioContext, destination: AudioNode): void {
  const now = ctx.currentTime;

  // Main tone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(150, now);

  // LFO for vibrato
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(8, now); // 8 Hz vibrato
  lfoGain.gain.setValueAtTime(10, now); // ±10 Hz depth
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.setValueAtTime(0.2, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + 0.5);
  lfo.stop(now + 0.5);
}
