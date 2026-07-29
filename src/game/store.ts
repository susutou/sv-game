import { create } from 'zustand';
import type { GameState, LocationId, HousingTier, TickerId, CharacterId } from './types';
import { createInitialState, netWorth, portfolioValue, equityValue, hospitalCost } from './economy';
import { beginWeek, dismissEvents, resolveAfterAction, scoreRun } from './loop';
import * as actions from './locations/actions';
import * as people from './locations/characters';
import { createCharactersState } from './characters';

const SAVE_KEY = 'valley-rise-save-v1';

type Store = {
  state: GameState | null;
  activeLocation: LocationId | null;
  activeCharacter: CharacterId | null;
  toast: string | null;
  newGame: (name: string) => void;
  loadGame: () => boolean;
  saveGame: () => void;
  openLocation: (id: LocationId) => void;
  openCharacter: (id: CharacterId) => void;
  closeLocation: () => void;
  clearToast: () => void;
  dismissEventModal: () => void;
  doWork: () => void;
  doOverwork: () => void;
  doPromo: () => void;
  doInterview: () => void;
  doOSS: () => void;
  doTrade: (ticker: TickerId, side: 'buy' | 'sell', dollars: number) => void;
  doDeposit: (n: number) => void;
  doWithdraw: (n: number) => void;
  doLoan: (n: number) => void;
  doPayDebt: (kind: 'student' | 'personal', n: number) => void;
  doHospital: (tier: 'basic' | 'full' | 'burnout') => void;
  doRent: (tier: HousingTier) => void;
  doBuy: (tier: HousingTier) => void;
  doSellHome: () => void;
  doCharacterAction: (action: string) => void;
  stats: () => {
    netWorth: number;
    portfolio: number;
    equity: number;
    hospitalCost: number;
    score: number;
  } | null;
};

