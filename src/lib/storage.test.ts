import { describe, expect, it } from 'vitest';
import { parseSession } from './storage';
const valid = {
  version: 2,
  id: 'test-game',
  mode: 'solo',
  difficulty: 'discovery',
  names: ['Alice', 'IA'],
  moves: [0, 7],
  createdAt: '2026-11-02T12:00:00Z',
};
describe('untrusted save validation', () => {
  it('reconstructs a valid save', () => expect(parseSession(valid).moves).toEqual([0, 7]));
  it('rejects illegal histories and malicious or malformed fields', () => {
    for (const input of [
      null,
      {},
      { ...valid, moves: [13] },
      { ...valid, moves: [0, 0] },
      { ...valid, moves: Array(601).fill(0) },
      { ...valid, names: ['a'] },
      { ...valid, mode: 'online' },
      { ...valid, names: ['a'.repeat(25), 'b'] },
      { ...valid, createdAt: 'bad' },
      { ...valid, moves: [0.5] },
      { ...valid, version: 1 },
    ])
      expect(() => parseSession(input)).toThrow();
  });
  it('strips untrusted state and returns copies', () => {
    const parsed = parseSession({ ...valid, board: Array(14).fill(100), scores: [70, 70] });
    expect(parsed).not.toHaveProperty('board');
    parsed.moves.push(1);
    expect(valid.moves).toEqual([0, 7]);
  });
});
