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
      {state.log.slice(0, 10).map((e, i) => (
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
  const activeCharacter = useGame((s) => s.activeCharacter);
  if (!state || state.phase === 'title' || state.phase === 'event') return null;
  if (state.phase === 'gameover' || state.phase === 'victory') return null;
  if (activeLocation || activeCharacter) return null;
  // PixelWorld shows its own proximity prompt — keep a light tip only early game
  if (state.week > 3) return null;
  return (
    <div className="location-hint">
      Explore the peninsula. Walk up to buildings or people and press <kbd>E</kbd>.
    </div>
  );
}
