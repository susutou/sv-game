import type { GameState, HousingTier, TickerId } from '../types';
import { CAREER_PAY, CAREER_TITLES, HOUSING_OPTIONS } from '../types';
import { applyDeltas, pushLog, treatHealth } from '../economy';
import { createRng, clamp } from '../rng';

export type ActionResult = { state: GameState; message: string };

export function workNormal(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'You are not employed. Try interviewing or freelancing from Company.' };
  }
  const stressGain = 4 + Math.floor(state.player.stress / 40);
  const s = applyDeltas(state, { health: -3, stress: stressGain, reputation: 1 });
  return {
    state: pushLog(s, 'Another week of tickets, standups, and mildly burnt coffee.', 'info'),
    message: 'You put in a solid week. Salary hits Friday.',
  };
}

export function overwork(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No job to overwork for.' };
  }
  const rng = createRng(state.rngState);
  const bonus = 600 + Math.floor(rng.next() * 900);
  const goodwill = rng.next() > 0.4;
  let s = applyDeltas(state, {
    cash: bonus,
    health: -14,
    stress: 18,
    reputation: goodwill ? 5 : 1,
  });
  s = { ...s, rngState: rng.state() };
  if (goodwill) {
    s = {
      ...s,
      company: {
        ...s.company,
        equityPercent: s.company.equityPercent + 0.005,
      },
    };
  }
  s = pushLog(
    s,
    `Crunch mode: +$${bonus}${goodwill ? ' and a tiny equity nod' : ''}. Health complains.`,
    goodwill ? 'good' : 'bad',
  );
  return { state: s, message: `Overwork complete. Bonus $${bonus}.` };
}

export function askPromotion(state: GameState): ActionResult {
  if (!state.company.employed) return { state, message: 'Unemployed — nothing to promote into.' };
  if (state.company.promoCooldown > 0) {
    return {
      state,
      message: `Too soon. Try again in ${state.company.promoCooldown} weeks.`,
    };
  }
  if (state.company.level === 'principal' || state.company.level === 'founder') {
    return { state, message: 'You are already at the top of the IC ladder here.' };
  }
  const rng = createRng(state.rngState);
  const chance =
    0.2 +
    state.player.reputation / 200 +
    state.company.weeksEmployed / 400 -
    state.player.stress / 300;
  const success = rng.next() < clamp(chance, 0.08, 0.75);
  let s = { ...state, rngState: rng.state(), company: { ...state.company, promoCooldown: 12 } };
  if (!success) {
    s = applyDeltas(s, { reputation: -2, stress: 6 });
    s = pushLog(s, 'Promo packet deferred. "Next cycle."', 'bad');
    return { state: s, message: 'Promotion denied this cycle. Reputation took a nick.' };
  }
  const order = ['junior', 'mid', 'senior', 'staff', 'principal'] as const;
  const idx = order.indexOf(s.company.level as (typeof order)[number]);
  const next = order[Math.min(idx + 1, order.length - 1)];
  s = applyDeltas(s, { reputation: 6, cash: 300 });
  s = {
    ...s,
    company: {
      ...s.company,
      level: next,
      title: CAREER_TITLES[next],
      weeklyPay: CAREER_PAY[next],
    },
  };
  s = pushLog(s, `Promoted to ${CAREER_TITLES[next]}!`, 'good');
  return { state: s, message: `Congrats — ${CAREER_TITLES[next]} @ $${CAREER_PAY[next]}/wk.` };
}

export function interviewElsewhere(state: GameState): ActionResult {
  const rng = createRng(state.rngState);
  const chance = 0.35 + state.player.reputation / 180 - (state.company.employed ? 0 : -0.1);
  const success = rng.next() < clamp(chance, 0.15, 0.85);
  let s = { ...state, rngState: rng.state() };
  if (!success) {
    s = applyDeltas(s, { reputation: -3, stress: 8, health: -2 });
    s = pushLog(s, 'Onsite went sideways. Ghosted after the "fun" algorithms round.', 'bad');
    return { state: s, message: 'Interview failed. Dust off and recover.' };
  }
  const base = state.company.employed ? state.company.weeklyPay : 1600;
  const newPay = Math.round(base * (1.15 + rng.next() * 0.25));
  const level =
    !state.company.employed || state.company.level === 'unemployed'
      ? 'mid'
      : state.company.level;
  s = applyDeltas(s, { reputation: 4, stress: -4 });
  s = {
    ...s,
    company: {
      name: 'Cascade Systems',
      valuation: 150 + Math.floor(rng.next() * 200),
      stage: 'seriesB',
      employed: true,
      title: CAREER_TITLES[level],
      level,
      weeklyPay: newPay,
      equityPercent: 0.035 + rng.next() * 0.03,
      vestedPercent: 0,
      weeksEmployed: 0,
      cliffWeeks: 52,
      vestWeeks: 208,
      promoCooldown: 8,
    },
  };
  s = pushLog(s, `Accepted offer at Cascade Systems — $${newPay}/wk.`, 'good');
  return { state: s, message: `New job! Cascade Systems, $${newPay}/wk. Vesting cliff resets.` };
}

