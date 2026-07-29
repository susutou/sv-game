import { useGame } from '../game/store';
import { CHARACTER_META } from '../game/characters';
import type { CharacterId } from '../game/types';

const ACTIONS: Record<
  CharacterId,
  { id: string; label: string; hint: string; danger?: boolean }[]
> = {
  girlfriend: [
    { id: 'girlfriendCoffee', label: 'Grab coffee', hint: 'Cheap bonding · −$45 · stress↓' },
    { id: 'girlfriendDateNight', label: 'Date night', hint: 'Bigger spend · affinity↑ · maybe engagement' },
    { id: 'girlfriendSeriousTalk', label: 'Have the talk', hint: 'High risk / high reward honesty' },
  ],
  wife: [
    { id: 'wifeDinner', label: 'Cook dinner together', hint: '−$90 · stress↓ · affinity↑' },
    { id: 'wifePlanFuture', label: 'Plan the future', hint: 'Budgets, houses, timelines' },
    { id: 'wifeDateNight', label: 'Married date night', hint: 'Keep the spark · −$220' },
    { id: 'wifeArgue', label: 'Pick a fight', hint: 'Dangerous · can end the marriage', danger: true },
  ],
  colleague: [
    { id: 'colleagueLunch', label: 'Cafeteria lunch', hint: 'Office politics lite' },
    { id: 'colleaguePair', label: 'Pair program', hint: 'Ship together · rep swing' },
    { id: 'colleagueGossip', label: 'Hallway gossip', hint: 'Intel or HR incident' },
    { id: 'colleagueHelp', label: 'Ask for help', hint: 'Needs affinity ≥ 40' },
  ],
  boss: [
    { id: 'bossOneOnOne', label: 'Weekly 1:1', hint: 'Steady relationship points' },
    { id: 'bossAskRaise', label: 'Ask for a raise', hint: 'Affinity + rep matter' },
    { id: 'bossTakeBlame', label: 'Take the blame', hint: 'Boss affinity↑ · your rep↓' },
    { id: 'bossSkipLevel', label: 'Prep skip-level', hint: 'Risky if boss affinity is low' },
  ],
  friend: [
    { id: 'friendHangout', label: 'Hang out', hint: 'Soul patch · −$60' },
    { id: 'friendTrip', label: 'Weekend trip', hint: 'Big stress relief · −$450' },
    { id: 'friendLend', label: 'Lend $500', hint: 'Friendship collateral' },
    { id: 'friendBrainstorm', label: 'Startup brainstorm', hint: 'Napkin ideas · maybe cash' },
  ],
};

export function CharacterPanel() {
  const id = useGame((s) => s.activeCharacter);
  const state = useGame((s) => s.state);
  const close = useGame((s) => s.closeLocation);
  const act = useGame((s) => s.doCharacterAction);

  if (!id || !state?.characters) return null;
  const bond = state.characters[id];
  const meta = CHARACTER_META[id];

  return (
    <div className="panel-backdrop" onClick={close}>
      <div className="panel character-panel" onClick={(e) => e.stopPropagation()}>
        <div className="character-header">
          <div
            className="character-avatar"
            style={{ background: meta.outfit, boxShadow: `inset 0 -18px 0 ${meta.hair}` }}
            aria-hidden
          />
          <div>
            <h2>{bond.name}</h2>
            <p className="sub" style={{ margin: 0 }}>
              {meta.label} · {meta.role}
            </p>
          </div>
        </div>

        <div className="affinity-block">
          <div className="affinity-label">
            <span>Affinity</span>
            <strong>{Math.round(bond.affinity)}</strong>
          </div>
          <div className="bar rep">
            <span style={{ width: `${bond.affinity}%` }} />
          </div>
        </div>

        <div className="panel-actions">
          {ACTIONS[id].map((a) => (
            <button
              key={a.id}
              type="button"
              className={a.danger ? 'danger' : 'primary'}
              onClick={() => act(a.id)}
            >
              <div>{a.label}</div>
              <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 400, marginTop: 2 }}>
                {a.hint}
              </div>
            </button>
          ))}
        </div>

        <div className="panel-footer">
          <span className="muted">Talking spends the week</span>
          <button type="button" onClick={close}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
