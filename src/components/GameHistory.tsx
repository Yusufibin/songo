import { useEffect, useRef } from 'react';
import { History } from 'lucide-react';
import type { GameState } from '../game/engine';
import { pitLabel } from '../game/engine';
export default function GameHistory({
  states,
  replayIndex,
  onReplay,
  saved,
}: {
  states: GameState[];
  replayIndex: number | null;
  onReplay: (index: number) => void;
  saved: boolean;
}) {
  const historyEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (historyEnd.current) historyEnd.current.scrollTop = historyEnd.current.scrollHeight;
  }, [states.length]);
  const rounds = Array.from({ length: states.length - 1 }, (_, i) => i);
  return (
    <section className="history-card">
      <div className="section-card-title">
        <h3>Le fil de la partie</h3>
        <History size={17} />
      </div>
      <div className="history-columns">
        <span>TOUR</span>
        <span>SUD</span>
        <span>NORD</span>
      </div>
      <div className="history-list" ref={historyEnd}>
        {states.length === 1 && (
          <div className="history-empty">
            <span className="empty-seeds">⠿</span>
            <p>
              L’histoire commence
              <br />
              avec votre premier coup.
            </p>
          </div>
        )}
        {rounds.map((round) => (
          <div className="history-row" key={round}>
            <span>{String(round + 1).padStart(2, '0')}</span>
            {[0, 1].map((column) => {
              const index = round;
              const move = states[index + 1]?.lastMove;
              return move && move.player === column ? (
                <button
                  key={column}
                  className={replayIndex === index + 1 ? 'history-selected' : ''}
                  onClick={() => onReplay(index + 1)}
                  aria-label={`Revoir le coup ${index + 1}, ${pitLabel(move.pit)}`}
                >
                  <span>{pitLabel(move.pit)}</span>
                  {move.captured > 0 && <small>+{move.captured}</small>}
                </button>
              ) : (
                <span key={column}>—</span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="history-footer">
        <span className="status-dot" />
        {saved ? 'Partie sauvegardée sur cet appareil' : 'Sauvegarde indisponible'}
      </div>
    </section>
  );
}
