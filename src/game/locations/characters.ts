import type { GameState } from '../types';
import { applyDeltas, pushLog } from '../economy';
import { createRng, clamp } from '../rng';
import type { CharacterId } from '../types';
import { syncPartnerName } from '../characters';

export type ActionResult = { state: GameState; message: string };

function bumpAffinity(state: GameState, id: CharacterId, delta: number): GameState {
  const c = state.characters[id];
  return {
    ...state,
    characters: {
      ...state.characters,
      [id]: {
        ...c,
        affinity: clamp(c.affinity + delta, 0, 100),
        met: true,
      },
    },
  };
}

/** Girlfriend — coffee, date night, deep talk, introduce to friends */
export function girlfriendCoffee(state: GameState): ActionResult {
  if (state.relationship.status !== 'dating' && state.relationship.status !== 'engaged') {
    return { state, message: 'You are not dating anyone right now.' };
  }
  const name = state.characters.girlfriend.name;
  let s = applyDeltas(state, { cash: -45, stress: -8, health: 2, reputation: 1 });
  s = bumpAffinity(s, 'girlfriend', 6);
  s = {
    ...s,
    relationship: { ...s.relationship, weeksTogether: s.relationship.weeksTogether },
  };
  s = pushLog(s, `Coffee with ${name}. Affinity up.`, 'good');
  return { state: s, message: `Latte run with ${name}. Stress down, wallet −$45.` };
}

export function girlfriendDateNight(state: GameState): ActionResult {
  if (state.relationship.status !== 'dating' && state.relationship.status !== 'engaged') {
    return { state, message: 'No girlfriend to take out.' };
  }
  const name = state.characters.girlfriend.name;
  const rng = createRng(state.rngState);
  const fancy = rng.next() > 0.5;
  const cost = fancy ? -280 : -140;
  let s = applyDeltas({ ...state, rngState: rng.state() }, {
    cash: cost,
    stress: -14,
    health: 4,
    reputation: fancy ? 3 : 1,
  });
  s = bumpAffinity(s, 'girlfriend', fancy ? 12 : 8);
  if (s.relationship.status === 'dating' && s.characters.girlfriend.affinity > 75 && rng.next() > 0.55) {
    s = { ...s, relationship: { ...s.relationship, status: 'engaged' } };
    s = pushLog(s, `${name} said yes to something bigger. You're engaged.`, 'good');
    return { state: s, message: `Date night went legendary — you're engaged to ${name}!` };
  }
  s = pushLog(s, `Date night with ${name} (${fancy ? 'fancy' : 'casual'}).`, 'good');
  return { state: s, message: `Date night with ${name}. −$${Math.abs(cost)}, affinity up.` };
}

export function girlfriendSeriousTalk(state: GameState): ActionResult {
  if (state.relationship.status !== 'dating' && state.relationship.status !== 'engaged') {
    return { state, message: 'No relationship to talk through.' };
  }
  const name = state.characters.girlfriend.name;
  const rng = createRng(state.rngState);
  const good = rng.next() < 0.55 + state.characters.girlfriend.affinity / 250;
  let s = { ...state, rngState: rng.state() };
  if (good) {
    s = applyDeltas(s, { stress: -10, health: 3, reputation: 2 });
    s = bumpAffinity(s, 'girlfriend', 10);
    s = pushLog(s, `Honest talk with ${name}. Closer than before.`, 'good');
    return { state: s, message: `Heart-to-heart with ${name}. Bond strengthens.` };
  }
  s = applyDeltas(s, { stress: 12, health: -4, reputation: -2 });
  s = bumpAffinity(s, 'girlfriend', -8);
  s = pushLog(s, `Tough talk with ${name}. Air is heavy.`, 'bad');
  return { state: s, message: `The talk with ${name} got rocky. Affinity took a hit.` };
}

