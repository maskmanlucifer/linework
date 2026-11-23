import type { Box, Element, Pt, Route } from './types';

/** cos(30°): horizontal scale of the isometric axes. */
export const ISO_COS = Math.cos(Math.PI / 6);
/** sin(30°): vertical scale of the isometric axes. */
export const ISO_SIN = 0.5;

/**
 * Projects a 3D point to 2D with a classic 30° isometric projection.
 * `x` runs right-down, `y` runs left-down and `z` runs up (screen y is inverted).
 *
 * @param x - Distance along the right-down axis.
 * @param y - Distance along the left-down axis.
 * @param z - Height.
 * @returns The screen point relative to the projected origin.
 */
export function iso(x: number, y: number, z: number): Pt {
  return [(x - y) * ISO_COS, (x + y) * ISO_SIN - z];
}

/** Screen-space faces of an isometric box, each a closed polygon. */
export interface IsoFaces {
  top: Pt[];
  left: Pt[];
  right: Pt[];
}

/**
 * Returns the three visible faces of an isometric box of size `w × d × h`
 * whose base sits at height `z`. Points are relative to the projected origin.
 *
 * @see {@link isoBoxSize} for the bounding box that contains these faces.
 */
export function isoBoxFaces(w: number, d: number, h: number, z = 0): IsoFaces {
  const t = z + h;
  return {
    top: [iso(0, 0, t), iso(w, 0, t), iso(w, d, t), iso(0, d, t)],
    right: [iso(w, 0, t), iso(w, d, t), iso(w, d, z), iso(w, 0, z)],
    left: [iso(0, d, t), iso(w, d, t), iso(w, d, z), iso(0, d, z)],
  };
}

/**
 * Screen size of an isometric box (or stack) with total height `h`, plus the
 * offset that moves the projected origin so the box fits in `[0, size]`.
 */
export function isoBoxSize(w: number, d: number, h: number): { w: number; h: number; origin: Pt } {
  return { w: (w + d) * ISO_COS, h: (w + d) * ISO_SIN + h, origin: [d * ISO_COS, h] };
}

/** Total height of an isometric stack. */
export function stackHeight(layers: number, h: number, gap: number): number {
  return layers * h + Math.max(0, layers - 1) * gap;
}

/** Rough text width. Exact metrics need a browser; this is good enough for boxes and hit tests. */
export function textWidth(text: string, size: number, font: 'sans' | 'mono' | 'serif' = 'sans'): number {
  const k = font === 'mono' ? 0.68 : font === 'serif' ? 0.46 : 0.56;
  return text.length * size * k;
}

/** Font size and padding of mono labels (callouts, dimensions, frame titles). */
export const LABEL_SIZE = 10.5;

/** Box of a callout label whose top-left is at `x`/`y`. */
export function calloutLabelBox(x: number, y: number, text: string): Box {
  return { x, y, w: textWidth(text, LABEL_SIZE, 'mono'), h: LABEL_SIZE * 1.3 };
}

/**
 * Leader line of a callout: a short horizontal shoulder out of the label,
 * then a straight run to the target. This is the usual technical-manual form.
 *
 * @returns Polyline points from the label to the target.
 */
export function calloutLeader(x: number, y: number, tx: number, ty: number, text: string): Pt[] {
  const b = calloutLabelBox(x, y, text);
  const cy = b.y + b.h / 2;
  const right = tx >= b.x + b.w / 2;
  const sx = right ? b.x + b.w + 6 : b.x - 6;
  const shoulder = right ? sx + 12 : sx - 12;
  // Skip the shoulder when the target is right next to the label.
  if (right ? tx <= shoulder : tx >= shoulder) return [[sx, cy], [tx, ty]];
  return [[sx, cy], [shoulder, cy], [tx, ty]];
}

/**
 * Points of a connector. Elbow routes go along the dominant axis first and
 * turn at the midpoint. Curved routes return `[p1, c1, c2, p2]` of one cubic Bézier.
 */
