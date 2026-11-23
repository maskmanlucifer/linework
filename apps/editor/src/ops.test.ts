import type { Doc } from '@maskmanlucifer/linework';
import { describe, expect, it } from 'vitest';
import { align, duplicateElements, expandGroups, removeStep, reorder } from './ops';

const doc: Doc = {
  version: 1,
  steps: [{}, {}, {}],
  elements: [
    { id: 'a', type: 'rect', x: 0, y: 0, w: 10, h: 10, groupId: 'g' },
    { id: 'b', type: 'rect', x: 50, y: 20, w: 20, h: 20, groupId: 'g', steps: { show: [3], highlight: [2, 3] } },
    { id: 'c', type: 'line', x: 0, y: 0, x2: 5, y2: 5, steps: { show: [1, 2] } },
  ],
};

describe('ops', () => {
  it('reorders in paint order', () => {
    expect(reorder(doc, ['a'], 'front').elements.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(reorder(doc, ['c'], 'backward').elements.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    expect(reorder(doc, ['a', 'b'], 'forward').elements.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('aligns to the shared edge', () => {
    const out = align(doc, ['a', 'b'], 'right');
    expect(out.elements[0]).toMatchObject({ x: 60 });
    expect(out.elements[1]).toMatchObject({ x: 50 });
  });

  it('duplicates with a fresh group id and offset', () => {
    const r = duplicateElements(doc, ['a', 'b']);
    const copies = r.doc.elements.slice(3);
    expect(copies).toHaveLength(2);
    expect(copies[0].groupId).toBe(copies[1].groupId);
    expect(copies[0].groupId).not.toBe('g');
    expect(copies[0]).toMatchObject({ x: 20, y: 20 });
  });

  it('expands selections to whole groups', () => {
    expect(expandGroups(doc, ['a'])).toEqual(['a', 'b']);
  });

  it('shifts step ranges when a step is removed', () => {
    const out = removeStep(doc, 2);
    expect(out.steps).toHaveLength(2);
    expect(out.elements[1].steps).toEqual({ show: [2], highlight: [2] });
    expect(out.elements[2].steps).toEqual({ show: [1, 1] });
  });
});
