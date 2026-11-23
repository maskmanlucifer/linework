import { ISO_COS as C, type Doc, type Element } from '@maskmanlucifer/linework';

const CX = 330;
const H = 16;
const GAP = 30;
const LABEL_X = CX + 220 * C + 70;

const layers = [
  { name: 'Registers', s: 60, t: '< 1 ns · bytes' },
  { name: 'L1 cache', s: 92, t: '1 ns · 64 KB' },
  { name: 'L2 cache', s: 126, t: '4 ns · 1 MB' },
  { name: 'L3 cache', s: 166, t: '12 ns · 32 MB' },
  { name: 'Main memory', s: 220, t: '100 ns · 16 GB' },
];

// Slabs are painted bottom-up so each upper slab covers the back of the bigger one below it.
const slabs: Element[] = [];
const elements: Element[] = [];
let y = 110;
layers.forEach((l, i) => {
  const step = i + 1;
  const last = i === layers.length - 1;
  slabs.unshift({
    id: `layer${i}`,
    type: 'isobox',
    x: CX - l.s * C,
    y,
    w: l.s,
    d: l.s,
    h: H,
    style: last ? { fill: 'hatch' } : i === 0 ? { fill: 'accent' } : undefined,
    steps: { show: [step], highlight: [step] },
  });
  const ty = y + l.s / 2 + H / 2;
  elements.push({
    id: `label${i}`,
    type: 'callout',
    x: LABEL_X,
    y: ty - 16,
    tx: CX + l.s * C - 1,
    ty,
    text: l.name,
    steps: { show: [step], highlight: [step] },
  });
  elements.push({
    id: `spec${i}`,
    type: 'text',
    x: LABEL_X,
    y: ty,
    text: l.t,
    font: 'mono',
    size: 10.5,
    style: { stroke: 'muted' },
    steps: { show: [step] },
  });
  if (last) {
    const top = y + H;
    elements.push({
      id: 'dim',
      type: 'dimension',
      x: CX - l.s * C,
      y: top + l.s / 2,
      x2: CX,
      y2: top + l.s,
      offset: -22,
      text: '16 GB',
      steps: { show: [step] },
    });
  } else {
    y = y + H + l.s / 2 + GAP - layers[i + 1].s / 2;
  }
});
const bottom = y + H + 220;

/** Example: the memory hierarchy as an exploded isometric stack. */
export const memoryStack: Doc = {
  version: 1,
  title: 'The memory hierarchy',
  steps: layers.map((l) => ({ caption: `${l.name}: ${l.t.replace(' · ', ' away, holds ')}.` })),
  elements: [
    { id: 'title', type: 'text', x: 0, y: 0, text: 'The memory hierarchy', font: 'serif', size: 32 },
    { id: 'fig', type: 'text', x: 0, y: 48, text: 'Fig. 2 — each level is bigger and slower', font: 'mono', size: 10.5, style: { stroke: 'muted' } },
    { id: 'axis', type: 'line', x: 40, y: bottom - 40, x2: 40, y2: 130, endArrow: true, startArrow: true, style: { stroke: 'muted', strokeWidth: 'thin' } },
    { id: 'fast', type: 'text', x: 54, y: 124, text: 'Faster', font: 'mono', size: 10.5, style: { stroke: 'muted' } },
    { id: 'big', type: 'text', x: 54, y: bottom - 54, text: 'Larger', font: 'mono', size: 10.5, style: { stroke: 'muted' } },
    ...slabs,
    ...elements,
  ],
};
