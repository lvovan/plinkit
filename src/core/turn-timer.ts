/**
 * Turn timer with configurable duration.
 * Counts down each second and fires callbacks.
 */
export class TurnTimer {
  private totalSeconds: number;
  private remaining: number;
  private onTick: (secondsRemaining: number) => void;
  private onExpiry: () => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    totalSeconds: number,
    onTick: (secondsRemaining: number) => void,
    onExpiry: () => void,
  ) {
    this.totalSeconds = totalSeconds;
    this.remaining = totalSeconds;
    this.onTick = onTick;
    this.onExpiry = onExpiry;
  }

  start(): void {
    this.stop();
    this.remaining = this.totalSeconds;
    this.running = true;
    this.onTick(this.remaining);

    this.intervalId = setInterval(() => {
      if (!this.running) return;

      this.remaining--;
      this.onTick(this.remaining);

      if (this.remaining <= 0) {
        this.stop();
        this.onExpiry();
      }
    }, 1000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.stop();
    this.remaining = this.totalSeconds;
  }

  getRemaining(): number {
    return this.remaining;
  }

  isActive(): boolean {
    return this.running;
  }
}
