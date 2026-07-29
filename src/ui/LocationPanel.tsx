import { useState, type ReactNode } from 'react';
import { useGame } from '../game/store';
import { TICKER_META, HOUSING_OPTIONS, type HousingTier, type TickerId } from '../game/types';
import { formatMoney } from '../game/rng';

function PanelShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  const close = useGame((s) => s.closeLocation);
  return (
    <div className="panel-backdrop" onClick={close}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="sub">{sub}</p>
        {children}
        <div className="panel-footer">
          <span className="muted">One primary action advances the week</span>
          <button type="button" onClick={close}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocationPanel() {
  const active = useGame((s) => s.activeLocation);
  const state = useGame((s) => s.state);
  if (!active || !state) return null;
  if (active === 'company') return <CompanyPanel />;
  if (active === 'market') return <MarketPanel />;
  if (active === 'bank') return <BankPanel />;
  if (active === 'hospital') return <HospitalPanel />;
  if (active === 'realestate') return <RealEstatePanel />;
  return null;
}

function CompanyPanel() {
  const state = useGame((s) => s.state)!;
  const doWork = useGame((s) => s.doWork);
  const doOverwork = useGame((s) => s.doOverwork);
  const doPromo = useGame((s) => s.doPromo);
  const doInterview = useGame((s) => s.doInterview);
  const doOSS = useGame((s) => s.doOSS);

  return (
    <PanelShell
      title={state.company.name}
      sub={`${state.company.title} · $${state.company.weeklyPay}/wk · Valuation $${state.company.valuation}M (${state.company.stage}) · Vested ${(state.company.vestedPercent * 100).toFixed(0)}% of ${state.company.equityPercent.toFixed(3)}%`}
    >
      <div className="panel-actions">
        <button type="button" className="primary" onClick={doWork} disabled={!state.company.employed}>
          Work the week (steady)
        </button>
        <button type="button" onClick={doOverwork} disabled={!state.company.employed}>
          Crunch / overwork — bonus, health hit
        </button>
        <button type="button" onClick={doPromo} disabled={!state.company.employed}>
          Ask for promotion
          {state.company.promoCooldown > 0 ? ` (${state.company.promoCooldown}w)` : ''}
        </button>
        <button type="button" onClick={doInterview}>
          Interview elsewhere / job hop
        </button>
        <button type="button" onClick={doOSS}>
          Ship open source (rep ↑, sleep ↓)
        </button>
      </div>
    </PanelShell>
  );
}

function MarketPanel() {
  const state = useGame((s) => s.state)!;
  const doTrade = useGame((s) => s.doTrade);
  const [ticker, setTicker] = useState<TickerId>('index');
  const [amount, setAmount] = useState(500);

  const tickers = Object.keys(TICKER_META) as TickerId[];

  return (
    <PanelShell title="Stock Market" sub="Bay Area brokerage — buy the rumor, sell the all-hands.">
      <div className="list-block">
        {tickers.map((t) => (
          <div className="ticker-row" key={t}>
            <span style={{ color: TICKER_META[t].color }}>{TICKER_META[t].name}</span>
            <span>{formatMoney(state.market.prices[t])}</span>
            <span className="muted">
              {state.market.holdings[t].shares.toFixed(2)} sh
            </span>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value as TickerId)}
          style={{
            background: '#0f1a14',
            color: 'inherit',
            border: '1px solid rgba(232,184,109,0.22)',
            borderRadius: 4,
            padding: '0.5rem',
          }}
        >
          {tickers.map((t) => (
            <option key={t} value={t}>
              {TICKER_META[t].name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ maxWidth: 120 }}
        />
      </div>
      <div className="row">
        <button type="button" className="primary" onClick={() => doTrade(ticker, 'buy', amount)}>
          Buy ${amount}
        </button>
        <button type="button" onClick={() => doTrade(ticker, 'sell', amount)}>
          Sell ${amount}
        </button>
      </div>
    </PanelShell>
  );
}

function BankPanel() {
  const state = useGame((s) => s.state)!;
  const doDeposit = useGame((s) => s.doDeposit);
  const doWithdraw = useGame((s) => s.doWithdraw);
  const doLoan = useGame((s) => s.doLoan);
  const doPayDebt = useGame((s) => s.doPayDebt);
  const [amount, setAmount] = useState(500);

  return (
    <PanelShell
      title="Peninsula Credit Union"
      sub={`Savings ${formatMoney(state.bank.savings)} · Student loan ${formatMoney(state.bank.studentLoan)} · Personal loan ${formatMoney(state.bank.personalLoan)}`}
    >
      <div className="row" style={{ marginBottom: 8 }}>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ maxWidth: 140 }}
        />
      </div>
      <div className="panel-actions">
        <button type="button" className="primary" onClick={() => doDeposit(amount)}>
          Deposit to savings
        </button>
        <button type="button" onClick={() => doWithdraw(amount)}>
          Withdraw
        </button>
        <button type="button" onClick={() => doPayDebt('student', amount)}>
          Pay student loan
        </button>
        <button type="button" onClick={() => doPayDebt('personal', amount)}>
          Pay personal loan
        </button>
        <button type="button" className="danger" onClick={() => doLoan(amount)}>
          Take personal loan
        </button>
      </div>
    </PanelShell>
  );
}

function HospitalPanel() {
  const state = useGame((s) => s.state)!;
  const stats = useGame((s) => s.stats)!;
  const doHospital = useGame((s) => s.doHospital);
  const cost = stats()?.hospitalCost ?? 0;

  return (
    <PanelShell
      title="El Camino Urgent Care"
      sub={
        state.company.employed
          ? 'Employer plan: ~55% off sticker. Pick a tier and spend the week healing.'
          : 'No insurance — full price. Pick a tier and spend the week healing.'
      }
    >
      {state.forcedHospital && (
        <div className="warn-banner">
          Mandatory visit — health is {state.player.health}%. Other locations are locked.
        </div>
      )}
      <div className="panel-actions">
        <button type="button" className="primary" onClick={() => doHospital('basic')}>
          Basic care (~{formatMoney(cost)}) — restore ~30 HP
        </button>
        <button type="button" onClick={() => doHospital('full')}>
          Full workup (~{formatMoney(Math.round(cost * 1.6))}) — restore ~55 HP
        </button>
        <button type="button" onClick={() => doHospital('burnout')}>
          Burnout clinic (~{formatMoney(Math.round(cost * 2.4))}) — HP + big stress relief
        </button>
      </div>
    </PanelShell>
  );
}

function RealEstatePanel() {
  const state = useGame((s) => s.state)!;
  const doRent = useGame((s) => s.doRent);
  const doBuy = useGame((s) => s.doBuy);
  const doSellHome = useGame((s) => s.doSellHome);
  const tiers = Object.keys(HOUSING_OPTIONS) as HousingTier[];

  return (
    <PanelShell
      title="Bay Area Realty"
      sub={`Now: ${state.housing.label} · ${state.housing.owned ? `Owned, value ${formatMoney(state.housing.propertyValue)}, mortgage ${formatMoney(state.housing.mortgageBalance)}` : `Rent ${formatMoney(state.housing.weeklyCost)}/wk`}`}
    >
      <div className="panel-actions">
        {tiers.map((tier) => {
          const o = HOUSING_OPTIONS[tier];
          return (
            <div className="list-block" key={tier}>
              <strong>{o.label}</strong>
              <div className="muted" style={{ margin: '4px 0 8px' }}>
                Rent {formatMoney(o.weeklyRent)}/wk
                {o.buyPrice
                  ? ` · Buy ${formatMoney(o.buyPrice)} (20% down, mortgage ${formatMoney(o.weeklyMortgage)}/wk)`
                  : ' · Rent only'}
              </div>
              <div className="row">
                {!state.housing.owned && (
                  <button type="button" onClick={() => doRent(tier)}>
                    Rent
                  </button>
                )}
                {!!o.buyPrice && !state.housing.owned && (
                  <button type="button" className="primary" onClick={() => doBuy(tier)}>
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {state.housing.owned && (
          <button type="button" className="danger" onClick={doSellHome}>
            Sell current property
          </button>
        )}
      </div>
    </PanelShell>
  );
}
