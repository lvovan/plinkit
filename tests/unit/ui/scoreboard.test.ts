// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Player } from '@/types/index';
import { PUCK_PALETTE } from '@/types/index';
import { GameHUD } from '@/ui/game-hud';

function makePlayer(id: string, name: string, score: number, turnOrder: number): Player {
  return {
    id,
    name,
    puckStyle: PUCK_PALETTE[turnOrder % PUCK_PALETTE.length],
    score,
    turnOrder,
    isActive: true,
  };
}

/**
 * Helper: get rows sorted by their visual position (translateY value).
 * Since we use absolute positioning + transforms, DOM order doesn't reflect visual order.
 */
function getRowsByVisualOrder(container: HTMLElement): HTMLElement[] {
  const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-player-id]'));
  return rows.sort((a, b) => {
    const yA = parseFloat(a.style.transform.replace(/translateY\((.+)px\)/, '$1') || '0');
    const yB = parseFloat(b.style.transform.replace(/translateY\((.+)px\)/, '$1') || '0');
    return yA - yB;
  });
}

describe('ScoreboardOverlay (via GameHUD)', () => {
  let container: HTMLElement;
  let hud: GameHUD;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    hud = new GameHUD(container);
  });

  afterEach(() => {
    hud.hideScoreboard();
    container.remove();
  });

  describe('Sort Logic — descending score order', () => {
    it('should display players sorted by score descending', () => {
      const players = [
        makePlayer('p1', 'Alice', 100, 0),
        makePlayer('p2', 'Bob', 500, 1),
        makePlayer('p3', 'Charlie', 300, 2),
      ];
      hud.updateScoreboard(players);

      const rows = getRowsByVisualOrder(container);
      expect(rows.length).toBe(3);
      expect(rows[0].getAttribute('data-player-id')).toBe('p2'); // 500
      expect(rows[1].getAttribute('data-player-id')).toBe('p3'); // 300
      expect(rows[2].getAttribute('data-player-id')).toBe('p1'); // 100
    });

    it('should preserve previous relative order for ties (stable sort)', () => {
      const players = [
        makePlayer('p1', 'Alice', 200, 0),
        makePlayer('p2', 'Bob', 200, 1),
        makePlayer('p3', 'Charlie', 200, 2),
      ];
      hud.updateScoreboard(players);

      const rows = getRowsByVisualOrder(container);
      // All tied at 200 — original order preserved
      expect(rows[0].getAttribute('data-player-id')).toBe('p1');
      expect(rows[1].getAttribute('data-player-id')).toBe('p2');
      expect(rows[2].getAttribute('data-player-id')).toBe('p3');
    });

    it('should update and re-sort when scores change', () => {
      const players = [
        makePlayer('p1', 'Alice', 100, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ];
      hud.updateScoreboard(players);

      // Alice now leads
      const updated = [
        makePlayer('p1', 'Alice', 500, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ];
      hud.updateScoreboard(updated);

      const rows = getRowsByVisualOrder(container);
      expect(rows[0].getAttribute('data-player-id')).toBe('p1'); // 500
      expect(rows[1].getAttribute('data-player-id')).toBe('p2'); // 200
    });

    it('should work with no-rank-change updates (scores unchanged)', () => {
      const players = [
        makePlayer('p1', 'Alice', 300, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ];
      hud.updateScoreboard(players);
      hud.updateScoreboard(players); // Same scores again

      const rows = getRowsByVisualOrder(container);
      expect(rows.length).toBe(2);
      expect(rows[0].getAttribute('data-player-id')).toBe('p1');
      expect(rows[1].getAttribute('data-player-id')).toBe('p2');
    });
  });

  describe('Leader highlighting', () => {
    it('should highlight the leading player', () => {
      const players = [
        makePlayer('p1', 'Alice', 500, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ];
      hud.updateScoreboard(players);

      const leaderRow = container.querySelector('[data-player-id="p1"]') as HTMLElement;
      // Leader should have gold color styling
      expect(leaderRow.style.color).toContain('ffd700');
    });
  });

  describe('Persistent DOM (keyed by player ID)', () => {
    it('should reuse row elements on repeated updates', () => {
      const players = [
        makePlayer('p1', 'Alice', 100, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ];
      hud.updateScoreboard(players);
      const firstRow = container.querySelector('[data-player-id="p1"]');

      hud.updateScoreboard([
        makePlayer('p1', 'Alice', 300, 0),
        makePlayer('p2', 'Bob', 200, 1),
      ]);
      const sameRow = container.querySelector('[data-player-id="p1"]');

      // Same DOM element should be reused
      expect(sameRow).toBe(firstRow);
    });
  });

  describe('show/hide lifecycle', () => {
    it('should create scoreboard element on show', () => {
      hud.showScoreboard();
      expect(container.querySelector('.scoreboard')).toBeTruthy();
    });

    it('should remove scoreboard element on hide', () => {
      hud.showScoreboard();
      hud.hideScoreboard();
      expect(container.querySelector('.scoreboard')).toBeFalsy();
    });
  });
});
