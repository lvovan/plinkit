import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateMachine } from '@/core/state-machine';
import { DEFAULT_GAME_CONFIG } from '@/config/game-config';
import { PUCK_PALETTE } from '@/types/index';
import type { PlayerRegistration, TurnResult } from '@/types/contracts';

function makePlayers(n: number): PlayerRegistration[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    puckStyle: PUCK_PALETTE[i],
  }));
}

function makeTurnResult(bucketIndex: number, scoreEarned: number): TurnResult {
  return {
    dropPositionX: 0,
    shoves: [],
    bucketIndex,
    scoreEarned,
    wasTimeout: false,
  };
}

describe('GameStateMachine', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine();
  });

  describe('startSession()', () => {
    it('should create a session with the correct number of players', () => {
      const session = sm.startSession(makePlayers(3), DEFAULT_GAME_CONFIG);
      expect(session.players.length).toBe(3);
      expect(session.phase).toBe('playing');
      expect(session.currentRound).toBe(1);
    });

    it('should assign puck styles from registrations', () => {
      const regs = makePlayers(2);
      const session = sm.startSession(regs, DEFAULT_GAME_CONFIG);
      expect(session.players[0].puckStyle.color).toBe(PUCK_PALETTE[0].color);
      expect(session.players[1].puckStyle.color).toBe(PUCK_PALETTE[1].color);
    });
  });

  describe('startTurn()', () => {
    it('should return the correct turn context for the first player', () => {
      sm.startSession(makePlayers(2), DEFAULT_GAME_CONFIG);
      const ctx = sm.startTurn();
      expect(ctx.player.name).toBe('Player 1');
      expect(ctx.turnNumber).toBe(1);
      expect(ctx.roundNumber).toBe(1);
      expect(ctx.shovesRemaining).toBe(DEFAULT_GAME_CONFIG.shoveConfig.maxShovesPerTurn);
    });
  });

  describe('completeTurn()', () => {
    it('should update player score after completing a turn', () => {
      sm.startSession(makePlayers(2), DEFAULT_GAME_CONFIG);
      sm.startTurn();
      sm.completeTurn(makeTurnResult(4, 10000));
      const state = sm.getState();
      expect(state.players[0].score).toBe(10000);
    });

    it('should advance to next player after completing a turn', () => {
      sm.startSession(makePlayers(2), DEFAULT_GAME_CONFIG);
      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));
      const ctx = sm.startTurn();
      expect(ctx.player.name).toBe('Player 2');
    });
  });

  describe('evaluateRoundEnd()', () => {
    it('should return nextRound when more rounds remain', () => {
      const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 3 };
      sm.startSession(makePlayers(2), config);

      // Complete round 1 (2 players = 2 turns)
      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));
      sm.startTurn();
      sm.completeTurn(makeTurnResult(4, 10000));

      const action = sm.evaluateRoundEnd();
      expect(action.type).toBe('nextRound');
    });

    it('should declare a winner after the final round', () => {
      const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
      sm.startSession(makePlayers(2), config);

      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));
      sm.startTurn();
      sm.completeTurn(makeTurnResult(4, 10000));

      const action = sm.evaluateRoundEnd();
      expect(action.type).toBe('winner');
      if (action.type === 'winner') {
        expect(action.winner.name).toBe('Player 2');
      }
    });

    it('should detect a tie after the final round', () => {
      const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
      sm.startSession(makePlayers(2), config);

      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));
      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));

      const action = sm.evaluateRoundEnd();
      expect(action.type).toBe('tieBreaker');
      if (action.type === 'tieBreaker') {
        expect(action.tiedPlayers.length).toBe(2);
      }
    });
  });

  describe('resetForReplay()', () => {
    it('should reset scores and rounds but keep players', () => {
      const config = { ...DEFAULT_GAME_CONFIG, totalRounds: 1 };
      sm.startSession(makePlayers(2), config);
      sm.startTurn();
      sm.completeTurn(makeTurnResult(4, 10000));
      sm.startTurn();
      sm.completeTurn(makeTurnResult(0, 100));

      sm.resetForReplay();
      const state = sm.getState();
      expect(state.players.length).toBe(2);
      expect(state.players[0].score).toBe(0);
      expect(state.currentRound).toBe(1);
      expect(state.phase).toBe('playing');
    });
  });

  describe('resetFull()', () => {
    it('should return to registration phase', () => {
      sm.startSession(makePlayers(2), DEFAULT_GAME_CONFIG);
      sm.resetFull();
      const state = sm.getState();
      expect(state.phase).toBe('registration');
      expect(state.players.length).toBe(0);
    });
  });
});
