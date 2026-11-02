import { describe, expect, it } from 'vitest';
import { createGame, legalMoves, playMove } from './engine';
import type { GameState } from './engine';
import { moveFrames } from './presentation';
function position(board: number[]): GameState {
  const remaining = 70 - board.reduce((sum, n) => sum + n, 0);
  return { ...createGame(), board, scores: [Math.floor(remaining / 2), Math.ceil(remaining / 2)] };
}
describe('visual move timeline', () => {
  it('picks up the source then deposits one seed at each destination in order', () => {
    const before = createGame(),
      after = playMove(before, 2);
    const frames = moveFrames(before, after);
    expect(frames[0].board[2]).toBe(0);
    expect(frames[0].hand).toBe(5);
    expect(frames.filter((f) => f.phase === 'sow').map((f) => f.to)).toEqual(
      [3, 4, 5, 6, 7].map((pit) => ({ pit })),
    );
    expect(frames.at(-1)?.board).toEqual(after.board);
    expect(before.board).toEqual(Array(14).fill(5));
  });
  it.each([
    [5, 5, 5, 5, 5, 5, 3, 1, 2, 3, 5, 5, 5, 5], // chain
    [14, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // single-seed long capture
    [0, 0, 0, 0, 0, 0, 2, 8, 8, 8, 8, 8, 8, 8], // gift
    [0, 0, 0, 0, 0, 0, 3, 1, 1, 1, 0, 0, 0, 0], // end collection
  ])('ends at the authoritative engine state for special rules: %j', (...board) => {
    const before = position(board);
    const pit = board[0] === 14 ? 0 : 6;
    const after = playMove(before, pit);
    const frames = moveFrames(before, after);
    expect(frames.at(-1)?.board).toEqual(after.board);
    expect(frames.at(-1)?.scores).toEqual(after.scores);
    for (const frame of frames) {
      expect(
        frame.board.reduce((sum, n) => sum + n, frame.hand) + frame.scores[0] + frame.scores[1],
      ).toBe(70);
    }
  });
  it('conserves seeds throughout every visual step of 12 complete games', () => {
    let seed = 7231;
    for (let game = 0; game < 12; game++) {
      let state = createGame();
      while (state.status === 'playing') {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const choices = legalMoves(state),
          next = playMove(state, choices[seed % choices.length]);
        const frames = moveFrames(state, next);
        expect(frames.at(-1)?.board).toEqual(next.board);
        expect(frames.at(-1)?.scores).toEqual(next.scores);
        for (const frame of frames) {
          expect(frame.board.every((n) => n >= 0)).toBe(true);
          expect(
            frame.board.reduce((sum, n) => sum + n, frame.hand) + frame.scores[0] + frame.scores[1],
          ).toBe(70);
        }
        state = next;
      }
    }
  });
});
