import { useGame } from '../game/store';
import { formatMoney, formatPct } from '../game/rng';

export function Hud() {
  const state = useGame((s) => s.state);
  const stats = useGame((s) => s.stats);
  const saveGame = useGame((s) => s.saveGame);
  if (!state || state.phase === 'title') return null;
  const st = stats();
  if (!st) return null;

  return (
    <div className="hud">
      <div className="hud-stats">
        <div className="stat">
          <label>Cash</label>
          <div className="value">{formatMoney(state.player.cash)}</div>
        </div>
        <div className="stat">
          <label>Net Worth</label>
          <div className="value">{formatMoney(st.netWorth)}</div>
        </div>
        <div className="stat">
          <label>Health</label>
          <div className="value">{formatPct(state.player.health)}</div>
          <div className="bar health">
            <span style={{ width: `${state.player.health}%` }} />
          </div>
        </div>
        <div className="stat">
          <label>Reputation</label>
          <div className="value">{formatPct(state.player.reputation)}</div>
          <div className="bar rep">
            <span style={{ width: `${state.player.reputation}%` }} />
          </div>
        </div>
      </div>
      <div className="hud-meta">
        <div>
          <strong>
            Week {Math.min(state.week, state.maxWeeks)}
          </strong>{' '}
          / {state.maxWeeks}
        </div>
        <div className="muted">
          {state.company.title} @ {state.company.name}
        </div>
        <div className="muted">
          Equity paper {formatMoney(st.equity)} · Portfolio {formatMoney(st.portfolio)}
        </div>
      </div>
      <div className="hud-actions">
        <button type="button" onClick={saveGame}>
          Save
        </button>
      </div>
    </div>
  );
}
