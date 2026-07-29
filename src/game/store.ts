import { create } from 'zustand';
import type { GameState, PhoneAppId, TickerId, PoiId, NpcId } from './types';
import { createInitialState, netWorth, portfolioValue, equityPaper, formatMoney } from './economy';
import { tradeBuy, tradeSell, advanceHour, doWork, healAtHospital } from './actions';

const SAVE_KEY = 'valley-rise-ow-v1';

type UIState = {
  phoneOpen: boolean;
  phoneApp: PhoneAppId;
  toast: string | null;
  interactLabel: string | null;
  dialogue: { speaker: string; text: string; options?: { label: string; action: string }[] } | null;
  title: boolean;
};

type Store = UIState & {
  state: GameState | null;
  newGame: (name: string) => void;
  loadGame: () => boolean;
  saveGame: () => void;
  setPhoneOpen: (open: boolean) => void;
  setPhoneApp: (app: PhoneAppId) => void;
  clearToast: () => void;
  setInteractLabel: (label: string | null) => void;
  setDialogue: (d: Store['dialogue']) => void;
  setPosition: (p: [number, number, number]) => void;
  tick: (dtHours: number) => void;
  buy: (ticker: TickerId, dollars: number) => void;
  sell: (ticker: TickerId, dollars: number) => void;
  work: (crunch?: boolean) => void;
  hospital: (tier: 'basic' | 'full') => void;
  bankDeposit: (n: number) => void;
  bankWithdraw: (n: number) => void;
  talkNpc: (id: NpcId) => void;
  resolveDialogue: (action: string) => void;
  interactPoi: (id: PoiId) => void;
  sleep: () => void;
  markMessagesRead: () => void;
  stats: () => { netWorth: number; portfolio: number; equity: number } | null;
};

