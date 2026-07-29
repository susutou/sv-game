import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { World } from './world/World';
import { useGame } from './game/store';
import { formatMoney } from './game/economy';
import { Phone } from './ui/phone/Phone';

function Title() {
  const title = useGame((s) => s.title);
  const newGame = useGame((s) => s.newGame);
  const loadGame = useGame((s) => s.loadGame);
  if (!title) return null;
  return (
    <div className="title-overlay">
      <div className="title-card">
        <p className="eyebrow">3D OPEN WORLD RPG</p>
        <h1>Valley Rise</h1>
        <p>
          Newly graduated. Series A desk. One peninsula between you and glory.
          Walk the Bay, ship code, open your phone, trade the tape.
        </p>
        <div className="title-actions">
          <button type="button" className="primary" onClick={() => newGame('Alex Chen')}>
            Start Career
          </button>
          <button type="button" onClick={() => loadGame()}>
            Continue
          </button>
        </div>
        <p className="hint">WASD move · Shift sprint · E / click interact · P phone</p>
      </div>
    </div>
  );
}

function Hud() {
  const state = useGame((s) => s.state);
  const title = useGame((s) => s.title);
  const stats = useGame((s) => s.stats);
  const setPhone = useGame((s) => s.setPhoneOpen);
  const save = useGame((s) => s.saveGame);
  const label = useGame((s) => s.interactLabel);
  if (title || !state) return null;
  const st = stats();
  const h = Math.floor(state.time.hour);
  const m = Math.floor((state.time.hour % 1) * 60);

  return (
    <div className="hud">
      <div className="hud-left">
        <div className="stat"><label>Cash</label><b>{formatMoney(state.vitals.cash)}</b></div>
        <div className="stat"><label>Net</label><b>{formatMoney(st?.netWorth ?? 0)}</b></div>
        <div className="stat">
          <label>Health</label>
          <b>{Math.round(state.vitals.health)}%</b>
          <div className="bar"><span style={{ width: `${state.vitals.health}%` }} /></div>
        </div>
        <div className="stat">
          <label>Rep</label>
          <b>{Math.round(state.vitals.reputation)}%</b>
          <div className="bar rep"><span style={{ width: `${state.vitals.reputation}%` }} /></div>
        </div>
      </div>
      <div className="hud-right">
        <div>Day {state.time.day} · {h}:{String(m).padStart(2, '0')}</div>
        <div className="muted">{state.company.title}</div>
        <div className="hud-btns">
          <button type="button" className="primary" onClick={() => setPhone(true)}>Phone</button>
          <button type="button" onClick={save}>Save</button>
        </div>
      </div>
      {label && <div className="interact-pill">{label}</div>}
      {state.flags.forcedHospital && <div className="alert">Health critical — get to Urgent Care</div>}
    </div>
  );
}

function Dialogue() {
  const d = useGame((s) => s.dialogue);
  const resolve = useGame((s) => s.resolveDialogue);
  if (!d) return null;
  return (
    <div className="dialogue">
      <div className="dialogue-card">
        <h3>{d.speaker}</h3>
        <p>{d.text}</p>
        <div className="dialogue-options">
          {(d.options ?? [{ label: 'OK', action: 'close' }]).map((o) => (
            <button key={o.action + o.label} type="button" onClick={() => resolve(o.action)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toast() {
  const toast = useGame((s) => s.toast);
  const clear = useGame((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 2600);
    return () => clearTimeout(t);
  }, [toast, clear]);
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

function EndScreens() {
  const state = useGame((s) => s.state);
  const newGame = useGame((s) => s.newGame);
  if (!state) return null;
  if (!state.gameOver && !state.victory) return null;
  return (
    <div className="title-overlay">
      <div className="title-card">
        <h1>{state.victory ? 'Glory' : 'Game Over'}</h1>
        <p>{state.victory ? 'You lasted a year in the Valley.' : state.gameOver}</p>
        <button type="button" className="primary" onClick={() => newGame(state.vitals.name)}>
          Play Again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const title = useGame((s) => s.title);
  return (
    <div className="app-shell">
      <div className="scene-layer">
        <Canvas
          shadows
          camera={{ position: [0, 6, 14], fov: 50, near: 0.1, far: 200 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#7eb6d4');
          }}
        >
          {!title && <World />}
          {title && (
            <>
              <color attach="background" args={['#1a2f40']} />
              <ambientLight intensity={0.6} />
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[40, 48]} />
                <meshStandardMaterial color="#3d5c4a" />
              </mesh>
              <mesh position={[-4, 2, -6]} castShadow>
                <boxGeometry args={[5, 4, 4]} />
                <meshStandardMaterial color="#8aa4b0" />
              </mesh>
              <mesh position={[5, 1.5, -3]} castShadow>
                <boxGeometry args={[3, 3, 3]} />
                <meshStandardMaterial color="#c4a484" />
              </mesh>
              <directionalLight position={[8, 12, 4]} intensity={1.1} castShadow />
            </>
          )}
        </Canvas>
      </div>
      <div className="ui-layer">
        <Title />
        <Hud />
        <Dialogue />
        <Phone />
        <Toast />
        <EndScreens />
      </div>
    </div>
  );
}
