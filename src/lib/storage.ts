import { replay } from '../game/engine';
import type { Difficulty } from '../game/ai';
export interface Session {
  version: 2;
  id: string;
  mode: 'solo' | 'local';
  difficulty: Difficulty;
  names: [string, string];
  moves: number[];
  createdAt: string;
}
export interface Result {
  id: string;
  mode: Session['mode'];
  winner: 0 | 1 | null;
  scores: [number, number];
  moves: number;
  date: string;
}
export interface Preferences {
  sound: boolean;
  motion: boolean;
  coordinates: boolean;
}
export const defaultPreferences: Preferences = { sound: false, motion: true, coordinates: true };
const SESSION_KEY = 'songo.session.v2',
  RESULTS_KEY = 'songo.results.v2',
  PREFS_KEY = 'songo.preferences.v2';
export function parseSession(value: unknown): Session {
  if (!value || typeof value !== 'object') throw new Error('Format de sauvegarde invalide.');
  const s = value as Session;
  if (
    s.version !== 2 ||
    typeof s.id !== 'string' ||
    s.id.length > 100 ||
    !['solo', 'local'].includes(s.mode) ||
    !['discovery', 'strategist', 'expert'].includes(s.difficulty) ||
    !Array.isArray(s.names) ||
    s.names.length !== 2 ||
    s.names.some((n) => typeof n !== 'string' || n.length < 1 || n.length > 24) ||
    !Array.isArray(s.moves) ||
    s.moves.some((n) => !Number.isInteger(n) || n < 0 || n > 13) ||
    typeof s.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(s.createdAt))
  )
    throw new Error('Format de sauvegarde invalide.');
  replay(s.moves); // Do not trust saved states: validate every move against the actual rules.
  return {
    version: 2,
    id: s.id,
    mode: s.mode,
    difficulty: s.difficulty,
    names: [...s.names],
    moves: [...s.moves],
    createdAt: s.createdAt,
  };
}
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? parseSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function newSession(
  mode: Session['mode'],
  difficulty: Difficulty,
  names: [string, string],
): Session {
  return {
    version: 2,
    id: crypto.randomUUID(),
    mode,
    difficulty,
    names,
    moves: [],
    createdAt: new Date().toISOString(),
  };
}
export function readResults(): Result[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is Result =>
          r &&
          typeof r.id === 'string' &&
          ['solo', 'local'].includes(r.mode) &&
          (r.winner === null || r.winner === 0 || r.winner === 1) &&
          Array.isArray(r.scores) &&
          r.scores.length === 2 &&
          r.scores.every(
            (s: unknown) => Number.isInteger(s) && Number(s) >= 0 && Number(s) <= 70,
          ) &&
          Number.isInteger(r.moves) &&
          r.moves >= 0 &&
          r.moves <= 600 &&
          typeof r.date === 'string' &&
          Number.isFinite(Date.parse(r.date)),
      )
      .slice(0, 500);
  } catch {
    return [];
  }
}
export function recordResult(result: Result) {
  const results = readResults();
  if (!results.some((r) => r.id === result.id))
    localStorage.setItem(RESULTS_KEY, JSON.stringify([result, ...results].slice(0, 500)));
}
export function clearResults() {
  localStorage.removeItem(RESULTS_KEY);
}
export function loadPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return Object.fromEntries(
      Object.entries(defaultPreferences).map(([key, value]) => [
        key,
        typeof p?.[key] === 'boolean' ? p[key] : value,
      ]),
    ) as unknown as Preferences;
  } catch {
    return defaultPreferences;
  }
}
export function savePreferences(p: Preferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
export function exportSession(session: Session) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `songo-${session.id.slice(0, 8)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
