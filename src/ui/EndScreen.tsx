import { useGame } from '../game/store';
import { formatMoney } from '../game/rng';

export function EndScreen() {
  const state = useGame((s) => s.state);
  const stats = useGame((s) => s.stats);
  const newGame = useGame((s) => s.newGame);
  if (!state || (state.phase !== 'gameover' && state.phase !== 'victory')) return null;
  const st = stats();
  const win = state.phase === 'victory';

  return (
    <div className="end-screen">
      <div className="end-card">
        <h1>{win ? 'Glory' : 'Game Over'}</h1>
        <p className="muted">
          {win
            ? `${state.player.name} survived ${state.maxWeeks} weeks in the Valley.`
            : state.gameOverReason}
        </p>
        <p style={{ fontSize: '1.25rem', margin: '1rem 0' }}>
          Final net worth <strong>{formatMoney(st?.netWorth ?? 0)}</strong>
          <br />
          <span className="muted">Score {st?.score ?? 0}</span>
        </p>
        {state.titles.length > 0 && (
          <div className="titles">
            {state.titles.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
        <button type="button" className="primary" onClick={() => newGame(state.player.name)}>
          Play Again
        </button>
      </div>
    </div>
  );
}
