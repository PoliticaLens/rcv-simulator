// candidates.js — default candidate pool and color system

const CANDIDATE_COLORS = [
  { idx: 0, color: '#2d5be3', dim: '#dce6ff' },
  { idx: 1, color: '#c94a1e', dim: '#fce8e1' },
  { idx: 2, color: '#1a7a4a', dim: '#d4f0e1' },
  { idx: 3, color: '#7c3aed', dim: '#ede9fe' },
  { idx: 4, color: '#b45309', dim: '#fef3c7' },
  { idx: 5, color: '#0e7490', dim: '#cffafe' },
];

const DEFAULT_CANDIDATES = [
  {
    id: 0,
    name: 'Eleanor Voss',
    party: 'Progressive Party',
    polling: 34,
    enthusiasm: 70,
    crossover: 20,
  },
  {
    id: 1,
    name: 'Marcus Webb',
    party: 'Moderate Alliance',
    polling: 28,
    enthusiasm: 55,
    crossover: 45,
  },
  {
    id: 2,
    name: 'Diana Chen',
    party: 'Reform Coalition',
    polling: 24,
    enthusiasm: 65,
    crossover: 35,
  },
  {
    id: 3,
    name: 'Robert Okafor',
    party: 'Independent',
    polling: 14,
    enthusiasm: 80,
    crossover: 60,
  },
];

const EXTRA_CANDIDATE_POOL = [
  { name: 'Sandra Novak',  party: 'Green Future', polling: 12, enthusiasm: 75, crossover: 50 },
  { name: 'James Harlow',  party: 'Liberty Party', polling: 18, enthusiasm: 60, crossover: 30 },
  { name: 'Priya Anand',   party: 'Civic First', polling: 22, enthusiasm: 68, crossover: 40 },
  { name: 'Tom Brannigan', party: 'Workers United', polling: 16, enthusiasm: 55, crossover: 25 },
];

function getColor(idx) {
  return CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
}

function getCandidateEmoji(name) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return initials;
}
