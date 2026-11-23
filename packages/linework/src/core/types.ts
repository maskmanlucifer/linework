/**
 * The JSON document model. A diagram is plain data so it can be saved,
 * diffed and rendered anywhere (server, browser, React).
 * @module
 */

/** Ink colors. Kept small on purpose: one warm accent, one cool accent, ink and gray. */
export type Color = 'ink' | 'muted' | 'accent' | 'teal';

/**
 * Fill tokens. `accent` and `teal` are soft tints, not solid colors, so that
 * ink lines on top stay readable. `hatch` and `dots` are SVG patterns.
 */
export type Fill = 'none' | 'paper' | 'shade' | 'accent' | 'teal' | 'hatch' | 'dots';

/** Stroke width presets in user units. */
export type StrokeWidth = 'thin' | 'regular' | 'bold';

/** Visual style of an element. Every field is optional; see {@link DEFAULT_STYLE}. */
export interface Style {
  stroke?: Color;
  fill?: Fill;
  strokeWidth?: StrokeWidth;
  dashed?: boolean;
}

/**
 * Step visibility of an element. Steps are numbered from 1.
 * Without `show`, the element is visible in every step.
 */
export interface StepRange {
  /** Inclusive `[from, to]` range of steps where the element is visible. `to` omitted means "until the end". */
  show?: [number, number?];
  /** Steps where the element is drawn in the accent color and the rest of the drawing is dimmed. */
  highlight?: number[];
}

interface Base {
  id: string;
  x: number;
  y: number;
  style?: Style;
  steps?: StepRange;
  /** Elements with the same group id are selected and moved together. */
  groupId?: string;
}

/** Rectangle. `radius > 0` gives the rounded rectangle. */
export interface RectEl extends Base {
  type: 'rect';
  w: number;
  h: number;
  radius?: number;
  /** Optional centered label (sans). */
  text?: string;
}

export interface EllipseEl extends Base {
  type: 'ellipse';
  w: number;
  h: number;
  text?: string;
}

/**
 * Isometric box. `x`/`y` is the top-left of its screen bounding box;
 * `w` runs along the right-down axis, `d` along the left-down axis, `h` is height.
 */
export interface IsoBoxEl extends Base {
  type: 'isobox';
  w: number;
  d: number;
  h: number;
  /** Optional label drawn flat on the top face. */
  text?: string;
}

/** A stack of equal isometric slabs (layers, memory, cache levels). */
export interface IsoStackEl extends Base {
  type: 'isostack';
  w: number;
  d: number;
  /** Height of one layer. */
  h: number;
  layers: number;
  /** Vertical gap between layers. */
  gap: number;
}

/** Database-style cylinder in its screen bounding box. */
export interface CylinderEl extends Base {
  type: 'cylinder';
  w: number;
  h: number;
  text?: string;
}

/** How a connector is routed between its two points. */
export type Route = 'straight' | 'elbow' | 'curved';

/** Line or arrow between two absolute points. `x`/`y` are the start point. */
export interface LineEl extends Base {
  type: 'line';
  x2: number;
  y2: number;
  route?: Route;
  startArrow?: boolean;
  endArrow?: boolean;
}

/** Free text. */
export interface TextEl extends Base {
  type: 'text';
  text: string;
  size?: number;
  font?: 'sans' | 'mono' | 'serif';
  align?: 'start' | 'middle' | 'end';
}

/**
 * Callout: mono uppercase label at `x`/`y` (left baseline) with a leader line
 * to the target point `tx`/`ty`.
 */
export interface CalloutEl extends Base {
  type: 'callout';
  tx: number;
  ty: number;
  text: string;
}

/**
 * Technical-drawing dimension between `x`/`y` and `x2`/`y2`, drawn `offset`
 * units to the left of the measured direction, with end ticks and a label.
 */
export interface DimensionEl extends Base {
  type: 'dimension';
  x2: number;
  y2: number;
  offset?: number;
  /** Label text. Defaults to the rounded length. */
  text?: string;
}

/** Titled frame used to group a region of a drawing (like a figure panel). */
export interface FrameEl extends Base {
  type: 'frame';
  w: number;
  h: number;
  title?: string;
}

/** Numbered circle badge; `x`/`y` is the center. */
export interface BadgeEl extends Base {
  type: 'badge';
  n: number;
  r?: number;
}

/** Any diagram element. */
export type Element =
  | RectEl
  | EllipseEl
  | IsoBoxEl
  | IsoStackEl
  | CylinderEl
  | LineEl
  | TextEl
  | CalloutEl
  | DimensionEl
  | FrameEl
  | BadgeEl;

/** All element type names. */
export type ElementType = Element['type'];

/** One step of a step-through figure. */
export interface Step {
  /** Short caption shown by the player. */
  caption?: string;
}

/** A diagram document. Elements are painted in array order (last on top). */
export interface Doc {
  version: 1;
  title?: string;
  elements: Element[];
  steps?: Step[];
}

/** Axis-aligned rectangle. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A 2D point as `[x, y]`. */
export type Pt = [number, number];
