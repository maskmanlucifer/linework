import {
  docBounds,
  getBounds,
  hitTest,
  patternDefs,
  renderElement,
  snap as snapTo,
  stepClass,
  stepHasHighlight,
  stepState,
  themeCSS,
  translateElement,
  type Box,
  type Doc,
  type Element,
  type Pt,
} from '@maskmanlucifer/linework';
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { expandGroups, mapElements } from './ops';
import { useEditor } from './store';
import { clickDefaults, createAt, dragShape } from './tools';

const GRID = 10;
const CSS = themeCSS();
const DEFS = patternDefs('lw');

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'p1' | 'p2' | 'target';

type Drag =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'move'; start: Pt; orig: Doc; ids: string[]; moved: boolean }
  | { kind: 'handle'; handle: Handle; orig: Element; moved: boolean }
  | { kind: 'create'; el: Element; start: Pt; moved: boolean }
  | { kind: 'marquee'; start: Pt; base: string[] };

/** Imperative canvas actions for menus and shortcuts. */
export const canvasApi = { fit: () => {} };

const isBoxLike = (el: Element) => el.type === 'rect' || el.type === 'ellipse' || el.type === 'frame' || el.type === 'cylinder';

function handlesOf(el: Element): [Handle, Pt][] {
  if (isBoxLike(el) && 'w' in el) {
    return [
      ['nw', [el.x, el.y]],
      ['ne', [el.x + el.w, el.y]],
      ['sw', [el.x, el.y + el.h]],
      ['se', [el.x + el.w, el.y + el.h]],
    ];
  }
  if (el.type === 'line' || el.type === 'dimension') return [['p1', [el.x, el.y]], ['p2', [el.x2, el.y2]]];
  if (el.type === 'callout') return [['target', [el.tx, el.ty]]];
  return [];
}

function applyHandle(el: Element, h: Handle, p: Pt): Element {
  if (h === 'p1') return { ...el, x: p[0], y: p[1] };
  if (h === 'p2') return { ...el, x2: p[0], y2: p[1] } as Element;
  if (h === 'target') return { ...el, tx: p[0], ty: p[1] } as Element;
  if (!('w' in el)) return el;
  const b = getBounds(el);
  const fx = h === 'nw' || h === 'sw' ? b.x + b.w : b.x;
  const fy = h === 'nw' || h === 'ne' ? b.y + b.h : b.y;
  return { ...el, x: Math.min(fx, p[0]), y: Math.min(fy, p[1]), w: Math.max(4, Math.abs(p[0] - fx)), h: Math.max(4, Math.abs(p[1] - fy)) };
}

const intersects = (a: Box, b: Box) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
const contains = (a: Box, b: Box) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;

const htmlCache = new WeakMap<Element, Map<string, string>>();
function elementHtml(el: Element, cls: string): string {
  let m = htmlCache.get(el);
  if (!m) htmlCache.set(el, (m = new Map()));
  let s = m.get(cls);
  if (s === undefined) m.set(cls, (s = renderElement(el, { className: cls })));
  return s;
}

/** Focuses the inspector text field, used after double-click or a new text element. */
export function focusTextField(): void {
  setTimeout(() => {
    const t = document.getElementById('insp-text') as HTMLTextAreaElement | null;
    t?.focus();
    t?.select();
  }, 0);
}

