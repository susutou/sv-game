import type { GameState, TickerId } from './types';
import { CAREER_PAY, CAREER_TITLES, HOUSING_OPTIONS } from './types';
import { clamp } from './rng';

export function createInitialState(name: string, seed = Date.now()): GameState {
  return {
    week: 1,
    maxWeeks: 104,
    phase: 'playing',
    player: {
      name: name.trim() || 'New Grad',
      cash: 1000,
      health: 100,
      reputation: 100,
      stress: 20,
    },
    company: {
      name: 'Nimbus Labs',
      valuation: 80,
      stage: 'seriesA',
      employed: true,
      title: CAREER_TITLES.junior,
      level: 'junior',
      weeklyPay: CAREER_PAY.junior,
      equityPercent: 0.05,
      vestedPercent: 0,
      weeksEmployed: 0,
      cliffWeeks: 52,
      vestWeeks: 208,
      promoCooldown: 0,
    },
    market: {
      prices: {
        bigtech: 180,
        index: 100,
        meme: 42,
        crypto: 65,
        company: 0, // private until IPO
      },
      holdings: {
        bigtech: { shares: 0, avgCost: 0 },
        index: { shares: 0, avgCost: 0 },
        meme: { shares: 0, avgCost: 0 },
        crypto: { shares: 0, avgCost: 0 },
        company: { shares: 0, avgCost: 0 },
      },
      history: {
        // Seed a short fake history so charts aren't empty on week 1
        bigtech: [168, 172, 170, 175, 178, 180],
        index: [94, 96, 97, 98, 99, 100],
        meme: [38, 45, 40, 48, 44, 42],
        crypto: [58, 72, 61, 70, 68, 65],
        company: [0, 0, 0, 0, 0, 0],
      },
    },
    bank: {
      savings: 0,
      savingsApyWeekly: 0.0008,
      studentLoan: 28000,
      personalLoan: 0,
      personalLoanRate: 0.003,
    },
    housing: {
      tier: 'shared',
      owned: false,
      weeklyCost: HOUSING_OPTIONS.shared.weeklyRent,
      propertyValue: 0,
      mortgageBalance: 0,
      label: HOUSING_OPTIONS.shared.label,
    },
    relationship: {
      status: 'single',
      partnerName: null,
      weeksTogether: 0,
    },
    flags: {
      survivedProbation: false,
      housePoor: false,
      paperMillionaire: false,
      unicornRider: false,
      laidOffOnce: false,
      marriedOnce: false,
      ipoHappened: false,
    },
    pendingEvents: [],
    lastSummary: [],
    log: [
      {
        week: 1,
        text: `Welcome to the Valley, ${name.trim() || 'New Grad'}. Cubicle awaits.`,
        kind: 'info',
      },
    ],
    forcedHospital: false,
    gameOverReason: null,
    titles: [],
    seed,
    rngState: seed >>> 0,
  };
}

export function portfolioValue(state: GameState): number {
  const tickers = Object.keys(state.market.prices) as TickerId[];
  return tickers.reduce((sum, t) => {
    const price = state.market.prices[t];
    const shares = state.market.holdings[t].shares;
    return sum + price * shares;
  }, 0);
}

export function equityValue(state: GameState): number {
  const { company } = state;
  if (!company.employed && company.stage !== 'ipo' && company.stage !== 'acquired') {
    // unvested/forfeited unless already liquid
  }
  const vested = company.equityPercent * company.vestedPercent;
  // valuation is in millions USD
  return (company.valuation * 1_000_000 * vested) / 100;
}

export function netWorth(state: GameState): number {
  const liquid =
    state.player.cash +
    state.bank.savings +
    portfolioValue(state) +
    (state.housing.owned ? state.housing.propertyValue - state.housing.mortgageBalance : 0) +
    equityValue(state);
  const debts = state.bank.studentLoan + state.bank.personalLoan;
  return liquid - debts;
}

export function livingCost(state: GameState): number {
  const lifestyle =
    state.relationship.status === 'married'
      ? 280
      : state.relationship.status === 'dating'
        ? 220
        : 160;
  return state.housing.weeklyCost + lifestyle;
}

export function applyDeltas(
  state: GameState,
  deltas: Partial<{ cash: number; health: number; reputation: number; stress: number }>,
): GameState {
  const p = { ...state.player };
  if (deltas.cash) p.cash = Math.round(p.cash + deltas.cash);
  if (deltas.health) p.health = clamp(p.health + deltas.health, 0, 100);
  if (deltas.reputation) p.reputation = clamp(p.reputation + deltas.reputation, 0, 100);
  if (deltas.stress) p.stress = clamp(p.stress + deltas.stress, 0, 100);
  return { ...state, player: p };
}

export function pushLog(
  state: GameState,
  text: string,
  kind: 'info' | 'good' | 'bad' | 'event' = 'info',
): GameState {
  const entry = { week: state.week, text, kind };
  return { ...state, log: [entry, ...state.log].slice(0, 80) };
}

export function hospitalCost(state: GameState): number {
  const deficit = Math.max(0, 50 - state.player.health);
  const base = 800 + deficit * 40;
  return state.company.employed ? Math.round(base * 0.45) : base;
}

export function treatHealth(state: GameState, tier: 'basic' | 'full' | 'burnout'): GameState {
  let cost = hospitalCost(state);
  let heal = 30;
  let stressRelief = 10;
  if (tier === 'full') {
    cost = Math.round(cost * 1.6);
    heal = 55;
    stressRelief = 20;
  }
  if (tier === 'burnout') {
    cost = Math.round(cost * 2.4);
    heal = 70;
    stressRelief = 45;
  }
  if (state.player.cash + state.bank.savings < cost) {
    // drain what we can
    const available = state.player.cash + state.bank.savings;
    cost = available;
    heal = Math.max(15, Math.floor(heal * (available / Math.max(1, hospitalCost(state)))));
  }
  let cash = state.player.cash;
  let savings = state.bank.savings;
  if (cash >= cost) {
    cash -= cost;
  } else {
    const need = cost - cash;
    cash = 0;
    savings = Math.max(0, savings - need);
  }
  return {
    ...state,
    player: {
      ...state.player,
      cash: Math.round(cash),
      health: clamp(state.player.health + heal, 0, 100),
      stress: clamp(state.player.stress - stressRelief, 0, 100),
    },
    bank: { ...state.bank, savings: Math.round(savings) },
    forcedHospital: false,
  };
}
