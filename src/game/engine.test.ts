import { describe, expect, it } from 'vitest';
import { createGame, legalMoves, playMove, replay, sowingPath } from './engine';
import type { GameState, Player } from './engine';
function position(board: number[], current: Player = 0): GameState {
  const remaining = 70 - board.reduce((a, b) => a + b, 0);
  return {
    ...createGame(),
    board,
    current,
    scores: [Math.floor(remaining / 2), Math.ceil(remaining / 2)],
  };
}
describe('Songo Ekang rules', () => {
  it('starts with 70 seeds, 14 pits and 7 available moves', () => {
    const game = createGame();
    expect(game.board).toEqual(Array(14).fill(5));
    expect(legalMoves(game)).toHaveLength(7);
  });
  it('sows clockwise, never mutating the input', () => {
    const game = createGame(),
      next = playMove(game, 2);
    expect(next.board.slice(2, 8)).toEqual([0, 6, 6, 6, 6, 6]);
    expect(game.board).toEqual(Array(14).fill(5));
    expect(next.current).toBe(1);
  });
  it('rejects empty, enemy, noninteger and finished moves', () => {
    expect(() => playMove(createGame(), 9)).toThrow();
    expect(() => playMove(createGame(), 1.5)).toThrow();
    const empty = createGame();
    empty.board[0] = 0;
    expect(() => playMove(empty, 0)).toThrow();
    expect(legalMoves({ ...createGame(), status: 'finished' })).toEqual([]);
  });
  it('sows only in the enemy camp after a complete lap', () => {
    expect(sowingPath(3, 23)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 1, 2, 7, 8, 9, 10, 11, 12, 13, 7, 8, 9,
    ]);
    expect(sowingPath(12, 15)).toEqual([13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]);
  });
  it('captures chains of 2, 3, 4 including the first pit when reached backwards', () => {
    const game = position([5, 5, 5, 5, 5, 5, 3, 1, 2, 3, 5, 5, 5, 5]);
    const next = playMove(game, 6);
    expect(next.lastMove?.captured).toBe(9);
    expect(next.lastMove?.capturedPits).toEqual([9, 8, 7]);
    expect(next.board.slice(7, 10)).toEqual([0, 0, 0]);
  });
  it('protects the first enemy pit from a normal direct capture', () => {
    const game = position([5, 5, 5, 5, 5, 2, 0, 2, 5, 5, 5, 5, 5, 5]);
    const next = playMove(game, 5);
    expect(next.board[7]).toBe(3);
    expect(next.lastMove?.captured).toBe(0);
  });
  it('captures only the final seed after a long sowing ends in the first enemy pit', () => {
    const game = position([14, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    const next = playMove(game, 0);
    expect(next.lastMove?.captured).toBe(1);
    expect(next.board[7]).toBe(5);
  });
  it('cancels a capture which would empty the enemy camp', () => {
    const game = position([9, 9, 9, 8, 8, 8, 3, 1, 1, 1, 0, 0, 0, 0]);
    const next = playMove(game, 6);
    expect(next.lastMove?.captured).toBe(0);
    expect(next.board.slice(7, 10)).toEqual([2, 2, 2]);
  });
  it('requires feeding at least seven seeds when possible', () => {
    const game = position([20, 15, 9, 6, 5, 4, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(legalMoves(game)).toEqual([0, 1]);
  });
  it('otherwise requires the move which feeds the maximum number of seeds', () => {
    const game = position([5, 6, 8, 6, 5, 4, 3, 0, 0, 0, 0, 0, 0, 0]);
    expect(legalMoves(game)).toEqual([2]);
  });
  it('prevents playing one or two seeds from the last own pit when other moves exist', () => {
    const game = position([5, 5, 5, 5, 5, 5, 2, 5, 5, 5, 5, 5, 5, 5]);
    expect(legalMoves(game)).not.toContain(6);
  });
  it('allows the restricted pit when solidarity forces it', () => {
    const game = position([5, 5, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(legalMoves(game)).toEqual([6]);
    expect(playMove(game, 6).lastMove?.gifted).toBe(2);
  });
  it('gives the opponent the last pit seeds if no alternative exists', () => {
    const game = position([0, 0, 0, 0, 0, 0, 2, 8, 8, 8, 8, 8, 8, 8]);
    const next = playMove(game, 6);
    expect(next.lastMove?.gifted).toBe(2);
    expect(next.scores[1]).toBe(game.scores[1] + 2);
  });
  it('settles remaining seeds and reports a draw if neither reaches 40', () => {
    const game = position([0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 0, 0, 0, 0]);
    const next = playMove(game, 6);
    expect(next.status).toBe('finished');
    expect(next.winner).toBe(null);
    expect(next.scores.reduce((a, b) => a + b, 0)).toBe(70);
    expect(next.board.every((n) => n === 0)).toBe(true);
  });
  it('settles the camps if feeding becomes impossible', () => {
    const game = position([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12], 1);
    const next = playMove(game, 13); // long enough to feed: verify general invariant
    expect(next.board.reduce((a, b) => a + b, 0) + next.scores[0] + next.scores[1]).toBe(70);
    const blocked = position([5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 1);
    const end = playMove(blocked, 13);
    expect(end.status).toBe('finished');
    expect(end.reason).toBe('starvation');
  });
  it('ends on a third repeated position and enforces the move limit', () => {
    const game = createGame(),
      after = playMove(game, 0);
    const key = after.positions.at(-1)!;
    game.positions = [key, key];
    expect(playMove(game, 0).reason).toBe('repetition');
    expect(playMove({ ...createGame(), ply: 599 }, 0).reason).toBe('move-limit');
  });
  it('declares a winner at 40 and settles all remaining seeds', () => {
    const game = {
      ...createGame(),
      board: [3, 3, 3, 3, 3, 3, 3, 1, 2, 3, 1, 1, 1, 1],
      scores: [39, 0] as [number, number],
    };
    const next = playMove(game, 6);
    expect(next.status).toBe('finished');
    expect(next.reason).toBe('target');
    expect(next.winner).toBe(0);
    expect(next.scores[0] + next.scores[1]).toBe(70);
    expect(next.board.every((n) => n === 0)).toBe(true);
  });
  it('replays validated moves exactly and refuses oversized histories', () => {
    const moves = [2, 9, 1, 8];
    const states = replay(moves);
    expect(states).toHaveLength(5);
    expect(states[4].ply).toBe(4);
    expect(() => replay([13])).toThrow();
    expect(() => replay(Array(601).fill(0))).toThrow();
  });
  it('conserves every seed and terminates across 60 deterministic full games', () => {
    let random = 7231;
    const rng = () => {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      return random / 2 ** 32;
    };
    for (let game = 0; game < 60; game++) {
      let state = createGame();
      while (state.status === 'playing') {
        const moves = legalMoves(state);
        expect(moves.length).toBeGreaterThan(0);
        state = playMove(state, moves[Math.floor(rng() * moves.length)]);
        expect(state.board.reduce((a, b) => a + b, 0) + state.scores[0] + state.scores[1]).toBe(70);
        expect(state.board.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
      }
      expect(state.ply).toBeLessThanOrEqual(600);
    }
  });
});
