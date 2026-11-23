import { LIGHT, resolveStyle, type Color, type Element, type Fill, type Route, type StrokeWidth } from '@maskmanlucifer/linework';
import type { ReactNode } from 'react';
import { actions, updateSelected } from './actions';
import { mapElements } from './ops';
import { useEditor } from './store';

const COLORS: Color[] = ['ink', 'muted', 'accent', 'teal'];
const FILLS: Fill[] = ['none', 'paper', 'shade', 'accent', 'teal', 'hatch', 'dots'];
const WIDTHS: StrokeWidth[] = ['thin', 'regular', 'bold'];
const NO_FILL = new Set<Element['type']>(['line', 'text', 'callout', 'dimension', 'badge']);

const swatch: Record<Fill, string> = {
  none: 'transparent',
  paper: '#FFFFFF',
  shade: LIGHT.shade,
  accent: LIGHT.accentSoft,
  teal: LIGHT.tealSoft,
  hatch: `repeating-linear-gradient(45deg, ${LIGHT.muted} 0 1px, #fff 1px 5px)`,
  dots: `radial-gradient(${LIGHT.muted} 0.9px, #fff 1px) 0 0 / 5px 5px`,
};

/**
 * Live edits: a checkpoint when a field gains focus, then history-free
 * updates while typing, so one edit session is one undo step.
 */
