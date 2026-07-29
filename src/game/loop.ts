import type { GameState, TickerId } from './types';
import { createRng, clamp } from './rng';
import {
  applyDeltas,
  livingCost,
  netWorth,
  portfolioValue,
  pushLog,
} from './economy';
import { applyEventToState, rollEvents } from './events/catalog';

function tickMarkets(state: GameState): GameState {
  const rng = createRng(state.rngState);
  const drift = (price: number, vol: number) => {
    const change = 1 + (rng.next() - 0.48) * vol;
    return Math.max(1, Math.round(price * change * 100) / 100);
  };
  const prices = {
    bigtech: drift(state.market.prices.bigtech, 0.06),
    index: drift(state.market.prices.index, 0.04),
    meme: drift(state.market.prices.meme, 0.14),
    crypto: drift(state.market.prices.crypto, 0.18),
    company:
      state.market.prices.company > 0
        ? drift(state.market.prices.company, 0.1)
        : 0,
  };
  const history = { ...state.market.history };
  (Object.keys(prices) as TickerId[]).forEach((t) => {
    history[t] = [...history[t], prices[t]].slice(-24);
  });

  // company private valuation drift
  let valuation = state.company.valuation;
  if (state.company.stage !== 'ipo' && state.company.stage !== 'acquired' && state.company.stage !== 'dead') {
    valuation = Math.max(15, Math.round(valuation * (1 + (rng.next() - 0.45) * 0.05)));
  }

  // housing appreciation
  let housing = state.housing;
  if (housing.owned) {
    const pv = Math.round(housing.propertyValue * (1 + (rng.next() - 0.42) * 0.01));
    const mortgagePay = Math.min(housing.mortgageBalance, Math.round(housing.weeklyCost * 0.55));
    housing = {
      ...housing,
      propertyValue: pv,
      mortgageBalance: Math.max(0, housing.mortgageBalance - mortgagePay),
    };
  }

  return {
    ...state,
    rngState: rng.state(),
    market: { ...state.market, prices, history },
    company: { ...state.company, valuation },
    housing,
  };
}

function tickVesting(state: GameState): GameState {
  if (!state.company.employed) return state;
  const weeks = state.company.weeksEmployed + 1;
  let vested = state.company.vestedPercent;
  if (weeks >= state.company.cliffWeeks) {
    vested = clamp(weeks / state.company.vestWeeks, 0, 1);
  }
  return {
    ...state,
    company: {
      ...state.company,
      weeksEmployed: weeks,
      vestedPercent: vested,
      promoCooldown: Math.max(0, state.company.promoCooldown - 1),
    },
  };
}

function tickCashflows(state: GameState): { state: GameState; lines: string[] } {
  const lines: string[] = [];
  let s = state;
  const pay = s.company.employed ? s.company.weeklyPay : 0;
  if (pay > 0) {
    s = { ...s, player: { ...s.player, cash: s.player.cash + pay } };
    lines.push(`Salary +$${pay}`);
  }

  // savings interest
  if (s.bank.savings > 0) {
    const interest = Math.round(s.bank.savings * s.bank.savingsApyWeekly);
    if (interest > 0) {
      s = { ...s, bank: { ...s.bank, savings: s.bank.savings + interest } };
      lines.push(`Savings interest +$${interest}`);
    }
  }

  // living costs
  const burn = livingCost(s);
  s = { ...s, player: { ...s.player, cash: s.player.cash - burn } };
  lines.push(`Living costs −$${burn}`);

  // student loan minimum + interest
  if (s.bank.studentLoan > 0) {
    const interest = Math.round(s.bank.studentLoan * 0.0012);
    const minPay = Math.min(s.bank.studentLoan, 120 + interest);
    s = {
      ...s,
      player: { ...s.player, cash: s.player.cash - minPay },
      bank: {
        ...s.bank,
        studentLoan: Math.max(0, s.bank.studentLoan + interest - minPay),
      },
    };
    lines.push(`Student loan −$${minPay}`);
  }

  // personal loan interest
  if (s.bank.personalLoan > 0) {
    const interest = Math.round(s.bank.personalLoan * s.bank.personalLoanRate);
    s = {
      ...s,
      bank: { ...s.bank, personalLoan: s.bank.personalLoan + interest },
    };
    lines.push(`Loan interest +$${interest} principal`);
  }

  // relationship weeks
  if (s.relationship.status === 'dating' || s.relationship.status === 'engaged' || s.relationship.status === 'married') {
    s = {
      ...s,
      relationship: {
        ...s.relationship,
        weeksTogether: s.relationship.weeksTogether + 1,
      },
    };
  }

  // passive stress decay / health bleed from stress
  if (s.player.stress > 70) {
    s = applyDeltas(s, { health: -2 });
    lines.push('High stress nibbles health (−2)');
  } else if (s.player.stress > 0) {
    s = applyDeltas(s, { stress: -2 });
  }

  return { state: s, lines };
}

