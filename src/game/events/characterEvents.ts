import type { ExtraEventDef } from './extraEvents';
import { applyDeltas } from '../economy';

function result(
  id: string,
  title: string,
  description: string,
  deltas: { cash?: number; health?: number; reputation?: number; stress?: number },
) {
  return { id, title, description, deltas };
}

function bump(
  s: Parameters<ExtraEventDef['apply']>[0],
  id: 'girlfriend' | 'wife' | 'colleague' | 'boss' | 'friend',
  delta: number,
) {
  const c = s.characters[id];
  return {
    ...s,
    characters: {
      ...s.characters,
      [id]: {
        ...c,
        affinity: Math.max(0, Math.min(100, c.affinity + delta)),
        met: true,
      },
    },
  };
}

/** Relationship / NPC-driven chaos */
export const CHARACTER_EVENTS: ExtraEventDef[] = [
  {
    id: 'gf_surprise_visit',
    title: 'Girlfriend Surprise Visit',
    description: (s) =>
      `${s.characters.girlfriend.name} shows up at the office with matcha. Slack notices.`,
    weight: (s) =>
      s.relationship.status === 'dating' || s.relationship.status === 'engaged' ? 3.5 : 0,
    apply: (s) => {
      const deltas = { stress: -6, reputation: 2, cash: -20 };
      let state = bump(applyDeltas(s, deltas), 'girlfriend', 7);
      state = bump(state, 'colleague', 2);
      return {
        state,
        result: result(
          'gf_surprise_visit',
          'Girlfriend Surprise Visit',
          `${s.characters.girlfriend.name} soft-launched your relationship at work.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'gf_jealousy',
    title: 'Late Slack ≠ Romance',
    description: (s) =>
      `${s.characters.girlfriend.name} saw you online at 1am. "Who is #incident-warroom?"`,
    weight: (s) =>
      (s.relationship.status === 'dating' || s.relationship.status === 'engaged') &&
      s.player.stress > 50
        ? 3
        : 0,
    apply: (s) => {
      const deltas = { stress: 10, health: -3, reputation: -1 };
      const state = bump(applyDeltas(s, deltas), 'girlfriend', -9);
      return {
        state,
        result: result(
          'gf_jealousy',
          'Late Slack ≠ Romance',
          `You explain PagerDuty. ${s.characters.girlfriend.name} only half-buys it.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'wife_anniversary',
    title: 'Anniversary Ambush',
    description: (s) =>
      `Calendar forgot. ${s.characters.wife.name} did not. Florist surge pricing engages.`,
    weight: (s) => (s.relationship.status === 'married' ? 2.8 : 0),
    apply: (s, rng) => {
      const saved = rng.next() > 0.35;
      if (saved) {
        const deltas = { cash: -350, stress: -8, reputation: 2 };
        const state = bump(applyDeltas(s, deltas), 'wife', 10);
        return {
          state,
          result: result(
            'wife_anniversary',
            'Anniversary Saved',
            `Roses + reservation. ${s.characters.wife.name} softens.`,
            deltas,
          ),
        };
      }
      const deltas = { cash: -80, stress: 14, health: -4 };
      const state = bump(applyDeltas(s, deltas), 'wife', -12);
      return {
        state,
        result: result(
          'wife_anniversary',
          'Anniversary Missed',
          `You brought grocery flowers. ${s.characters.wife.name} brought silence.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'wife_support',
    title: 'Spouse Soft Landing',
    description: (s) =>
      `${s.characters.wife.name} cancels their plans so you can ship. Quiet heroics.`,
    weight: (s) =>
      s.relationship.status === 'married' && s.characters.wife.affinity > 55 ? 3 : 0.5,
    apply: (s) => {
      const deltas = { stress: -15, health: 4, reputation: 1 };
      const state = bump(applyDeltas(s, deltas), 'wife', 6);
      return {
        state,
        result: result(
          'wife_support',
          'Spouse Soft Landing',
          `You owe ${s.characters.wife.name} a real weekend.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'colleague_cover',
    title: 'Colleague Covers On-Call',
    description: (s) => `${s.characters.colleague.name} takes your pager so you can sleep.`,
    weight: (s) =>
      s.company.employed && s.characters.colleague.affinity > 50 ? 3.2 : 0.8,
    apply: (s) => {
      const deltas = { health: 8, stress: -10, reputation: 2 };
      const state = bump(applyDeltas(s, deltas), 'colleague', 5);
      return {
        state,
        result: result(
          'colleague_cover',
          'Colleague Covers On-Call',
          `${s.characters.colleague.name}: "You owe me boba forever."`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'colleague_credit_steal',
    title: 'Credit Ambush',
    description: (s) =>
      `${s.characters.colleague.name} demoed your design doc as "our work." Mostly theirs in the telling.`,
    weight: (s) =>
      s.company.employed && s.characters.colleague.affinity < 45 ? 2.5 : 1,
    apply: (s) => {
      const deltas = { reputation: -7, stress: 10 };
      let state = bump(applyDeltas(s, deltas), 'colleague', -10);
      state = bump(state, 'boss', -2);
      return {
        state,
        result: result(
          'colleague_credit_steal',
          'Credit Ambush',
          `Politics. You schedule a clarifying 1:1 with ${s.characters.boss.name}.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'boss_shoutout',
    title: 'All-Hands Shoutout',
    description: (s) =>
      `${s.characters.boss.name} names you in the all-hands. Slack reacts pile up.`,
    weight: (s) =>
      s.company.employed && s.characters.boss.affinity > 60 ? 3.5 : 1,
    apply: (s) => {
      const deltas = { reputation: 10, stress: -4 };
      const state = bump(applyDeltas(s, deltas), 'boss', 4);
      return {
        state,
        result: result(
          'boss_shoutout',
          'All-Hands Shoutout',
          `Public praise from ${s.characters.boss.name}. Imposter syndrome buffers.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'boss_sunday_slack',
    title: 'Sunday Slack from Boss',
    description: (s) =>
      `${s.characters.boss.name}: "Quick question when you have a sec 😊" — it is never quick.`,
    weight: (s) => (s.company.employed ? 3.5 : 0),
    apply: (s) => {
      const deltas = { stress: 12, health: -5, reputation: 2 };
      const state = bump(applyDeltas(s, deltas), 'boss', 3);
      return {
        state,
        result: result(
          'boss_sunday_slack',
          'Sunday Slack from Boss',
          `You answer. Boundaries cry softly in the corner.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'boss_defends_you',
    title: 'Boss Runs Interference',
    description: (s) =>
      `Product wants blood. ${s.characters.boss.name} takes the meeting instead.`,
    weight: (s) =>
      s.company.employed && s.characters.boss.affinity > 55 ? 2.8 : 0.6,
    apply: (s) => {
      const deltas = { stress: -8, reputation: 4 };
      const state = bump(applyDeltas(s, deltas), 'boss', 6);
      return {
        state,
        result: result(
          'boss_defends_you',
          'Boss Runs Interference',
          `${s.characters.boss.name} spent political capital on you.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'friend_intervention',
    title: 'Friend Intervention',
    description: (s) =>
      `${s.characters.friend.name} confiscates your laptop for a hike. No Wi-Fi. Actual trees.`,
    weight: (s) => (s.player.stress > 55 ? 3.5 : 1.5),
    apply: (s) => {
      const deltas = { stress: -18, health: 8, cash: -40, reputation: -1 };
      const state = bump(applyDeltas(s, deltas), 'friend', 8);
      return {
        state,
        result: result(
          'friend_intervention',
          'Friend Intervention',
          `${s.characters.friend.name} was right. Annoyingly.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'friend_pays_back',
    title: 'Friend Pays Back',
    description: (s) => `${s.characters.friend.name} hits you with a Venmo: "interest in tacos."`,
    weight: (s) => (s.characters.friend.affinity > 50 ? 2.5 : 1),
    apply: (s, rng) => {
      const cash = 200 + Math.floor(rng.next() * 400);
      const deltas = { cash, stress: -3 };
      const state = bump(applyDeltas(s, deltas), 'friend', 4);
      return {
        state,
        result: result(
          'friend_pays_back',
          'Friend Pays Back',
          `+$${cash} from ${s.characters.friend.name}. Faith in humanity++.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'friend_bad_invest',
    title: 'Friend\'s "Can\'t Miss" Tip',
    description: (s) =>
      `${s.characters.friend.name} swears this ticker is going to Mars. It goes to the parking lot.`,
    weight: () => 2.2,
    apply: (s, rng) => {
      const loss = 300 + Math.floor(rng.next() * 1200);
      const deltas = { cash: -loss, stress: 8, reputation: -1 };
      const state = bump(applyDeltas(s, deltas), 'friend', -2);
      const prices = {
        ...state.market.prices,
        meme: Math.max(1, Math.round(state.market.prices.meme * (0.85 + rng.next() * 0.1))),
      };
      return {
        state: { ...state, market: { ...state.market, prices } },
        result: result(
          'friend_bad_invest',
          'Friend\'s "Can\'t Miss" Tip',
          `−$${loss}. ${s.characters.friend.name} says "long-term."`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'triangle_awkward',
    title: 'Dinner Party Collision',
    description: (s) =>
      `${s.characters.friend.name} invites everyone. ${s.characters.colleague.name} overshares. Your partner stares.`,
    weight: (s) =>
      (s.relationship.status === 'dating' ||
        s.relationship.status === 'engaged' ||
        s.relationship.status === 'married') &&
      s.company.employed
        ? 2.4
        : 0,
    apply: (s) => {
      const partnerId = s.relationship.status === 'married' ? 'wife' : 'girlfriend';
      const deltas = { stress: 9, reputation: -2, cash: -75 };
      let state = bump(applyDeltas(s, deltas), partnerId, -4);
      state = bump(state, 'colleague', -3);
      state = bump(state, 'friend', 2);
      return {
        state,
        result: result(
          'triangle_awkward',
          'Dinner Party Collision',
          'Social graph goes fully connected. Too connected.',
          deltas,
        ),
      };
    },
  },
  {
    id: 'boss_vs_partner',
    title: 'Offsite vs Anniversary',
    description: (s) =>
      `${s.characters.boss.name} books a mandatory offsite on your anniversary weekend.`,
    weight: (s) =>
      s.company.employed &&
      (s.relationship.status === 'married' || s.relationship.status === 'engaged')
        ? 2.6
        : 0,
    apply: (s, rng) => {
      const chooseWork = rng.next() > 0.45;
      const partnerId = s.relationship.status === 'married' ? 'wife' : 'girlfriend';
      if (chooseWork) {
        const deltas = { reputation: 5, stress: 8, cash: 200 };
        let state = bump(applyDeltas(s, deltas), 'boss', 8);
        state = bump(state, partnerId, -14);
        return {
          state,
          result: result(
            'boss_vs_partner',
            'You Chose the Offsite',
            `Boss happy. ${s.characters[partnerId].name} is booking a "spa weekend" alone.`,
            deltas,
          ),
        };
      }
      const deltas = { reputation: -4, stress: -6, health: 3, cash: -250 };
      let state = bump(applyDeltas(s, deltas), 'boss', -8);
      state = bump(state, partnerId, 12);
      return {
        state,
        result: result(
          'boss_vs_partner',
          'You Chose Your Person',
          `${s.characters.boss.name} notes it. ${s.characters[partnerId].name} remembers it.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'colleague_crush_rumor',
    title: 'Hallway Rumor Mill',
    description: (s) =>
      `Blind-adjacent gossip: you and ${s.characters.colleague.name}. Neither of you asked for this.`,
    weight: (s) => (s.company.employed ? 2 : 0),
    apply: (s) => {
      const deltas = { reputation: -5, stress: 8 };
      let state = bump(applyDeltas(s, deltas), 'colleague', -4);
      if (s.relationship.status === 'dating' || s.relationship.status === 'engaged') {
        state = bump(state, 'girlfriend', -6);
      }
      if (s.relationship.status === 'married') {
        state = bump(state, 'wife', -6);
      }
      return {
        state,
        result: result(
          'colleague_crush_rumor',
          'Hallway Rumor Mill',
          'You both post very professional LinkedIn updates out of spite.',
          deltas,
        ),
      };
    },
  },
];
