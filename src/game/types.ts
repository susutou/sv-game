/** Valley Rise — open-world RPG core types */

export type CareerLevel =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'unemployed';

export type RelationshipStatus = 'single' | 'dating' | 'engaged' | 'married' | 'divorced';

export type TickerId = 'bigtech' | 'index' | 'meme' | 'crypto' | 'company';

export type PhoneAppId = 'home' | 'trade' | 'wallet' | 'equity' | 'news' | 'messages';

export type PoiId = 'company' | 'bank' | 'hospital' | 'housing' | 'cafe' | 'park' | 'market';

export type NpcId = 'boss' | 'colleague' | 'friend' | 'partner';

export interface Holding {
  shares: number;
  avgCost: number;
}

export interface MarketState {
  prices: Record<TickerId, number>;
  holdings: Record<TickerId, Holding>;
  history: Record<TickerId, number[]>;
}

export interface CompanyState {
  name: string;
  valuation: number;
  stage: 'seriesA' | 'seriesB' | 'seriesC' | 'ipo' | 'acquired' | 'dead';
  employed: boolean;
  title: string;
  level: CareerLevel;
  weeklyPay: number;
  equityPercent: number;
  vestedPercent: number;
  weeksEmployed: number;
  cliffWeeks: number;
  vestWeeks: number;
}

export interface PlayerVitals {
  name: string;
  cash: number;
  health: number;
  reputation: number;
  stress: number;
}

export interface TimeState {
  day: number; // 1..730-ish
  maxDays: number;
  hour: number; // 0..23.99
  paused: boolean;
}

export interface HousingState {
  label: string;
  dailyRent: number;
  owned: boolean;
  propertyValue: number;
}

export interface BankState {
  savings: number;
  studentLoan: number;
  personalLoan: number;
}

export interface NpcBond {
  name: string;
  affinity: number;
}

export interface GameFlags {
  tutorialDone: boolean;
  forcedHospital: boolean;
  survivedProbation: boolean;
  paperMillionaire: boolean;
  unicornRider: boolean;
}

export interface NewsItem {
  id: string;
  day: number;
  title: string;
  body: string;
}

export interface MessageItem {
  id: string;
  from: string;
  body: string;
  day: number;
  read: boolean;
}

export interface GameState {
  vitals: PlayerVitals;
  time: TimeState;
  company: CompanyState;
  market: MarketState;
  bank: BankState;
  housing: HousingState;
  relationship: { status: RelationshipStatus; partnerName: string | null };
  npcs: Record<NpcId, NpcBond>;
  flags: GameFlags;
  news: NewsItem[];
  messages: MessageItem[];
  log: string[];
  position: [number, number, number];
  gameOver: string | null;
  victory: boolean;
}

export const TICKER_META: Record<TickerId, { name: string; symbol: string; color: string }> = {
  bigtech: { name: 'FAANG Basket', symbol: 'FNG', color: '#4a7c59' },
  index: { name: 'S&P Shadow', symbol: 'SPYx', color: '#3d5a80' },
  meme: { name: 'Meme Growth', symbol: 'YOLO', color: '#c44900' },
  crypto: { name: 'Crypto Index', symbol: 'CRYX', color: '#e8b86d' },
  company: { name: 'Nimbus (priv)', symbol: 'NMBS', color: '#7eb8a2' },
};

export const CAREER_PAY: Record<CareerLevel, number> = {
  junior: 257, // ~daily take-home abstracted from ~1800/wk
  mid: 371,
  senior: 514,
  staff: 685,
  principal: 885,
  unemployed: 0,
};

export const CAREER_TITLE: Record<CareerLevel, string> = {
  junior: 'Junior Software Engineer',
  mid: 'Software Engineer',
  senior: 'Senior Software Engineer',
  staff: 'Staff Engineer',
  principal: 'Principal Engineer',
  unemployed: 'Between Jobs',
};
