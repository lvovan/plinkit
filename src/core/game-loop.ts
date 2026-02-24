/**
 * Fixed-timestep game loop with accumulator pattern.
 *
 * Calls `onStep()` at a fixed rate (default 1/60s) regardless of
 * display refresh rate, using the classic "fix your timestep" pattern.
 * Also provides an interpolation alpha for smooth rendering.
 */
export interface GameLoopCallbacks {
  /** Called once per fixed-timestep tick */
  onStep(): void;
  /** Called once per animation frame with interpolation alpha [0,1) */
  onRender(alpha: number): void;
}

export class GameLoop {
  private fixedTimestep: number;     // seconds per physics tick
  private maxFrameTime: number;      // clamp input dt to avoid spiral of death
  private maxStepsPerFrame: number;  // safety cap

  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private callbacks: GameLoopCallbacks;

  constructor(
    callbacks: GameLoopCallbacks,
    fixedTimestep = 1 / 60,
    maxFrameTime = 0.25,    // 250 ms
    maxStepsPerFrame = 4,
  ) {
    this.callbacks = callbacks;
    this.fixedTimestep = fixedTimestep;
    this.maxFrameTime = maxFrameTime;
    this.maxStepsPerFrame = maxStepsPerFrame;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private tick = (nowMs: number): void => {
    if (!this.running) return;

    const now = nowMs / 1000;
    let frameTime = now - this.lastTime;
    this.lastTime = now;

    // Clamp to avoid spiral of death (e.g., after tab switch)
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime;
    }

    this.accumulator += frameTime;

    let steps = 0;
    while (this.accumulator >= this.fixedTimestep && steps < this.maxStepsPerFrame) {
      this.callbacks.onStep();
      this.accumulator -= this.fixedTimestep;
      steps++;
    }

    // Interpolation alpha for smooth rendering between physics states
    const alpha = this.accumulator / this.fixedTimestep;
    this.callbacks.onRender(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}
