import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Plus, Trophy } from 'lucide-react';
import { exportSession } from '../lib/storage';
import type { Session, Result } from '../lib/storage';
import type { GameState } from '../game/engine';
import { levels } from '../game/config';
export default function SavedGames({
  session,
  live,
  results,
  onNew,
  onPlay,
  onImport,
  onClear,
}: {
  session: Session;
  live: GameState;
  results: Result[];
  onNew: () => void;
  onPlay: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  const soloResults = results.filter((r) => r.mode === 'solo');
  const wins = soloResults.filter((r) => r.winner === 0).length;
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">VOTRE PARCOURS</span>
          <h1>
            Chaque partie vous fait grandir<span>.</span>
          </h1>
          <p>Vos parties et vos progrès, conservés sur cet appareil.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Plus size={18} />
          Nouvelle partie
        </button>
      </section>
      <div className="stats-grid">
        <div>
          <span>Parties terminées</span>
          <strong>{results.length}</strong>
        </div>
        <div>
          <span>Victoires en solo</span>
          <strong>{wins}</strong>
        </div>
        <div>
          <span>Réussite en solo</span>
          <strong>
            {soloResults.length ? Math.round((wins / soloResults.length) * 100) : 0}
            <small>%</small>
          </strong>
        </div>
      </div>
      <section className="content-card saved-game">
        <div className="section-card-title">
          <h2>Votre plateau actuel</h2>
          <span className="small-badge">
            {live.status === 'finished' ? 'Terminée' : 'En cours'}
          </span>
        </div>
        <p>
          {session.names.join(' contre ')} · {session.moves.length} coups ·{' '}
          {session.mode === 'solo' ? levels[session.difficulty].label : 'Duel local'}
        </p>
        <div className="saved-actions">
          <button className="primary-button" onClick={onPlay}>
            {live.status === 'finished' ? 'Revoir le plateau' : 'Continuer la partie'}
            <ArrowRight size={16} />
          </button>
          <button className="secondary-button" onClick={() => exportSession(session)}>
            <ArrowDownToLine size={16} />
            Exporter
          </button>
          <button className="secondary-button" onClick={onImport}>
            <ArrowUpFromLine size={16} />
            Importer une partie
          </button>
        </div>
        <p className="muted small">
          Le fichier JSON permet de transférer ou rejouer une partie sur un autre appareil. L’import
          remplace le plateau actuel.
        </p>
      </section>
      <section className="content-card results-card">
        <div className="section-card-title">
          <h2>Vos dernières récoltes</h2>
          <button className="text-button" disabled={!results.length} onClick={onClear}>
            Effacer l’historique
          </button>
        </div>
        {!results.length ? (
          <div className="results-empty">
            <Trophy size={35} strokeWidth={1.2} />
            <h3>Tout reste à jouer.</h3>
            <p>Vos résultats apparaîtront ici à la fin de votre première partie.</p>
          </div>
        ) : (
          <div className="results-table">
            <div className="result-table-head">
              <span>Date</span>
              <span>Mode</span>
              <span>Score</span>
              <span>Résultat</span>
            </div>
            {results.map((result) => (
              <div key={result.id}>
                <span>
                  {new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short' }).format(
                    new Date(result.date),
                  )}
                </span>
                <span>{result.mode === 'solo' ? 'Solo' : 'Duel local'}</span>
                <strong>{result.scores.join(' – ')}</strong>
                <span className={`result-tag ${result.winner === 0 ? 'win' : ''}`}>
                  {result.winner === null
                    ? 'Nulle'
                    : result.mode === 'local'
                      ? `${result.winner === 0 ? 'Sud' : 'Nord'} gagne`
                      : result.winner === 0
                        ? 'Victoire'
                        : 'Défaite'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
