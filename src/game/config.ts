import type { Difficulty } from './ai';
export const levels: Record<Difficulty, { label: string; text: string }> = {
  discovery: { label: 'Découverte', text: 'Prenez vos marques, un coup à la fois.' },
  strategist: { label: 'Stratège', text: 'Un adversaire qui anticipe vos intentions.' },
  expert: { label: 'Expert', text: 'Une recherche plus profonde. À vous de jouer.' },
};
