import { describe, expect, it } from 'vitest';
import {
  dimensionGeometry,
  getBounds,
  hitTest,
  iso,
  isoBoxSize,
  renderToSVG,
  resolveStyle,
  routePoints,
  stepHasHighlight,
  stepState,
  translateElement,
  type Doc,
  type Element,
} from '../index';

const doc: Doc = {
  version: 1,
  title: 'Test <figure>',
  steps: [{ caption: 'one' }, { caption: 'two' }],
  elements: [
    { id: 'a', type: 'rect', x: 0, y: 0, w: 100, h: 50, text: 'cache' },
    { id: 'b', type: 'isobox', x: 200, y: 0, w: 60, d: 40, h: 30, steps: { show: [2] } },
    { id: 'c', type: 'line', x: 100, y: 25, x2: 200, y2: 25, endArrow: true, steps: { highlight: [2] } },
    { id: 'd', type: 'dimension', x: 0, y: 60, x2: 100, y2: 60, offset: -12 },
  ],
};

describe('geometry', () => {
  it('projects isometric points on 30° axes', () => {
    const [x, y] = iso(10, 0, 0);
    expect(Math.atan2(y, x)).toBeCloseTo(Math.PI / 6);
    expect(iso(0, 0, 5)).toEqual([0, -5]);
  });

  it('sizes an isometric box so all faces fit', () => {
    const s = isoBoxSize(60, 40, 30);
    expect(s.w).toBeCloseTo(100 * Math.cos(Math.PI / 6));
    expect(s.h).toBe(80);
    expect(getBounds(doc.elements[1])).toMatchObject({ x: 200, y: 0, h: 80 });
  });

  it('routes elbows along the dominant axis', () => {
    expect(routePoints(0, 0, 100, 40, 'elbow')).toEqual([[0, 0], [50, 0], [50, 40], [100, 40]]);
    expect(routePoints(0, 0, 10, 40, 'elbow')).toEqual([[0, 0], [0, 20], [10, 20], [10, 40]]);
  });

  it('offsets dimensions to the left of the measured direction', () => {
    const g = dimensionGeometry(0, 0, 100, 0, 10);
    expect(g.a).toEqual([0, -10]);
    expect(g.length).toBe(100);
    expect(g.ext).toHaveLength(2);
  });

  it('hits the topmost element and ignores frame interiors', () => {
    const els: Element[] = [
      { id: 'r', type: 'rect', x: 0, y: 0, w: 50, h: 50 },
      { id: 'f', type: 'frame', x: -20, y: -40, w: 200, h: 200, title: 'fig' },
    ];
    expect(hitTest(els, [25, 25])).toBe('r');
    expect(hitTest(els, [-20, 50])).toBe('f');
    expect(hitTest(els, [500, 500])).toBeUndefined();
  });

  it('moves secondary points with the element', () => {
    expect(translateElement(doc.elements[2], 5, 5)).toMatchObject({ x: 105, y: 30, x2: 205, y2: 30 });
  });
});

describe('style', () => {
  it('gives dimensions a muted thin default', () => {
    expect(resolveStyle(doc.elements[3])).toMatchObject({ stroke: 'muted', strokeWidth: 'thin' });
    expect(resolveStyle({ ...doc.elements[0], style: { fill: 'hatch', stroke: undefined } })).toMatchObject({
      stroke: 'ink',
      fill: 'hatch',
    });
  });
});

describe('steps', () => {
  it('computes visibility, highlight and dimming', () => {
    const [a, b, c] = doc.elements;
    expect(stepState(b, 1)).toBe('hidden');
    expect(stepState(b, 2)).toBe('visible');
    expect(stepHasHighlight(doc, 2)).toBe(true);
    expect(stepState(c, 2, true)).toBe('highlight');
    expect(stepState(a, 2, true)).toBe('dim');
    expect(stepState(b, undefined)).toBe('visible');
  });
});

describe('renderToSVG', () => {
  it('produces a self-contained, escaped, themeable SVG', () => {
    const svg = renderToSVG(doc, { theme: 'dark' });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" class="lw lw-dark"')).toBe(true);
    expect(svg).toContain('<style>');
    expect(svg).toContain('--lw-accent:#E4572E');
    expect(svg).toContain('Test &lt;figure&gt;');
    expect(svg).toContain('>CACHE<');
    expect(svg).toContain('<polygon');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('bakes step classes', () => {
    const svg = renderToSVG(doc, { step: 1 });
    expect(svg).toMatch(/data-id="b" class="lw-el lw-hidden"/);
    expect(renderToSVG(doc, { step: 2 })).toMatch(/data-id="c" class="lw-el lw-hl"/);
  });

  it('scales to a requested width', () => {
    const svg = renderToSVG(doc, { width: 800 });
    expect(svg).toMatch(/width="800"/);
  });
});