function persist(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function rng() {
  return Math.random();
}

export const useGame = create<Store>((set, get) => ({
  state: null,
  phoneOpen: false,
  phoneApp: 'home',
  toast: null,
  interactLabel: null,
  dialogue: null,
  title: true,

  newGame: (name) => {
    const s = createInitialState(name);
    set({
      state: s,
      title: false,
      phoneOpen: false,
      phoneApp: 'home',
      toast: 'Welcome to the Valley. Press P for phone.',
      dialogue: null,
    });
    persist(s);
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw) as GameState;
      set({ state: s, title: false, toast: 'Save loaded.', phoneOpen: false });
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

  setPhoneOpen: (open) => set({ phoneOpen: open, phoneApp: open ? get().phoneApp : 'home' }),
  setPhoneApp: (app) => set({ phoneApp: app }),
  clearToast: () => set({ toast: null }),
  setInteractLabel: (label) => set({ interactLabel: label }),
  setDialogue: (d) => set({ dialogue: d }),

  setPosition: (p) => {
    const s = get().state;
    if (!s) return;
    set({ state: { ...s, position: p } });
  },

  tick: (dtHours) => {
    const s = get().state;
    if (!s || s.gameOver || s.victory || get().phoneOpen || get().dialogue) return;
    if (s.time.paused) return;
    const next = advanceHour(s, dtHours, rng);
    set({ state: next });
    if (next.gameOver) set({ toast: next.gameOver });
    if (next.victory) set({ toast: 'You survived a year in the Valley.' });
  },

  buy: (ticker, dollars) => {
    const s = get().state;
    if (!s) return;
    const r = tradeBuy(s, ticker, dollars);
    set({ state: r.state, toast: r.message });
    persist(r.state);
  },

  sell: (ticker, dollars) => {
    const s = get().state;
    if (!s) return;
    const r = tradeSell(s, ticker, dollars);
    set({ state: r.state, toast: r.message });
    persist(r.state);
  },

  work: (crunch = false) => {
    const s = get().state;
    if (!s) return;
    let next = doWork(s, crunch);
    next = advanceHour(next, crunch ? 3 : 2, rng);
    set({ state: next, toast: crunch ? 'Crunch complete.' : 'Work block done.', dialogue: null });
    persist(next);
  },

  hospital: (tier) => {
    const s = get().state;
    if (!s) return;
    let next = healAtHospital(s, tier);
    next = advanceHour(next, 2, rng);
    set({ state: next, toast: 'Feeling better.', dialogue: null });
    persist(next);
  },

  bankDeposit: (n) => {
    const s = get().state;
    if (!s || n <= 0 || s.vitals.cash < n) {
      set({ toast: 'Invalid deposit.' });
      return;
    }
    const next = {
      ...s,
      vitals: { ...s.vitals, cash: s.vitals.cash - n },
      bank: { ...s.bank, savings: s.bank.savings + n },
    };
    set({ state: next, toast: `Deposited ${formatMoney(n)}` });
    persist(next);
  },

  bankWithdraw: (n) => {
    const s = get().state;
    if (!s || n <= 0 || s.bank.savings < n) {
      set({ toast: 'Invalid withdrawal.' });
      return;
    }
    const next = {
      ...s,
      vitals: { ...s.vitals, cash: s.vitals.cash + n },
      bank: { ...s.bank, savings: s.bank.savings - n },
    };
    set({ state: next, toast: `Withdrew ${formatMoney(n)}` });
    persist(next);
  },

  talkNpc: (id) => {
    const s = get().state;
    if (!s) return;
    const npc = s.npcs[id];
    const lines: Record<NpcId, Store['dialogue']> = {
      boss: {
        speaker: npc.name,
        text: 'How are the tickets looking? We need that launch tight.',
        options: [
          { label: 'I\'ll crush it (work)', action: 'work' },
          { label: 'Ask about promo', action: 'ask-promo' },
          { label: 'Gotta run', action: 'close' },
        ],
      },
      colleague: {
        speaker: npc.name,
        text: 'Coffee? Also I rewrote your PR description. You\'re welcome.',
        options: [
          { label: 'Pair for an hour', action: 'pair' },
          { label: 'Gossip carefully', action: 'gossip' },
          { label: 'Later', action: 'close' },
        ],
      },
      friend: {
        speaker: npc.name,
        text: 'You look like a Jira ticket. Drink? Hike? Or stare at charts together?',
        options: [
          { label: 'Hang out (−stress)', action: 'hang' },
          { label: 'Open Trade together', action: 'open-trade' },
          { label: 'Rain check', action: 'close' },
        ],
      },
      partner: {
        speaker: s.relationship.partnerName ?? npc.name,
        text:
          s.relationship.status === 'single'
            ? 'We haven\'t met yet — try the cafe after work.'
            : 'Hey. Real talk: how many hours did Slack steal today?',
        options:
          s.relationship.status === 'single'
            ? [{ label: 'Leave', action: 'close' }]
            : [
                { label: 'Date night', action: 'date' },
                { label: 'Honest talk', action: 'talk' },
                { label: 'Love you, bye', action: 'close' },
              ],
      },
    };
    set({ dialogue: lines[id] });
  },

  resolveDialogue: (action) => {
    const s = get().state;
    if (!s) return;
    if (action === 'close') {
      set({ dialogue: null });
      return;
    }
    if (action === 'work') {
      get().work(false);
      return;
    }
    if (action === 'open-trade') {
      set({ dialogue: null, phoneOpen: true, phoneApp: 'trade', toast: 'Trade app opened.' });
      return;
    }
    let next = { ...s };
    if (action === 'ask-promo') {
      const ok = s.vitals.reputation > 60 && s.npcs.boss.affinity > 50;
      next = {
        ...s,
        vitals: {
          ...s.vitals,
          reputation: Math.min(100, s.vitals.reputation + (ok ? 5 : -2)),
          stress: Math.min(100, s.vitals.stress + (ok ? 2 : 8)),
        },
        npcs: {
          ...s.npcs,
          boss: { ...s.npcs.boss, affinity: Math.min(100, s.npcs.boss.affinity + (ok ? 4 : -3)) },
        },
      };
      set({
        state: next,
        dialogue: null,
        toast: ok ? 'Boss is open to a promo packet.' : 'Not yet — ship more.',
      });
      persist(next);
      return;
    }
    if (action === 'pair') {
      next = {
        ...s,
        vitals: {
          ...s.vitals,
          reputation: Math.min(100, s.vitals.reputation + 3),
          stress: Math.min(100, s.vitals.stress + 3),
        },
        npcs: {
          ...s.npcs,
          colleague: { ...s.npcs.colleague, affinity: Math.min(100, s.npcs.colleague.affinity + 5) },
        },
      };
      next = advanceHour(next, 1, rng);
      set({ state: next, dialogue: null, toast: 'Paired with Priya.' });
      persist(next);
      return;
    }
    if (action === 'gossip') {
      next = {
        ...s,
        vitals: { ...s.vitals, reputation: Math.max(0, s.vitals.reputation - 4), stress: Math.min(100, s.vitals.stress + 4) },
        npcs: {
          ...s.npcs,
          colleague: { ...s.npcs.colleague, affinity: Math.min(100, s.npcs.colleague.affinity + 2) },
          boss: { ...s.npcs.boss, affinity: Math.max(0, s.npcs.boss.affinity - 3) },
        },
      };
      set({ state: next, dialogue: null, toast: 'Gossip has a half-life.' });
      persist(next);
      return;
    }
    if (action === 'hang') {
      next = {
        ...s,
        vitals: {
          ...s.vitals,
          cash: s.vitals.cash - 40,
          stress: Math.max(0, s.vitals.stress - 12),
          health: Math.min(100, s.vitals.health + 4),
        },
        npcs: {
          ...s.npcs,
          friend: { ...s.npcs.friend, affinity: Math.min(100, s.npcs.friend.affinity + 5) },
        },
      };
      next = advanceHour(next, 2, rng);
      set({ state: next, dialogue: null, toast: 'Hangout restored HP of the soul.' });
      persist(next);
      return;
    }
    if (action === 'date') {
      next = {
        ...s,
        vitals: {
          ...s.vitals,
          cash: s.vitals.cash - 120,
          stress: Math.max(0, s.vitals.stress - 10),
          health: Math.min(100, s.vitals.health + 3),
        },
        npcs: {
          ...s.npcs,
          partner: { ...s.npcs.partner, affinity: Math.min(100, s.npcs.partner.affinity + 8) },
        },
      };
      next = advanceHour(next, 3, rng);
      set({ state: next, dialogue: null, toast: 'Date night logged.' });
      persist(next);
      return;
    }
    if (action === 'talk') {
      next = {
        ...s,
        vitals: { ...s.vitals, stress: Math.max(0, s.vitals.stress - 6) },
        npcs: {
          ...s.npcs,
          partner: { ...s.npcs.partner, affinity: Math.min(100, s.npcs.partner.affinity + 4) },
        },
      };
      set({ state: next, dialogue: null, toast: 'Good talk.' });
      persist(next);
      return;
    }
    set({ dialogue: null });
  },

  interactPoi: (id) => {
    const s = get().state;
    if (!s) return;
    if (s.flags.forcedHospital && id !== 'hospital') {
      set({ toast: 'Health < 50%. Get to the hospital.' });
      return;
    }
    if (id === 'market') {
      set({ phoneOpen: true, phoneApp: 'trade', toast: 'Trade app — brokerage terminal linked.' });
      return;
    }
    if (id === 'company') {
      set({
        dialogue: {
          speaker: 'Nimbus Labs',
          text: 'Badge in. What\'s the move?',
          options: [
            { label: 'Work a block (~2h)', action: 'work' },
            { label: 'Crunch mode (~3h)', action: 'crunch' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
      // monkey-patch crunch via resolve — add handler
      return;
    }
    if (id === 'hospital') {
      set({
        dialogue: {
          speaker: 'El Camino Urgent Care',
          text: s.flags.forcedHospital
            ? 'You look terrible. Pick a treatment.'
            : 'Walk-in available. Insurance helps if employed.',
          options: [
            { label: 'Basic care (~$450)', action: 'heal-basic' },
            { label: 'Full workup (~$900)', action: 'heal-full' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
      return;
    }
    if (id === 'bank') {
      set({
        dialogue: {
          speaker: 'Peninsula Credit Union',
          text: `Cash ${formatMoney(s.vitals.cash)} · Savings ${formatMoney(s.bank.savings)}`,
          options: [
            { label: 'Deposit $500', action: 'dep-500' },
            { label: 'Withdraw $500', action: 'wd-500' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
      return;
    }
    if (id === 'housing') {
      set({
        dialogue: {
          speaker: 'Bay Realty',
          text: `Current: ${s.housing.label} ($${s.housing.dailyRent}/day)`,
          options: [
            { label: 'Sleep here (advance to morning)', action: 'sleep' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
      return;
    }
    if (id === 'cafe') {
      // meet partner chance
      if (s.relationship.status === 'single' && Math.random() > 0.4) {
        const next = {
          ...s,
          relationship: { status: 'dating' as const, partnerName: 'Jordan Lee' },
          npcs: { ...s.npcs, partner: { name: 'Jordan Lee', affinity: 50 } },
          vitals: { ...s.vitals, cash: s.vitals.cash - 18, stress: Math.max(0, s.vitals.stress - 4) },
        };
        set({
          state: next,
          dialogue: {
            speaker: 'Jordan Lee',
            text: 'Wi-Fi password is a red flag. The conversation isn\'t. Want to grab dinner sometime?',
            options: [{ label: 'Absolutely', action: 'close' }],
          },
          toast: 'You\'re dating Jordan Lee.',
        });
        persist(next);
        return;
      }
      set({
        dialogue: {
          speaker: 'Cafe',
          text: 'Oat milk latte. Slack still finds you.',
          options: [
            { label: 'Buy coffee (−$8, −stress)', action: 'coffee' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
      return;
    }
    if (id === 'park') {
      set({
        dialogue: {
          speaker: 'Shoreline Park',
          text: 'Eucalyptus and distant 101. A rare quiet buffer.',
          options: [
            { label: 'Walk & breathe (−stress)', action: 'park' },
            { label: 'Leave', action: 'close' },
          ],
        },
      });
    }
  },

  sleep: () => {
    const s = get().state;
    if (!s) return;
    const hours = 24 - s.time.hour + 7.5;
    let next = advanceHour(s, hours, rng);
    next = {
      ...next,
      vitals: {
        ...next.vitals,
        health: Math.min(100, next.vitals.health + 8),
        stress: Math.max(0, next.vitals.stress - 10),
      },
    };
    set({
      state: next,
      dialogue: null,
      toast: `Good morning — Day ${next.time.day}.`,
    });
    persist(next);
  },

  markMessagesRead: () => {
    const s = get().state;
    if (!s) return;
    const next = {
      ...s,
      messages: s.messages.map((m) => ({ ...m, read: true })),
    };
    set({ state: next });
  },

  stats: () => {
    const s = get().state;
    if (!s) return null;
    return { netWorth: netWorth(s), portfolio: portfolioValue(s), equity: equityPaper(s) };
  },
}));

// Extend resolveDialogue for POI actions by wrapping — patch store methods after create
const originalResolve = useGame.getState().resolveDialogue;
useGame.setState({
  resolveDialogue: (action: string) => {
    const store = useGame.getState();
    const s = store.state;
    if (!s) return;
    if (action === 'crunch') {
      store.work(true);
      return;
    }
    if (action === 'heal-basic') {
      store.hospital('basic');
      return;
    }
    if (action === 'heal-full') {
      store.hospital('full');
      return;
    }
    if (action === 'dep-500') {
      store.bankDeposit(500);
      store.setDialogue(null);
      return;
    }
    if (action === 'wd-500') {
      store.bankWithdraw(500);
      store.setDialogue(null);
      return;
    }
    if (action === 'sleep') {
      store.sleep();
      return;
    }
    if (action === 'coffee') {
      const next = {
        ...s,
        vitals: {
          ...s.vitals,
          cash: s.vitals.cash - 8,
          stress: Math.max(0, s.vitals.stress - 5),
        },
      };
      useGame.setState({ state: next, dialogue: null, toast: 'Coffee acquired.' });
      persist(next);
      return;
    }
    if (action === 'park') {
      let next = {
        ...s,
        vitals: {
          ...s.vitals,
          stress: Math.max(0, s.vitals.stress - 10),
          health: Math.min(100, s.vitals.health + 3),
        },
      };
      next = advanceHour(next, 1, rng);
      useGame.setState({ state: next, dialogue: null, toast: 'Park walk complete.' });
      persist(next);
      return;
    }
    originalResolve(action);
  },
});