function persist(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function migrate(s: GameState): GameState {
  const tickers = Object.keys(s.market?.holdings ?? {}) as (keyof typeof s.market.holdings)[];
  for (const t of tickers) {
    const h = s.market.holdings[t] as { shares: number; avgCost?: number };
    if (h && h.avgCost == null) h.avgCost = 0;
  }
  if (!s.characters) {
    s = { ...s, characters: createCharactersState(s.relationship?.partnerName ?? null) };
  }
  return people.ensureCharacters(s);
}

function afterAction(set: (p: Partial<Store>) => void, result: actions.ActionResult) {
  const s = resolveAfterAction(result.state);
  set({ state: s, toast: result.message, activeLocation: null, activeCharacter: null });
  persist(s);
}

const CHARACTER_ACTIONS: Record<string, (s: GameState) => actions.ActionResult> = {
  girlfriendCoffee: people.girlfriendCoffee,
  girlfriendDateNight: people.girlfriendDateNight,
  girlfriendSeriousTalk: people.girlfriendSeriousTalk,
  wifeDinner: people.wifeDinner,
  wifePlanFuture: people.wifePlanFuture,
  wifeDateNight: people.wifeDateNight,
  wifeArgue: people.wifeArgue,
  colleagueLunch: people.colleagueLunch,
  colleaguePair: people.colleaguePair,
  colleagueGossip: people.colleagueGossip,
  colleagueHelp: people.colleagueHelp,
  bossOneOnOne: people.bossOneOnOne,
  bossAskRaise: people.bossAskRaise,
  bossTakeBlame: people.bossTakeBlame,
  bossSkipLevel: people.bossSkipLevel,
  friendHangout: people.friendHangout,
  friendTrip: people.friendTrip,
  friendLend: people.friendLend,
  friendBrainstorm: people.friendBrainstorm,
};

export const useGame = create<Store>((set, get) => ({
  state: null,
  activeLocation: null,
  activeCharacter: null,
  toast: null,

  newGame: (name) => {
    let s = createInitialState(name);
    s = beginWeek(s);
    set({
      state: s,
      activeLocation: null,
      activeCharacter: null,
      toast: 'Week 1. The grind begins.',
    });
    persist(s);
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = migrate(JSON.parse(raw) as GameState);
      set({ state: s, activeLocation: null, activeCharacter: null, toast: 'Save loaded.' });
      return true;
    } catch {
      return false;
    }
  },

  saveGame: () => {
    const s = get().state;
    if (s) persist(s);
    set({ toast: 'Game saved.' });
  },

  openLocation: (id) => {
    const s = get().state;
    if (!s || s.phase === 'gameover' || s.phase === 'victory') return;
    if (s.forcedHospital && id !== 'hospital') {
      set({ toast: 'Health < 50%. Hospital only this week.' });
      return;
    }
    if (s.phase === 'event') return;
    set({
      activeLocation: id,
      activeCharacter: null,
      state: { ...s, phase: 'location' },
    });
  },

  openCharacter: (id) => {
    const s = get().state;
    if (!s || s.phase === 'gameover' || s.phase === 'victory') return;
    if (s.forcedHospital) {
      set({ toast: 'Health < 50%. Hospital only this week.' });
      return;
    }
    if (s.phase === 'event') return;
    set({
      activeCharacter: id,
      activeLocation: null,
      state: { ...s, phase: 'character' },
    });
  },

  closeLocation: () => {
    const s = get().state;
    if (!s) return;
    set({
      activeLocation: null,
      activeCharacter: null,
      state: {
        ...s,
        phase: s.forcedHospital ? 'hospital-forced' : 'playing',
      },
    });
  },

  clearToast: () => set({ toast: null }),

  dismissEventModal: () => {
    const s = get().state;
    if (!s) return;
    const next = dismissEvents(s);
    set({ state: next, toast: `Week ${Math.min(next.week, next.maxWeeks)} begins.` });
    persist(next);
  },

  doWork: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.workNormal(s));
  },
  doOverwork: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.overwork(s));
  },
  doPromo: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.askPromotion(s));
  },
  doInterview: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.interviewElsewhere(s));
  },
  doOSS: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.openSource(s));
  },
  doTrade: (ticker, side, dollars) => {
    const s = get().state;
    if (!s) return;
    const r = actions.tradeStock(s, ticker, side, dollars);
    if (r.message.startsWith('Bought') || r.message.startsWith('Sold')) {
      afterAction(set, r);
    } else {
      set({ toast: r.message, state: r.state });
    }
  },
  doDeposit: (n) => {
    const s = get().state;
    if (!s) return;
    const r = actions.bankDeposit(s, n);
    if (r.message.startsWith('Deposited')) afterAction(set, r);
    else set({ toast: r.message });
  },
  doWithdraw: (n) => {
    const s = get().state;
    if (!s) return;
    const r = actions.bankWithdraw(s, n);
    if (r.message.startsWith('Withdrew')) afterAction(set, r);
    else set({ toast: r.message });
  },
  doLoan: (n) => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.takeLoan(s, n));
  },
  doPayDebt: (kind, n) => {
    const s = get().state;
    if (!s) return;
    const r = actions.payDebt(s, kind, n);
    if (r.message.startsWith('Paid')) afterAction(set, r);
    else set({ toast: r.message });
  },
  doHospital: (tier) => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.hospitalVisit(s, tier));
  },
  doRent: (tier) => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.rentHousing(s, tier));
  },
  doBuy: (tier) => {
    const s = get().state;
    if (!s) return;
    const r = actions.buyHousing(s, tier);
    if (r.message.startsWith('Keys')) afterAction(set, r);
    else set({ toast: r.message });
  },
  doSellHome: () => {
    const s = get().state;
    if (!s) return;
    afterAction(set, actions.sellHousing(s));
  },

  doCharacterAction: (action) => {
    const s = get().state;
    if (!s) return;
    const fn = CHARACTER_ACTIONS[action];
    if (!fn) {
      set({ toast: 'Unknown action.' });
      return;
    }
    afterAction(set, fn(s));
  },

  stats: () => {
    const s = get().state;
    if (!s) return null;
    return {
      netWorth: netWorth(s),
      portfolio: portfolioValue(s),
      equity: equityValue(s),
      hospitalCost: hospitalCost(s),
      score: scoreRun(s),
    };
  },
}));