export function openSource(state: GameState): ActionResult {
  const rng = createRng(state.rngState);
  const tip = rng.next() > 0.7 ? 150 + Math.floor(rng.next() * 400) : 0;
  let s = applyDeltas(state, {
    reputation: 7,
    health: -5,
    stress: 4,
    cash: tip,
  });
  s = { ...s, rngState: rng.state() };
  s = pushLog(
    s,
    tip ? `OSS week — reputation up, and $${tip} in tips.` : 'OSS week — reputation up, sleep down.',
    'good',
  );
  return { state: s, message: tip ? `Shipped OSS. +rep, +$${tip}.` : 'Shipped OSS. Reputation climbs.' };
}

export function tradeStock(
  state: GameState,
  ticker: TickerId,
  side: 'buy' | 'sell',
  dollars: number,
): ActionResult {
  if (ticker === 'company' && state.company.stage !== 'ipo' && state.market.prices.company <= 0) {
    return { state, message: 'Company stock is private. Wait for IPO.' };
  }
  const price = state.market.prices[ticker];
  if (price <= 0) return { state, message: 'No market price available.' };
  const amount = Math.max(0, Math.floor(dollars));
  if (amount <= 0) return { state, message: 'Enter a positive dollar amount.' };

  if (side === 'buy') {
    if (state.player.cash < amount) return { state, message: 'Not enough cash.' };
    const shares = amount / price;
    const s: GameState = {
      ...state,
      player: { ...state.player, cash: Math.round(state.player.cash - amount) },
      market: {
        ...state.market,
        holdings: {
          ...state.market.holdings,
          [ticker]: { shares: state.market.holdings[ticker].shares + shares },
        },
      },
    };
    return {
      state: pushLog(s, `Bought $${amount} of ${ticker}.`, 'info'),
      message: `Bought ${shares.toFixed(2)} shares of ${ticker}.`,
    };
  }

  const held = state.market.holdings[ticker].shares;
  const value = held * price;
  const sellValue = Math.min(amount, Math.floor(value));
  if (sellValue <= 0 || held <= 0) return { state, message: 'Nothing to sell.' };
  const sharesSold = sellValue / price;
  const s: GameState = {
    ...state,
    player: { ...state.player, cash: Math.round(state.player.cash + sellValue) },
    market: {
      ...state.market,
      holdings: {
        ...state.market.holdings,
        [ticker]: { shares: Math.max(0, held - sharesSold) },
      },
    },
  };
  return {
    state: pushLog(s, `Sold $${sellValue} of ${ticker}.`, 'info'),
    message: `Sold $${sellValue} of ${ticker}.`,
  };
}

export function bankDeposit(state: GameState, amount: number): ActionResult {
  const a = Math.floor(amount);
  if (a <= 0 || state.player.cash < a) return { state, message: 'Invalid deposit.' };
  const s = {
    ...state,
    player: { ...state.player, cash: state.player.cash - a },
    bank: { ...state.bank, savings: state.bank.savings + a },
  };
  return { state: pushLog(s, `Deposited $${a} to savings.`, 'info'), message: `Deposited $${a}.` };
}

export function bankWithdraw(state: GameState, amount: number): ActionResult {
  const a = Math.floor(amount);
  if (a <= 0 || state.bank.savings < a) return { state, message: 'Invalid withdrawal.' };
  const s = {
    ...state,
    player: { ...state.player, cash: state.player.cash + a },
    bank: { ...state.bank, savings: state.bank.savings - a },
  };
  return { state: pushLog(s, `Withdrew $${a} from savings.`, 'info'), message: `Withdrew $${a}.` };
}

export function takeLoan(state: GameState, amount: number): ActionResult {
  const a = Math.floor(amount);
  if (a < 500 || a > 50000) return { state, message: 'Loan must be $500–$50,000.' };
  const s = {
    ...state,
    player: { ...state.player, cash: state.player.cash + a },
    bank: {
      ...state.bank,
      personalLoan: state.bank.personalLoan + a,
      personalLoanRate: Math.min(0.01, state.bank.personalLoanRate + 0.0005),
    },
  };
  return {
    state: pushLog(s, `Took personal loan $${a}. Rate ticks up.`, 'bad'),
    message: `Loan approved: $${a}. Spend wisely.`,
  };
}

