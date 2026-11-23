import {
  calloutLeader,
  dimensionGeometry,
  dimensionLabel,
  getBounds,
  ISO_COS,
  ISO_SIN,
  isoBoxFaces,
  isoBoxSize,
  LABEL_SIZE,
  routePoints,
  stackHeight,
  textWidth,
  unionBoxes,
} from './geometry';
import { stepClass, stepHasHighlight, stepState } from './steps';
import { patternDefs, resolveStyle, STROKE_WIDTHS, themeCSS, type Theme } from './theme';
import type { Box, Doc, Element, Fill, Pt, Style } from './types';

/** Options of {@link renderElement}. */
export interface ElementRenderOptions {
  /** Id prefix of the pattern defs (see {@link patternDefs}). @default 'lw' */
  idPrefix?: string;
  /** Extra classes on the element group, such as a step class. */
  className?: string;
}

/** Options of {@link renderToSVG}. */
export interface RenderOptions {
  /** 1-based step to render. Omit to show every element with no dimming. */
  step?: number;
  /** @default 'light' */
  theme?: Theme;
  /** Space around the drawing in user units. @default 24 */
  padding?: number;
  /** Paint the paper background. Turn off to place the drawing on a host page. @default true */
  background?: boolean;
  /** Prefix for pattern ids; make it unique when several drawings share one page. @default 'lw' */
  idPrefix?: string;
  /** Pixel width of the `<svg>`; height follows the aspect ratio. Defaults to the drawing size. */
  width?: number;
}

const f = (v: number): string => String(Math.round(v * 100) / 100);
const pts = (p: Pt[]): string => p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

