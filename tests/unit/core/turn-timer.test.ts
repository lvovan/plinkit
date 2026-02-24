import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TurnTimer } from '@/core/turn-timer';

describe('TurnTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should countdown from configured seconds', () => {
    const onTick = vi.fn();
    const onExpiry = vi.fn();
    const timer = new TurnTimer(15, onTick, onExpiry);

    timer.start();
    expect(onTick).toHaveBeenCalledWith(15);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(14);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(13);
  });

  it('should fire expiry callback at 0', () => {
    const onTick = vi.fn();
    const onExpiry = vi.fn();
    const timer = new TurnTimer(3, onTick, onExpiry);

    timer.start();
    vi.advanceTimersByTime(3000);

    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it('should stop countdown when manually stopped', () => {
    const onTick = vi.fn();
    const onExpiry = vi.fn();
    const timer = new TurnTimer(15, onTick, onExpiry);

    timer.start();
    vi.advanceTimersByTime(3000);
    timer.stop();

    vi.advanceTimersByTime(12000);
    expect(onExpiry).not.toHaveBeenCalled();
    // Tick should have stopped after stop() was called
    const ticksAfterStop = onTick.mock.calls.filter(c => c[0] < 12).length;
    expect(ticksAfterStop).toBe(0);
  });

  it('should reset between turns', () => {
    const onTick = vi.fn();
    const onExpiry = vi.fn();
    const timer = new TurnTimer(15, onTick, onExpiry);

    timer.start();
    vi.advanceTimersByTime(5000);
    timer.reset();

    // After reset, start again
    timer.start();
    expect(onTick).toHaveBeenCalledWith(15); // restarted
  });

  it('should report remaining seconds', () => {
    const onTick = vi.fn();
    const onExpiry = vi.fn();
    const timer = new TurnTimer(15, onTick, onExpiry);

    timer.start();
    vi.advanceTimersByTime(5000);
    expect(timer.getRemaining()).toBe(10);
  });

  it('should not allow shoves after timeout (integrated via callback)', () => {
    let shovesAllowed = true;
    const onExpiry = () => { shovesAllowed = false; };
    const timer = new TurnTimer(15, vi.fn(), onExpiry);

    timer.start();
    expect(shovesAllowed).toBe(true);

    vi.advanceTimersByTime(15000);
    expect(shovesAllowed).toBe(false);
  });
});