/** Wife — dinner, plan future, argue, date night */
export function wifeDinner(state: GameState): ActionResult {
  if (state.relationship.status !== 'married') {
    return { state, message: 'You are not married.' };
  }
  const name = state.characters.wife.name;
  let s = applyDeltas(state, { cash: -90, stress: -12, health: 3 });
  s = bumpAffinity(s, 'wife', 7);
  s = pushLog(s, `Home dinner with ${name}.`, 'good');
  return { state: s, message: `Quiet dinner with ${name}. House feels like home.` };
}

export function wifePlanFuture(state: GameState): ActionResult {
  if (state.relationship.status !== 'married') {
    return { state, message: 'You are not married.' };
  }
  const name = state.characters.wife.name;
  let s = applyDeltas(state, { stress: -6, reputation: 2, cash: -200 });
  s = bumpAffinity(s, 'wife', 9);
  // tiny housing goodwill
  if (s.housing.owned) {
    s = {
      ...s,
      housing: {
        ...s.housing,
        propertyValue: Math.round(s.housing.propertyValue * 1.002),
      },
    };
  }
  s = pushLog(s, `Future-planning session with ${name}. Spreadsheets of love.`, 'good');
  return { state: s, message: `You and ${name} mapped the next five years. −$200 planning fund.` };
}

export function wifeDateNight(state: GameState): ActionResult {
  if (state.relationship.status !== 'married') {
    return { state, message: 'You are not married.' };
  }
  const name = state.characters.wife.name;
  let s = applyDeltas(state, { cash: -220, stress: -16, health: 5, reputation: 2 });
  s = bumpAffinity(s, 'wife', 11);
  s = pushLog(s, `Married date night with ${name}.`, 'good');
  return { state: s, message: `Date night with ${name}. Still got it. −$220.` };
}

export function wifeArgue(state: GameState): ActionResult {
  if (state.relationship.status !== 'married') {
    return { state, message: 'You are not married.' };
  }
  const name = state.characters.wife.name;
  const rng = createRng(state.rngState);
  let s = applyDeltas({ ...state, rngState: rng.state() }, {
    stress: 18,
    health: -6,
    reputation: -3,
  });
  s = bumpAffinity(s, 'wife', -12);
  if (s.characters.wife.affinity < 25 && rng.next() > 0.6) {
    s = {
      ...s,
      relationship: { status: 'divorced', partnerName: null, weeksTogether: 0 },
    };
    s = applyDeltas(s, { cash: -8000, stress: 10 });
    s = pushLog(s, `The fight with ${name} ended the marriage.`, 'bad');
    return { state: s, message: `Irreconcilable. You and ${name} are getting divorced.` };
  }
  s = pushLog(s, `Argument with ${name}. Doors may have been involved.`, 'bad');
  return { state: s, message: `Fight with ${name}. Affinity down. Cool off.` };
}

/** Colleague — lunch, pair program, gossip, ask for help */
export function colleagueLunch(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No office — no desk neighbor lunch.' };
  }
  const name = state.characters.colleague.name;
  let s = applyDeltas(state, { cash: -35, stress: -6, reputation: 2 });
  s = bumpAffinity(s, 'colleague', 5);
  s = pushLog(s, `Lunch with ${name}.`, 'info');
  return { state: s, message: `Cafeteria politics with ${name}. −$35.` };
}

export function colleaguePair(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'Need a job to pair program.' };
  }
  const name = state.characters.colleague.name;
  const rng = createRng(state.rngState);
  const win = rng.next() < 0.6 + state.characters.colleague.affinity / 300;
  let s = { ...state, rngState: rng.state() };
  if (win) {
    s = applyDeltas(s, { reputation: 6, stress: 4, health: -3 });
    s = bumpAffinity(s, 'colleague', 8);
    s = pushLog(s, `Pairing with ${name} shipped a gnarly bugfix.`, 'good');
    return { state: s, message: `Great pairing session with ${name}. Reputation up.` };
  }
  s = applyDeltas(s, { reputation: -2, stress: 8, health: -4 });
  s = bumpAffinity(s, 'colleague', 2);
  s = pushLog(s, `Pairing with ${name} was… educational.`, 'info');
  return { state: s, message: `Pairing with ${name} exposed gaps. Still bonding.` };
}

