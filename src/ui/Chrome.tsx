import { useEffect } from 'react';
import { useGame } from '../game/store';

export function Toast() {
  const toast = useGame((s) => s.toast);
  const clear = useGame((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 2800);
    return () => clearTimeout(t);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  );
}

export function LogDock() {
  const state = useGame((s) => s.state);
  if (!state || state.phase === 'title') return null;
  return (
    <div className="log-dock" aria-label="Event log">
      {state.log.slice(0, 12).map((e, i) => (
        <div key={`${e.week}-${i}`} className={e.kind}>
          <strong>W{e.week}</strong> {e.text}
        </div>
      ))}
    </div>
  );
}

export function LocationHint() {
  const state = useGame((s) => s.state);
  const activeLocation = useGame((s) => s.activeLocation);
  if (!state || state.phase === 'title' || state.phase === 'event') return null;
  if (state.phase === 'gameover' || state.phase === 'victory') return null;
  if (activeLocation) return null;
  return (
    <div className="location-hint">
      {state.forcedHospital
        ? 'Health below 50% — click the Hospital. Treatment is mandatory this week.'
        : 'Click a building: Company · Market · Bank · Hospital · Real Estate. One action ends the week.'}
    </div>
  );
}
