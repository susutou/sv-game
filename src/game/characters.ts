import type { CharacterId, CharactersState, GameState, RelationshipStatus } from './types';

export type { CharacterId, CharactersState };

export const CHARACTER_META: Record<
  CharacterId,
  {
    label: string;
    role: string;
    color: string;
    hair: string;
    outfit: string;
  }
> = {
  girlfriend: {
    label: 'Girlfriend',
    role: 'Partner',
    color: '#e8a0b0',
    hair: '#3e2723',
    outfit: '#c2185b',
  },
  wife: {
    label: 'Wife',
    role: 'Spouse',
    color: '#f0c4a8',
    hair: '#4e342e',
    outfit: '#6a1b9a',
  },
  colleague: {
    label: 'Colleague',
    role: 'Desk neighbor',
    color: '#c4a882',
    hair: '#1a1a1a',
    outfit: '#1565c0',
  },
  boss: {
    label: 'Boss',
    role: 'Engineering Manager',
    color: '#d4b896',
    hair: '#37474f',
    outfit: '#263238',
  },
  friend: {
    label: 'Friend',
    role: 'College buddy',
    color: '#c49a6c',
    hair: '#5d4037',
    outfit: '#2e7d32',
  },
};

export function createCharactersState(partnerName: string | null = null): CharactersState {
  return {
    girlfriend: { name: partnerName ?? 'Jordan', affinity: 55, met: false },
    wife: { name: partnerName ?? 'Jordan', affinity: 70, met: false },
    colleague: { name: 'Priya', affinity: 50, met: true },
    boss: { name: 'Marcus Chen', affinity: 45, met: true },
    friend: { name: 'Diego', affinity: 65, met: true },
  };
}

/** Who appears on the map this week */
export function visibleCharacters(state: GameState): CharacterId[] {
  const rel = state.relationship.status;
  const ids: CharacterId[] = ['friend', 'colleague'];
  if (state.company.employed) ids.push('boss');
  if (rel === 'dating' || rel === 'engaged') ids.push('girlfriend');
  if (rel === 'married') ids.push('wife');
  return ids;
}

export function syncPartnerName(state: GameState): GameState {
  const name = state.relationship.partnerName;
  if (!name || !state.characters) return state;
  return {
    ...state,
    characters: {
      ...state.characters,
      girlfriend: {
        ...state.characters.girlfriend,
        name,
        met: state.relationship.status === 'dating' || state.relationship.status === 'engaged' || state.relationship.status === 'married',
      },
      wife: {
        ...state.characters.wife,
        name,
        met: state.relationship.status === 'married',
      },
    },
  };
}

export function partnerLabel(status: RelationshipStatus): string {
  if (status === 'married') return 'wife';
  if (status === 'dating' || status === 'engaged') return 'girlfriend';
  return 'partner';
}
