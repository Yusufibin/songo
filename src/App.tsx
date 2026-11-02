import { useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flag,
  Gamepad2,
  History,
  Leaf,
  Lightbulb,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import Board from './components/Board';
import GameHistory from './components/GameHistory';
import NewGameDialog from './components/NewGameDialog';
import SavedGames from './components/SavedGames';
import { levels } from './game/config';
import Modal from './components/Modal';
import Rules from './components/Rules';
import { legalMoves, pitLabel, replay, VICTORY_SEEDS } from './game/engine';
import {
  clearResults,
  loadPreferences,
  loadSession,
  newSession,
  parseSession,
  readResults,
  recordResult,
  savePreferences,
  saveSession,
} from './lib/storage';
import type { Session } from './lib/storage';
import { playSound } from './lib/sound';
type View = 'play' | 'learn' | 'games';
type Dialog = 'new' | 'settings' | 'rules' | 'clear' | null;
const endTexts = {
  target: 'Le seuil de 40 graines a été atteint.',
  'few-seeds': 'Moins de 10 graines restaient en jeu.',
  starvation: 'La solidarité n’était plus possible.',
  repetition: 'La même position est apparue trois fois.',
  'move-limit': 'La limite de 600 coups a été atteinte.',
};
function App() {
  const [session, setSession] = useState<Session>(
    () => loadSession() ?? newSession('solo', 'discovery', ['Vous', 'Esprit Songo']),
  );
  const states = useMemo(() => replay(session.moves), [session.moves]);
  const live = states.at(-1)!;
  const [view, setView] = useState<View>('play');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const state = replayIndex === null ? live : states[Math.min(replayIndex, states.length - 1)];
  const [prefs, setPrefs] = useState(loadPreferences);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<number | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(true);
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [results, setResults] = useState(readResults);
  const hintWorker = useRef<Worker | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const isHuman = session.mode === 'local' || live.current === 0;
  const enabled =
    live.status === 'playing' && isHuman && replayIndex === null && !dialog && !conflict;
  useEffect(() => {
    try {
      saveSession(session);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [session]);
  useEffect(() => {
    if (live.status !== 'finished') return;
    try {
      recordResult({
        id: session.id,
        mode: session.mode,
        winner: live.winner,
        scores: live.scores,
        moves: live.ply,
        date: new Date().toISOString(),
      });
      setResults(readResults());
    } catch {
      setNotice('Le stockage est indisponible. Exportez votre partie pour la conserver.');
    }
  }, [live, session.id, session.mode]);
  useEffect(() => {
    const up = () => setOnline(true),
      down = () => setOnline(false);
    const sync = (event: StorageEvent) => {
      if (event.key === 'songo.session.v2') setConflict(true);
      if (event.key === 'songo.results.v2') setResults(readResults());
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    try {
      savePreferences(prefs);
    } catch {
      /* Session export remains available if storage is blocked. */
    }
    document.documentElement.dataset.motion = prefs.motion ? 'on' : 'off';
  }, [prefs]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    hintWorker.current?.terminate();
    hintWorker.current = null;
    setHint(null);
    setHintBusy(false);
    setSelected(null);
    return () => {
      hintWorker.current?.terminate();
    };
  }, [session.moves, session.id]);
  useEffect(() => {
    if (
      session.mode !== 'solo' ||
      live.current !== 1 ||
      live.status !== 'playing' ||
      replayIndex !== null ||
      dialog ||
      view !== 'play' ||
      conflict
    ) {
      setThinking(false);
      return;
    }
    setThinking(true);
    let timer: ReturnType<typeof setTimeout>;
    const started = performance.now();
    const commit = (pit: number | null) => {
      timer = setTimeout(
        () => {
          if (pit !== null) {
            setSession((current) =>
              current.id === session.id && current.moves.length === session.moves.length
                ? { ...current, moves: [...current.moves, pit] }
                : current,
            );
            if (prefs.sound) playSound();
          }
          setThinking(false);
        },
        Math.max(50, 650 - (performance.now() - started)),
      );
    };
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('./game/ai.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event) => commit(event.data);
      worker.onerror = () => {
        setNotice('Calcul avancé indisponible : l’ordinateur utilise un coup légal.');
        commit(legalMoves(live)[0] ?? null);
      };
      worker.postMessage({ state: live, difficulty: session.difficulty });
    } catch {
      commit(legalMoves(live)[0] ?? null);
    }
    return () => {
      worker?.terminate();
      clearTimeout(timer);
    };
  }, [
    live,
    session.id,
    session.mode,
    session.difficulty,
    session.moves.length,
    replayIndex,
    dialog,
    view,
    conflict,
    prefs.sound,
  ]);
  function openNew() {
    setDialog('new');
  }
  function makeMove(pit: number) {
    if (!enabled || !legalMoves(live).includes(pit)) return;
    if (prefs.sound) playSound();
    setSession((current) => {
      const now = replay(current.moves).at(-1)!;
      return current.id === session.id &&
        legalMoves(now).includes(pit) &&
        (current.mode === 'local' || now.current === 0)
        ? { ...current, moves: [...current.moves, pit] }
        : current;
    });
  }
  function undo() {
    let length = session.moves.length - 1;
    if (session.mode === 'solo') while (length > 0 && states[length].current !== 0) length--;
    setSession((current) => ({ ...current, moves: current.moves.slice(0, Math.max(length, 0)) }));
    setReplayIndex(null);
  }
  function requestHint() {
    if (!enabled || hintBusy) return;
    setHintBusy(true);
    try {
      hintWorker.current = new Worker(new URL('./game/ai.worker.ts', import.meta.url), {
        type: 'module',
      });
      hintWorker.current.onmessage = (event) => {
        setHint(event.data);
        setHintBusy(false);
        hintWorker.current?.terminate();
      };
      hintWorker.current.onerror = () => {
        setNotice('Le conseil n’a pas pu être calculé. Réessayez.');
        setHintBusy(false);
        hintWorker.current?.terminate();
      };
      hintWorker.current.postMessage({ state: live, difficulty: 'expert' });
    } catch {
      setHintBusy(false);
      setNotice('Les conseils nécessitent la prise en charge des Web Workers.');
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 50000) throw new Error('Ce fichier est trop volumineux (50 Ko maximum).');
      const imported = parseSession(JSON.parse(await file.text()));
      setSession(imported);
      setReplayIndex(null);
      setConflict(false);
      setView('play');
      setNotice('Partie importée. Votre plateau est prêt.');
    } catch (error) {
      setNotice(
        error instanceof Error && error.message.startsWith('Ce fichier')
          ? error.message
          : 'Sauvegarde invalide : aucun changement n’a été effectué.',
      );
    }
    if (fileInput.current) fileInput.current.value = '';
  }
  const switchView = (next: View) => {
    setView(next);
    setReplayIndex(null);
  };
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            switchView('play');
          }}
          aria-label="Songo, accueil"
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            songo<span className="brand-period">.</span>
          </span>
        </a>
        <div className="sidebar-kicker">LE JEU QUI NOUS RASSEMBLE</div>
        <nav aria-label="Navigation principale">
          <button
            className={view === 'play' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('play')}
          >
            <Gamepad2 size={19} />
            <span>Jouer</span>
            {view === 'play' && <span className="nav-dot" />}
          </button>
          <button
            className={view === 'learn' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('learn')}
          >
            <BookOpen size={19} />
            <span>Apprendre</span>
          </button>
          <button
            className={view === 'games' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('games')}
          >
            <History size={19} />
            <span>Mes parties</span>
          </button>
        </nav>
        <div className="sidebar-story">
          <div className="story-illustration">
            <Sprout size={38} strokeWidth={1.2} />
            <span>◇</span>
          </div>
          <h3>
            Des racines.
            <br />
            De nouvelles parties.
          </h3>
          <p>Un héritage d’Afrique centrale, à faire vivre à chaque coup.</p>
          <button onClick={() => switchView('learn')}>
            Découvrir le Songo <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setDialog('settings')}>
            <Settings2 size={18} />
            Préférences
          </button>
          <div className="local-profile">
            <div className="avatar avatar-you">{session.names[0][0].toLocaleUpperCase()}</div>
            <div>
              <strong>{session.names[0]}</strong>
              <span>Votre espace local</span>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Un peu de recul. Un coup d’avance.</span>
          <div>
            <span className="local-status">
              <span className="status-dot" />
              {online ? 'Prêt à jouer' : 'Hors ligne'}
            </span>
            <button
              className="icon-button"
              onClick={() => setDialog('settings')}
              aria-label="Ouvrir les préférences"
            >
              <Settings2 size={19} />
            </button>
            <button
              className="icon-button"
              onClick={() => setDialog('rules')}
              aria-label="Aide et règles"
            >
              <CircleHelp size={20} />
            </button>
            <button
              className="icon-button"
              onClick={() => setPrefs((p) => ({ ...p, sound: !p.sound }))}
              aria-label={prefs.sound ? 'Couper le son' : 'Activer le son'}
            >
              {prefs.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
        </header>
        <main id="main">
          {conflict && (
            <div className="alert-banner">
              Cette partie a changé dans un autre onglet.{' '}
              <button
                onClick={() => {
                  const incoming = loadSession();
                  if (incoming) {
                    setSession(incoming);
                    setReplayIndex(null);
                  }
                  setConflict(false);
                }}
              >
                Charger sa version
              </button>
              <button
                onClick={() => {
                  try {
                    saveSession(session);
                    setConflict(false);
                  } catch {
                    setNotice('Le stockage est indisponible.');
                  }
                }}
              >
                Garder celle-ci
              </button>
            </div>
          )}
          {!saved && (
            <div className="alert-banner">
              Sauvegarde locale indisponible. Exportez votre partie pour la conserver.
            </div>
          )}
          {needRefresh && (
            <div className="alert-banner">
              Une nouvelle version est disponible.{' '}
              <button onClick={() => void updateServiceWorker(true)}>Mettre à jour</button>
            </div>
          )}
          {!online && (
            <div className="offline-note">
              <WifiOff size={15} />
              Vous pouvez continuer : le jeu fonctionne sur cet appareil.
            </div>
          )}
          {view === 'play' && (
            <>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">
                    <span className="tiny-diamond">◇</span> LA TRADITION A DE L’AVENIR
                  </span>
                  <h1>
                    Chaque graine compte<span>.</span>
                  </h1>
                  <p>Un plateau, deux esprits. Faites germer votre prochaine victoire.</p>
                </div>
                <button className="primary-button" onClick={openNew}>
                  <Plus size={18} /> Nouvelle partie
                </button>
              </section>
              <div className="play-layout">
                <section className="game-card" aria-label="Partie en cours">
                  <div className="game-card-header">
                    <div className="game-mode">
                      <span className="mode-icon">
                        {session.mode === 'solo' ? <Sparkles size={17} /> : <Users size={17} />}
                      </span>
                      <div>
                        <h2>
                          {session.mode === 'solo'
                            ? 'Face à l’ordinateur'
                            : 'Duel sur le même appareil'}
                        </h2>
                        <span>
                          {session.mode === 'solo'
                            ? `Niveau ${levels[session.difficulty].label}`
                            : 'Deux joueurs · un plateau'}
                          <span className="text-dot">·</span>Règles Ekang · 40 graines
                        </span>
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      onClick={openNew}
                      aria-label="Configurer une nouvelle partie"
                    >
                      <MoreHorizontal size={22} />
                    </button>
                  </div>
                  <div className="turn-strip">
                    <span aria-live="polite" className={`turn-pill ${thinking ? 'thinking' : ''}`}>
                      <span className="status-dot" />
                      {replayIndex !== null
                        ? `Relecture · coup ${replayIndex}`
                        : live.status === 'finished'
                          ? 'Partie terminée'
                          : thinking
                            ? 'L’ordinateur réfléchit'
                            : `Au tour de ${session.names[live.current]}`}
                    </span>
                    <span className="move-number">
                      Coup {state.ply.toString().padStart(2, '0')}
                    </span>
                  </div>
                  {live.status === 'finished' && replayIndex === null && (
                    <div className="result-banner">
                      <Trophy size={27} />
                      <div>
                        <strong>
                          {live.winner === null
                            ? 'Une belle partie, à égalité.'
                            : `${session.names[live.winner]} remporte la partie !`}
                        </strong>
                        <p>
                          {endTexts[live.reason!]} Score final : {live.scores.join(' – ')}.
                        </p>
                      </div>
                      <button onClick={openNew}>
                        Rejouer <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <Board
                    state={state}
                    names={session.names}
                    enabled={enabled}
                    hint={hint}
                    selected={selected}
                    coordinates={prefs.coordinates}
                    onPlay={makeMove}
                    onSelect={setSelected}
                    thinking={thinking}
                    replaying={replayIndex !== null}
                  />
                  <div className="game-controls">
                    <div>
                      <button
                        className="secondary-button"
                        disabled={
                          !session.moves.length ||
                          replayIndex !== null ||
                          live.status === 'finished' ||
                          conflict
                        }
                        onClick={undo}
                      >
                        <RotateCcw size={16} />
                        <span>Annuler</span>
                      </button>
                      <button
                        className={`secondary-button ${hint !== null ? 'hint-active' : ''}`}
                        disabled={!enabled || hintBusy}
                        onClick={requestHint}
                      >
                        <Lightbulb size={17} />
                        <span>{hintBusy ? 'Analyse…' : 'Un conseil'}</span>
                      </button>
                    </div>
                    <button
                      className="text-button rules-control"
                      onClick={() => setDialog('rules')}
                    >
                      <BookOpen size={16} />
                      Les règles
                    </button>
                  </div>
                  {hint !== null && replayIndex === null && (
                    <div className="hint-note">
                      <Sparkles size={16} />
                      Explorez la case {pitLabel(hint)}, mise en lumière sur le plateau.
                      <button
                        className="icon-button"
                        aria-label="Masquer le conseil"
                        onClick={() => setHint(null)}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  {replayIndex !== null && (
                    <div className="replay-controls">
                      <button
                        className="icon-button"
                        aria-label="Coup précédent"
                        disabled={replayIndex === 0}
                        onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span>
                        {replayIndex} / {session.moves.length}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Coup suivant"
                        disabled={replayIndex === session.moves.length}
                        onClick={() =>
                          setReplayIndex(Math.min(session.moves.length, replayIndex + 1))
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                      <button className="text-button" onClick={() => setReplayIndex(null)}>
                        Reprendre la partie <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </section>
                <aside className="game-rail">
                  <section className="objective-card">
                    <span className="eyebrow">LE CAP À GARDER</span>
                    <div className="objective-top">
                      <h3>
                        La victoire
                        <br />
                        se cultive.
                      </h3>
                      <span className="target-illustration">
                        <Flag size={30} strokeWidth={1.3} />
                        <i />
                        <i />
                      </span>
                    </div>
                    <p>
                      Récoltez <strong>40 graines</strong> pour remporter la partie.
                    </p>
                    <div className="score-progress-label">
                      <span>Votre récolte</span>
                      <strong>
                        {state.scores[0]} <span>/ {VICTORY_SEEDS}</span>
                      </strong>
                    </div>
                    <div
                      className="score-progress"
                      role="progressbar"
                      aria-label="Votre récolte"
                      aria-valuenow={Math.min(40, state.scores[0])}
                      aria-valuemin={0}
                      aria-valuemax={40}
                    >
                      <span style={{ width: `${Math.min(100, (state.scores[0] / 40) * 100)}%` }} />
                    </div>
                  </section>
                  <GameHistory
                    states={states}
                    replayIndex={replayIndex}
                    onReplay={setReplayIndex}
                    saved={saved}
                  />
                </aside>
              </div>
              <section className="bottom-tip">
                <div className="tip-icon">
                  <Sprout size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <span>LA SAGESSE DU PLATEAU</span>
                  <p>Une bonne récolte commence par une graine bien semée.</p>
                </div>
                <button onClick={() => switchView('learn')}>
                  Apprendre à jouer <ArrowRight size={15} />
                </button>
              </section>
            </>
          )}
          {view === 'learn' && (
            <>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">L’ESPRIT DU SONGO</span>
                  <h1>
                    La stratégie se transmet<span>.</span>
                  </h1>
                  <p>Les bons réflexes pour votre première partie et toutes les suivantes.</p>
                </div>
                <button className="primary-button" onClick={() => switchView('play')}>
                  Au plateau <ArrowRight size={17} />
                </button>
              </section>
              <section className="content-card">
                <Rules />
              </section>
            </>
          )}
          {view === 'games' && (
            <SavedGames
              session={session}
              live={live}
              results={results}
              onNew={openNew}
              onPlay={() => switchView('play')}
              onImport={() => fileInput.current?.click()}
              onClear={() => setDialog('clear')}
            />
          )}
          <footer className="page-footer">
            <span>70 graines. Des possibilités infinies.</span>
            <span>
              Fait pour jouer, pensé pour durer.{' '}
              <span className="footer-leaf">
                <Leaf size={13} />
              </span>
            </span>
          </footer>
        </main>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void importFile(event.target.files?.[0])}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Fermer la notification"
            onClick={() => setNotice('')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {dialog === 'rules' && (
        <Modal title="Les règles du Songo" onClose={() => setDialog(null)} wide>
          <Rules />
          <button className="primary-button full-width" onClick={() => setDialog(null)}>
            J’ai compris, à moi de jouer <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {dialog === 'new' && (
        <NewGameDialog
          session={session}
          onClose={() => setDialog(null)}
          onStart={(next) => {
            setSession(next);
            setReplayIndex(null);
            setDialog(null);
            setView('play');
            setConflict(false);
          }}
        />
      )}
      {dialog === 'settings' && (
        <Modal title="À votre façon" onClose={() => setDialog(null)}>
          <p className="modal-description">Quelques détails pour vous sentir bien au plateau.</p>
          {(
            [
              { key: 'sound', title: 'Le son des graines', text: 'Un son discret à chaque coup.' },
              {
                key: 'motion',
                title: 'Animations',
                text: 'Des transitions douces sur le plateau.',
              },
              {
                key: 'coordinates',
                title: 'Repères des cases',
                text: 'Afficher S1 à S7 et N1 à N7.',
              },
            ] as const
          ).map((item) => (
            <label className="preference-row" key={item.key}>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={prefs[item.key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))}
              />
            </label>
          ))}
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <p>
              Votre partie reste dans votre navigateur. Aucun compte ni service externe n’est
              nécessaire pour jouer. Les données ne sont pas synchronisées entre appareils.
            </p>
          </div>
        </Modal>
      )}
      {dialog === 'clear' && (
        <Modal title="Effacer vos résultats ?" onClose={() => setDialog(null)}>
          <p className="modal-description">
            Les statistiques et résultats seront supprimés de cet appareil. Votre plateau actuel
            sera conservé.
          </p>
          <div className="saved-actions">
            <button className="secondary-button" onClick={() => setDialog(null)}>
              Conserver
            </button>
            <button
              className="primary-button"
              onClick={() => {
                try {
                  clearResults();
                  setResults([]);
                  setDialog(null);
                } catch {
                  setNotice('Impossible d’effacer le stockage.');
                }
              }}
            >
              Effacer les résultats
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default App;
