import { chooseMove } from './ai';
import type { Difficulty } from './ai';
import type { GameState } from './engine';
self.onmessage = (event: MessageEvent<{ state: GameState; difficulty: Difficulty }>) => {
  self.postMessage(chooseMove(event.data.state, event.data.difficulty));
};