/** Escapes text for use in SVG markup. */
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`);
}

function paint(s: Required<Style>, prefix: string, fill: Fill = s.fill): string {
  const sw = STROKE_WIDTHS[s.strokeWidth];
  const fillPart =
    fill === 'hatch' || fill === 'dots' ? `class="lw-s-${s.stroke}" fill="url(#${prefix}-${fill})"` : `class="lw-s-${s.stroke} lw-f-${fill}"`;
  const dash = s.dashed ? ` stroke-dasharray="${f(sw * 3)} ${f(sw * 3)}"` : '';
  return `${fillPart} stroke-width="${sw}"${dash}`;
}

/** Mono uppercase label lines centered on a point, the house style for names inside shapes. */
function centerLabel(text: string | undefined, cx: number, cy: number, color: string): string {
  if (!text) return '';
  const lines = text.toUpperCase().split('\n');
  const lh = LABEL_SIZE * 1.35;
  const y0 = cy - ((lines.length - 1) * lh) / 2 + LABEL_SIZE * 0.36;
  return lines
    .map(
      (l, i) =>
        `<text class="lw-mono lw-c-${color}" x="${f(cx)}" y="${f(y0 + i * lh)}" font-size="${LABEL_SIZE}" text-anchor="middle">${escapeXml(l)}</text>`,
    )
    .join('');
}

function arrowHead(tip: Pt, from: Pt, sw: number, color: string): string {
  const len = 6 + sw * 2;
  const half = 2.6 + sw;
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const bx = tip[0] - c * len;
  const by = tip[1] - s * len;
  const p: Pt[] = [tip, [bx - s * half, by + c * half], [bx + s * half, by - c * half]];
  return `<polygon class="lw-c-${color} lw-s-${color}" points="${pts(p)}" stroke-width="1" stroke-linejoin="round"/>`;
}

/** Moves `tip` back toward `from` so a butt-capped stroke ends inside the arrowhead. */
function pullBack(tip: Pt, from: Pt, d: number): Pt {
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  return [tip[0] - ((tip[0] - from[0]) / len) * d, tip[1] - ((tip[1] - from[1]) / len) * d];
}

function body(el: Element, prefix: string): string {
  const s = resolveStyle(el);
  const sw = STROKE_WIDTHS[s.strokeWidth];
  switch (el.type) {
    case 'rect':
      return (
        `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(el.radius ?? 0)}" ${paint(s, prefix)}/>` +
        centerLabel(el.text, el.x + el.w / 2, el.y + el.h / 2, 'ink')
      );
    case 'ellipse':
      return (
        `<ellipse cx="${f(el.x + el.w / 2)}" cy="${f(el.y + el.h / 2)}" rx="${f(el.w / 2)}" ry="${f(el.h / 2)}" ${paint(s, prefix)}/>` +
        centerLabel(el.text, el.x + el.w / 2, el.y + el.h / 2, 'ink')
      );
    case 'isobox':
    case 'isostack': {
      const layers = el.type === 'isostack' ? el.layers : 1;
      const gap = el.type === 'isostack' ? el.gap : 0;
      const total = stackHeight(layers, el.h, gap);
      const { origin } = isoBoxSize(el.w, el.d, total);
      let out = `<g transform="translate(${f(el.x + origin[0])} ${f(el.y + origin[1])})">`;
      for (let i = 0; i < layers; i++) {
        const fc = isoBoxFaces(el.w, el.d, el.h, i * (el.h + gap));
        out +=
          `<polygon points="${pts(fc.left)}" ${paint(s, prefix)}/><polygon class="lw-side1" points="${pts(fc.left)}"/>` +
          `<polygon points="${pts(fc.right)}" ${paint(s, prefix)}/><polygon class="lw-side2" points="${pts(fc.right)}"/>` +
          `<polygon points="${pts(fc.top)}" ${paint(s, prefix)}/>`;
      }
      if (el.type === 'isobox' && el.text) {
        // Lay the label flat on the top face: the x axis follows the box width.
        const [cx, cy] = [(el.w - el.d) * ISO_COS * 0.5, (el.w + el.d) * ISO_SIN * 0.5 - el.h];
        out += `<g transform="translate(${f(cx)} ${f(cy)}) matrix(${f(ISO_COS)} ${ISO_SIN} ${f(-ISO_COS)} ${ISO_SIN} 0 0)">${centerLabel(el.text, 0, 0, 'ink')}</g>`;
      }
      return out + '</g>';
    }
    case 'cylinder': {
      const rx = el.w / 2;
      const ry = Math.min(el.w * 0.16, el.h / 4);
      const { x, y, w, h } = el;
      return (
        `<path d="M${f(x)} ${f(y + ry)}V${f(y + h - ry)}A${f(rx)} ${f(ry)} 0 0 0 ${f(x + w)} ${f(y + h - ry)}V${f(y + ry)}Z" ${paint(s, prefix)}/>` +
        `<path class="lw-side1" d="M${f(x + w * 0.62)} ${f(y + ry)}V${f(y + h - ry)}A${f(rx)} ${f(ry)} 0 0 0 ${f(x + w)} ${f(y + h - ry)}V${f(y + ry)}Z"/>` +
        `<ellipse cx="${f(x + rx)}" cy="${f(y + ry)}" rx="${f(rx)}" ry="${f(ry)}" ${paint(s, prefix)}/>` +
        centerLabel(el.text, x + rx, y + ry + (h - ry) / 2, 'ink')
      );
    }
    case 'line': {
      const p = routePoints(el.x, el.y, el.x2, el.y2, el.route);
      const curved = el.route === 'curved';
      const last = p.length - 1;
      const endFrom = curved && p[2][0] === p[3][0] && p[2][1] === p[3][1] ? p[0] : p[last - 1];
      const startFrom = curved && p[1][0] === p[0][0] && p[1][1] === p[0][1] ? p[last] : p[1];
      const line = p.slice();
      const cut = (6 + sw * 2) * 0.6;
      if (el.endArrow) line[last] = pullBack(p[last], endFrom, cut);
      if (el.startArrow) line[0] = pullBack(p[0], startFrom, cut);
      const d = curved
        ? `M${f(line[0][0])} ${f(line[0][1])}C${pts(line.slice(1))}`
        : `M${line.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
      return (
        `<path d="${d}" fill="none" ${paint(s, prefix, 'none')}/>` +
        (el.endArrow ? arrowHead(p[last], endFrom, sw, s.stroke) : '') +
        (el.startArrow ? arrowHead(p[0], startFrom, sw, s.stroke) : '')
      );
    }
    case 'text': {
      const size = el.size ?? 16;
      const font = el.font ?? 'sans';
      const cls = font === 'mono' ? 'lw-mono ' : font === 'serif' ? 'lw-serif ' : '';
      const text = font === 'mono' ? el.text.toUpperCase() : el.text;
      const spans = text
        .split('\n')
        .map((l, i) => `<tspan x="${f(el.x)}" dy="${i ? '1.25em' : f(size * 0.92)}">${escapeXml(l)}</tspan>`)
        .join('');
      return `<text class="${cls}lw-c-${s.stroke}" x="${f(el.x)}" y="${f(el.y)}" font-size="${size}" text-anchor="${el.align ?? 'start'}">${spans}</text>`;
    }
    case 'callout': {
      const leader = calloutLeader(el.x, el.y, el.tx, el.ty, el.text);
      return (
        `<polyline points="${pts(leader)}" fill="none" ${paint(s, prefix, 'none')}/>` +
        `<circle class="lw-c-${s.stroke}" cx="${f(el.tx)}" cy="${f(el.ty)}" r="2.2"/>` +
        `<text class="lw-mono lw-c-ink" x="${f(el.x)}" y="${f(el.y + LABEL_SIZE * 1.02)}" font-size="${LABEL_SIZE}">${escapeXml(el.text.toUpperCase())}</text>`
      );
    }
    case 'dimension': {
      const g = dimensionGeometry(el.x, el.y, el.x2, el.y2, el.offset);
      const label = dimensionLabel(el.text, g.length).toUpperCase();
      const a = (g.angle * Math.PI) / 180;
      // 45° architectural ticks, the classic dimension terminator.
      const t: Pt = [Math.cos(a - Math.PI / 4) * 4.5, Math.sin(a - Math.PI / 4) * 4.5];
      const tick = (p: Pt) => `M${f(p[0] - t[0])} ${f(p[1] - t[1])}L${f(p[0] + t[0])} ${f(p[1] + t[1])}`;
      const lw = textWidth(label, LABEL_SIZE, 'mono') + 8;
      const ext = g.ext.map(([p, q]) => `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`).join('');
      return (
        `<path d="${ext}M${f(g.a[0])} ${f(g.a[1])}L${f(g.b[0])} ${f(g.b[1])}${tick(g.a)}${tick(g.b)}" fill="none" ${paint(s, prefix, 'none')}/>` +
        `<g transform="translate(${f(g.mid[0])} ${f(g.mid[1])}) rotate(${f(g.angle)})">` +
        `<rect class="lw-bg" x="${f(-lw / 2)}" y="${f(-LABEL_SIZE * 0.75)}" width="${f(lw)}" height="${f(LABEL_SIZE * 1.5)}"/>` +
        `<text class="lw-mono lw-c-ink" x="0" y="${f(LABEL_SIZE * 0.36)}" font-size="${LABEL_SIZE}" text-anchor="middle">${escapeXml(label)}</text></g>`
      );
    }
    case 'frame':
      return (
        `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="2" ${paint(s, prefix)}/>` +
        (el.title
          ? `<text class="lw-mono lw-c-${s.stroke}" x="${f(el.x + 12)}" y="${f(el.y + 20)}" font-size="${LABEL_SIZE}">${escapeXml(el.title.toUpperCase())}</text>`
          : '')
      );
    case 'badge': {
      const r = el.r ?? 11;
      return (
        `<circle class="lw-c-${s.stroke}" cx="${f(el.x)}" cy="${f(el.y)}" r="${f(r)}"/>` +
        `<text class="lw-mono lw-bg" x="${f(el.x)}" y="${f(el.y + r * 0.36)}" font-size="${f(r * 1.05)}" font-weight="600" text-anchor="middle" style="letter-spacing:0">${el.n}</text>`
      );
    }
  }
}

/**
 * Renders one element as an SVG `<g>` string. The group carries
 * `data-id` so hosts can find it (for step classes or hit tests).
 */
export function renderElement(el: Element, opts: ElementRenderOptions = {}): string {
  const cls = opts.className ? `lw-el ${opts.className}` : 'lw-el';
  return `<g data-id="${escapeXml(el.id)}" class="${cls}">${body(el, opts.idPrefix ?? 'lw')}</g>`;
}

/** Bounding box of all elements of a document. */
export function docBounds(doc: Doc): Box {
  return unionBoxes(doc.elements.map(getBounds));
}

/** The pieces of a rendered drawing, for hosts that build their own `<svg>` (such as React). */
export interface RenderedParts {
  viewBox: string;
  width: number;
  height: number;
  className: string;
  /** Inner markup: style, defs, background and elements. */
  inner: string;
}

/**
 * Renders a document into the parts of an `<svg>`. The view box covers all
 * elements of all steps, so the drawing does not jump while stepping.
 */
export function renderParts(doc: Doc, opts: RenderOptions = {}): RenderedParts {
  const pad = opts.padding ?? 24;
  const prefix = opts.idPrefix ?? 'lw';
  const b = docBounds(doc);
  const vb = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  const any = opts.step !== undefined && stepHasHighlight(doc, opts.step);
  const els = doc.elements
    .map((el) => renderElement(el, { idPrefix: prefix, className: stepClass(stepState(el, opts.step, any)) }))
    .join('');
  const bg = opts.background === false ? '' : `<rect class="lw-bg" x="${f(vb.x)}" y="${f(vb.y)}" width="${f(vb.w)}" height="${f(vb.h)}"/>`;
  const width = opts.width ?? vb.w;
  return {
    viewBox: `${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}`,
    width: Math.round(width),
    height: Math.round((width * vb.h) / (vb.w || 1)),
    className: `lw lw-${opts.theme ?? 'light'}`,
    inner: `<style>${themeCSS()}</style><defs>${patternDefs(prefix)}</defs>${bg}<g stroke-linejoin="round" stroke-linecap="round">${els}</g>`,
  };
}

/**
 * Renders a document to a standalone SVG string. The result embeds its own
 * stylesheet and patterns, so it works as a file, an `<img>` source, or inline.
 *
 * @example
 * ```ts
 * const svg = renderToSVG(doc, { theme: 'auto', step: 2 });
 * ```
 */
export function renderToSVG(doc: Doc, opts: RenderOptions = {}): string {
  const p = renderParts(doc, opts);
  const title = doc.title ? `<title>${escapeXml(doc.title)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${p.className}" viewBox="${p.viewBox}" width="${p.width}" height="${p.height}">${title}${p.inner}</svg>`;
}
