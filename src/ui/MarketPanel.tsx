import { useMemo, useState } from 'react';
import { useGame } from '../game/store';
import { TICKER_META, type TickerId } from '../game/types';
import { formatMoney } from '../game/rng';

function Sparkline({
  data,
  positive,
  width = 280,
  height = 120,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const path = useMemo(() => {
    const pts = data.filter((n) => n > 0);
    if (pts.length < 2) return '';
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(0.0001, max - min);
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * width;
        const y = height - ((v - min) / span) * (height - 12) - 6;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, width, height]);

  const fill = useMemo(() => {
    if (!path) return '';
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, width, height]);

  const stroke = positive ? '#00c805' : '#ff5000';
  const fillColor = positive ? 'rgba(0,200,5,0.15)' : 'rgba(255,80,0,0.12)';

  if (!path) {
    return (
      <div className="spark-empty muted">No price history yet — private or illiquid.</div>
    );
  }

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <path d={fill} fill={fillColor} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

export function MarketPanel({ onClose }: { onClose: () => void }) {
  const state = useGame((s) => s.state)!;
  const doTrade = useGame((s) => s.doTrade);
  const tickers = (Object.keys(TICKER_META) as TickerId[]).filter(
    (t) => t !== 'company' || state.market.prices.company > 0,
  );
  const [ticker, setTicker] = useState<TickerId>(tickers[0] ?? 'index');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(500);
  const [pct, setPct] = useState<number | null>(null);

  const price = state.market.prices[ticker] || 0;
  const holding = state.market.holdings[ticker];
  const shares = holding?.shares ?? 0;
  const avgCost = holding?.avgCost ?? 0;
  const marketValue = shares * price;
  const costBasis = shares * avgCost;
  const unrealized = marketValue - costBasis;
  const unrealizedPct = costBasis > 0 ? (unrealized / costBasis) * 100 : 0;
  const history = state.market.history[ticker] ?? [];
  const prev = history.length > 1 ? history[history.length - 2] : price;
  const dayChange = price - prev;
  const dayChangePct = prev > 0 ? (dayChange / prev) * 100 : 0;
  const positive = dayChange >= 0;
  const maxBuy = Math.max(0, Math.floor(state.player.cash));
  const maxSell = Math.max(0, Math.floor(marketValue));

  const applyPct = (p: number) => {
    setPct(p);
    if (side === 'buy') setAmount(Math.max(1, Math.floor(maxBuy * p)));
    else setAmount(Math.max(1, Math.floor(maxSell * p)));
  };

  const canTrade =
    price > 0 &&
    amount > 0 &&
    (side === 'buy' ? amount <= maxBuy : maxSell > 0 && amount <= maxSell);

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <div className="panel trade-panel" onClick={(e) => e.stopPropagation()}>
        <div className="trade-header">
          <div>
            <div className="trade-title">{TICKER_META[ticker].name}</div>
            <div className="trade-price">
              {price > 0 ? formatMoney(price) : '—'}
              <span className={positive ? 'good' : 'bad'}>
                {' '}
                {positive ? '+' : ''}
                {dayChange.toFixed(2)} ({positive ? '+' : ''}
                {dayChangePct.toFixed(2)}%)
              </span>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <Sparkline data={history} positive={positive} />

        <div className="ticker-pills">
          {(Object.keys(TICKER_META) as TickerId[]).map((t) => {
            const p = state.market.prices[t];
            const h = state.market.history[t] ?? [];
            const prevP = h.length > 1 ? h[h.length - 2] : p;
            const up = p >= prevP;
            const disabled = t === 'company' && p <= 0;
            return (
              <button
                key={t}
                type="button"
                className={`ticker-pill ${ticker === t ? 'active' : ''} ${up ? 'up' : 'down'}`}
                disabled={disabled}
                onClick={() => {
                  setTicker(t);
                  setPct(null);
                }}
              >
                <span>{TICKER_META[t].name.split(' ')[0]}</span>
                <strong>{p > 0 ? formatMoney(p) : 'IPO?'}</strong>
              </button>
            );
          })}
        </div>

        <div className="holdings-card">
          <div className="holdings-row">
            <span>Market value</span>
            <strong>{formatMoney(marketValue)}</strong>
          </div>
          <div className="holdings-row">
            <span>Shares</span>
            <strong>{shares.toFixed(3)}</strong>
          </div>
          <div className="holdings-row">
            <span>Avg cost</span>
            <strong>{shares > 0 ? formatMoney(avgCost) : '—'}</strong>
          </div>
          <div className="holdings-row">
            <span>Unrealized</span>
            <strong className={unrealized >= 0 ? 'good' : 'bad'}>
              {shares > 0
                ? `${unrealized >= 0 ? '+' : ''}${formatMoney(unrealized)} (${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%)`
                : '—'}
            </strong>
          </div>
        </div>

        <div className="trade-tabs">
          <button
            type="button"
            className={`tab buy ${side === 'buy' ? 'active' : ''}`}
            onClick={() => {
              setSide('buy');
              setPct(null);
            }}
          >
            Buy
          </button>
          <button
            type="button"
            className={`tab sell ${side === 'sell' ? 'active' : ''}`}
            onClick={() => {
              setSide('sell');
              setPct(null);
              setAmount(maxSell > 0 ? Math.min(amount, maxSell) : 0);
            }}
          >
            Sell
          </button>
        </div>

        <label className="trade-label">
          Dollar amount
          <input
            type="number"
            min={0}
            max={side === 'buy' ? maxBuy : maxSell}
            value={amount}
            onChange={(e) => {
              setPct(null);
              setAmount(Number(e.target.value));
            }}
          />
        </label>

        <div className="pct-row">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button
              key={p}
              type="button"
              className={pct === p ? 'active' : ''}
              onClick={() => applyPct(p)}
              disabled={side === 'sell' ? maxSell <= 0 : maxBuy <= 0}
            >
              {p === 1 ? 'Max' : `${p * 100}%`}
            </button>
          ))}
        </div>

        <div className="trade-limits muted">
          {side === 'buy' ? (
            <>Buying power {formatMoney(maxBuy)}</>
          ) : (
            <>
              Max sellable <strong className="good">{formatMoney(maxSell)}</strong>
            </>
          )}
          <span>· Action spends the week</span>
        </div>

        <button
          type="button"
          className={`trade-submit ${side}`}
          disabled={!canTrade}
          onClick={() => doTrade(ticker, side, amount)}
        >
          {side === 'buy' ? `Buy ${formatMoney(amount)}` : `Sell ${formatMoney(amount)}`}
        </button>
      </div>
    </div>
  );
}
