import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../game/store';
import { TICKER_META, type PhoneAppId, type TickerId } from '../../game/types';
import { formatMoney } from '../../game/economy';

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const d = useMemo(() => {
    const pts = data.filter((n) => n > 0);
    if (pts.length < 2) return '';
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(0.0001, max - min);
    const w = 260;
    const h = 90;
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 10) - 5;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);
  if (!d) return <div className="phone-muted">No chart data</div>;
  return (
    <svg viewBox="0 0 260 90" width="100%" height="90" className="phone-spark">
      <path d={`${d} L260,90 L0,90 Z`} fill={up ? 'rgba(0,200,5,0.12)' : 'rgba(255,80,0,0.1)'} />
      <path d={d} fill="none" stroke={up ? '#00c805' : '#ff5000'} strokeWidth="2.5" />
    </svg>
  );
}

function TradeApp() {
  const state = useGame((s) => s.state)!;
  const buy = useGame((s) => s.buy);
  const sell = useGame((s) => s.sell);
  const [ticker, setTicker] = useState<TickerId>('index');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(250);

  const price = state.market.prices[ticker];
  const held = state.market.holdings[ticker];
  const value = held.shares * price;
  const pnl = value - held.shares * held.avgCost;
  const hist = state.market.history[ticker] ?? [];
  const prev = hist.length > 1 ? hist[hist.length - 2] : price;
  const up = price >= prev;
  const maxBuy = Math.floor(state.vitals.cash);
  const maxSell = Math.floor(value);

  return (
    <div className="phone-app-body">
      <div className="phone-trade-price">
        <div>
          <strong>{TICKER_META[ticker].symbol}</strong>
          <div className="phone-muted">{TICKER_META[ticker].name}</div>
        </div>
        <div className="phone-price-big">
          {formatMoney(price)}
          <span className={up ? 'up' : 'down'}>
            {up ? '+' : ''}
            {(price - prev).toFixed(2)}
          </span>
        </div>
      </div>
      <Sparkline data={hist} up={up} />

      <div className="phone-ticker-row">
        {(Object.keys(TICKER_META) as TickerId[]).map((t) => (
          <button
            key={t}
            type="button"
            className={ticker === t ? 'active' : ''}
            disabled={t === 'company' && state.market.prices.company <= 0}
            onClick={() => setTicker(t)}
          >
            {TICKER_META[t].symbol}
          </button>
        ))}
      </div>

      <div className="phone-card">
        <div className="phone-row"><span>Position</span><strong>{formatMoney(value)}</strong></div>
        <div className="phone-row"><span>Shares</span><strong>{held.shares.toFixed(3)}</strong></div>
        <div className="phone-row"><span>Avg cost</span><strong>{held.shares ? formatMoney(held.avgCost) : '—'}</strong></div>
        <div className="phone-row">
          <span>Unrealized</span>
          <strong className={pnl >= 0 ? 'up' : 'down'}>
            {held.shares ? `${pnl >= 0 ? '+' : ''}${formatMoney(pnl)}` : '—'}
          </strong>
        </div>
      </div>

      <div className="phone-side-tabs">
        <button type="button" className={`buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>Buy</button>
        <button type="button" className={`sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>Sell</button>
      </div>

      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <div className="phone-pct">
        {[0.25, 0.5, 1].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(Math.max(1, Math.floor((side === 'buy' ? maxBuy : maxSell) * p)))}
          >
            {p === 1 ? 'Max' : `${p * 100}%`}
          </button>
        ))}
      </div>
      <div className="phone-muted">
        {side === 'buy' ? `Buying power ${formatMoney(maxBuy)}` : `Max sellable ${formatMoney(maxSell)}`}
      </div>
      <button
        type="button"
        className={`phone-trade-go ${side}`}
        disabled={side === 'buy' ? amount > maxBuy || amount <= 0 : amount > maxSell || amount <= 0}
        onClick={() => (side === 'buy' ? buy(ticker, amount) : sell(ticker, amount))}
      >
        {side === 'buy' ? `Buy ${formatMoney(amount)}` : `Sell ${formatMoney(amount)}`}
      </button>
    </div>
  );
}

