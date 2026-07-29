import type { GameState, TickerId } from './types';
import { clamp, formatMoney } from './economy';

export function tradeBuy(state: GameState, ticker: TickerId, dollars: number): { state: GameState; message: string } {
  const price = state.market.prices[ticker];
  if (ticker === 'company' && price <= 0) {
    return { state, message: 'Nimbus is still private. Watch Equity app for vesting.' };
  }
  if (price <= 0) return { state, message: 'No market price.' };
  const amount = Math.floor(dollars);
  if (amount <= 0) return { state, message: 'Enter a positive amount.' };
  if (state.vitals.cash < amount) return { state, message: 'Not enough cash.' };

  const shares = amount / price;
  const prev = state.market.holdings[ticker];
  const newShares = prev.shares + shares;
  const avgCost = (prev.shares * prev.avgCost + shares * price) / newShares;

  return {
    state: {
      ...state,
      vitals: { ...state.vitals, cash: state.vitals.cash - amount },
      market: {
        ...state.market,
        holdings: { ...state.market.holdings, [ticker]: { shares: newShares, avgCost } },
      },
      log: [`Bought $${amount} ${ticker}`, ...state.log].slice(0, 40),
    },
    message: `Bought ${shares.toFixed(3)} ${ticker} @ ${formatMoney(price)}`,
  };
}

export function tradeSell(state: GameState, ticker: TickerId, dollars: number): { state: GameState; message: string } {
  const price = state.market.prices[ticker];
  if (price <= 0) return { state, message: 'No market price.' };
  const held = state.market.holdings[ticker];
  const maxValue = Math.floor(held.shares * price);
  const amount = Math.min(Math.floor(dollars), maxValue);
  if (amount <= 0 || held.shares <= 0) return { state, message: 'Nothing to sell.' };

  const sharesSold = amount / price;
  const remaining = held.shares - sharesSold;

  return {
    state: {
      ...state,
      vitals: { ...state.vitals, cash: state.vitals.cash + amount },
      market: {
        ...state.market,
        holdings: {
          ...state.market.holdings,
          [ticker]: {
            shares: remaining < 0.0001 ? 0 : remaining,
            avgCost: remaining < 0.0001 ? 0 : held.avgCost,
          },
        },
      },
      log: [`Sold $${amount} ${ticker}`, ...state.log].slice(0, 40),
    },
    message: `Sold $${amount} of ${ticker}`,
  };
}

export function tickMarkets(state: GameState, rng: () => number): GameState {
  const drift = (p: number, vol: number) =>
    Math.max(1, Math.round(p * (1 + (rng() - 0.48) * vol) * 100) / 100);

  const prices = {
    bigtech: drift(state.market.prices.bigtech, 0.05),
    index: drift(state.market.prices.index, 0.035),
    meme: drift(state.market.prices.meme, 0.12),
    crypto: drift(state.market.prices.crypto, 0.16),
    company:
      state.market.prices.company > 0 ? drift(state.market.prices.company, 0.08) : 0,
  };

  const history = { ...state.market.history };
  (Object.keys(prices) as TickerId[]).forEach((t) => {
    history[t] = [...history[t], prices[t]].slice(-48);
  });

  return { ...state, market: { ...state.market, prices, history } };
}

export function advanceHour(state: GameState, hours: number, rng: () => number): GameState {
  let s = { ...state, time: { ...state.time } };
  s.time.hour += hours;

  while (s.time.hour >= 24) {
    s.time.hour -= 24;
    s = endOfDay(s, rng);
  }

  if (s.vitals.health < 50) {
    s = { ...s, flags: { ...s.flags, forcedHospital: true } };
  } else if (s.vitals.health >= 70) {
    s = { ...s, flags: { ...s.flags, forcedHospital: false } };
  }

  return s;
}

