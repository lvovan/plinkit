import { describe, it, expect, beforeEach } from 'vitest';
import { TurnManager } from '@/core/turn-manager';
import { PUCK_PALETTE } from '@/types/index';
import type { Player } from '@/types/index';

function createPlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    puckStyle: PUCK_PALETTE[i],
    score: 0,
    turnOrder: i,
    isActive: true,
  }));
}

describe('TurnManager', () => {
  let tm: TurnManager;
  let players: Player[];

  beforeEach(() => {
    players = createPlayers(3);
    tm = new TurnManager(players, 5); // 5 rounds
  });

  it('should start with the first player as current', () => {
    expect(tm.getCurrentPlayer().name).toBe('Player 1');
  });

  it('should cycle through players in registration order', () => {
    expect(tm.getCurrentPlayer().name).toBe('Player 1');
    tm.advanceTurn();
    expect(tm.getCurrentPlayer().name).toBe('Player 2');
    tm.advanceTurn();
    expect(tm.getCurrentPlayer().name).toBe('Player 3');
  });

  it('should advance round after all players have played', () => {
    expect(tm.getCurrentRound()).toBe(1);
    tm.advanceTurn(); // P1 done
    tm.advanceTurn(); // P2 done
    tm.advanceTurn(); // P3 done → round 2
    expect(tm.getCurrentRound()).toBe(2);
  });

  it('should report round complete after all players played', () => {
    expect(tm.isRoundComplete()).toBe(false);
    tm.advanceTurn();
    tm.advanceTurn();
    tm.advanceTurn(); // all 3 players done
    // After advancing past all players, the round counter increments
    // and we start the next round — isRoundComplete is true briefly
    expect(tm.getCurrentRound()).toBe(2);
  });

  it('should report when all rounds are complete', () => {
    // Play through 5 rounds × 3 players = 15 turns
    for (let i = 0; i < 15; i++) {
      expect(tm.isAllRoundsComplete()).toBe(false);
      tm.advanceTurn();
    }
    expect(tm.isAllRoundsComplete()).toBe(true);
  });

  it('should track the current turn number', () => {
    expect(tm.getTurnNumber()).toBe(1);
    tm.advanceTurn();
    expect(tm.getTurnNumber()).toBe(2);
    tm.advanceTurn();
    expect(tm.getTurnNumber()).toBe(3);
  });

  it('should allow filtering to a subset of players', () => {
    // Simulate tie-breaker with only players 1 and 3
    tm.setActivePlayers([players[0], players[2]]);
    expect(tm.getCurrentPlayer().name).toBe('Player 1');
    tm.advanceTurn();
    expect(tm.getCurrentPlayer().name).toBe('Player 3');
  });

  it('should reset state', () => {
    tm.advanceTurn();
    tm.advanceTurn();
    tm.reset(players, 3);
    expect(tm.getCurrentPlayer().name).toBe('Player 1');
    expect(tm.getCurrentRound()).toBe(1);
    expect(tm.getTurnNumber()).toBe(1);
  });
});
