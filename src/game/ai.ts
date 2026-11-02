import { legalMoves, other, playMove, sideSeeds } from './engine';
import type { GameState, Player } from './engine';
export type Difficulty = 'discovery' | 'strategist' | 'expert';
const depths: Record<Difficulty, number> = { discovery: 1, strategist: 4, expert: 7 };
function evaluate(state: GameState, player: Player) {
  const enemy = other(player);
  if (state.status === 'finished')
    return state.winner === null
      ? 0
      : state.winner === player
        ? 100000 - state.ply
        : -100000 + state.ply;
  return (
    (state.scores[player] - state.scores[enemy]) * 30 +
    (sideSeeds(state.board, player) - sideSeeds(state.board, enemy)) * 0.3 +
    (state.board.slice(player * 7, player * 7 + 7).filter((n) => n > 0).length -
      state.board.slice(enemy * 7, enemy * 7 + 7).filter((n) => n > 0).length) *
      2
  );
}
/** Iterative deepening and alpha-beta run in a dedicated worker, with a hard time budget. */
export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
  budgetMs = 750,
): number | null {
  const moves = legalMoves(state);
  if (!moves.length) return null;
  const player = state.current;
  const deadline = performance.now() + budgetMs;
  const timeout = Symbol('timeout');
  function search(node: GameState, depth: number, alpha: number, beta: number): number {
    if (performance.now() > deadline) throw timeout;
    if (depth === 0 || node.status === 'finished') return evaluate(node, player);
    const maximizing = node.current === player;
    let best = maximizing ? -Infinity : Infinity;
    const next = legalMoves(node)
      .map((pit) => playMove(node, pit))
      .sort((a, b) => (b.lastMove?.captured ?? 0) - (a.lastMove?.captured ?? 0));
    for (const child of next) {
      const score = search(child, depth - 1, alpha, beta);
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let selected = moves[0];
  for (let depth = 1; depth <= depths[difficulty]; depth++) {
    let best = -Infinity,
      candidate = selected;
    try {
      for (const pit of [selected, ...moves.filter((x) => x !== selected)]) {
        const score = search(playMove(state, pit), depth - 1, -Infinity, Infinity);
        if (score > best) {
          best = score;
          candidate = pit;
        }
      }
      selected = candidate;
    } catch (error) {
      if (error !== timeout) throw error;
      break;
    }
  }
  return selected;
}
