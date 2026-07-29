/** Valley Rise — core game types */

export type CareerLevel =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'founder'
  | 'unemployed';

export type RelationshipStatus =
  | 'single'
  | 'dating'
  | 'engaged'
  | 'married'
  | 'divorced';

export type LocationId =
  | 'company'
  | 'market'
  | 'bank'
  | 'hospital'
  | 'realestate';

export type HousingTier = 'shared' | 'studio' | 'condo' | 'house' | 'mansion';

export type GamePhase =
  | 'title'
  | 'playing'
  | 'event'
  | 'location'
  | 'hospital-forced'
  | 'week-summary'
  | 'gameover'
  | 'victory';

export type TickerId = 'bigtech' | 'index' | 'meme' | 'crypto' | 'company';

export interface StockHolding {
  shares: number;
}

export interface MarketState {
  prices: Record<TickerId, number>;
  holdings: Record<TickerId, StockHolding>;
  history: Record<TickerId, number[]>;
}

export interface CompanyState {
  name: string;
  valuation: number; // millions
  stage: 'seed' | 'seriesA' | 'seriesB' | 'seriesC' | 'ipo' | 'acquired' | 'dead';
  employed: boolean;
  title: string;
  level: CareerLevel;
  weeklyPay: number;
  equityPercent: number;
  vestedPercent: number; // 0-1 of equity vested
  weeksEmployed: number;
  cliffWeeks: number;
  vestWeeks: number;
  promoCooldown: number;
}

export interface HousingState {
  tier: HousingTier;
  owned: boolean;
  weeklyCost: number; // rent or mortgage
  propertyValue: number;
  mortgageBalance: number;
  label: string;
}

export interface BankState {
  savings: number;
  savingsApyWeekly: number;
  studentLoan: number;
  personalLoan: number;
  personalLoanRate: number;
}

export interface RelationshipState {
  status: RelationshipStatus;
  partnerName: string | null;
  weeksTogether: number;
}

export interface PlayerState {
  name: string;
  cash: number;
  health: number;
  reputation: number;
  stress: number; // 0-100 hidden
}

export interface EventResult {
  id: string;
  title: string;
  description: string;
  deltas: Partial<{
    cash: number;
    health: number;
    reputation: number;
    stress: number;
  }>;
  flags?: Partial<GameFlags>;
}

export interface GameFlags {
  survivedProbation: boolean;
  housePoor: boolean;
  paperMillionaire: boolean;
  unicornRider: boolean;
  laidOffOnce: boolean;
  marriedOnce: boolean;
  ipoHappened: boolean;
}

export interface LogEntry {
  week: number;
  text: string;
  kind: 'info' | 'good' | 'bad' | 'event';
}

export interface GameState {
  week: number;
  maxWeeks: number;
  phase: GamePhase;
  player: PlayerState;
  company: CompanyState;
  market: MarketState;
  bank: BankState;
  housing: HousingState;
  relationship: RelationshipState;
  flags: GameFlags;
  pendingEvents: EventResult[];
  lastSummary: string[];
  log: LogEntry[];
  forcedHospital: boolean;
  gameOverReason: string | null;
  titles: string[];
  seed: number;
  rngState: number;
}

export const TICKER_META: Record<
  TickerId,
  { name: string; color: string }
> = {
  bigtech: { name: 'FAANG Basket', color: '#4a7c59' },
  index: { name: 'S&P Shadow ETF', color: '#3d5a80' },
  meme: { name: 'Meme / Growth', color: '#c44900' },
  crypto: { name: 'Crypto Index', color: '#e8b86d' },
  company: { name: 'Your Co (private)', color: '#7eb8a2' },
};

export const HOUSING_OPTIONS: Record<
  HousingTier,
  { label: string; weeklyRent: number; buyPrice: number; weeklyMortgage: number }
> = {
  shared: {
    label: 'Shared East Bay room',
    weeklyRent: 700,
    buyPrice: 0,
    weeklyMortgage: 0,
  },
  studio: {
    label: 'South Bay studio',
    weeklyRent: 1100,
    buyPrice: 420000,
    weeklyMortgage: 1800,
  },
  condo: {
    label: 'Peninsula condo',
    weeklyRent: 1600,
    buyPrice: 780000,
    weeklyMortgage: 3200,
  },
  house: {
    label: 'Palo Alto bungalow',
    weeklyRent: 2800,
    buyPrice: 1600000,
    weeklyMortgage: 6200,
  },
  mansion: {
    label: 'Hillsborough estate',
    weeklyRent: 6000,
    buyPrice: 4500000,
    weeklyMortgage: 16000,
  },
};

export const CAREER_PAY: Record<CareerLevel, number> = {
  junior: 1800,
  mid: 2600,
  senior: 3600,
  staff: 4800,
  principal: 6200,
  founder: 4000,
  unemployed: 0,
};

export const CAREER_TITLES: Record<CareerLevel, string> = {
  junior: 'Junior Software Engineer',
  mid: 'Software Engineer',
  senior: 'Senior Software Engineer',
  staff: 'Staff Engineer',
  principal: 'Principal Engineer',
  founder: 'Co-Founder',
  unemployed: 'Between Jobs',
};
