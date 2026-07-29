import { useGame } from '../game/store';
import { formatMoney } from '../game/rng';

export function EventModal() {
  const state = useGame((s) => s.state);
  const dismiss = useGame((s) => s.dismissEventModal);
  if (!state || state.phase !== 'event') return null;

  return (
    <div className="panel-backdrop">
      <div className="panel">
        <h2>This Week</h2>
        <p className="sub">Random Valley weather — markets, drama, and destiny.</p>
        {state.pendingEvents.length === 0 && (
          <div className="list-block muted">A quiet week on the Peninsula. Almost suspicious.</div>
        )}
        {state.pendingEvents.map((ev) => (
          <div className="list-block" key={ev.id + ev.title}>
            <strong>{ev.title}</strong>
            <div style={{ marginTop: 6 }}>{ev.description}</div>
            <div className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
              {ev.deltas.cash ? (
                <span className={ev.deltas.cash > 0 ? 'good' : 'bad'}>
                  Cash {ev.deltas.cash > 0 ? '+' : ''}
                  {formatMoney(ev.deltas.cash)}{' '}
                </span>
              ) : null}
              {ev.deltas.health ? (
                <span className={ev.deltas.health > 0 ? 'good' : 'bad'}>
                  Health {ev.deltas.health > 0 ? '+' : ''}
                  {ev.deltas.health}{' '}
                </span>
              ) : null}
              {ev.deltas.reputation ? (
                <span className={ev.deltas.reputation > 0 ? 'good' : 'bad'}>
                  Rep {ev.deltas.reputation > 0 ? '+' : ''}
                  {ev.deltas.reputation}{' '}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {state.lastSummary.length > 0 && (
          <div className="list-block muted">
            <div style={{ marginBottom: 4 }}>Ledger</div>
            {state.lastSummary.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        )}
        <div className="panel-footer">
          <span className="muted">Week {state.week} complete</span>
          <button type="button" className="primary" onClick={dismiss}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