export function routePoints(x1: number, y1: number, x2: number, y2: number, route: Route = 'straight'): Pt[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (route === 'elbow') {
    if (dx === 0 || dy === 0) return [[x1, y1], [x2, y2]];
    if (horizontal) {
      const mx = x1 + dx / 2;
      return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
    }
    const my = y1 + dy / 2;
    return [[x1, y1], [x1, my], [x2, my], [x2, y2]];
  }
  if (route === 'curved') {
    if (horizontal) return [[x1, y1], [x1 + dx / 2, y1], [x2 - dx / 2, y2], [x2, y2]];
    return [[x1, y1], [x1, y1 + dy / 2], [x2, y2 - dy / 2], [x2, y2]];
  }
  return [[x1, y1], [x2, y2]];
}

/** Geometry of a dimension line, computed once for render, bounds and hit tests. */
export interface DimensionGeometry {
  /** Measured length. */
  length: number;
  /** Ends of the dimension line itself. */
  a: Pt;
  b: Pt;
  /** Extension lines from the object to just past the dimension line. */
  ext: [Pt, Pt][];
  /** Label center and its rotation in degrees (kept upright). */
  mid: Pt;
  angle: number;
}

/**
 * Computes a dimension line. The offset goes to the left of the measured
 * direction, which is "above" for a left-to-right measurement.
 */
export function dimensionGeometry(x1: number, y1: number, x2: number, y2: number, offset = 0): DimensionGeometry {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = uy;
  const ny = -ux;
  const a: Pt = [x1 + nx * offset, y1 + ny * offset];
  const b: Pt = [x2 + nx * offset, y2 + ny * offset];
  const ext: [Pt, Pt][] = [];
  if (Math.abs(offset) > 4) {
    const s = Math.sign(offset);
    for (const [px, py] of [[x1, y1], [x2, y2]] as Pt[]) {
      ext.push([
        [px + nx * 3 * s, py + ny * 3 * s],
        [px + nx * (offset + 4 * s), py + ny * (offset + 4 * s)],
      ]);
    }
  }
  let angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle <= -90) angle += 180;
  return { length: Math.hypot(x2 - x1, y2 - y1), a, b, ext, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], angle };
}

/** Default label of a dimension: its rounded length. */
export function dimensionLabel(text: string | undefined, length: number): string {
  return text ?? String(Math.round(length));
}

function boxOf(points: Pt[]): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Smallest box that contains all the given boxes. Returns a zero box for an empty list. */
export function unionBoxes(boxes: Box[]): Box {
  if (!boxes.length) return { x: 0, y: 0, w: 0, h: 0 };
  return boxOf(boxes.flatMap((b): Pt[] => [[b.x, b.y], [b.x + b.w, b.y + b.h]]));
}

/**
 * Screen bounding box of an element. Text and labels use estimated metrics,
 * so treat the result as a layout hint, not a pixel-exact measurement.
 */
