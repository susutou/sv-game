import { useEffect, useState } from 'react';
import { useGame } from '../game/store';

export function TitleScreen() {
  const state = useGame((s) => s.state);
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  const [name, setName] = useState('Alex Chen');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setHasSave(!!localStorage.getItem('valley-rise-save-v1'));
  }, [state]);

  if (state && state.phase !== 'title') return null;

  return (
    <div className="title-screen pixel-title">
      <div className="pixel-title-card">
        <p className="pixel-eyebrow">OPEN WORLD · PIXEL RPG</p>
        <h1 className="brand">Valley Rise</h1>
        <p className="tagline">
          Fresh out of college. One peninsula. One hundred four weeks.
          Walk the Valley, talk to people, chase glory — or burn out trying.
        </p>
        <div className="title-actions">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Character name"
            maxLength={24}
          />
          <button type="button" className="primary" onClick={() => newGame(name)}>
            New Game
          </button>
          {hasSave && (
            <button type="button" onClick={() => loadGame()}>
              Continue
            </button>
          )}
        </div>
        <p className="pixel-howto muted">
          WASD / Arrows to walk · E to talk / enter · Survive 104 weeks
        </p>
      </div>
    </div>
  );
}
