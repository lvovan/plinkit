import type { MusicManager, MusicTrack } from '@/types/contracts';

/**
 * Manages two procedural looping music tracks (lobby + gameplay)
 * with crossfade transitions and independent mute control.
 *
 * Uses a look-ahead step-sequencer scheduling pattern against
 * AudioContext.currentTime for sample-accurate timing.
 *
 * Audio bus routing:
 *   destination (masterGain) → musicGain → lobbyGain → [lobby sources]
 *                                        → gameplayGain → [gameplay sources]
 */
export class GameMusicManager implements MusicManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private lobbyGain: GainNode | null = null;
  private gameplayGain: GainNode | null = null;
  private currentTrack: MusicTrack | null = null;
  private muted = false;
  private volume = 0.3;
  private initialized = false;
  private timeScale = 1.0;

  // Scheduler state
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private readonly scheduleAheadTime = 0.1; // seconds to look ahead
  private readonly schedulerInterval = 25; // ms between scheduler ticks

  // Lobby track state
  private lobbyBeatIndex = 0;
  // Gameplay track state
  private gameplayBeatIndex = 0;

  // Tempo in seconds per beat
  private readonly lobbyBeatDuration = 60 / 65; // ~65 BPM
  private readonly gameplayBeatDuration = 60 / 130; // ~130 BPM

  init(ctx: AudioContext, destination: AudioNode): void {
    if (this.initialized) return;
    this.ctx = ctx;

    // musicGain → destination (masterGain)
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.muted ? 0 : this.volume;
    this.musicGain.connect(destination);

    // Per-track gain buses for crossfading
    this.lobbyGain = ctx.createGain();
    this.lobbyGain.gain.value = 0;
    this.lobbyGain.connect(this.musicGain);

    this.gameplayGain = ctx.createGain();
    this.gameplayGain.gain.value = 0;
    this.gameplayGain.connect(this.musicGain);

    this.initialized = true;
  }

  startTrack(track: MusicTrack): void {
    if (!this.ctx || !this.initialized) return;

    this.stopScheduler();
    this.currentTrack = track;

    // Set gains immediately
    if (this.lobbyGain && this.gameplayGain) {
      this.lobbyGain.gain.value = track === 'lobby' ? 1 : 0;
      this.gameplayGain.gain.value = track === 'gameplay' ? 1 : 0;
    }

    this.lobbyBeatIndex = 0;
    this.gameplayBeatIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.startScheduler();
  }

  crossfadeTo(track: MusicTrack, durationMs = 1500): void {
    if (!this.ctx || !this.initialized) return;
    if (this.currentTrack === track) return;
    if (!this.currentTrack) {
      this.startTrack(track);
      return;
    }

    const now = this.ctx.currentTime;
    const duration = durationMs / 1000;

    if (this.lobbyGain && this.gameplayGain) {
      if (track === 'lobby') {
        this.gameplayGain.gain.setValueAtTime(this.gameplayGain.gain.value, now);
        this.gameplayGain.gain.linearRampToValueAtTime(0, now + duration);
        this.lobbyGain.gain.setValueAtTime(this.lobbyGain.gain.value, now);
        this.lobbyGain.gain.linearRampToValueAtTime(1, now + duration);
      } else {
        this.lobbyGain.gain.setValueAtTime(this.lobbyGain.gain.value, now);
        this.lobbyGain.gain.linearRampToValueAtTime(0, now + duration);
        this.gameplayGain.gain.setValueAtTime(this.gameplayGain.gain.value, now);
        this.gameplayGain.gain.linearRampToValueAtTime(1, now + duration);
      }
    }

    this.currentTrack = track;

    // Reset beat index for new track
    if (track === 'lobby') {
      this.lobbyBeatIndex = 0;
    } else {
      this.gameplayBeatIndex = 0;
    }
  }

  stop(): void {
    this.stopScheduler();
    this.currentTrack = null;
    if (this.lobbyGain) this.lobbyGain.gain.value = 0;
    if (this.gameplayGain) this.gameplayGain.gain.value = 0;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && !this.muted) {
      this.musicGain.gain.value = this.volume;
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.musicGain) {
      this.musicGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(2.0, scale));
  }

  // ---- Scheduler ----

  private startScheduler(): void {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => this.schedulerTick(), this.schedulerInterval);
  }

  private stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private schedulerTick(): void {
    if (!this.ctx) return;
    const deadline = this.ctx.currentTime + this.scheduleAheadTime;

    while (this.nextNoteTime < deadline) {
      if (this.currentTrack === 'lobby' || (this.lobbyGain && this.lobbyGain.gain.value > 0)) {
        this.scheduleLobbyBeat(this.nextNoteTime);
      }
      if (this.currentTrack === 'gameplay' || (this.gameplayGain && this.gameplayGain.gain.value > 0)) {
        this.scheduleGameplayBeat(this.nextNoteTime);
      }

      // Advance based on current track tempo, scaled by timeScale
      const beatDuration = this.currentTrack === 'gameplay'
        ? this.gameplayBeatDuration
        : this.lobbyBeatDuration;
      this.nextNoteTime += beatDuration / this.timeScale;
    }
  }

  // ---- Lobby Track (~65 BPM, calm pads + sparse melody) ----

  private scheduleLobbyBeat(time: number): void {
    if (!this.ctx || !this.lobbyGain) return;
    const beat = this.lobbyBeatIndex % 16; // 16-beat loop (4 bars)

    // Pad chord — sustained on beats 0, 4, 8, 12
    if (beat % 4 === 0) {
      this.playPadChord(time, this.lobbyGain);
    }

    // Sparse melody — pentatonic notes on select beats
    const melodyPattern = [0, -1, -1, 4, -1, 7, -1, -1, 2, -1, -1, 5, -1, -1, 9, -1];
    const melodyNote = melodyPattern[beat];
    if (melodyNote >= 0) {
      this.playMelodyNote(time, melodyNote, this.lobbyGain, 0.08, 0.8);
    }

    this.lobbyBeatIndex++;
  }

  private playPadChord(time: number, dest: GainNode): void {
    if (!this.ctx) return;
    // Cmaj7 chord: C4=262, E4=330, G4=392, B4=494
    const freqs = [262, 330, 392, 494].map(f => f * Math.pow(this.timeScale, 0.5));
    const duration = (this.lobbyBeatDuration * 4) / this.timeScale; // sustain for 4 beats, stretched

    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.04, time);
      gain.gain.setValueAtTime(0.04, time + duration * 0.8);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + duration);
    }

    // Add triangle layer for warmth
    for (const freq of [262, 392].map(f => f * Math.pow(this.timeScale, 0.5))) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.025, time);
      gain.gain.linearRampToValueAtTime(0, time + duration);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + duration);
    }
  }

  // ---- Gameplay Track (~130 BPM, pentatonic melody + bass + percussion) ----

  private scheduleGameplayBeat(time: number): void {
    if (!this.ctx || !this.gameplayGain) return;
    const beat = this.gameplayBeatIndex % 16; // 16-beat loop (2 bars at 130 BPM)

    // Bass: root-fifth pattern on quarter notes (every 2 8th-note beats)
    if (beat % 2 === 0) {
      const bassNotes = [131, 131, 196, 196, 131, 131, 196, 196]; // C3=131, G3=196
      this.playBassNote(time, bassNotes[(beat / 2) % bassNotes.length], this.gameplayGain);
    }

    // Melody: 8th-note pentatonic pattern
    const melodyPattern = [0, 2, 4, 3, 1, 3, 2, 0, 4, 3, 1, 0, 2, 4, 3, 1];
    this.playMelodyNote(time, melodyPattern[beat], this.gameplayGain, 0.1, 0.3);

    // Percussion: hi-hat on every beat, kick on beats 0, 4, 8, 12
    this.playHiHat(time, this.gameplayGain);
    if (beat % 4 === 0) {
      this.playKick(time, this.gameplayGain);
    }

    this.gameplayBeatIndex++;
  }

  private playBassNote(time: number, freq: number, dest: GainNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const duration = (this.gameplayBeatDuration * 1.8) / this.timeScale;
    const shiftedFreq = freq * Math.pow(this.timeScale, 0.5);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(shiftedFreq, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + duration);
  }

  private playMelodyNote(
    time: number,
    noteIndex: number,
    dest: GainNode,
    volume: number,
    duration: number,
  ): void {
    if (!this.ctx) return;
    const pentatonic = [523, 587, 659, 784, 880]; // C5, D5, E5, G5, A5
    const freq = pentatonic[noteIndex % pentatonic.length] * Math.pow(this.timeScale, 0.5);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const stretchedDuration = duration / this.timeScale;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.linearRampToValueAtTime(0, time + stretchedDuration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + stretchedDuration + 0.01);
  }

  private playHiHat(time: number, dest: GainNode): void {
    if (!this.ctx) return;
    // Filtered noise burst for hi-hat feel
    const duration = 0.04 / this.timeScale;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(time);
    source.stop(time + duration);
  }

  private playKick(time: number, dest: GainNode): void {
    if (!this.ctx) return;
    // Low sine thud for kick feel
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const dur = 0.15 / this.timeScale;
    const startFreq = 150 * Math.pow(this.timeScale, 0.5);
    const endFreq = 40 * Math.pow(this.timeScale, 0.5);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.1 / this.timeScale);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur);
  }
}