export function colleagueGossip(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No hallway for gossip.' };
  }
  const name = state.characters.colleague.name;
  const rng = createRng(state.rngState);
  const burn = rng.next() > 0.55;
  let s = { ...state, rngState: rng.state() };
  if (burn) {
    s = applyDeltas(s, { reputation: -8, stress: 6 });
    s = bumpAffinity(s, 'colleague', 3);
    s = bumpAffinity(s, 'boss', -5);
    s = pushLog(s, `Gossip with ${name} leaked upstairs.`, 'bad');
    return { state: s, message: `Tea with ${name} backfired. Boss affinity down.` };
  }
  s = applyDeltas(s, { reputation: 3, stress: -3 });
  s = bumpAffinity(s, 'colleague', 6);
  s = pushLog(s, `Strategic gossip with ${name}. Useful intel.`, 'good');
  return { state: s, message: `Intel from ${name}. You look informed, not toxic.` };
}

export function colleagueHelp(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'Unemployed — ask LinkedIn instead.' };
  }
  const name = state.characters.colleague.name;
  const ok = state.characters.colleague.affinity >= 40;
  if (!ok) {
    let s = applyDeltas(state, { stress: 4, reputation: -1 });
    s = pushLog(s, `${name} is too busy (or not close enough).`, 'bad');
    return { state: s, message: `${name} brushed you off. Build affinity first.` };
  }
  let s = applyDeltas(state, { stress: -8, reputation: 4, health: 2 });
  s = bumpAffinity(s, 'colleague', 4);
  s = pushLog(s, `${name} unblocked you on a sticky PR.`, 'good');
  return { state: s, message: `${name} saved your sprint. Stress down.` };
}

/** Boss — 1:1, ask promo signal, take blame, skip-level prep */
export function bossOneOnOne(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No boss without a job.' };
  }
  const name = state.characters.boss.name;
  let s = applyDeltas(state, { stress: 4, reputation: 3 });
  s = bumpAffinity(s, 'boss', 5);
  s = pushLog(s, `1:1 with ${name}.`, 'info');
  return { state: s, message: `1:1 with ${name}. Notes taken. Affinity +5.` };
}

export function bossAskRaise(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No paycheck to raise.' };
  }
  const name = state.characters.boss.name;
  const rng = createRng(state.rngState);
  const chance =
    0.2 +
    state.characters.boss.affinity / 200 +
    state.player.reputation / 250 -
    state.player.stress / 400;
  let s = { ...state, rngState: rng.state() };
  if (rng.next() < clamp(chance, 0.08, 0.7)) {
    const bump = Math.round(s.company.weeklyPay * 0.08);
    s = {
      ...s,
      company: { ...s.company, weeklyPay: s.company.weeklyPay + bump },
    };
    s = applyDeltas(s, { reputation: 5, stress: -4 });
    s = bumpAffinity(s, 'boss', 6);
    s = pushLog(s, `${name} approved a raise (+$${bump}/wk).`, 'good');
    return { state: s, message: `${name} came through — +$${bump}/wk.` };
  }
  s = applyDeltas(s, { stress: 8, reputation: -2 });
  s = bumpAffinity(s, 'boss', -3);
  s = pushLog(s, `${name} deferred the raise talk.`, 'bad');
  return { state: s, message: `${name}: "Let's revisit next cycle."` };
}

export function bossTakeBlame(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'Nothing to take blame for.' };
  }
  const name = state.characters.boss.name;
  let s = applyDeltas(state, { reputation: -6, stress: 10, health: -3 });
  s = bumpAffinity(s, 'boss', 14);
  s = pushLog(s, `You took the heat for ${name}'s roadmap miss.`, 'info');
  return { state: s, message: `You shielded ${name}. Boss loves you. Org chat does not.` };
}

