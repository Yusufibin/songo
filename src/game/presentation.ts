import { owner } from './engine';
import type { GameState, Player } from './engine';

export type Destination = { pit: number } | { score: Player };
export interface MoveFrame {
  board: number[];
  scores: [number, number];
  phase: 'pickup' | 'sow' | 'capture' | 'gift' | 'collect';
  hand: number;
  from: number;
  to?: Destination;
  duration: number;
}

/** Presentation only. The engine remains the sole authority for legal moves. */
export function moveFrames(previous: GameState, next: GameState): MoveFrame[] {
  const move = next.lastMove!;
  const board = [...previous.board];
  const scores: [number, number] = [...previous.scores];
  const frames: MoveFrame[] = [];
  const add = (frame: Omit<MoveFrame, 'board' | 'scores'>) =>
    frames.push({ ...frame, board: [...board], scores: [...scores] });
  board[move.pit] = 0;
  add({ phase: 'pickup', hand: move.seeds, from: move.pit, duration: 140 });
  if (move.gifted) {
    const recipient = move.player === 0 ? 1 : 0;
    scores[recipient] += move.gifted;
    add({ phase: 'gift', hand: 0, from: move.pit, to: { score: recipient }, duration: 300 });
  } else {
    move.path.forEach((pit, index) => {
      board[pit]++;
      add({
        phase: 'sow',
        hand: move.seeds - index - 1,
        from: index ? move.path[index - 1] : move.pit,
        to: { pit },
        duration: Math.max(45, Math.min(150, 1800 / move.seeds)),
      });
    });
    let remaining = move.captured;
    for (const pit of move.capturedPits) {
      // The long-sowing rule can capture just one seed from a non-empty pit.
      const count = Math.min(board[pit], remaining);
      board[pit] -= count;
      scores[move.player] += count;
      remaining -= count;
      add({ phase: 'capture', hand: 0, from: pit, to: { score: move.player }, duration: 260 });
    }
  }
  if (next.status === 'finished') {
    for (let pit = 0; pit < board.length; pit++) {
      if (!board[pit]) continue;
      scores[owner(pit)] += board[pit];
      board[pit] = 0;
      add({ phase: 'collect', hand: 0, from: pit, to: { score: owner(pit) }, duration: 70 });
    }
  }
  return frames;
}