function checkTitles(state: GameState): GameState {
  const titles = new Set(state.titles);
  let flags = { ...state.flags };
  if (state.week >= 12 && state.company.employed) {
    titles.add('Survived Probation');
    flags.survivedProbation = true;
  }
  if (state.housing.owned) {
    titles.add('House Poor');
    flags.housePoor = true;
  }
  if (netWorth(state) >= 1_000_000) {
    titles.add('Paper Millionaire');
    flags.paperMillionaire = true;
  }
  if (flags.unicornRider) titles.add('Unicorn Rider');
  if (state.week >= state.maxWeeks) titles.add('Valley Veteran');
  return { ...state, titles: [...titles], flags };
}

function checkEndings(state: GameState): GameState {
  if (state.player.health <= 0) {
    return {
      ...state,
      phase: 'gameover',
      gameOverReason: 'Health hit zero. The Valley took everything but the hoodie.',
    };
  }
  if (state.player.reputation <= 0 && !state.company.employed && state.player.cash < 0) {
    return {
      ...state,
      phase: 'gameover',
      gameOverReason: 'Blacklisted, broke, and out of runway.',
    };
  }
  // bankruptcy soft: deeply negative cash with no assets
  if (state.player.cash < -5000 && portfolioValue(state) < 100 && state.bank.savings < 100) {
    return {
      ...state,
      phase: 'gameover',
      gameOverReason: 'Insolvent. Collectors found your last remaining mechanical keyboard.',
    };
  }
  if (state.week > state.maxWeeks) {
    return { ...state, phase: 'victory' };
  }
  return state;
}

/** Start of week after a location action: markets, cashflows already happened at week start.
 * Flow:
 * 1) beginWeek (passive) → maybe force hospital
 * 2) player acts at location
 * 3) resolveWeek (events + advance)
 */

export function beginWeek(state: GameState): GameState {
  if (state.phase === 'gameover' || state.phase === 'victory' || state.phase === 'title') {
    return state;
  }
  let s = tickMarkets(state);
  s = tickVesting(s);
  const { state: paid, lines } = tickCashflows(s);
  s = paid;
  s = { ...s, lastSummary: lines };
  s = checkTitles(s);

  if (s.player.health < 50) {
    s = {
      ...s,
      forcedHospital: true,
      phase: 'hospital-forced',
    };
    s = pushLog(s, 'Health critically low — hospital is mandatory this week.', 'bad');
  } else {
    s = { ...s, forcedHospital: false, phase: 'playing' };
  }
  return checkEndings(s);
}

export function resolveAfterAction(state: GameState): GameState {
  // Roll events, then advance week
  const rng = createRng(state.rngState);
  const eventCount = rng.next() < 0.25 ? 2 : 1;
  let s = { ...state, rngState: rng.state() };
  const { state: after, events } = rollEvents(s, eventCount);
  s = after;
  for (const ev of events) {
    s = applyEventToState(s, ev);
  }
  s = { ...s, pendingEvents: events, phase: 'event' };

  // advance week number when events dismissed — handled by dismissEvents
  return checkEndings(checkTitles(s));
}

export function dismissEvents(state: GameState): GameState {
  let s: GameState = {
    ...state,
    pendingEvents: [],
    week: state.week + 1,
    phase: 'playing',
  };
  if (s.week > s.maxWeeks) {
    s = { ...s, phase: 'victory' };
    return checkTitles(s);
  }
  s = beginWeek(s);
  return s;
}

export function scoreRun(state: GameState): number {
  return Math.round(
    netWorth(state) / 1000 +
      state.player.reputation * 80 +
      state.player.health * 40 +
      state.titles.length * 5000,
  );
}