function EquityApp() {
  const state = useGame((s) => s.state)!;
  const stats = useGame((s) => s.stats)!;
  const st = stats();
  const c = state.company;
  return (
    <div className="phone-app-body">
      <h3>{c.name}</h3>
      <div className="phone-muted">{c.title} · {c.stage}</div>
      <div className="phone-card">
        <div className="phone-row"><span>Valuation</span><strong>${c.valuation}M</strong></div>
        <div className="phone-row"><span>Grant</span><strong>{c.equityPercent.toFixed(3)}%</strong></div>
        <div className="phone-row"><span>Vested</span><strong>{(c.vestedPercent * 100).toFixed(1)}%</strong></div>
        <div className="phone-row"><span>Paper value</span><strong>{formatMoney(st?.equity ?? 0)}</strong></div>
        <div className="phone-row"><span>Cliff</span><strong>{c.cliffWeeks} weeks</strong></div>
      </div>
      <p className="phone-muted">
        Private shares unlock in Trade after IPO. Until then, this is your lottery ticket.
      </p>
    </div>
  );
}

function WalletApp() {
  const state = useGame((s) => s.state)!;
  const stats = useGame((s) => s.stats)!;
  const st = stats();
  return (
    <div className="phone-app-body">
      <div className="phone-card">
        <div className="phone-row"><span>Cash</span><strong>{formatMoney(state.vitals.cash)}</strong></div>
        <div className="phone-row"><span>Savings</span><strong>{formatMoney(state.bank.savings)}</strong></div>
        <div className="phone-row"><span>Brokerage</span><strong>{formatMoney(st?.portfolio ?? 0)}</strong></div>
        <div className="phone-row"><span>Equity paper</span><strong>{formatMoney(st?.equity ?? 0)}</strong></div>
        <div className="phone-row"><span>Student loan</span><strong>{formatMoney(state.bank.studentLoan)}</strong></div>
        <div className="phone-row"><span>Net worth</span><strong>{formatMoney(st?.netWorth ?? 0)}</strong></div>
      </div>
    </div>
  );
}

function NewsApp() {
  const news = useGame((s) => s.state?.news ?? []);
  return (
    <div className="phone-app-body">
      {news.map((n) => (
        <div className="phone-card" key={n.id}>
          <strong>{n.title}</strong>
          <div className="phone-muted">Day {n.day}</div>
          <p>{n.body}</p>
        </div>
      ))}
    </div>
  );
}

function MessagesApp() {
  const messages = useGame((s) => s.state?.messages ?? []);
  const mark = useGame((s) => s.markMessagesRead);
  useEffect(() => {
    mark();
  }, [mark]);
  return (
    <div className="phone-app-body">
      {messages.map((m) => (
        <div className="phone-card" key={m.id}>
          <strong>{m.from}</strong>
          <div className="phone-muted">Day {m.day}</div>
          <p>{m.body}</p>
        </div>
      ))}
    </div>
  );
}

const APPS: { id: PhoneAppId; name: string; icon: string }[] = [
  { id: 'trade', name: 'Trade', icon: '📈' },
  { id: 'equity', name: 'Equity', icon: '💎' },
  { id: 'wallet', name: 'Wallet', icon: '💳' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'messages', name: 'Messages', icon: '💬' },
];

export function Phone() {
  const open = useGame((s) => s.phoneOpen);
  const app = useGame((s) => s.phoneApp);
  const setOpen = useGame((s) => s.setPhoneOpen);
  const setApp = useGame((s) => s.setPhoneApp);
  const state = useGame((s) => s.state);
  if (!open || !state) return null;

  return (
    <div className="phone-backdrop" onClick={() => setOpen(false)}>
      <div className="phone-shell" onClick={(e) => e.stopPropagation()}>
        <div className="phone-status">
          <span>
            Day {state.time.day} · {Math.floor(state.time.hour)}:{String(Math.floor((state.time.hour % 1) * 60)).padStart(2, '0')}
          </span>
          <span>{formatMoney(state.vitals.cash)}</span>
        </div>
        <div className="phone-notch" />
        {app === 'home' ? (
          <div className="phone-home">
            <h2>Phone</h2>
            <p className="phone-muted">Trade stocks & track startup equity on the go.</p>
            <div className="phone-grid">
              {APPS.map((a) => (
                <button key={a.id} type="button" className="phone-app-icon" onClick={() => setApp(a.id)}>
                  <span className="phone-emoji">{a.icon}</span>
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="phone-app-bar">
              <button type="button" onClick={() => setApp('home')}>‹ Home</button>
              <strong>{APPS.find((a) => a.id === app)?.name}</strong>
              <button type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            {app === 'trade' && <TradeApp />}
            {app === 'equity' && <EquityApp />}
            {app === 'wallet' && <WalletApp />}
            {app === 'news' && <NewsApp />}
            {app === 'messages' && <MessagesApp />}
          </>
        )}
      </div>
    </div>
  );
}