function live(fn: (el: Element, v: string) => Element) {
  return {
    onFocus: () => useEditor.getState().checkpoint(),
    onChange: (e: { target: { value: string } }) => {
      const s = useEditor.getState();
      s.setDoc(mapElements(s.doc, s.selection, (el) => fn(el, e.target.value)));
    },
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="insp-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T | undefined; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} type="button" className={o === value ? 'active' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Num({ label, el, k, min = 0 }: { label: string; el: Element; k: string; min?: number }) {
  const v = (el as unknown as Record<string, number | undefined>)[k] ?? 0;
  return (
    <label className="num">
      <span>{label}</span>
      <input type="number" min={min} value={Math.round(v * 100) / 100} {...live((e, s) => ({ ...e, [k]: Math.max(min, Number(s) || 0) }) as Element)} />
    </label>
  );
}

function textKey(el: Element): 'text' | 'title' | null {
  if (el.type === 'frame') return 'title';
  if ('text' in el || el.type === 'rect' || el.type === 'ellipse' || el.type === 'cylinder' || el.type === 'isobox' || el.type === 'dimension') return 'text';
  return null;
}

/** Right-hand panel: style and properties of the selection, or document settings. */
export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const sel = doc.elements.filter((e) => selection.includes(e.id));
  const el = sel[0];

  if (!el) {
    return (
      <aside className="inspector">
        <Section title="Document">
          <label className="field">
            <span>Title</span>
            <input value={doc.title ?? ''} {...{
              onFocus: () => useEditor.getState().checkpoint(),
              onChange: (e) => useEditor.getState().setDoc({ ...useEditor.getState().doc, title: e.target.value }),
            }} />
          </label>
          <p className="hint">{doc.elements.length} elements · {doc.steps?.length ?? 0} steps</p>
        </Section>
        <Section title="Shortcuts">
          <dl className="keys">
            {[
              ['Space + drag', 'Pan'],
              ['⌘ + wheel', 'Zoom'],
              ['⇧ 1', 'Zoom to fit'],
              ['Alt', 'No snapping'],
              ['⌘ Z / ⇧⌘ Z', 'Undo / redo'],
              ['⌘ D', 'Duplicate'],
              ['⌘ G / ⇧⌘ G', 'Group / ungroup'],
              ['[ ]  ⌘[ ⌘]', 'Z-order'],
              ['Arrows', 'Nudge (⇧ ×10)'],
              ['Double-click', 'Edit text'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </aside>
    );
  }

  const style = resolveStyle(el);
  const tk = textKey(el);
  const setStyle = (patch: object) => updateSelected((e) => ({ ...e, style: { ...e.style, ...patch } }));

  return (
    <aside className="inspector">
      <Section title={sel.length > 1 ? `${sel.length} selected` : el.type}>
        {sel.length === 1 && tk && (
          <label className="field">
            <span>{tk === 'title' ? 'Title' : el.type === 'dimension' ? 'Label (empty = length)' : 'Text'}</span>
            <textarea
              id="insp-text"
              rows={2}
              value={(el as unknown as Record<string, string | undefined>)[tk] ?? ''}
              {...live((e, v) => ({ ...e, [tk]: v || (e.type === 'dimension' ? undefined : v) }) as Element)}
            />
          </label>
        )}
      </Section>

      <Section title="Stroke">
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              className={style.stroke === c ? 'sw active' : 'sw'}
              style={{ background: LIGHT[c] }}
              onClick={() => setStyle({ stroke: c })}
            />
          ))}
        </div>
        <Seg value={style.strokeWidth} options={WIDTHS} onChange={(v) => setStyle({ strokeWidth: v })} />
        <label className="check">
          <input type="checkbox" checked={style.dashed} onChange={(e) => setStyle({ dashed: e.target.checked })} /> Dashed
        </label>
      </Section>

      {!NO_FILL.has(el.type) && (
        <Section title="Fill">
          <div className="swatches">
            {FILLS.map((f) => (
              <button
                key={f}
                type="button"
                title={f}
                className={style.fill === f ? 'sw active' : 'sw'}
                style={{ background: swatch[f] }}
                onClick={() => setStyle({ fill: f })}
              >
                {f === 'none' ? '∅' : ''}
              </button>
            ))}
          </div>
        </Section>
      )}

      {sel.length === 1 && (
        <Section title="Shape">
          <div className="nums">
            {'w' in el && el.type !== 'isobox' && el.type !== 'isostack' && <Num label="W" el={el} k="w" />}
            {'h' in el && el.type !== 'isobox' && el.type !== 'isostack' && <Num label="H" el={el} k="h" />}
            {el.type === 'rect' && <Num label="Radius" el={el} k="radius" />}
            {(el.type === 'isobox' || el.type === 'isostack') && (
              <>
                <Num label="W" el={el} k="w" />
                <Num label="D" el={el} k="d" />
                <Num label="H" el={el} k="h" />
              </>
            )}
            {el.type === 'isostack' && (
              <>
                <Num label="Layers" el={el} k="layers" min={1} />
                <Num label="Gap" el={el} k="gap" />
              </>
            )}
            {el.type === 'text' && <Num label="Size" el={el} k="size" min={6} />}
            {el.type === 'badge' && <Num label="Number" el={el} k="n" />}
            {el.type === 'dimension' && <Num label="Offset" el={el} k="offset" min={-500} />}
          </div>
          {el.type === 'line' && (
            <>
              <Seg<Route> value={el.route ?? 'straight'} options={['straight', 'elbow', 'curved']} onChange={(v) => updateSelected((e) => ({ ...e, route: v }))} />
              <div className="row">
                <label className="check">
                  <input type="checkbox" checked={!!el.startArrow} onChange={(e) => updateSelected((x) => ({ ...x, startArrow: e.target.checked }))} /> Start arrow
                </label>
                <label className="check">
                  <input type="checkbox" checked={!!el.endArrow} onChange={(e) => updateSelected((x) => ({ ...x, endArrow: e.target.checked }))} /> End arrow
                </label>
              </div>
            </>
          )}
          {el.type === 'text' && (
            <>
              <Seg value={el.font ?? 'sans'} options={['sans', 'mono', 'serif']} onChange={(v) => updateSelected((e) => ({ ...e, font: v }))} />
              <Seg value={el.align ?? 'start'} options={['start', 'middle', 'end']} onChange={(v) => updateSelected((e) => ({ ...e, align: v }))} />
            </>
          )}
        </Section>
      )}

      <Section title="Arrange">
        <div className="grid4">
          <button type="button" onClick={() => actions.reorder('back')} title="Send to back (⌘[)">Back</button>
          <button type="button" onClick={() => actions.reorder('backward')} title="Send backward ([)">Down</button>
          <button type="button" onClick={() => actions.reorder('forward')} title="Bring forward (])">Up</button>
          <button type="button" onClick={() => actions.reorder('front')} title="Bring to front (⌘])">Front</button>
        </div>
        {sel.length > 1 && (
          <div className="grid3">
            {(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((a) => (
              <button key={a} type="button" onClick={() => actions.align(a)}>
                {a}
              </button>
            ))}
          </div>
        )}
        <div className="grid4">
          <button type="button" onClick={actions.duplicate} title="⌘D">Copy</button>
          <button type="button" onClick={() => actions.group(true)} title="⌘G" disabled={sel.length < 2}>Group</button>
          <button type="button" onClick={() => actions.group(false)} title="⇧⌘G" disabled={!sel.some((e) => e.groupId)}>Ungroup</button>
          <button type="button" className="danger" onClick={actions.remove} title="Delete">Delete</button>
        </div>
      </Section>
    </aside>
  );
}