export function payDebt(
  state: GameState,
  kind: 'student' | 'personal',
  amount: number,
): ActionResult {
  const a = Math.floor(amount);
  if (a <= 0 || state.player.cash < a) return { state, message: 'Cannot pay that amount.' };
  if (kind === 'student') {
    const pay = Math.min(a, state.bank.studentLoan);
    const s = {
      ...state,
      player: { ...state.player, cash: state.player.cash - pay },
      bank: { ...state.bank, studentLoan: Math.max(0, state.bank.studentLoan - pay) },
    };
    return { state: pushLog(s, `Paid $${pay} toward student loans.`, 'good'), message: `Paid $${pay}.` };
  }
  const pay = Math.min(a, state.bank.personalLoan);
  const s = {
    ...state,
    player: { ...state.player, cash: state.player.cash - pay },
    bank: { ...state.bank, personalLoan: Math.max(0, state.bank.personalLoan - pay) },
  };
  return { state: pushLog(s, `Paid $${pay} toward personal loan.`, 'good'), message: `Paid $${pay}.` };
}

export function hospitalVisit(
  state: GameState,
  tier: 'basic' | 'full' | 'burnout',
): ActionResult {
  const before = state.player.health;
  const s = treatHealth(state, tier);
  const healed = s.player.health - before;
  const msg = `Treated (${tier}). Health ${before} → ${s.player.health} (+${healed}).`;
  return { state: pushLog(s, msg, 'good'), message: msg };
}

export function rentHousing(state: GameState, tier: HousingTier): ActionResult {
  const opt = HOUSING_OPTIONS[tier];
  if (tier === 'shared' && state.housing.owned) {
    return { state, message: 'Sell first if you want to go back to renting shared.' };
  }
  if (state.housing.owned) {
    return { state, message: 'You own property. Sell or keep paying the mortgage.' };
  }
  const s = {
    ...state,
    housing: {
      tier,
      owned: false,
      weeklyCost: opt.weeklyRent,
      propertyValue: 0,
      mortgageBalance: 0,
      label: opt.label,
    },
  };
  return {
    state: pushLog(s, `Now renting: ${opt.label} ($${opt.weeklyRent}/wk).`, 'info'),
    message: `Rented ${opt.label}.`,
  };
}

export function buyHousing(state: GameState, tier: HousingTier): ActionResult {
  const opt = HOUSING_OPTIONS[tier];
  if (!opt.buyPrice) return { state, message: 'That tier is rent-only.' };
  const down = Math.round(opt.buyPrice * 0.2);
  const liquid = state.player.cash + state.bank.savings;
  if (liquid < down) {
    return { state, message: `Need $${down.toLocaleString()} down payment (20%).` };
  }
  // debt-to-income soft check
  if (state.bank.personalLoan + state.bank.studentLoan > state.company.weeklyPay * 40) {
    return { state, message: 'Underwriter frowned at your debt load. Pay down loans first.' };
  }
  let cash = state.player.cash;
  let savings = state.bank.savings;
  if (cash >= down) cash -= down;
  else {
    const need = down - cash;
    cash = 0;
    savings -= need;
  }
  const mortgage = opt.buyPrice - down;
  const s: GameState = {
    ...state,
    player: { ...state.player, cash: Math.round(cash) },
    bank: { ...state.bank, savings: Math.round(savings) },
    housing: {
      tier,
      owned: true,
      weeklyCost: opt.weeklyMortgage,
      propertyValue: opt.buyPrice,
      mortgageBalance: mortgage,
      label: opt.label,
    },
    flags: { ...state.flags, housePoor: true },
  };
  return {
    state: pushLog(s, `Bought ${opt.label}! Down $${down.toLocaleString()}.`, 'good'),
    message: `Keys to ${opt.label}. Mortgage $${opt.weeklyMortgage}/wk.`,
  };
}

export function sellHousing(state: GameState): ActionResult {
  if (!state.housing.owned) return { state, message: 'You do not own property.' };
  const equity = state.housing.propertyValue - state.housing.mortgageBalance;
  const proceeds = Math.max(0, Math.round(equity * 0.94)); // closing costs
  const shared = HOUSING_OPTIONS.shared;
  const s: GameState = {
    ...state,
    player: { ...state.player, cash: state.player.cash + proceeds },
    housing: {
      tier: 'shared',
      owned: false,
      weeklyCost: shared.weeklyRent,
      propertyValue: 0,
      mortgageBalance: 0,
      label: shared.label,
    },
  };
  return {
    state: pushLog(s, `Sold property. Net proceeds $${proceeds.toLocaleString()}.`, 'info'),
    message: `Sold. +$${proceeds.toLocaleString()} cash. Back to ${shared.label}.`,
  };
}
