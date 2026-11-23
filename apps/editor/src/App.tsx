import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { useShortcuts } from './shortcuts';
import { StepsPanel } from './StepsPanel';
import { Toolbar } from './Toolbar';
import { TopBar } from './TopBar';

/** Editor layout: top bar, tools, canvas, inspector and steps. */
export function App() {
  useShortcuts();
  return (
    <div className="app">
      <TopBar />
      <Toolbar />
      <main className="stage">
        <Canvas />
      </main>
      <StepsPanel />
      <Inspector />
    </div>
  );
}
