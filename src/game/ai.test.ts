import { describe, expect, it } from 'vitest';
import { chooseMove } from './ai';
import { createGame, legalMoves, playMove } from './engine';
describe('worker-independent AI', () => {
  it('chooses a legal move for every difficulty without changing the input', () => {
    const state = createGame();
    const before = JSON.stringify(state);
    for (const difficulty of ['discovery', 'strategist', 'expert'] as const)
      expect(legalMoves(state)).toContain(chooseMove(state, difficulty, 40));
    expect(JSON.stringify(state)).toBe(before);
  });
  it('returns null for finished games', () =>
    expect(chooseMove({ ...createGame(), status: 'finished' }, 'expert')).toBe(null));
  it('respects legal moves through an AI-driven game', () => {
    let state = createGame();
    for (let i = 0; i < 25 && state.status === 'playing'; i++) {
      const move = chooseMove(state, 'strategist', 15)!;
      expect(legalMoves(state)).toContain(move);
      state = playMove(state, move);
    }
  });
});
