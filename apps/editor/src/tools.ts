/**
 * Element factories for the drawing tools: what a click creates, and how a
 * drag shapes the new element.
 * @module
 */
import type { Doc, Element, Pt } from '@maskmanlucifer/linework';
import { newId } from './ops';
import type { Tool } from './store';

/** Tool metadata for the toolbar and shortcuts. */
export const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Select', key: 'v' },
  { id: 'hand', label: 'Hand', key: 'h' },
  { id: 'rect', label: 'Rectangle', key: 'r' },
  { id: 'rounded', label: 'Rounded rectangle', key: 'u' },
  { id: 'ellipse', label: 'Ellipse', key: 'o' },
  { id: 'isobox', label: 'Isometric box', key: 'b' },
  { id: 'isostack', label: 'Isometric stack', key: 's' },
  { id: 'cylinder', label: 'Cylinder (database)', key: 'c' },
  { id: 'line', label: 'Line', key: 'l' },
  { id: 'arrow', label: 'Arrow', key: 'a' },
  { id: 'text', label: 'Text', key: 't' },
  { id: 'callout', label: 'Callout label (drag from target to label)', key: 'n' },
  { id: 'dimension', label: 'Dimension line', key: 'd' },
  { id: 'frame', label: 'Frame', key: 'f' },
  { id: 'badge', label: 'Numbered badge', key: 'm' },
];

/** Creates the element for a tool at the pointer-down point. */
export function createAt(tool: Tool, [x, y]: Pt, doc: Doc): Element | null {
  const id = newId();
  switch (tool) {
    case 'rect':
      return { id, type: 'rect', x, y, w: 0, h: 0 };
    case 'rounded':
      return { id, type: 'rect', x, y, w: 0, h: 0, radius: 10 };
    case 'ellipse':
      return { id, type: 'ellipse', x, y, w: 0, h: 0 };
    case 'frame':
      return { id, type: 'frame', x, y, w: 0, h: 0, title: 'Figure' };
    case 'cylinder':
      return { id, type: 'cylinder', x, y, w: 0, h: 0 };
    case 'isobox':
      return { id, type: 'isobox', x, y, w: 80, d: 80, h: 40 };
    case 'isostack':
      return { id, type: 'isostack', x, y, w: 90, d: 90, h: 12, layers: 4, gap: 10 };
    case 'line':
    case 'arrow':
      return { id, type: 'line', x, y, x2: x, y2: y, endArrow: tool === 'arrow' };
    case 'dimension':
      return { id, type: 'dimension', x, y, x2: x, y2: y, offset: 16 };
    case 'callout':
      return { id, type: 'callout', x, y, tx: x, ty: y, text: 'Label' };
    case 'text':
      return { id, type: 'text', x, y, text: 'Text', size: 16 };
    case 'badge': {
      const n = Math.max(0, ...doc.elements.map((e) => (e.type === 'badge' ? e.n : 0))) + 1;
      return { id, type: 'badge', x, y, n };
    }
    default:
      return null;
  }
}

/** Shapes a new element while the user drags from `a` to `b`. */
export function dragShape(el: Element, a: Pt, b: Pt): Element {
  switch (el.type) {
    case 'rect':
    case 'ellipse':
    case 'frame':
    case 'cylinder':
      return { ...el, x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
    case 'line':
    case 'dimension':
      return { ...el, x2: b[0], y2: b[1] };
    case 'callout':
      // Press on the target, release where the label goes.
      return { ...el, tx: a[0], ty: a[1], x: b[0], y: b[1] };
    default:
      return el;
  }
}

/** Gives a clicked (not dragged) element a useful default size. */
export function clickDefaults(el: Element): Element {
  switch (el.type) {
    case 'rect':
      return { ...el, w: 140, h: 70 };
    case 'ellipse':
      return { ...el, w: 120, h: 80 };
    case 'frame':
      return { ...el, w: 320, h: 220 };
    case 'cylinder':
      return { ...el, w: 90, h: 110 };
    case 'line':
    case 'dimension':
      return { ...el, x2: el.x + 120, y2: el.y };
    case 'callout':
      return { ...el, x: el.tx + 30, y: el.ty - 40 };
    default:
      return el;
  }
}
