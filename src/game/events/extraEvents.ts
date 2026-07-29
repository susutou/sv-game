import type { EventResult, GameState } from '../types';
import { applyDeltas } from '../economy';
import { CAREER_PAY, CAREER_TITLES } from '../types';

export type ExtraEventDef = {
  id: string;
  title: string;
  description: (s: GameState) => string;
  weight: (s: GameState) => number;
  apply: (s: GameState, rng: { next: () => number }) => { state: GameState; result: EventResult };
};

function result(
  id: string,
  title: string,
  description: string,
  deltas: { cash?: number; health?: number; reputation?: number; stress?: number },
): EventResult {
  return { id, title, description, deltas };
}

/** Extra chaotic Silicon Valley scenarios — keep the grind spicy. */
export const EXTRA_EVENTS: ExtraEventDef[] = [
  {
    id: 'ping_pong_injury',
    title: 'Ping-Pong Incident',
    description: () => 'You went for the highlight reel smash. The table went for your ACL.',
    weight: (s) => (s.company.employed ? 3 : 0),
    apply: (s) => {
      const deltas = { health: -10, reputation: 2, stress: 4 };
      return {
        state: applyDeltas(s, deltas),
        result: result('ping_pong_injury', 'Ping-Pong Incident', 'FOOSBALL IS CANCELLED. Also ping-pong.', deltas),
      };
    },
  },
  {
    id: 'free_lunch_trap',
    title: 'Free Lunch Tax',
    description: () => 'Catered sushi. Three helpings. The 2pm design review is a war crime.',
    weight: (s) => (s.company.employed ? 4 : 1),
    apply: (s) => {
      const deltas = { health: -4, stress: -3, cash: -0 };
      return {
        state: applyDeltas(s, deltas),
        result: result('free_lunch_trap', 'Free Lunch Tax', 'Calories: infinite. Focus: optional.', deltas),
      };
    },
  },
  {
    id: 'hackathon_win',
    title: 'Hackathon Glory',
    description: () => '36 hours. One demo. The judges cried (allergies, probably).',
    weight: (s) => (s.company.employed && s.player.health > 45 ? 3.5 : 1),
    apply: (s, rng) => {
      const cash = 800 + Math.floor(rng.next() * 2200);
      const deltas = { cash, reputation: 10, health: -16, stress: 14 };
      return {
        state: applyDeltas(s, deltas),
        result: result('hackathon_win', 'Hackathon Glory', `Prize + swag +$${cash}. Your spine files a ticket.`, deltas),
      };
    },
  },
  {
    id: 'demo_day_disaster',
    title: 'Demo Day Bluescreen',
    description: () => 'Live demo. Staging was "fine." Staging was a liar.',
    weight: (s) => (s.company.employed ? 3 : 0),
    apply: (s) => {
      const deltas = { reputation: -9, stress: 16, health: -5 };
      let state = applyDeltas(s, deltas);
      state = {
        ...state,
        company: {
          ...state.company,
          valuation: Math.max(20, Math.round(state.company.valuation * 0.92)),
        },
      };
      return {
        state,
        result: result('demo_day_disaster', 'Demo Day Bluescreen', 'Investors saw the blue screen of destiny. Valuation dipped.', deltas),
      };
    },
  },
  {
    id: 'y_combinator_envy',
    title: 'YC Batch FOMO',
    description: () => 'Your college roommate got into YC. Their hoodie is louder than your salary.',
    weight: () => 3,
    apply: (s) => {
      const deltas = { stress: 10, reputation: -2, health: -2 };
      return {
        state: applyDeltas(s, deltas),
        result: result('y_combinator_envy', 'YC Batch FOMO', 'You refresh their launch tweet 40 times. Character development?', deltas),
      };
    },
  },
  {
    id: 'angel_check',
    title: 'Angel Check Lands',
    description: () => 'A random angel from a rooftop mixer wires you for a weekend prototype.',
    weight: (s) => (s.player.reputation > 55 ? 2.5 : 0.8),
    apply: (s, rng) => {
      const cash = 2500 + Math.floor(rng.next() * 7500);
      const deltas = { cash, reputation: 6, stress: 8 };
      return {
        state: applyDeltas(s, deltas),
        result: result('angel_check', 'Angel Check Lands', `+$${cash.toLocaleString()} to chase a half-baked idea. Classic.`, deltas),
      };
    },
  },
  {
    id: 'stock_split_meme',
    title: 'Meme Stock Split',
    description: () => 'Your meme ticker does a 4-for-1 split. The chart looks taller. Your brain does not.',
    weight: (s) => (s.market.holdings.meme.shares > 0 ? 4 : 2),
    apply: (s) => {
      const price = Math.max(1, Math.round((s.market.prices.meme / 4) * 100) / 100);
      const shares = s.market.holdings.meme.shares * 4;
      const avgCost = s.market.holdings.meme.avgCost / 4;
      const state = {
        ...s,
        market: {
          ...s.market,
          prices: { ...s.market.prices, meme: price },
          holdings: {
            ...s.market.holdings,
            meme: { shares, avgCost: avgCost || 0 },
          },
        },
      };
      return {
        state,
        result: result('stock_split_meme', 'Meme Stock Split', 'More shares, same bag. Diamond hands paperwork.', {}),
      };
    },
  },
  {
    id: 'fed_speech',
    title: 'Fed Chair Speaks',
    description: () => 'One adjective from the podium. Markets interpret it as jazz.',
    weight: () => 4,
    apply: (s, rng) => {
      const up = rng.next() > 0.45;
      const mult = up ? 1.06 + rng.next() * 0.05 : 0.92 - rng.next() * 0.05;
      const bump = (v: number) => Math.max(1, Math.round(v * mult * 100) / 100);
      const prices = {
        ...s.market.prices,
        bigtech: bump(s.market.prices.bigtech),
        index: bump(s.market.prices.index),
        meme: bump(s.market.prices.meme),
      };
      const deltas = { stress: up ? -2 : 6 };
      return {
        state: { ...applyDeltas(s, deltas), market: { ...s.market, prices } },
        result: result(
          'fed_speech',
          'Fed Chair Speaks',
          up ? 'Risk-on. Your brokerage app goes neon green.' : 'Risk-off. Your brokerage app goes pumpkin.',
          deltas,
        ),
      };
    },
  },
  {
    id: 'ai_hype_cycle',
    title: 'AI Hype Cycle',
    description: () => 'Every roadmap slide now says "agents." Even the lunch menu.',
    weight: (s) => (s.company.employed ? 4 : 2),
    apply: (s, rng) => {
      const val = Math.round(s.company.valuation * (1.15 + rng.next() * 0.35));
      const prices = {
        ...s.market.prices,
        bigtech: Math.round(s.market.prices.bigtech * (1.08 + rng.next() * 0.1)),
        meme: Math.round(s.market.prices.meme * (1.12 + rng.next() * 0.2)),
      };
      const deltas = { reputation: 3, stress: 5 };
      return {
        state: {
          ...applyDeltas(s, deltas),
          company: { ...s.company, valuation: val },
          market: { ...s.market, prices },
        },
        result: result('ai_hype_cycle', 'AI Hype Cycle', `Company marked to $${val}M. Paper wealth intensifies.`, deltas),
      };
    },
  },
  {
    id: 'gpu_shortage',
    title: 'GPU Hunger Games',
    description: () => 'Training jobs queue for days. Someone offers you a 4090 for a kidney.',
    weight: (s) => (s.company.employed ? 3 : 1),
    apply: (s) => {
      const deltas = { stress: 12, health: -4, reputation: 1 };
      return {
        state: applyDeltas(s, deltas),
        result: result('gpu_shortage', 'GPU Hunger Games', 'You learn to love spot instances and denial.', deltas),
      };
    },
  },
  {
    id: 'nft_regret',
    title: 'NFT Flashback',
    description: () => 'You find an old wallet. The JPEG is still ugly. The gas fees were real.',
    weight: () => 2,
    apply: (s, rng) => {
      const loss = 200 + Math.floor(rng.next() * 1800);
      const deltas = { cash: -loss, reputation: -3, stress: 5 };
      return {
        state: applyDeltas(s, deltas),
        result: result('nft_regret', 'NFT Flashback', `−$${loss}. You were early. Early to what remains unclear.`, deltas),
      };
    },
  },
  {
    id: 'roommate_moves_out',
    title: 'Roommate Exodus',
    description: () => 'They got FAANG. You get their half of the rent. Capitalism is a sitcom.',
    weight: (s) => (!s.housing.owned && s.housing.tier === 'shared' ? 3.5 : 0),
    apply: (s) => {
      const hike = Math.round(s.housing.weeklyCost * 0.45);
      const state = {
        ...s,
        housing: { ...s.housing, weeklyCost: s.housing.weeklyCost + hike },
      };
      const deltas = { stress: 10, health: -3 };
      return {
        state: applyDeltas(state, deltas),
        result: result('roommate_moves_out', 'Roommate Exodus', `Housing +$${hike}/wk. The couch feels larger and sadder.`, deltas),
      };
    },
  },
  {
    id: 'dating_app_boost',
    title: 'Profile Glow-Up',
    description: () => 'New headshot. "Staff-curious." Matches go vertical.',
    weight: (s) => (s.relationship.status === 'single' ? 3.5 : 0.5),
    apply: (s) => {
      const deltas = { reputation: 4, cash: -80, stress: -4 };
      return {
        state: applyDeltas(s, deltas),
        result: result('dating_app_boost', 'Profile Glow-Up', 'The algorithm likes your hoodie now.', deltas),
      };
    },
  },
  {
    id: 'meeting_that_should_email',
    title: 'This Meeting Should Be an Email',
    description: () => '45 minutes to align on aligning. Someone shares a blank doc.',
    weight: (s) => (s.company.employed ? 5 : 0),
    apply: (s) => {
      const deltas = { stress: 8, health: -2, reputation: -1 };
      return {
        state: applyDeltas(s, deltas),
        result: result('meeting_that_should_email', 'This Meeting Should Be an Email', 'Your calendar files a restraining order.', deltas),
      };
    },
  },
  {
    id: 'patent_bonus',
    title: 'Patent Bonus Hits',
    description: () => 'Legal finally files your name on the invention. Payroll notices.',
    weight: (s) => (s.company.employed && s.player.reputation > 50 ? 2.5 : 0.5),
    apply: (s) => {
      const deltas = { cash: 1500, reputation: 8, stress: -2 };
      return {
        state: applyDeltas(s, deltas),
        result: result('patent_bonus', 'Patent Bonus Hits', '+$1,500 and a plaque you will never hang.', deltas),
      };
    },
  },
  {
    id: 'pip_scare',
    title: 'PIP Shadows',
    description: () => 'HR schedules a "career conversation." Your stomach leaves the building first.',
    weight: (s) =>
      s.company.employed && (s.player.reputation < 45 || s.player.stress > 65) ? 4 : 0.6,
    apply: (s) => {
      const deltas = { reputation: -6, stress: 20, health: -8 };
      return {
        state: applyDeltas(s, deltas),
        result: result('pip_scare', 'PIP Shadows', 'Performance plan vibes. Update the résumé quietly.', deltas),
      };
    },
  },
  {
    id: 'manager_leaves',
    title: 'Manager Quits via Slack',
    description: () => '"Excited for my next chapter" — and just like that, reorg season.',
    weight: (s) => (s.company.employed ? 3 : 0),
    apply: (s) => {
      const deltas = { stress: 14, reputation: -3, health: -3 };
      return {
        state: applyDeltas(s, deltas),
        result: result('manager_leaves', 'Manager Quits via Slack', 'New skip. New OKRs. New chaos.', deltas),
      };
    },
  },
  {
    id: 'conference_talk',
    title: 'Conference Main Stage',
    description: () => 'You speak at a big conf. The Wi-Fi dies mid-demo. You improvise like a legend.',
    weight: (s) => (s.player.reputation > 60 ? 3 : 1),
    apply: (s, rng) => {
      const cash = 400 + Math.floor(rng.next() * 900);
      const deltas = { reputation: 12, cash, stress: 6, health: -4 };
      return {
        state: applyDeltas(s, deltas),
        result: result('conference_talk', 'Conference Main Stage', `Speaking fee +$${cash}. Internet: optional.`, deltas),
      };
    },
  },
  {
    id: 'bike_crash',
    title: 'Caltrain Trail Wipeout',
    description: () => 'E-bike vs gravel. Gravel wins. Your AirPods survive, somehow.',
    weight: () => 2.5,
    apply: (s) => {
      const deltas = { health: -18, cash: -350, stress: 8 };
      return {
        state: applyDeltas(s, deltas),
        result: result('bike_crash', 'Caltrain Trail Wipeout', 'Urgent care co-pay + bruised ego.', deltas),
      };
    },
  },
  {
    id: 'housing_lottery',
    title: 'Below-Market Lottery Win',
    description: () => 'You win a below-market-rate apartment drawing. Unicorn housing.',
    weight: (s) => (!s.housing.owned ? 1.5 : 0),
    apply: (s) => {
      const state = {
        ...s,
        housing: {
          ...s.housing,
          weeklyCost: Math.max(400, Math.round(s.housing.weeklyCost * 0.55)),
          label: `${s.housing.label} (BMR win!)`,
        },
      };
      const deltas = { reputation: 3, stress: -10 };
      return {
        state: applyDeltas(state, deltas),
        result: result('housing_lottery', 'Below-Market Lottery Win', 'Rent plummets. Friends pretend to be happy for you.', deltas),
      };
    },
  },
  {
    id: 'wildfire_smoke',
    title: 'Wildfire Sky Week',
    description: () => 'The sun is a red thumbnail. Air quality: "stay inside and ship."',
    weight: () => 2.2,
    apply: (s) => {
      const deltas = { health: -10, stress: 8, cash: -120 };
      return {
        state: applyDeltas(s, deltas),
        result: result('wildfire_smoke', 'Wildfire Sky Week', 'Air purifier impulse-buy. Lungs file a bug.', deltas),
      };
    },
  },
  {
    id: 'earthquake_drill',
    title: 'Actual Earthquake',
    description: () => 'Not a drill. Monitors sway. Slack fills with "you good??"',
    weight: () => 1.8,
    apply: (s) => {
      const deltas = { stress: 12, health: -3, reputation: 1 };
      return {
        state: applyDeltas(s, deltas),
        result: result('earthquake_drill', 'Actual Earthquake', 'You remembered Drop, Cover, Hold On. Barely.', deltas),
      };
    },
  },
  {
    id: 'options_refresh',
    title: 'Surprise Refresh Grant',
    description: () => 'Comp committee sprinkles more options. Vesting chart gets a new line.',
    weight: (s) => (s.company.employed && s.player.reputation > 55 ? 3 : 0.5),
    apply: (s) => {
      const state = {
        ...s,
        company: {
          ...s.company,
          equityPercent: s.company.equityPercent + 0.02,
        },
      };
      const deltas = { reputation: 4, stress: -4 };
      return {
        state: applyDeltas(state, deltas),
        result: result('options_refresh', 'Surprise Refresh Grant', '+0.02% equity. Still paper. Still exciting.', deltas),
      };
    },
  },
  {
    id: 'visa_anxiety',
    title: 'Immigration Paperwork Spiral',
    description: () => 'A teammate\'s visa drama reminds you bureaucracy is undefeated.',
    weight: (s) => (s.company.employed ? 2 : 1),
    apply: (s) => {
      const deltas = { stress: 15, health: -4, cash: -200 };
      return {
        state: applyDeltas(s, deltas),
        result: result('visa_anxiety', 'Immigration Paperwork Spiral', 'You buy a coworker dinner. Empathy is expensive.', deltas),
      };
    },
  },
  {
    id: 'founders_fight',
    title: 'Founder Civil War',
    description: () => 'Co-founders disagree on the "P" in PMF. All-hands gets spicy.',
    weight: (s) => (s.company.employed && s.company.stage !== 'ipo' ? 2.8 : 0),
    apply: (s) => {
      const deltas = { stress: 14, reputation: -4 };
      const state = {
        ...applyDeltas(s, deltas),
        company: {
          ...s.company,
          valuation: Math.max(25, Math.round(s.company.valuation * 0.9)),
        },
      };
      return {
        state,
        result: result('founders_fight', 'Founder Civil War', 'Morale dips. Valuation takes a haircut.', deltas),
      };
    },
  },
  {
    id: 'side_hustle_viral',
    title: 'Side Hustle Goes Viral',
    description: () => 'Your silly Chrome extension hits Product Hunt #1. Inbox: on fire.',
    weight: (s) => (s.player.reputation > 40 ? 2.8 : 1.2),
    apply: (s, rng) => {
      const cash = 1200 + Math.floor(rng.next() * 5000);
      const deltas = { cash, reputation: 15, health: -8, stress: 10 };
      return {
        state: applyDeltas(s, deltas),
        result: result('side_hustle_viral', 'Side Hustle Goes Viral', `+$${cash.toLocaleString()}. Sleep is a legacy feature.`, deltas),
      };
    },
  },
  {
    id: 'tax_bill',
    title: 'Surprise Tax Bill',
    description: () => 'RSU withholding was "estimated." The IRS does not estimate.',
    weight: (s) => (s.player.cash > 5000 || s.market.holdings.company.shares > 0 ? 3 : 1),
    apply: (s, rng) => {
      const bill = 800 + Math.floor(rng.next() * 4200);
      const deltas = { cash: -bill, stress: 12 };
      return {
        state: applyDeltas(s, deltas),
        result: result('tax_bill', 'Surprise Tax Bill', `−$${bill.toLocaleString()}. April is every month now.`, deltas),
      };
    },
  },
  {
    id: 'lottery_ticket_tech',
    title: 'Secondary Sale Window',
    description: () => 'A tender offer opens. You can sell a slice of paper into cash.',
    weight: (s) =>
      s.company.employed && s.company.vestedPercent > 0.2 && s.company.stage !== 'ipo' ? 2.5 : 0,
    apply: (s, rng) => {
      const payout = Math.round(
        s.company.valuation * 10000 * s.company.equityPercent * s.company.vestedPercent * (0.15 + rng.next() * 0.2),
      );
      const state = {
        ...s,
        company: {
          ...s.company,
          equityPercent: s.company.equityPercent * 0.85,
        },
      };
      const deltas = { cash: payout, stress: -6, reputation: 2 };
      return {
        state: applyDeltas(state, deltas),
        result: result(
          'lottery_ticket_tech',
          'Secondary Sale Window',
          `You liquidate a slice for $${payout.toLocaleString()}. Still mostly paper.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'dogfooding',
    title: 'Forced Dogfooding Week',
    description: () => 'You must use only the internal tools. The internal tools hate you back.',
    weight: (s) => (s.company.employed ? 3.5 : 0),
    apply: (s) => {
      const deltas = { stress: 11, health: -5, reputation: 3 };
      return {
        state: applyDeltas(s, deltas),
        result: result('dogfooding', 'Forced Dogfooding Week', 'Empathy for users: maxed. Empathy for yourself: buffering.', deltas),
      };
    },
  },
  {
    id: 'mentor_coffee',
    title: 'Mentor Coffee',
    description: () => 'A Staff engineer sketches your career on a napkin. It somehow makes sense.',
    weight: (s) => (s.company.employed ? 3 : 1.5),
    apply: (s) => {
      const deltas = { reputation: 6, stress: -8, cash: -25, health: 3 };
      return {
        state: applyDeltas(s, deltas),
        result: result('mentor_coffee', 'Mentor Coffee', 'Clarity + oat milk. Cheap at the price.', deltas),
      };
    },
  },
  {
    id: 'layoff_survivor_guilt',
    title: 'Survivor Guilt',
    description: () => 'Half the floor is gone. You kept your badge. The silence is loud.',
    weight: (s) => (s.flags.laidOffOnce || s.company.valuation < 60 ? 2.5 : 1),
    apply: (s) => {
      const deltas = { stress: 16, health: -6, reputation: 2 };
      return {
        state: applyDeltas(s, deltas),
        result: result('layoff_survivor_guilt', 'Survivor Guilt', 'You ship quieter. You feel louder.', deltas),
      };
    },
  },
  {
    id: 'crypto_airdrop',
    title: 'Mystery Airdrop',
    description: () => 'A random chain drops tokens into a wallet you forgot existed.',
    weight: () => 2.2,
    apply: (s, rng) => {
      const cash = 150 + Math.floor(rng.next() * 2400);
      const prices = {
        ...s.market.prices,
        crypto: Math.round(s.market.prices.crypto * (1.05 + rng.next() * 0.2)),
      };
      const deltas = { cash, reputation: 1 };
      return {
        state: { ...applyDeltas(s, deltas), market: { ...s.market, prices } },
        result: result('crypto_airdrop', 'Mystery Airdrop', `+$${cash} of mystery money. Do not ask questions.`, deltas),
      };
    },
  },
  {
    id: 'board_meeting_leak',
    title: 'Board Deck Leak',
    description: () => 'Someone screenshots the board deck into Blind. Chaos multipliers engage.',
    weight: (s) => (s.company.employed ? 2.4 : 0),
    apply: (s, rng) => {
      const swing = rng.next() > 0.5 ? 1.08 : 0.88;
      const deltas = { stress: 10, reputation: swing > 1 ? 3 : -5 };
      const state = {
        ...applyDeltas(s, deltas),
        company: {
          ...s.company,
          valuation: Math.max(20, Math.round(s.company.valuation * swing)),
        },
      };
      return {
        state,
        result: result(
          'board_meeting_leak',
          'Board Deck Leak',
          swing > 1 ? 'Leak says growth. Memes say moon.' : 'Leak says burn. Memes say doom.',
          deltas,
        ),
      };
    },
  },
  {
    id: 'weekend_in_tahoe',
    title: 'Escape to Tahoe',
    description: () => 'Friends drag you out of the peninsula. Snow and no Slack (mostly).',
    weight: (s) => (s.player.stress > 40 ? 3.5 : 1.5),
    apply: (s) => {
      const deltas = { cash: -600, health: 12, stress: -22, reputation: -1 };
      return {
        state: applyDeltas(s, deltas),
        result: result('weekend_in_tahoe', 'Escape to Tahoe', 'Soul restored. Wallet lighter. Worth it.', deltas),
      };
    },
  },
  {
    id: 'internal_transfer',
    title: 'Internal Transfer Wins',
    description: () => 'You flee a sinking team for the shiny new platform org.',
    weight: (s) => (s.company.employed && s.player.stress > 50 ? 3 : 1),
    apply: (s) => {
      const deltas = { stress: -12, reputation: 4, health: 4 };
      return {
        state: applyDeltas(s, deltas),
        result: result('internal_transfer', 'Internal Transfer Wins', 'New team, new hope, same badge.', deltas),
      };
    },
  },
  {
    id: 'seed_angel_yourself',
    title: 'You Angel a Friend',
    description: () => 'A friend\'s seed round needs $5k. You become "investor" on LinkedIn.',
    weight: (s) => (s.player.cash > 8000 ? 2.2 : 0.4),
    apply: (s, rng) => {
      const win = rng.next() > 0.55;
      if (win) {
        const gain = 5000 + Math.floor(rng.next() * 20000);
        const deltas = { cash: gain - 5000, reputation: 8, stress: 4 };
        return {
          state: applyDeltas(s, deltas),
          result: result('seed_angel_yourself', 'Angel Bet Pays', `Your $5k becomes $${gain.toLocaleString()}. Beginner's luck?`, deltas),
        };
      }
      const deltas = { cash: -5000, reputation: 3, stress: 6 };
      return {
        state: applyDeltas(s, deltas),
        result: result('seed_angel_yourself', 'Angel Bet Goes to Zero', '−$5k. You gained a story and a write-off.', deltas),
      };
    },
  },
  {
    id: 'promotion_ladder_skip',
    title: 'Skip-Level Miracle',
    description: () => 'Your skip notices your work. Levels blur. Titles shift.',
    weight: (s) =>
      s.company.employed &&
      s.player.reputation > 70 &&
      s.company.level !== 'principal' &&
      s.company.level !== 'founder'
        ? 2
        : 0,
    apply: (s) => {
      const order = ['junior', 'mid', 'senior', 'staff', 'principal'] as const;
      const idx = order.indexOf(s.company.level as (typeof order)[number]);
      const next = order[Math.min(idx + 1, order.length - 1)];
      const deltas = { reputation: 10, cash: 500, stress: 4 };
      const state = {
        ...applyDeltas(s, deltas),
        company: {
          ...s.company,
          level: next,
          title: CAREER_TITLES[next],
          weeklyPay: CAREER_PAY[next],
          promoCooldown: 20,
        },
      };
      return {
        state,
        result: result(
          'promotion_ladder_skip',
          'Skip-Level Miracle',
          `Fast-tracked to ${CAREER_TITLES[next]}. Imposter syndrome upgrades too.`,
          deltas,
        ),
      };
    },
  },
  {
    id: 'quiet_quit_temptation',
    title: 'Quiet Quitting Era',
    description: () => 'You do the job description — exactly. Nothing more. Slack status: "focusing."',
    weight: (s) => (s.player.stress > 55 && s.company.employed ? 3.5 : 1),
    apply: (s) => {
      const deltas = { stress: -10, reputation: -5, health: 6 };
      return {
        state: applyDeltas(s, deltas),
        result: result('quiet_quit_temptation', 'Quiet Quitting Era', 'Boundaries: set. Promo packet: postponed.', deltas),
      };
    },
  },
  {
    id: 'blind_post_fame',
    title: 'Blind Post Goes Nuclear',
    description: () => 'You vent anonymously. The whole industry quotes you. HR has questions.',
    weight: (s) => (s.company.employed ? 2.5 : 1),
    apply: (s, rng) => {
      const famous = rng.next() > 0.4;
      const deltas = famous
        ? { reputation: 8, stress: 10, cash: 0 }
        : { reputation: -10, stress: 14, health: -3 };
      return {
        state: applyDeltas(s, deltas),
        result: result(
          'blind_post_fame',
          famous ? 'Blind Folk Hero' : 'Blind Backfire',
          famous
            ? 'Anon legend status. Your manager suspiciously likes your posts.'
            : 'They know. They always know.',
          deltas,
        ),
      };
    },
  },
];
