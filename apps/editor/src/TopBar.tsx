import type { Theme } from '@maskmanlucifer/linework';
import { useState } from 'react';
import { canvasApi } from './Canvas';
import { examples } from './examples';
import { copySVG, exportPNG, exportSVG, openJSON, saveJSON } from './io';
import { useEditor } from './store';

/** Top bar: file, examples, export and view settings. */
export function TopBar() {
  const doc = useEditor((s) => s.doc);
  const step = useEditor((s) => s.step);
  const theme = useEditor((s) => s.theme);
  const snap = useEditor((s) => s.snap);
  const zoom = useEditor((s) => s.view.zoom);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { load, setTheme, toggleSnap, undo, redo } = useEditor.getState();
  const [note, setNote] = useState('');
  const opts = { theme, step: step ?? undefined };

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(''), 1600);
  };
  const open = (d: typeof doc) => {
    load(d);
    requestAnimationFrame(canvasApi.fit);
  };

  return (
    <header className="topbar">
      <span className="brand">linework</span>
      <span className="doc-title">{doc.title || 'Untitled'}</span>
      <div className="group">
        <button type="button" onClick={() => open({ version: 1, title: 'Untitled', elements: [] })}>New</button>
        <button type="button" onClick={() => openJSON().then(open, (e: Error) => flash(e.message))}>Open</button>
        <button type="button" onClick={() => saveJSON(doc)}>Save</button>
        <select
          value=""
          onChange={(e) => {
            const ex = examples[Number(e.target.value)];
            if (ex) open(structuredClone(ex.doc));
          }}
        >
          <option value="">Examples…</option>
          {examples.map((ex, i) => (
            <option key={ex.name} value={i}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>
      <div className="group">
        <button type="button" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">↷</button>
      </div>
      <span className="spacer" />
      {note && <span className="note">{note}</span>}
      <div className="group">
        <button type="button" className={snap ? 'active' : ''} onClick={toggleSnap} title="Snap to grid (hold Alt to bypass)">
          Snap
        </button>
        <button type="button" onClick={canvasApi.fit} title="Zoom to fit (⇧1)">
          {Math.round(zoom * 100)}%
        </button>
        <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)} title="Theme of canvas and exports">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      <div className="group">
        <button type="button" onClick={() => exportSVG(doc, opts)} title="Exports the current step">SVG</button>
        <button type="button" onClick={() => exportPNG(doc, opts).catch((e: Error) => flash(e.message))}>PNG</button>
        <button type="button" className="primary" onClick={() => copySVG(doc, opts).then(() => flash('SVG copied'), () => flash('Copy failed'))}>
          Copy SVG
        </button>
      </div>
    </header>
  );
}
