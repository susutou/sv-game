import { Scene } from './scene/Campus';
import { Hud } from './ui/Hud';
import { TitleScreen } from './ui/TitleScreen';
import { EventModal } from './ui/EventModal';
import { EndScreen } from './ui/EndScreen';
import { LocationPanel } from './ui/LocationPanel';
import { CharacterPanel } from './ui/CharacterPanel';
import { Toast, LogDock, LocationHint } from './ui/Chrome';

export default function App() {
  return (
    <div className="app-shell">
      <Scene />
      <div className="ui-layer">
        <TitleScreen />
        <Hud />
        <LocationHint />
        <LogDock />
        <Toast />
        <LocationPanel />
        <CharacterPanel />
        <EventModal />
        <EndScreen />
      </div>
    </div>
  );
}
