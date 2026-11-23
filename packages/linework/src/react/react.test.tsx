import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Doc } from '../index';
import { Diagram, DiagramPlayer } from './index';

const doc: Doc = {
  version: 1,
  steps: [{ caption: 'First the box' }, { caption: 'Then the arrow' }],
  elements: [
    { id: 'a', type: 'rect', x: 0, y: 0, w: 80, h: 40 },
    { id: 'b', type: 'line', x: 80, y: 20, x2: 160, y2: 20, endArrow: true, steps: { show: [2] } },
  ],
};

describe('React', () => {
  it('renders inline SVG with the requested step baked in', () => {
    const html = renderToStaticMarkup(<Diagram doc={doc} step={1} theme="dark" />);
    expect(html).toMatch(/^<svg/);
    expect(html).toContain('lw lw-dark');
    expect(html).toContain('data-id="b" class="lw-el lw-hidden"');
  });

  it('renders player controls with mono step counter', () => {
    const html = renderToStaticMarkup(<DiagramPlayer doc={doc} />);
    expect(html).toContain('◀ Prev');
    expect(html).toContain('▶ Play');
    expect(html).toContain('Next ▶');
    expect(html).toContain('Step 1 / 2');
    expect(html).toContain('First the box');
  });
});