/** The infinite drawing canvas: grid, elements, selection and all pointer input. */
export function Canvas() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const tool = useEditor((s) => s.tool);
  const view = useEditor((s) => s.view);
  const step = useEditor((s) => s.step);
  const theme = useEditor((s) => s.theme);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [space, setSpace] = useState(false);
  const [panning, setPanning] = useState(false);

  const html = useMemo(() => {
    const s = step ?? undefined;
    const any = s !== undefined && stepHasHighlight(doc, s);
    return doc.elements.map((el) => elementHtml(el, stepClass(stepState(el, s, any)))).join('');
  }, [doc, step]);

  useEffect(() => {
    canvasApi.fit = () => {
      const svg = svgRef.current;
      const { doc } = useEditor.getState();
      if (!svg || !doc.elements.length) return;
      const b = docBounds(doc);
      const r = svg.getBoundingClientRect();
      const zoom = Math.min((r.width - 120) / b.w, (r.height - 120) / b.h, 1.5);
      useEditor.getState().setView({ zoom, x: r.width / 2 - (b.x + b.w / 2) * zoom, y: r.height / 2 - (b.y + b.h / 2) * zoom });
    };
    canvasApi.fit();
  }, []);

  useEffect(() => {
    const svg = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { view, setView } = useEditor.getState();
      if (e.ctrlKey || e.metaKey) {
        const r = svg.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const zoom = Math.min(8, Math.max(0.1, view.zoom * Math.exp(-e.deltaY * 0.01)));
        const k = zoom / view.zoom;
        setView({ zoom, x: mx - (mx - view.x) * k, y: my - (my - view.y) * k });
      } else {
        setView({ ...view, x: view.x - e.deltaX, y: view.y - e.deltaY });
      }
    };
    const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement).closest?.('input,textarea,select');
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) {
        e.preventDefault();
        setSpace(true);
      }
    };
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpace(false);
    svg.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      svg.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const toWorld = (e: { clientX: number; clientY: number; altKey?: boolean }, snapped = true): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    const { view, snap } = useEditor.getState();
    const p: Pt = [(e.clientX - r.left - view.x) / view.zoom, (e.clientY - r.top - view.y) / view.zoom];
    return snapped && snap && !e.altKey ? [snapTo(p[0], GRID), snapTo(p[1], GRID)] : p;
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    const st = useEditor.getState();
    (e.target as SVGElement).setPointerCapture?.(e.pointerId);
    if (e.button === 1 || space || st.tool === 'hand') {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: st.view.x, vy: st.view.y };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    const handle = (e.target as SVGElement).closest('[data-handle]')?.getAttribute('data-handle') as Handle | null;
    const sel = st.doc.elements.find((el) => el.id === st.selection[0]);
    if (handle && sel) {
      drag.current = { kind: 'handle', handle, orig: sel, moved: false };
      return;
    }
    const p = toWorld(e);
    if (st.tool !== 'select') {
      const el = createAt(st.tool, p, st.doc);
      if (!el) return;
      st.checkpoint();
      st.setDoc({ ...st.doc, elements: [...st.doc.elements, el] });
      st.select([el.id]);
      drag.current = { kind: 'create', el, start: p, moved: false };
      return;
    }
    const raw = toWorld(e, false);
    const hit = hitTest(st.doc.elements, raw, 5 / st.view.zoom);
    if (hit) {
      let ids = st.selection.includes(hit) ? st.selection : [hit];
      if (e.shiftKey) ids = st.selection.includes(hit) ? st.selection.filter((i) => i !== hit) : [...st.selection, hit];
      ids = expandGroups(st.doc, ids);
      st.select(ids);
      drag.current = { kind: 'move', start: p, orig: st.doc, ids, moved: false };
    } else {
      if (!e.shiftKey) st.select([]);
      drag.current = { kind: 'marquee', start: raw, base: e.shiftKey ? st.selection : [] };
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const st = useEditor.getState();
    if (d.kind === 'pan') {
      st.setView({ ...st.view, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy });
      return;
    }
    if (d.kind === 'marquee') {
      const p = toWorld(e, false);
      const box = { x: Math.min(p[0], d.start[0]), y: Math.min(p[1], d.start[1]), w: Math.abs(p[0] - d.start[0]), h: Math.abs(p[1] - d.start[1]) };
      setMarquee(box);
      const hits = st.doc.elements
        .filter((el) => (el.type === 'frame' ? contains(box, getBounds(el)) : intersects(box, getBounds(el))))
        .map((el) => el.id);
      st.select(expandGroups(st.doc, [...new Set([...d.base, ...hits])]));
      return;
    }
    const p = toWorld(e);
    if (d.kind === 'move') {
      const dx = p[0] - d.start[0];
      const dy = p[1] - d.start[1];
      if (!d.moved && !dx && !dy) return;
      if (!d.moved) st.checkpoint();
      d.moved = true;
      st.setDoc(mapElements(d.orig, d.ids, (el) => translateElement(el, dx, dy)));
    } else if (d.kind === 'handle') {
      if (!d.moved) st.checkpoint();
      d.moved = true;
      st.setDoc(mapElements(st.doc, [d.orig.id], () => applyHandle(d.orig, d.handle, p)));
    } else if (d.kind === 'create') {
      if (Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) < 4 && !d.moved) return;
      d.moved = true;
      st.setDoc(mapElements(st.doc, [d.el.id], () => dragShape(d.el, d.start, p)));
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setMarquee(null);
    setPanning(false);
    if (d?.kind !== 'create') return;
    const st = useEditor.getState();
    if (!d.moved) st.setDoc(mapElements(st.doc, [d.el.id], () => clickDefaults(d.el)));
    st.setTool('select');
    if (d.el.type === 'text' || d.el.type === 'callout') focusTextField();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const st = useEditor.getState();
    const hit = hitTest(st.doc.elements, toWorld(e, false), 5 / st.view.zoom);
    if (hit) {
      st.select([hit]);
      focusTextField();
    }
  };

  const selected = doc.elements.filter((el) => selection.includes(el.id));
  const single = selected.length === 1 ? selected[0] : undefined;
  const gridStep = GRID * 2 * (view.zoom < 0.5 ? 2 : 1) * view.zoom;
  const hs = 4 / view.zoom;
  const cursor = panning ? 'grabbing' : space || tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';

  return (
    <svg
      ref={svgRef}
      className={`canvas lw lw-${theme}`}
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <style>{CSS}</style>
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
      <defs>
        <pattern id="grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
          <circle className="grid-dot" cx={1} cy={1} r={1} />
        </pattern>
      </defs>
      <rect className="lw-bg" width="100%" height="100%" />
      <rect fill="url(#grid)" width="100%" height="100%" />
      <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
        <g strokeLinejoin="round" strokeLinecap="round" dangerouslySetInnerHTML={{ __html: html }} />
        <g className="overlay">
          {selected.map((el) => {
            const b = getBounds(el);
            return <rect key={el.id} x={b.x - 3 / view.zoom} y={b.y - 3 / view.zoom} width={b.w + 6 / view.zoom} height={b.h + 6 / view.zoom} />;
          })}
          {single &&
            handlesOf(single).map(([h, [x, y]]) => (
              <rect key={h} data-handle={h} className="handle" x={x - hs} y={y - hs} width={hs * 2} height={hs * 2} />
            ))}
          {marquee && <rect className="marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} />}
        </g>
      </g>
    </svg>
  );
}