export function getBounds(el: Element): Box {
  switch (el.type) {
    case 'rect':
    case 'ellipse':
    case 'cylinder':
    case 'frame':
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    case 'isobox': {
      const s = isoBoxSize(el.w, el.d, el.h);
      return { x: el.x, y: el.y, w: s.w, h: s.h };
    }
    case 'isostack': {
      const s = isoBoxSize(el.w, el.d, stackHeight(el.layers, el.h, el.gap));
      return { x: el.x, y: el.y, w: s.w, h: s.h };
    }
    case 'line':
      return boxOf(routePoints(el.x, el.y, el.x2, el.y2, el.route === 'curved' ? 'straight' : el.route));
    case 'text': {
      const size = el.size ?? 16;
      const lines = el.text.split('\n');
      const w = Math.max(...lines.map((l) => textWidth(l, size, el.font)));
      const x = el.align === 'middle' ? el.x - w / 2 : el.align === 'end' ? el.x - w : el.x;
      return { x, y: el.y, w, h: size * 1.25 * lines.length };
    }
    case 'callout': {
      const b = calloutLabelBox(el.x, el.y, el.text);
      return unionBoxes([b, { x: el.tx - 3, y: el.ty - 3, w: 6, h: 6 }]);
    }
    case 'dimension': {
      const g = dimensionGeometry(el.x, el.y, el.x2, el.y2, el.offset);
      const lw = textWidth(dimensionLabel(el.text, g.length), LABEL_SIZE, 'mono') / 2 + 4;
      return boxOf([g.a, g.b, [el.x, el.y], [el.x2, el.y2], [g.mid[0] - lw, g.mid[1] - lw], [g.mid[0] + lw, g.mid[1] + lw]]);
    }
    case 'badge': {
      const r = el.r ?? 11;
      return { x: el.x - r, y: el.y - r, w: r * 2, h: r * 2 };
    }
  }
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function distToPolyline(p: Pt, pts: Pt[]): number {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distToSegment(p, pts[i - 1], pts[i]));
  return d;
}

function bezierPoints(pts: Pt[], n = 24): Pt[] {
  const [p0, p1, p2, p3] = pts;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    out.push([
      k[0] * p0[0] + k[1] * p1[0] + k[2] * p2[0] + k[3] * p3[0],
      k[0] * p0[1] + k[1] * p1[1] + k[2] * p2[1] + k[3] * p3[1],
    ]);
  }
  return out;
}

function inBox(p: Pt, b: Box, pad = 0): boolean {
  return p[0] >= b.x - pad && p[0] <= b.x + b.w + pad && p[1] >= b.y - pad && p[1] <= b.y + b.h + pad;
}

/**
 * Tests if a point hits an element. Strokes use `tolerance`. Frames only
 * hit on their border and title, so clicks inside a frame reach its content.
 */
export function hitElement(el: Element, p: Pt, tolerance = 4): boolean {
  switch (el.type) {
    case 'line': {
      const pts = routePoints(el.x, el.y, el.x2, el.y2, el.route);
      return distToPolyline(p, el.route === 'curved' ? bezierPoints(pts) : pts) <= tolerance;
    }
    case 'dimension': {
      const g = dimensionGeometry(el.x, el.y, el.x2, el.y2, el.offset);
      return distToSegment(p, g.a, g.b) <= tolerance + 4;
    }
    case 'callout':
      return (
        inBox(p, calloutLabelBox(el.x, el.y, el.text), tolerance) ||
        distToPolyline(p, calloutLeader(el.x, el.y, el.tx, el.ty, el.text)) <= tolerance
      );
    case 'frame': {
      const b = getBounds(el);
      const inner = { x: b.x + tolerance, y: b.y + 22, w: b.w - tolerance * 2, h: b.h - 22 - tolerance };
      return inBox(p, b, tolerance) && !inBox(p, inner);
    }
    default:
      return inBox(p, getBounds(el), tolerance / 2);
  }
}

/**
 * Finds the topmost element under a point.
 *
 * @returns The element id, or `undefined` when nothing is hit.
 */
export function hitTest(elements: Element[], p: Pt, tolerance = 4): string | undefined {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitElement(elements[i], p, tolerance)) return elements[i].id;
  }
  return undefined;
}

/** Snaps a value to the nearest multiple of `grid`. */
export function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

/**
 * Returns a copy of an element moved by `dx`/`dy`, including every
 * secondary point (line ends, callout targets).
 */
export function translateElement<T extends Element>(el: T, dx: number, dy: number): T {
  const out = { ...el, x: el.x + dx, y: el.y + dy };
  if ('x2' in out) Object.assign(out, { x2: out.x2 + dx, y2: out.y2 + dy });
  if ('tx' in out) Object.assign(out, { tx: out.tx + dx, ty: out.ty + dy });
  return out;
}
