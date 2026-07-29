import type { GameState } from './types';
import { CAREER_PAY, CAREER_TITLE } from './types';

export function createInitialState(name: string): GameState {
  return {
    vitals: {
      name: name.trim() || 'New Grad',
      cash: 1000,
      health: 100,
      reputation: 100,
      stress: 18,
    },
    time: {
      day: 1,
      maxDays: 365,
      hour: 8.5,
      paused: false,
    },
    company: {
      name: 'Nimbus Labs',
      valuation: 80,
      stage: 'seriesA',
      employed: true,
      title: CAREER_TITLE.junior,
      level: 'junior',
      weeklyPay: CAREER_PAY.junior * 7,
      equityPercent: 0.05,
      vestedPercent: 0,
      weeksEmployed: 0,
      cliffWeeks: 52,
      vestWeeks: 208,
    },
    market: {
      prices: { bigtech: 180, index: 100, meme: 42, crypto: 65, company: 0 },
      holdings: {
        bigtech: { shares: 0, avgCost: 0 },
        index: { shares: 0, avgCost: 0 },
        meme: { shares: 0, avgCost: 0 },
        crypto: { shares: 0, avgCost: 0 },
        company: { shares: 0, avgCost: 0 },
      },
      history: {
        bigtech: [168, 172, 175, 178, 180],
        index: [94, 96, 98, 99, 100],
        meme: [38, 44, 40, 46, 42],
        crypto: [58, 70, 62, 68, 65],
        company: [0, 0, 0, 0, 0],
      },
    },
    bank: {
      savings: 0,
      studentLoan: 28000,
      personalLoan: 0,
    },
    housing: {
      label: 'East Bay shared room',
      dailyRent: 100,
      owned: false,
      propertyValue: 0,
    },
    relationship: { status: 'single', partnerName: null },
    npcs: {
      boss: { name: 'Marcus Chen', affinity: 45 },
      colleague: { name: 'Priya Shah', affinity: 55 },
      friend: { name: 'Diego Alvarez', affinity: 70 },
      partner: { name: 'Jordan', affinity: 0 },
    },
    flags: {
      tutorialDone: false,
      forcedHospital: false,
      survivedProbation: false,
      paperMillionaire: false,
      unicornRider: false,
    },
    news: [
      {
        id: 'welcome',
        day: 1,
        title: 'Welcome to the Valley',
        body: 'Nimbus Labs expects you at 9. Don\'t be late. Your phone has Trade & Equity apps.',
      },
    ],
    messages: [
      {
        id: 'm1',
        from: 'Marcus Chen',
        body: 'See you at the all-hands. Desk is by the microkitchen.',
        day: 1,
        read: false,
      },
      {
        id: 'm2',
        from: 'Diego',
        body: 'Beer this weekend? Also install the Trade app before you YOLO rent money.',
        day: 1,
        read: false,
      },
    ],
    log: ['Day 1 — Path to glory starts now.'],
    position: [0, 0.9, 8],
    gameOver: null,
    victory: false,
  };
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function portfolioValue(state: GameState): number {
  return (Object.keys(state.market.prices) as (keyof typeof state.market.prices)[]).reduce(
    (sum, t) => sum + state.market.prices[t] * state.market.holdings[t].shares,
    0,
  );
}

export function equityPaper(state: GameState): number {
  const { company } = state;
  return (company.valuation * 1_000_000 * company.equityPercent * company.vestedPercent) / 100;
}

export function netWorth(state: GameState): number {
  return (
    state.vitals.cash +
    state.bank.savings +
    portfolioValue(state) +
    equityPaper(state) +
    (state.housing.owned ? state.housing.propertyValue : 0) -
    state.bank.studentLoan -
    state.bank.personalLoan
  );
}
