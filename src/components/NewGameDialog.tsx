import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Sparkles, Users } from 'lucide-react';
import Modal from './Modal';
import { exportSession, newSession } from '../lib/storage';
import type { Session } from '../lib/storage';
import type { Difficulty } from '../game/ai';
import { levels } from '../game/config';
export default function NewGameDialog({
  session,
  onClose,
  onStart,
}: {
  session: Session;
  onClose: () => void;
  onStart: (session: Session) => void;
}) {
  const [draftMode, setDraftMode] = useState<Session['mode']>(session.mode);
  const [draftLevel, setDraftLevel] = useState<Difficulty>(session.difficulty);
  const [draftNames, setDraftNames] = useState<[string, string]>([
    session.names[0],
    session.mode === 'local' ? session.names[1] : 'Joueur 2',
  ]);
  function startGame(event: FormEvent) {
    event.preventDefault();
    const names: [string, string] = [
      draftNames[0].trim() || 'Vous',
      draftMode === 'solo' ? 'Esprit Songo' : draftNames[1].trim() || 'Joueur 2',
    ];
    onStart(newSession(draftMode, draftLevel, names));
  }
  return (
    <Modal title="Une nouvelle histoire" onClose={onClose}>
      <form onSubmit={startGame}>
        <p className="modal-description">
          Choisissez votre partenaire et faites parler les graines.
        </p>
        <div className="mode-options">
          {(['solo', 'local'] as const).map((mode) => (
            <button
              type="button"
              className={`mode-option ${draftMode === mode ? 'chosen' : ''}`}
              aria-pressed={draftMode === mode}
              key={mode}
              onClick={() => setDraftMode(mode)}
            >
              {mode === 'solo' ? <Sparkles size={23} /> : <Users size={23} />}
              <strong>{mode === 'solo' ? 'En solo' : 'À deux'}</strong>
              <span>{mode === 'solo' ? 'Face à l’ordinateur' : 'Sur le même appareil'}</span>
              {draftMode === mode && <Check size={16} className="chosen-check" />}
            </button>
          ))}
        </div>
        <label className="form-label">
          {draftMode === 'solo' ? 'Votre prénom' : 'Joueur du camp sud'}
          <input
            maxLength={24}
            value={draftNames[0]}
            onChange={(e) => setDraftNames([e.target.value, draftNames[1]])}
            placeholder="Votre prénom"
          />
        </label>
        {draftMode === 'local' ? (
          <label className="form-label">
            Joueur du camp nord
            <input
              maxLength={24}
              value={draftNames[1]}
              onChange={(e) => setDraftNames([draftNames[0], e.target.value])}
              placeholder="Joueur 2"
            />
          </label>
        ) : (
          <fieldset className="level-options">
            <legend>Votre rythme</legend>
            {(Object.keys(levels) as Difficulty[]).map((level) => (
              <label key={level} className={draftLevel === level ? 'chosen' : ''}>
                <input
                  type="radio"
                  name="difficulty"
                  value={level}
                  checked={draftLevel === level}
                  onChange={() => setDraftLevel(level)}
                />
                <span>
                  <strong>{levels[level].label}</strong>
                  <small>{levels[level].text}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {session.moves.length > 0 && (
          <p className="form-warning">
            Cette nouvelle partie remplacera le plateau actuel.{' '}
            <button type="button" className="text-button" onClick={() => exportSession(session)}>
              Exporter d’abord
            </button>
          </p>
        )}
        <button type="submit" className="primary-button full-width">
          C’est parti <ArrowRight size={17} />
        </button>
      </form>
    </Modal>
  );
}
