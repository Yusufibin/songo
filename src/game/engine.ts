/** Pure, deterministic Songo engine. Board indices follow the clockwise sowing path. */
export type Player = 0 | 1;
export type EndReason = 'target' | 'few-seeds' | 'starvation' | 'repetition' | 'move-limit';
export interface Move {
  player: Player;
  pit: number;
  seeds: number;
  path: number[];
  capturedPits: number[];
  captured: number;
  gifted: number;
}
export interface GameState {
  board: number[];
  scores: [number, number];
  current: Player;
  ply: number;
  status: 'playing' | 'finished';
  winner: Player | null;
  reason: EndReason | null;
  lastMove: Move | null;
  positions: string[];
}
export const TOTAL_SEEDS = 70;
export const VICTORY_SEEDS = 40;
export const other = (player: Player): Player => (player === 0 ? 1 : 0);
export const owner = (pit: number): Player => (pit < 7 ? 0 : 1);
export const pitsOf = (player: Player) => Array.from({ length: 7 }, (_, i) => player * 7 + i);
export const sideSeeds = (board: readonly number[], player: Player) =>
  pitsOf(player).reduce((n, i) => n + board[i], 0);
const keyOf = (state: Pick<GameState, 'board' | 'scores' | 'current'>) =>
  `${state.current}:${state.board.join(',')}:${state.scores.join(',')}`;
export function createGame(): GameState {
  const state: GameState = {
    board: Array(14).fill(5),
    scores: [0, 0],
    current: 0,
    ply: 0,
    status: 'playing',
    winner: null,
    reason: null,
    lastMove: null,
    positions: [],
  };
  state.positions = [keyOf(state)];
  return state;
}
export function sowingPath(pit: number, seeds: number): number[] {
  const path: number[] = [];
  let cursor = pit;
  // One full lap, omitting the origin. Further seeds go exclusively to the opponent.
  for (let i = 0; i < Math.min(seeds, 13); i++) {
    cursor = (cursor + 1) % 14;
    path.push(cursor);
  }
  const enemyStart = other(owner(pit)) * 7;
  for (let i = 13; i < seeds; i++) path.push(enemyStart + ((i - 13) % 7));
  return path;
}
function isGift(state: GameState, pit: number) {
  return pit === state.current * 7 + 6 && state.board[pit] < 3;
}
export function legalMoves(state: GameState): number[] {
  if (state.status !== 'playing') return [];
  const occupied = pitsOf(state.current).filter((i) => state.board[i] > 0);
  const usual = occupied.filter((i) => !isGift(state, i));
  const enemy = other(state.current);
  if (sideSeeds(state.board, enemy) > 0) return usual.length ? usual : occupied;
  const feeds = occupied
    .map((pit) => ({
      pit,
      count: isGift(state, pit)
        ? state.board[pit]
        : sowingPath(pit, state.board[pit]).filter((i) => owner(i) === enemy).length,
    }))
    .filter((x) => x.count > 0);
  // Solidarity can force the restricted last pit even if other occupied pits cannot feed.
  const usualFeeds = feeds.filter((x) => !isGift(state, x.pit));
  const candidates = usualFeeds.length ? usualFeeds : feeds;
  const max = Math.max(0, ...candidates.map((x) => x.count));
  if (max === 0) return [];
  return candidates.filter((x) => (max >= 7 ? x.count >= 7 : x.count === max)).map((x) => x.pit);
}
function finish(state: GameState, reason: EndReason): GameState {
  for (const player of [0, 1] as const) {
    state.scores[player] += sideSeeds(state.board, player);
  }
  state.board.fill(0);
  state.status = 'finished';
  state.reason = reason;
  state.winner =
    reason === 'repetition' || reason === 'move-limit'
      ? null
      : state.scores[0] >= VICTORY_SEEDS
        ? 0
        : state.scores[1] >= VICTORY_SEEDS
          ? 1
          : null;
  return state;
}
export function playMove(previous: GameState, pit: number): GameState {
  if (!Number.isInteger(pit) || !legalMoves(previous).includes(pit))
    throw new Error('Ce coup est interdit.');
  const state: GameState = {
    ...previous,
    board: [...previous.board],
    scores: [...previous.scores],
    positions: [...previous.positions],
    ply: previous.ply + 1,
  };
  const player = state.current,
    enemy = other(player),
    seeds = state.board[pit];
  const move: Move = { player, pit, seeds, path: [], capturedPits: [], captured: 0, gifted: 0 };
  state.board[pit] = 0;
  if (isGift(previous, pit)) {
    move.gifted = seeds;
    state.scores[enemy] += seeds;
  } else {
    move.path = sowingPath(pit, seeds);
    move.path.forEach((i) => state.board[i]++);
    const end = move.path.at(-1)!;
    const firstEnemy = enemy * 7;
    const captures: number[] = [];
    if (end === firstEnemy && seeds > 13) {
      // The special long-sowing capture takes only the final seed.
      if (sideSeeds(state.board, enemy) > 1) {
        state.board[end]--;
        state.scores[player]++;
        move.captured = 1;
        move.capturedPits = [end];
      }
    } else if (owner(end) === enemy && end !== firstEnemy) {
      for (let i = end; i >= firstEnemy && state.board[i] >= 2 && state.board[i] <= 4; i--)
        captures.push(i);
      const count = captures.reduce((n, i) => n + state.board[i], 0);
      // A capture that would empty the entire enemy camp is cancelled.
      if (count < sideSeeds(state.board, enemy)) {
        move.captured = count;
        move.capturedPits = captures;
        captures.forEach((i) => (state.board[i] = 0));
        state.scores[player] += count;
      }
    }
  }
  state.lastMove = move;
  state.current = enemy;
  if (state.scores.some((n) => n >= VICTORY_SEEDS)) return finish(state, 'target');
  if (state.board.reduce((a, b) => a + b, 0) < 10) return finish(state, 'few-seeds');
  // An empty player hands the turn back to the player required to feed them.
  if (sideSeeds(state.board, state.current) === 0) state.current = other(state.current);
  if (legalMoves(state).length === 0) return finish(state, 'starvation');
  const key = keyOf(state);
  state.positions.push(key);
  if (state.positions.filter((x) => x === key).length >= 3) return finish(state, 'repetition');
  if (state.ply >= 600) return finish(state, 'move-limit');
  return state;
}
export function replay(moves: readonly number[]): GameState[] {
  if (moves.length > 600) throw new Error('La partie dépasse 600 coups.');
  const states = [createGame()];
  for (const move of moves) states.push(playMove(states.at(-1)!, move));
  return states;
}
export const pitLabel = (pit: number) => `${owner(pit) === 0 ? 'S' : 'N'}${(pit % 7) + 1}`;
