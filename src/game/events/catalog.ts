import type { EventResult, GameState } from '../types';
import { createRng, pickWeighted, clamp } from '../rng';
import { CAREER_PAY, CAREER_TITLES } from '../types';
import { applyDeltas, equityValue, pushLog } from '../economy';
import { EXTRA_EVENTS } from './extraEvents';
import { CHARACTER_EVENTS } from './characterEvents';

export type EventDef = {
  id: string;
  title: string;
  description: (s: GameState) => string;
  weight: (s: GameState) => number;
  apply: (s: GameState, rng: { next: () => number }) => { state: GameState; result: EventResult };
};

const PARTNERS = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Avery'];

function result(
  id: string,
  title: string,
  description: string,
  deltas: EventResult['deltas'],
  flags?: EventResult['flags'],
): EventResult {
  return { id, title, description, deltas, flags };
}

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'overwork_success',
    title: 'Ship It Friday',
    description: (s) =>
      `${s.company.name} hits the deadline. Your manager notices — and so does your spine.`,
    weight: (s) => (s.company.employed ? 8 + s.player.stress / 10 : 0),
    apply: (s) => {
      const deltas = { cash: 400, reputation: 6, health: -8, stress: 12 };
      const description = `${s.company.name} hits the deadline. Your manager notices — and so does your spine.`;
      return {
        state: applyDeltas(s, deltas),
        result: result('overwork_success', 'Ship It Friday', description, deltas),
      };
    },
  },
  {
    id: 'oncall_nightmare',
    title: 'On-Call Nightmare',
    description: () =>
      'PagerDuty sings at 3am. A cascading outage. Coffee becomes a personality.',
    weight: (s) => (s.company.employed ? 6 + s.player.stress / 8 : 0),
    apply: (s) => {
      const deltas = { reputation: 3, health: -12, stress: 18 };
      return {
        state: applyDeltas(s, deltas),
        result: result(
          'oncall_nightmare',
          'On-Call Nightmare',
          'PagerDuty sings at 3am. A cascading outage. Coffee becomes a personality.',
          deltas,
        ),
      };
    },
  },
  {
    id: 'promotion',
    title: 'Unexpected Promotion',
    description: (s) => `Your skip-level pulls you aside. "${s.player.name}, let's talk level."`,
    weight: (s) =>
      s.company.employed && s.company.level !== 'principal' && s.company.level !== 'founder'
        ? Math.max(0, (s.player.reputation - 55) / 8)
        : 0,
    apply: (s) => {
      const order = ['junior', 'mid', 'senior', 'staff', 'principal'] as const;
      const idx = order.indexOf(s.company.level as (typeof order)[number]);
      const next = order[Math.min(idx + 1, order.length - 1)];
      const deltas = { reputation: 8, cash: 200, stress: 5 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: {
          ...state.company,
          level: next,
          title: CAREER_TITLES[next],
          weeklyPay: CAREER_PAY[next],
          promoCooldown: 16,
        },
      };
      return {
        state,
        result: result(
          'promotion',
          'Unexpected Promotion',
          `You are now ${CAREER_TITLES[next]}. Pay bumps to ${CAREER_PAY[next]}/wk.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'layoff',
    title: 'Restructuring',
    description: (s) =>
      `${s.company.name} "optimizes headcount." Your badge stops working at 4:59pm.`,
    weight: (s) => {
      if (!s.company.employed) return 0;
      let w = 2;
      if (s.player.reputation < 40) w += 6;
      if (s.player.health < 50) w += 3;
      if (s.company.valuation < 40) w += 5;
      return w;
    },
    apply: (s) => {
      const severance = Math.round(s.company.weeklyPay * 4);
      const deltas = { cash: severance, reputation: -10, stress: 25, health: -5 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: {
          ...state.company,
          employed: false,
          level: 'unemployed',
          title: CAREER_TITLES.unemployed,
          weeklyPay: 0,
          vestedPercent:
            state.company.weeksEmployed >= state.company.cliffWeeks
              ? state.company.vestedPercent
              : 0,
        },
        flags: { ...state.flags, laidOffOnce: true },
      };
      return {
        state,
        result: result(
          'layoff',
          'Restructuring',
          `Laid off. Severance: $${severance}. Equity cliff matters now.`,
          deltas,
          { laidOffOnce: true },
        ),
      };
    },
  },
  {
    id: 'recruiter',
    title: 'Recruiter Inception',
    description: () =>
      'LinkedIn: "Saw your profile — exciting role, competitive comp, dog-friendly office."',
    weight: (s) => (s.player.reputation > 50 ? 5 : 2),
    apply: (s, rng) => {
      if (rng.next() > 0.45 || s.company.employed === false) {
        const bump = 200 + Math.floor(rng.next() * 400);
        const deltas = { cash: bump, reputation: 2 };
        return {
          state: applyDeltas(s, deltas),
          result: result(
            'recruiter',
            'Side Interview Payday',
            `You take a "coffee chat" that turns into a paid consulting gig (+$${bump}).`,
            deltas,
          ),
        };
      }
      const deltas = { reputation: 1 };
      return {
        state: applyDeltas(s, deltas),
        result: result(
          'recruiter',
          'Recruiter Noise',
          'You archive 14 identical messages. Reputation barely notices.',
          deltas,
        ),
      };
    },
  },
  {
    id: 'job_switch_offer',
    title: 'Competing Offer',
    description: () => 'A Series B rival waves a 30% bump and refresh grant.',
    weight: (s) => (s.company.employed && s.player.reputation > 60 ? 4 : 0),
    apply: (s) => {
      const newPay = Math.round(s.company.weeklyPay * 1.3);
      const deltas = { reputation: 4, stress: -5, health: 2 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: {
          ...state.company,
          name: 'Northstar AI',
          stage: 'seriesB',
          valuation: 220,
          weeklyPay: newPay,
          equityPercent: 0.04,
          vestedPercent: 0,
          weeksEmployed: 0,
          cliffWeeks: 52,
          title: state.company.title,
        },
      };
      return {
        state,
        result: result(
          'job_switch_offer',
          'You Jump Ship',
          `Welcome to Northstar AI. Pay ${newPay}/wk. Vesting resets — classic Valley.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'ipo',
    title: 'S-1 Filed',
    description: (s) => `${s.company.name} confetti in the all-hands. Lockup jokes intensify.`,
    weight: (s) =>
      s.company.employed &&
      (s.company.stage === 'seriesB' || s.company.stage === 'seriesC') &&
      s.company.valuation > 500
        ? 3
        : s.company.valuation > 900
          ? 5
          : 0.5,
    apply: (s) => {
      const price = Math.max(12, Math.round(s.company.valuation / 20));
      const deltas = { reputation: 12, stress: 8 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: { ...state.company, stage: 'ipo' },
        market: {
          ...state.market,
          prices: { ...state.market.prices, company: price },
        },
        flags: { ...state.flags, ipoHappened: true, unicornRider: true },
      };
      // convert vested equity to tradable shares (simplified)
      const shares = Math.floor(equityValue(s) / Math.max(1, price));
      const prev = state.market.holdings.company;
      const newShares = prev.shares + shares;
      const avgCost =
        newShares <= 0
          ? 0
          : (prev.shares * (prev.avgCost || 0) + shares * price) / newShares;
      state = {
        ...state,
        market: {
          ...state.market,
          holdings: {
            ...state.market.holdings,
            company: { shares: newShares, avgCost },
          },
        },
        company: { ...state.company, equityPercent: 0, vestedPercent: 0 },
      };
      return {
        state,
        result: result(
          'ipo',
          'IPO Day',
          `Shares open around $${price}. Your vested equity is now tradable (lockup hand-waved).`,
          deltas,
          { ipoHappened: true, unicornRider: true },
        ),
      };
    },
  },
  {
    id: 'acquisition',
    title: 'Acqui-Hire Rumors → Real',
    description: (s) => `Big Tech swallows ${s.company.name}. Golden handcuffs glitter.`,
    weight: (s) =>
      s.company.employed && s.company.stage !== 'ipo' && s.company.valuation > 100 ? 2.5 : 0,
    apply: (s) => {
      const payout = Math.round(equityValue(s) * 0.7);
      const deltas = { cash: payout, reputation: 6, stress: -10 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: {
          ...state.company,
          stage: 'acquired',
          name: `${state.company.name} (acq.)`,
          equityPercent: 0,
          vestedPercent: 0,
          weeklyPay: Math.round(state.company.weeklyPay * 1.15),
        },
        flags: { ...state.flags, unicornRider: true },
      };
      return {
        state,
        result: result(
          'acquisition',
          'Acquired',
          `Cash-out (after haircut): $${payout.toLocaleString()}. You stay on under new logos.`,
          deltas,
          { unicornRider: true },
        ),
      };
    },
  },
  {
    id: 'crypto_moon',
    title: 'Crypto Moonshot',
    description: () => 'CT is unhinged. Your group chat invents new emojis for "number go up."',
    weight: () => 4,
    apply: (s, rng) => {
      const mult = 1.25 + rng.next() * 0.6;
      const prices = { ...s.market.prices, crypto: Math.round(s.market.prices.crypto * mult) };
      const held = s.market.holdings.crypto.shares;
      const deltas = held > 0 ? { reputation: 2 } : { reputation: 0 };
      return {
        state: { ...applyDeltas(s, deltas), market: { ...s.market, prices } },
        result: result(
          'crypto_moon',
          'Crypto Moonshot',
          `Crypto index ×${mult.toFixed(2)}. ${held ? 'Your bags notice.' : 'You watch from the sidelines.'}`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'crypto_crash',
    title: 'Crypto Contagion',
    description: () => 'An exchange "pauses withdrawals." Charts look like ski slopes.',
    weight: () => 3.5,
    apply: (s, rng) => {
      const mult = 0.45 + rng.next() * 0.35;
      const prices = { ...s.market.prices, crypto: Math.max(1, Math.round(s.market.prices.crypto * mult)) };
      const held = s.market.holdings.crypto.shares;
      const deltas = held > 0 ? { reputation: -2, stress: 10 } : { stress: 2 };
      return {
        state: { ...applyDeltas(s, deltas), market: { ...s.market, prices } },
        result: result(
          'crypto_crash',
          'Crypto Contagion',
          `Crypto index ×${mult.toFixed(2)}. ${held ? 'Unrealized pain.' : 'Dodged.'}`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'market_rally',
    title: 'Risk-On Rally',
    description: () => 'Fed vibes dovish. Tech leads. CNBC discovers AI again.',
    weight: () => 5,
    apply: (s, rng) => {
      const bump = (v: number) => Math.round(v * (1.04 + rng.next() * 0.08));
      const prices = {
        ...s.market.prices,
        bigtech: bump(s.market.prices.bigtech),
        index: bump(s.market.prices.index),
        meme: bump(s.market.prices.meme),
      };
      return {
        state: { ...s, market: { ...s.market, prices } },
        result: result('market_rally', 'Risk-On Rally', 'Equities grind higher this week.', {}),
      };
    },
  },
  {
    id: 'recession',
    title: 'Macro Scare',
    description: () => 'Layoff headlines. Hiring freezes. Your RSUs feel philosophical.',
    weight: () => 3,
    apply: (s, rng) => {
      const drop = (v: number) => Math.max(1, Math.round(v * (0.88 - rng.next() * 0.08)));
      const prices = {
        ...s.market.prices,
        bigtech: drop(s.market.prices.bigtech),
        index: drop(s.market.prices.index),
        meme: drop(s.market.prices.meme),
      };
      const val = Math.max(20, Math.round(s.company.valuation * (0.85 - rng.next() * 0.1)));
      const deltas = { stress: 8, reputation: -2 };
      return {
        state: {
          ...applyDeltas(s, deltas),
          market: { ...s.market, prices },
          company: { ...s.company, valuation: val },
        },
        result: result(
          'recession',
          'Macro Scare',
          `Markets slip. ${s.company.name} marked down to $${val}M.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'dating',
    title: 'Match → IRL',
    description: () => 'A coffee in Hayes Valley. The Wi-Fi password is a red flag, but the convo isn\'t.',
    weight: (s) => (s.relationship.status === 'single' ? 5 + s.player.reputation / 25 : 0),
    apply: (s, rng) => {
      const partner = PARTNERS[Math.floor(rng.next() * PARTNERS.length)];
      const deltas = { cash: -120, health: 4, stress: -8, reputation: 2 };
      let state = {
        ...applyDeltas(s, deltas),
        relationship: { status: 'dating' as const, partnerName: partner, weeksTogether: 0 },
      };
      state = {
        ...state,
        characters: {
          ...state.characters,
          girlfriend: { name: partner, affinity: 60, met: true },
          wife: { ...state.characters.wife, name: partner },
        },
      };
      return {
        state,
        result: result(
          'dating',
          'Now Dating',
          `You and ${partner} are a thing. Calendar Tetris begins.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'engagement',
    title: 'Ring Economics',
    description: (s) =>
      `${s.relationship.partnerName ?? 'Your partner'} says yes. Your budget says "series seed."`,
    weight: (s) =>
      s.relationship.status === 'dating' && s.relationship.weeksTogether > 20
        ? 3 + s.player.cash / 50000
        : 0,
    apply: (s) => {
      const cost = -3500;
      const deltas = { cash: cost, reputation: 5, stress: 5, health: 3 };
      const state = {
        ...applyDeltas(s, deltas),
        relationship: { ...s.relationship, status: 'engaged' as const },
      };
      return {
        state,
        result: result('engagement', 'Engaged', `Down $${Math.abs(cost)} and up a future.`, deltas),
      };
    },
  },
  {
    id: 'wedding',
    title: 'Wedding Week',
    description: () => 'Napa light, friends flying in, OpenTable regrets.',
    weight: (s) => (s.relationship.status === 'engaged' ? 6 : 0),
    apply: (s) => {
      const cost = -12000;
      const deltas = { cash: cost, reputation: 8, stress: -5, health: 2 };
      const partner = s.relationship.partnerName ?? s.characters.girlfriend.name;
      const state = {
        ...applyDeltas(s, deltas),
        relationship: { ...s.relationship, status: 'married' as const },
        flags: { ...s.flags, marriedOnce: true },
        characters: {
          ...s.characters,
          wife: {
            name: partner,
            affinity: Math.max(s.characters.girlfriend.affinity, s.characters.wife.affinity, 70),
            met: true,
          },
        },
      };
      return {
        state,
        result: result(
          'wedding',
          'Married',
          `Vows exchanged. Bank account lighter by $${Math.abs(cost).toLocaleString()}.`,
          deltas,
          { marriedOnce: true },
        ),
      };
    },
  },
  {
    id: 'divorce',
    title: 'Irreconcilable Calendars',
    description: () => 'Two careers, one lease, zero bandwidth. Lawyers enter the chat.',
    weight: (s) =>
      s.relationship.status === 'married' && s.player.stress > 60 ? 3 : s.relationship.status === 'married' ? 0.8 : 0,
    apply: (s) => {
      const cost = -8000;
      const deltas = { cash: cost, reputation: -6, stress: 20, health: -8 };
      const state = {
        ...applyDeltas(s, deltas),
        relationship: { status: 'divorced' as const, partnerName: null, weeksTogether: 0 },
        characters: {
          ...s.characters,
          wife: { ...s.characters.wife, affinity: 15, met: true },
          girlfriend: { ...s.characters.girlfriend, affinity: 20, met: false },
        },
      };
      return {
        state,
        result: result('divorce', 'Divorced', `Settlement hit: $${Math.abs(cost).toLocaleString()}.`, deltas),
      };
    },
  },
  {
    id: 'flu',
    title: 'Office Flu',
    description: () => 'Open floor plan meets February. You become a vector.',
    weight: (s) => 3 + (100 - s.player.health) / 20,
    apply: (s) => {
      const deltas = { health: -15, stress: 5, cash: -80 };
      return {
        state: applyDeltas(s, deltas),
        result: result('flu', 'Office Flu', 'Sick days, DoorDash, and Slack guilt.', deltas),
      };
    },
  },
  {
    id: 'burnout',
    title: 'Burnout Spiral',
    description: () => 'You reread the same PR for 40 minutes. Nothing lands.',
    weight: (s) => (s.player.stress > 50 ? 4 + s.player.stress / 15 : 1),
    apply: (s) => {
      const deltas = { health: -18, reputation: -4, stress: 10 };
      return {
        state: applyDeltas(s, deltas),
        result: result('burnout', 'Burnout Spiral', 'Health tanks. Performance review foreshadowing.', deltas),
      };
    },
  },
  {
    id: 'gym_streak',
    title: 'Gym Arc',
    description: () => '5am Club. Protein. Somehow fewer meetings feel fatal.',
    weight: (s) => (s.player.health < 85 ? 4 : 2),
    apply: (s) => {
      const deltas = { health: 10, stress: -12, cash: -60, reputation: 1 };
      return {
        state: applyDeltas(s, deltas),
        result: result('gym_streak', 'Gym Arc', 'Endorphins > standups.', deltas),
      };
    },
  },
  {
    id: 'viral_post',
    title: 'Viral Engineering Post',
    description: () => 'Your thread on "why we left k8s" hits Hacker News front page.',
    weight: (s) => 2 + s.player.reputation / 40,
    apply: (s) => {
      const deltas = { reputation: 14, stress: 4 };
      return {
        state: applyDeltas(s, deltas),
        result: result('viral_post', 'Viral Engineering Post', 'Recruiters multiply. Ego carefully managed.', deltas),
      };
    },
  },
  {
    id: 'twitter_drama',
    title: 'Public Squabble',
    description: () => 'You quote-tweet the wrong infra take. Ratio inbound.',
    weight: () => 2,
    apply: (s) => {
      const deltas = { reputation: -12, stress: 8 };
      return {
        state: applyDeltas(s, deltas),
        result: result('twitter_drama', 'Public Squabble', 'Main character of the wrong day.', deltas),
      };
    },
  },
  {
    id: 'rent_hike',
    title: 'Rent Hike',
    description: () => 'Landlord cites "market comps." Your room stays the same size.',
    weight: (s) => (!s.housing.owned ? 3 : 0),
    apply: (s) => {
      const hike = Math.round(s.housing.weeklyCost * 0.08);
      const state = {
        ...s,
        housing: { ...s.housing, weeklyCost: s.housing.weeklyCost + hike },
      };
      return {
        state,
        result: result(
          'rent_hike',
          'Rent Hike',
          `Weekly housing +$${hike}. Welcome to the Bay.`,
          {},
        ),
      };
    },
  },
  {
    id: 'valuation_up',
    title: 'Up Round',
    description: (s) => `${s.company.name} closes a hot round. Softbank energy (metaphorically).`,
    weight: (s) => (s.company.employed && s.company.stage !== 'dead' ? 4 : 0),
    apply: (s, rng) => {
      const mult = 1.3 + rng.next() * 0.7;
      const valuation = Math.round(s.company.valuation * mult);
      let stage = s.company.stage;
      if (valuation > 200 && stage === 'seriesA') stage = 'seriesB';
      if (valuation > 600 && stage === 'seriesB') stage = 'seriesC';
      const deltas = { reputation: 3 };
      return {
        state: {
          ...applyDeltas(s, deltas),
          company: { ...s.company, valuation, stage },
        },
        result: result(
          'valuation_up',
          'Up Round',
          `Valuation → $${valuation}M (${stage}). Paper wealth vibes.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'student_loan_relief',
    title: 'Refinance Win',
    description: () => 'A fintech ads finally pays off — lower rate on the diploma debt.',
    weight: (s) => (s.bank.studentLoan > 1000 ? 2 : 0),
    apply: (s) => {
      const cut = Math.round(s.bank.studentLoan * 0.05);
      const state = {
        ...s,
        bank: { ...s.bank, studentLoan: Math.max(0, s.bank.studentLoan - cut) },
      };
      return {
        state,
        result: result(
          'student_loan_relief',
          'Refinance Win',
          `Student loan principal −$${cut.toLocaleString()}.`,
          {},
        ),
      };
    },
  },
  {
    id: 'parental_visit',
    title: 'Parents in Town',
    description: () => 'They want to see the office. You show them the microkitchen.',
    weight: () => 2,
    apply: (s) => {
      const deltas = { cash: -250, stress: -5, reputation: 1, health: 2 };
      return {
        state: applyDeltas(s, deltas),
        result: result('parental_visit', 'Parents in Town', 'Pride, dim sum, and a lecture on housing.', deltas),
      };
    },
  },
  {
    id: 'side_project',
    title: 'Weekend Shipping',
    description: () => 'An indie tool hits $1k MRR for a hot minute.',
    weight: (s) => (s.player.health > 40 ? 3 : 1),
    apply: (s, rng) => {
      const cash = 300 + Math.floor(rng.next() * 1200);
      const deltas = { cash, reputation: 5, health: -6, stress: 6 };
      return {
        state: applyDeltas(s, deltas),
        result: result('side_project', 'Weekend Shipping', `Side income +$${cash}. Sleep −some.`, deltas),
      };
    },
  },
  ...EXTRA_EVENTS,
  ...CHARACTER_EVENTS,
];

export function rollEvents(state: GameState, count = 1): { state: GameState; events: EventResult[] } {
  const rng = createRng(state.rngState);
  const events: EventResult[] = [];
  let s = state;
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    const weighted = EVENT_DEFS.filter((e) => !used.has(e.id)).map((e) => ({
      item: e,
      weight: Math.max(0, e.weight(s)),
    }));
    const def = pickWeighted(rng, weighted);
    if (!def) break;
    used.add(def.id);
    const { state: next, result: ev } = def.apply(s, rng);
    s = next;
    events.push(ev);
  }

  return { state: { ...s, rngState: rng.state() }, events };
}

export function applyEventToState(state: GameState, ev: EventResult): GameState {
  let s = pushLog(state, `${ev.title}: ${ev.description}`, 'event');
  if (ev.flags) {
    s = { ...s, flags: { ...s.flags, ...ev.flags } };
  }
  // deltas already applied in event.apply; ensure clamps
  s = {
    ...s,
    player: {
      ...s.player,
      health: clamp(s.player.health, 0, 100),
      reputation: clamp(s.player.reputation, 0, 100),
      stress: clamp(s.player.stress, 0, 100),
    },
  };
  return s;
}
