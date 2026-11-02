import { ArrowLeft, ArrowRight, Leaf, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import { legalMoves, pitLabel, sideSeeds } from '../game/engine';
import type { GameState } from '../game/engine';
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
}
function Seeds({ count, dark }: { count: number; dark?: boolean }) {
  return (
    <span className={`seeds ${dark ? 'seeds-dark' : ''}`} aria-hidden="true">
      {Array.from({ length: Math.min(count, 14) }, (_, i) => {
        const angle = i * 2.39996,
          radius = Math.sqrt(i) * 7.2;
        return (
          <i
            key={i}
            style={
              {
                '--x': `${Math.cos(angle) * radius}px`,
                '--y': `${Math.sin(angle) * radius * 0.7}px`,
                '--r': `${i * 59 - 30}deg`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
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
}: Props) {
  const legal = legalMoves(state);
  const last = state.lastMove;
  const preview = selected !== null && legal.includes(selected) ? selected : hint;
  const renderPit = (pit: number) => {
    const canPlay = enabled && legal.includes(pit),
      highlighted = hint === pit;
    const touched = last?.path.includes(pit) || last?.pit === pit;
    return (
      <div className="pit-wrap" key={pit}>
        {coordinates && pit < 7 && <span className="coordinate">{pitLabel(pit)}</span>}
        <button
          className={`pit ${canPlay ? 'pit-playable' : ''} ${highlighted ? 'pit-hint' : ''} ${last?.pit === pit ? 'pit-origin' : ''} ${touched ? 'pit-touched' : ''}`}
          onClick={() => onPlay(pit)}
          disabled={!canPlay}
          data-pit={pit}
          aria-label={`${names[pit < 7 ? 0 : 1]}, case ${pitLabel(pit)}, ${state.board[pit]} graines${highlighted ? ', conseil' : ''}`}
          onMouseEnter={() => canPlay && onSelect(pit)}
          onMouseLeave={() => onSelect(null)}
          onFocus={() => canPlay && onSelect(pit)}
          onBlur={() => onSelect(null)}
        >
          <Seeds count={state.board[pit]} dark={pit < 7} />
          <span className="pit-count">{state.board[pit]}</span>
          {highlighted && <Sparkles size={14} className="hint-star" />}
        </button>
        {coordinates && pit >= 7 && <span className="coordinate">{pitLabel(pit)}</span>}
      </div>
    );
  };
  return (
    <div className="board-area">
      <div
        className={`player-line ${state.current === 1 && state.status === 'playing' ? 'player-active' : ''}`}
      >
        <div className="avatar avatar-ai">
          <Sparkles size={19} />
        </div>
        <div className="player-name">
          <strong>{names[1]}</strong>
          <span>{thinking ? 'Réfléchit à son prochain coup…' : 'Camp nord'}</span>
        </div>
        <span className="camp-count">
          {sideSeeds(state.board, 1)} <Leaf size={13} />
        </span>
        <div className="player-score">
          <strong>{state.scores[1]}</strong>
          <span>graines</span>
        </div>
      </div>
      <div className="wood-board" aria-label="Plateau de Songo, 2 rangées de 7 cases">
        <div className="board-carving">
          S O N G O <span>◇</span>
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
            <div className="pit-row">{[7, 8, 9, 10, 11, 12, 13].map(renderPit)}</div>
            <div className="board-divider">
              <span>◇</span>
              <span>◇</span>
              <span>◇</span>
            </div>
            <div className="pit-row">{[6, 5, 4, 3, 2, 1, 0].map(renderPit)}</div>
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
      <div
        className={`player-line bottom-player ${state.current === 0 && state.status === 'playing' ? 'player-active' : ''}`}
      >
        <div className="avatar avatar-you">{names[0].slice(0, 1).toLocaleUpperCase()}</div>
        <div className="player-name">
          <strong>
            {names[0]} <span className="you-badge">SUD</span>
          </strong>
          <span>
            {state.current === 0 && state.status === 'playing' && !replaying
              ? 'À vous de semer'
              : 'Camp sud'}
          </span>
        </div>
        <span className="camp-count">
          {sideSeeds(state.board, 0)} <Leaf size={13} />
        </span>
        <div className="player-score">
          <strong>{state.scores[0]}</strong>
          <span>graines</span>
        </div>
      </div>
      <div className="board-caption">
        <span className={`status-dot ${thinking ? 'pulse' : ''}`} />
        <span>
          {replaying
            ? 'Vous consultez un coup de l’historique.'
            : state.status === 'finished'
              ? 'La partie est terminée. Prêt pour la revanche ?'
              : thinking
                ? 'Laissez votre adversaire préparer sa stratégie.'
                : preview !== null
                  ? `Case ${pitLabel(preview)} : ${state.board[preview]} graines à semer.`
                  : 'Choisissez une case de votre camp pour semer ses graines.'}
        </span>
      </div>
    </div>
  );
}