function endOfDay(state: GameState, rng: () => number): GameState {
  let s = tickMarkets(state, rng);
  s = { ...s, time: { ...s.time, day: s.time.day + 1 } };

  // pay
  const daily = s.company.employed ? Math.round(s.company.weeklyPay / 7) : 0;
  let cash = s.vitals.cash + daily - s.housing.dailyRent - 35; // living

  // loans
  if (s.bank.studentLoan > 0) {
    const pay = Math.min(40, s.bank.studentLoan);
    cash -= pay;
    s = {
      ...s,
      bank: { ...s.bank, studentLoan: Math.max(0, s.bank.studentLoan - pay + Math.round(s.bank.studentLoan * 0.0003)) },
    };
  }

  // vesting
  if (s.company.employed) {
    const weeks = s.company.weeksEmployed + (s.time.day % 7 === 0 ? 1 : 0);
    let vested = s.company.vestedPercent;
    const approxWeeks = Math.floor(s.time.day / 7);
    if (approxWeeks >= s.company.cliffWeeks) {
      vested = clamp(approxWeeks / s.company.vestWeeks, 0, 1);
    }
    s = {
      ...s,
      company: { ...s.company, weeksEmployed: weeks, vestedPercent: vested },
    };
  }

  // stress bleed
  let health = s.vitals.health;
  let stress = s.vitals.stress;
  if (stress > 70) health -= 2;
  else stress = Math.max(0, stress - 3);

  s = {
    ...s,
    vitals: { ...s.vitals, cash: Math.round(cash), health: clamp(health, 0, 100), stress: clamp(stress, 0, 100) },
    log: [
      `Day ${s.time.day}: salary +$${daily}, rent −$${s.housing.dailyRent}`,
      ...s.log,
    ].slice(0, 40),
  };

  if (s.time.day >= 14 && s.company.employed) {
    s = { ...s, flags: { ...s.flags, survivedProbation: true } };
  }

  if (s.vitals.health <= 0) {
    s = { ...s, gameOver: 'Health hit zero. The Valley keeps your hoodie.' };
  }
  if (s.time.day > s.time.maxDays) {
    s = { ...s, victory: true };
  }

  // light random news
  if (rng() < 0.25) {
    const headlines = [
      ['Risk-on tape', 'Tech leads overnight. Your brokerage app looks greener.'],
      ['Macro jitters', 'Rates chatter hits growth names.'],
      ['AI fever', 'Every roadmap slide grows an agent.'],
      ['Crypto weather', 'Charts do parkour again.'],
      ['Hiring chill', 'Headcount freezes whisper through Slack.'],
    ];
    const h = headlines[Math.floor(rng() * headlines.length)];
    s = {
      ...s,
      news: [{ id: `n-${s.time.day}-${rng()}`, day: s.time.day, title: h[0], body: h[1] }, ...s.news].slice(0, 30),
    };
  }

  return s;
}

export function doWork(state: GameState, crunch: boolean): GameState {
  if (!state.company.employed) return state;
  const bonus = crunch ? 80 + Math.floor(Math.random() * 120) : 0;
  return {
    ...state,
    vitals: {
      ...state.vitals,
      cash: state.vitals.cash + bonus,
      health: clamp(state.vitals.health - (crunch ? 8 : 3), 0, 100),
      stress: clamp(state.vitals.stress + (crunch ? 12 : 4), 0, 100),
      reputation: clamp(state.vitals.reputation + (crunch ? 3 : 1), 0, 100),
    },
    log: [crunch ? `Crunch session +$${bonus}` : 'Solid work block', ...state.log].slice(0, 40),
  };
}

export function healAtHospital(state: GameState, tier: 'basic' | 'full'): GameState {
  const cost = tier === 'full' ? 900 : 450;
  const heal = tier === 'full' ? 55 : 30;
  const pay = Math.min(cost, state.vitals.cash + state.bank.savings);
  let cash = state.vitals.cash;
  let savings = state.bank.savings;
  if (cash >= pay) cash -= pay;
  else {
    const need = pay - cash;
    cash = 0;
    savings = Math.max(0, savings - need);
  }
  return {
    ...state,
    vitals: {
      ...state.vitals,
      cash: Math.round(cash),
      health: clamp(state.vitals.health + heal, 0, 100),
      stress: clamp(state.vitals.stress - (tier === 'full' ? 20 : 8), 0, 100),
    },
    bank: { ...state.bank, savings: Math.round(savings) },
    flags: { ...state.flags, forcedHospital: false },
    log: [`Hospital ${tier} (−$${pay})`, ...state.log].slice(0, 40),
  };
}
