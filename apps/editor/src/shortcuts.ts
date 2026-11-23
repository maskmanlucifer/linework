import { useEffect } from 'react';
import { actions } from './actions';
import { canvasApi } from './Canvas';
import { saveJSON } from './io';
import { useEditor } from './store';
import { TOOLS } from './tools';

/** Global keyboard shortcuts. Ignored while typing in a field. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input,textarea,select')) return;
      const s = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (mod) {
        if (k === 'z') return run(e.shiftKey ? s.redo : s.undo);
        if (k === 'y') return run(s.redo);
        if (k === 'd') return run(actions.duplicate);
        if (k === 'a') return run(actions.selectAll);
        if (k === 'g') return run(() => actions.group(!e.shiftKey));
        if (k === 's') return run(() => saveJSON(s.doc));
        if (k === ']') return run(() => actions.reorder('front'));
        if (k === '[') return run(() => actions.reorder('back'));
        if (k === '0') return run(() => s.setView({ ...s.view, zoom: 1 }));
        return;
      }
      if (k === 'delete' || k === 'backspace') return run(actions.remove);
      if (k === 'escape') return run(() => (s.setTool('select'), s.select([])));
      if (k === ']') return run(() => actions.reorder('forward'));
      if (k === '[') return run(() => actions.reorder('backward'));
      if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) return run(canvasApi.fit);
      const step = e.shiftKey ? 10 : 1;
      const arrows: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      if (arrows[k] && s.selection.length) return run(() => actions.nudge(...arrows[k]));
      const tool = TOOLS.find((t) => t.key === k);
      if (tool && !e.shiftKey && !e.altKey) run(() => s.setTool(tool.id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
