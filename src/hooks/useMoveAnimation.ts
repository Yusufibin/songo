import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameState } from '../game/engine';
import { moveFrames } from '../game/presentation';
import type { MoveFrame } from '../game/presentation';
import { playSound } from '../lib/sound';

export interface Playback {
  frame: MoveFrame;
  step: number;
  total: number;
}

function follows(previous: GameState, next: GameState) {
  return (
    next.ply === previous.ply + 1 &&
    next.lastMove?.player === previous.current &&
    previous.positions.every((key, i) => next.positions[i] === key)
  );
}

export function useMoveAnimation(
  state: GameState,
  sessionId: string,
  replaying: boolean,
  active: boolean,
  motion: boolean,
  sound: boolean,
) {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [visual, setVisual] = useState(state);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const previous = useRef({ state, sessionId, replaying });
  const soundEnabled = useRef(sound);
  soundEnabled.current = sound;
  const canAnimate = motion && !reduced && !hidden && active && !replaying;
  const pending =
    previous.current.state !== state &&
    canAnimate &&
    previous.current.sessionId === sessionId &&
    !previous.current.replaying &&
    follows(previous.current.state, state);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    const visibility = () => setHidden(document.hidden);
    query.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query.removeEventListener('change', change);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { state, sessionId, replaying };
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    if (
      !canAnimate ||
      before.sessionId !== sessionId ||
      before.replaying ||
      !follows(before.state, state) ||
      !state.lastMove
    ) {
      setVisual(state);
      setPlayback(null);
      if (
        soundEnabled.current &&
        active &&
        !replaying &&
        !before.replaying &&
        before.sessionId === sessionId &&
        follows(before.state, state)
      )
        playSound(!!state.lastMove?.captured);
      return;
    }
    const frames = moveFrames(before.state, state);
    // Keep the previous player's turn visible until their last seed has landed.
    setVisual(before.state);
    let index = 0;
    const advance = () => {
      if (cancelled) return;
      if (index === frames.length) {
        setVisual(state);
        setPlayback(null);
        return;
      }
      const frame = frames[index];
      setPlayback({ frame, step: index, total: frames.length });
      timer = setTimeout(() => {
        if (cancelled) return;
        setVisual({ ...before.state, board: frame.board, scores: frame.scores });
        if (soundEnabled.current && frame.to) playSound(frame.phase === 'capture');
        index++;
        timer = setTimeout(advance, 35);
      }, frame.duration);
    };
    advance();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, sessionId, replaying, canAnimate]);

  return {
    visual: canAnimate && (pending || playback) ? visual : state,
    playback: canAnimate ? playback : null,
    animating: !!(canAnimate && (pending || playback)),
  };
}
