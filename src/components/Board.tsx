import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Leaf, Sparkles, X } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { legalMoves, pitLabel, playMove, sideSeeds } from '../game/engine';
import type { GameState } from '../game/engine';
import type { Playback } from '../hooks/useMoveAnimation';
interface Props {
  state: GameState;
  names: [string, string];
  enabled: boolean;
  hint: number | null;
  selected: number | null;
  coordinates: boolean;
  onPlay: (pit: number) => void;
  onSelect: (pit: number | null) => void;
  thinking: boolean;
  replaying: boolean;
  playback: Playback | null;
  animating: boolean;
}
function Seeds({ count, dark }: { count: number; dark?: boolean }) {
  return (
    <span className={`seeds ${dark ? 'seeds-dark' : ''}`} aria-hidden="true">
      {Array.from({ length: Math.min(count, 14) }, (_, i) => {
        const angle = i * 2.39996,
          radius = Math.sqrt(i) * 5.8;
        return (
          <i
            key={i}
            style={
              {
                '--x': `${Math.cos(angle) * radius}px`,
                '--y': `${Math.sin(angle) * radius * 0.65}px`,
                '--r': `${i * 59 - 30}deg`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
function FlyingSeed({
  playback,
  area,
}: {
  playback: Playback;
  area: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const { frame } = playback;
    if (!frame.to || !area.current || !ref.current) return;
    const from = area.current.querySelector(`[data-pit="${frame.from}"]`);
    const to = area.current.querySelector(
      'pit' in frame.to ? `[data-pit="${frame.to.pit}"]` : `[data-score="${frame.to.score}"]`,
    );
    if (!from || !to) return;
    const origin = area.current.getBoundingClientRect();
    const a = from.getBoundingClientRect(),
      b = to.getBoundingClientRect();
    const x1 = a.left + a.width / 2 - origin.left,
      y1 = a.top + a.height / 2 - origin.top;
    const x2 = b.left + b.width / 2 - origin.left,
      y2 = b.top + b.height / 2 - origin.top;
    const animation = ref.current.animate(
      [
        { transform: `translate(${x1}px, ${y1}px) scale(1.15)`, opacity: 1 },
        {
          transform: `translate(${(x1 + x2) / 2}px, ${(y1 + y2) / 2 - 22}px) scale(1.35)`,
          opacity: 1,
          offset: 0.5,
        },
        { transform: `translate(${x2}px, ${y2}px) scale(0.85)`, opacity: 1 },
      ],
      { duration: frame.duration, easing: 'cubic-bezier(.3,.05,.55,1)', fill: 'forwards' },
    );
    return () => animation.cancel();
  }, [playback, area]);
  return (
    <span
      ref={ref}
      className={`flying-seed ${playback.frame.phase === 'capture' ? 'flying-capture' : ''}`}
      aria-hidden="true"
    />
  );
}
export default function Board({
  state,
  names,
  enabled,
  hint,
  selected,
  coordinates,
  onPlay,
  onSelect,
  thinking,
  replaying,
  playback,
  animating,
}: Props) {
  const area = useRef<HTMLDivElement>(null);
  const legal = legalMoves(state);
  const preview = enabled && selected !== null && legal.includes(selected) ? selected : null;
  const prediction = useMemo(
    () => (preview === null ? null : playMove(state, preview).lastMove),
    [state, preview],
  );
  const landing = prediction?.path.at(-1);
  const phase = playback?.frame.phase;
  const activePit =
    playback?.frame.to && 'pit' in playback.frame.to ? playback.frame.to.pit : playback?.frame.from;
  const last = state.lastMove;
  function select(pit: number) {
    if (!enabled || !legal.includes(pit)) return;
    if (preview === pit) onPlay(pit);
    else onSelect(pit);
  }
  const renderPit = (pit: number) => {
    const canPlay = enabled && legal.includes(pit);
    const isSelected = preview === pit;
    const route = prediction?.path.includes(pit);
    return (
      <div className={`pit-wrap ${pit < 7 ? 'south-pit' : 'north-pit'}`} key={pit}>
        {coordinates && (
          <span className="coordinate" aria-hidden="true">
            {pitLabel(pit)}
          </span>
        )}
        <button
          className={`pit ${canPlay ? 'pit-playable' : ''} ${isSelected ? 'pit-selected' : ''} ${hint === pit ? 'pit-hint' : ''} ${route ? 'pit-route' : ''} ${landing === pit ? 'pit-landing' : ''} ${activePit === pit ? 'pit-sowing' : ''} ${!animating && last?.pit === pit ? 'pit-origin' : ''}`}
          onClick={() => select(pit)}
          disabled={!canPlay}
          data-pit={pit}
          aria-pressed={isSelected}
          aria-label={`${names[pit < 7 ? 0 : 1]}, case ${pitLabel(pit)}, ${state.board[pit]} graines${hint === pit ? ', conseil' : ''}${isSelected ? ', sélectionnée, activer pour semer' : ''}`}
        >
          <Seeds count={state.board[pit]} dark={pit < 7} />
          <span className="pit-count">{state.board[pit]}</span>
          {hint === pit && <Sparkles size={14} className="hint-star" />}
          {landing === pit && <span className="landing-dot" aria-hidden="true" />}
        </button>
      </div>
    );
  };
  const player = (side: 0 | 1) => (
    <div
      className={`player-line ${side === 0 ? 'bottom-player' : ''} ${state.current === side && state.status === 'playing' ? 'player-active' : ''}`}
    >
      <div className={`avatar ${side === 0 ? 'avatar-you' : 'avatar-ai'}`}>
        {side === 0 ? names[0].slice(0, 1).toLocaleUpperCase() : <Sparkles size={19} />}
      </div>
      <div className="player-name">
        <strong>
          {names[side]} <span className="you-badge">{side === 0 ? 'SUD' : 'NORD'}</span>
        </strong>
        <span>
          {animating && state.current === side
            ? 'Semis en cours…'
            : thinking && side === 1
              ? 'Prépare son prochain coup…'
              : state.current === side && state.status === 'playing'
                ? 'À vous de jouer'
                : 'En attente du prochain tour'}
        </span>
      </div>
      <span className="camp-count">
        {sideSeeds(state.board, side)} <Leaf size={13} />
      </span>
      <div className="player-score" data-score={side}>
        <strong>{state.scores[side]}</strong>
        <span>/ 40</span>
      </div>
    </div>
  );
  let message = replaying
    ? 'Relecture du plateau · reprenez la partie pour jouer.'
    : state.status === 'finished'
      ? 'La partie est terminée. Prêt pour la revanche ?'
      : animating
        ? phase === 'capture'
          ? 'Récolte ! Les graines rejoignent votre score.'
          : phase === 'gift'
            ? 'Don de graines au camp adverse.'
            : phase === 'collect'
              ? 'Dernière récolte : on compte les scores.'
              : `Semis en cours · ${playback?.frame.hand ?? 0} graines en main`
        : thinking
          ? 'L’ordinateur prépare sa stratégie…'
          : 'Touchez une case de votre camp, puis semez.';
  if (preview !== null)
    message = `Case ${pitLabel(preview)} · ${state.board[preview]} graines${prediction?.captured ? ` · ${prediction.captured} à récolter` : prediction?.gifted ? ' · don au camp adverse' : ' · parcours en lumière'}`;
  return (
    <div className={`board-area ${animating ? 'board-busy' : ''}`} ref={area} aria-busy={animating}>
      {player(1)}
      <div className="wood-board" aria-label="Plateau de Songo, deux camps de sept cases">
        <div className="board-carving">
          S O N G O <span>◇</span>
        </div>
        <div className="portrait-camps" aria-hidden="true">
          <span>
            NORD <ArrowUp size={12} />
          </span>
          <span>
            SUD <ArrowDown size={12} />
          </span>
        </div>
        <div className="sowing-direction top-direction">
          <span>SEMER</span>
          <ArrowRight size={21} />
        </div>
        <div className="board-grid">
          <div
            className="store store-north"
            aria-label={`Grenier nord : ${state.scores[1]} graines`}
          >
            <Seeds count={Math.min(state.scores[1], 14)} />
            <b>{state.scores[1]}</b>
          </div>
          <div className="pit-rows">
            <div className="pit-row north-row">{[7, 8, 9, 10, 11, 12, 13].map(renderPit)}</div>
            <div className="board-divider" aria-hidden="true">
              <span>◇</span>
              <span>◇</span>
              <span>◇</span>
            </div>
            <div className="pit-row south-row">{[6, 5, 4, 3, 2, 1, 0].map(renderPit)}</div>
          </div>
          <div
            className="store store-south"
            aria-label={`Grenier sud : ${state.scores[0]} graines`}
          >
            <Seeds count={Math.min(state.scores[0], 14)} dark />
            <b>{state.scores[0]}</b>
          </div>
        </div>
        <div className="sowing-direction bottom-direction">
          <ArrowLeft size={21} />
          <span>SEMER</span>
        </div>
      </div>
      {player(0)}
      <div className={`move-dock ${preview !== null ? 'move-ready' : ''}`}>
        <div className="board-caption" role="status">
          <span className={`status-dot ${thinking || animating ? 'pulse' : ''}`} />
          <span>{message}</span>
        </div>
        {preview !== null && (
          <div className="selection-actions">
            <button
              className="icon-button"
              aria-label="Annuler la sélection"
              onClick={() => onSelect(null)}
            >
              <X size={18} />
            </button>
            <button className="primary-button sow-button" onClick={() => onPlay(preview)}>
              Semer {state.board[preview]} graines <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>
      {playback?.frame.to && (
        <FlyingSeed key={`${state.ply}-${playback.step}`} playback={playback} area={area} />
      )}
    </div>
  );
}