export function bossSkipLevel(state: GameState): ActionResult {
  if (!state.company.employed) {
    return { state, message: 'No skip-level when unemployed.' };
  }
  const name = state.characters.boss.name;
  const rng = createRng(state.rngState);
  let s = { ...state, rngState: rng.state() };
  if (state.characters.boss.affinity < 35) {
    s = applyDeltas(s, { reputation: -5, stress: 10 });
    s = bumpAffinity(s, 'boss', -10);
    s = pushLog(s, `${name} found out about the skip-level. Frosty.`, 'bad');
    return { state: s, message: `Skip-level without trust. ${name} is cold now.` };
  }
  s = applyDeltas(s, { reputation: 7, stress: 5 });
  s = bumpAffinity(s, 'boss', 2);
  s = pushLog(s, `Skip-level went fine — ${name} even coached you.`, 'good');
  return { state: s, message: `Skip-level visibility up. ${name} stayed supportive.` };
}

/** Friend — hangout, weekend trip, borrow/lend, startup brainstorm */
export function friendHangout(state: GameState): ActionResult {
  const name = state.characters.friend.name;
  let s = applyDeltas(state, { cash: -60, stress: -14, health: 5, reputation: 1 });
  s = bumpAffinity(s, 'friend', 6);
  s = pushLog(s, `Hangout with ${name}.`, 'good');
  return { state: s, message: `Beers / board games with ${name}. Soul patched.` };
}

export function friendTrip(state: GameState): ActionResult {
  const name = state.characters.friend.name;
  let s = applyDeltas(state, { cash: -450, stress: -22, health: 10, reputation: -1 });
  s = bumpAffinity(s, 'friend', 12);
  s = pushLog(s, `Weekend trip with ${name}.`, 'good');
  return { state: s, message: `Escape pod with ${name}. −$450, stress crushed.` };
}

export function friendLend(state: GameState): ActionResult {
  const name = state.characters.friend.name;
  if (state.player.cash < 500) {
    return { state, message: 'You need at least $500 cash to lend.' };
  }
  const rng = createRng(state.rngState);
  let s = applyDeltas({ ...state, rngState: rng.state() }, { cash: -500, stress: 2 });
  s = bumpAffinity(s, 'friend', 10);
  if (rng.next() > 0.4) {
    // they'll pay back via event later — small immediate goodwill
    s = pushLog(s, `Lent $500 to ${name}.`, 'info');
    return { state: s, message: `Lent $500 to ${name}. Friendship collateral.` };
  }
  s = applyDeltas(s, { cash: 520 });
  s = pushLog(s, `${name} Venmo'd you back same day + coffee.`, 'good');
  return { state: s, message: `${name} repaid fast (+$20 coffee tax).` };
}

export function friendBrainstorm(state: GameState): ActionResult {
  const name = state.characters.friend.name;
  const rng = createRng(state.rngState);
  const hit = rng.next() > 0.62;
  let s = applyDeltas({ ...state, rngState: rng.state() }, {
    stress: 4,
    health: -2,
    reputation: 3,
  });
  s = bumpAffinity(s, 'friend', 5);
  if (hit) {
    const cash = 400 + Math.floor(rng.next() * 1600);
    s = applyDeltas(s, { cash, reputation: 4 });
    s = pushLog(s, `Brainstorm with ${name} sparked a paid idea (+$${cash}).`, 'good');
    return { state: s, message: `Startup napkin with ${name} paid $${cash}.` };
  }
  s = pushLog(s, `Brainstorm with ${name}: fun, zero ARR.`, 'info');
  return { state: s, message: `Ideas with ${name}. No revenue — yet.` };
}

export function ensureCharacters(state: GameState): GameState {
  if (state.characters) return syncPartnerName(state);
  return syncPartnerName({
    ...state,
    characters: {
      girlfriend: { name: state.relationship.partnerName ?? 'Jordan', affinity: 55, met: !!state.relationship.partnerName },
      wife: { name: state.relationship.partnerName ?? 'Jordan', affinity: 70, met: state.relationship.status === 'married' },
      colleague: { name: 'Priya', affinity: 50, met: true },
      boss: { name: 'Marcus Chen', affinity: 45, met: true },
      friend: { name: 'Diego', affinity: 65, met: true },
    },
  });
}
