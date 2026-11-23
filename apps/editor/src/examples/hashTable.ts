import type { Doc, Element } from '@maskmanlucifer/linework';

const BX = 430;
const BY = 110;
const BH = 40;
const by = (i: number) => BY + i * BH;

const buckets: Element[] = [0, 1, 2, 3, 4, 5].flatMap((i): Element[] => [
  {
    id: `bucket${i}`,
    type: 'rect',
    x: BX,
    y: by(i),
    w: 110,
    h: BH,
    style: { fill: i === 2 || i === 4 ? 'paper' : 'hatch' },
  },
  { id: `idx${i}`, type: 'text', x: BX - 10, y: by(i) + 3, text: String(i), font: 'mono', size: 10.5, align: 'end', style: { stroke: 'muted' } },
]);

/** Example: looking up a key in a hash table with separate chaining. */
export const hashTable: Doc = {
  version: 1,
  title: 'Looking up a key in a hash table',
  steps: [
    { caption: 'Hash the key. The function turns "grape" into a number and takes it modulo the bucket count.' },
    { caption: 'The result, 2, is an index: jump straight to bucket 2. No scan of the other buckets.' },
    { caption: 'Bucket 2 already holds "apple". That is a collision, so compare and walk the chain.' },
    { caption: 'Follow the next pointer and compare again: "grape" is found.' },
  ],
  elements: [
    { id: 'title', type: 'text', x: 0, y: 0, text: 'Looking up a key in a hash table', font: 'serif', size: 32 },
    { id: 'fig', type: 'text', x: 0, y: 48, text: 'Fig. 1 — separate chaining', font: 'mono', size: 10.5, style: { stroke: 'muted' } },
    ...buckets,
    { id: 'dim', type: 'dimension', x: BX, y: by(6), x2: BX + 110, y2: by(6), offset: -18, text: '6 buckets' },
    { id: 'key', type: 'rect', x: 0, y: 188, w: 120, h: 44, radius: 22, text: '"grape"', steps: { show: [1] } },
    { id: 'a1', type: 'line', x: 120, y: 210, x2: 186, y2: 210, endArrow: true, steps: { show: [1] } },
    { id: 'hash', type: 'rect', x: 186, y: 178, w: 130, h: 64, text: 'hash(key)\n% 6', style: { fill: 'shade' }, steps: { show: [1], highlight: [1] } },
    { id: 'b1', type: 'badge', x: 186, y: 178, n: 1, steps: { show: [1], highlight: [1] } },
    { id: 'a2', type: 'line', x: 316, y: by(2) + 20, x2: BX, y2: by(2) + 20, endArrow: true, steps: { show: [2], highlight: [2] } },
    { id: 'h2', type: 'text', x: 364, y: 188, text: 'h = 2', font: 'mono', size: 10.5, style: { stroke: 'accent' }, steps: { show: [2], highlight: [2] } },
    { id: 'b2', type: 'badge', x: 344, y: by(2) + 20, n: 2, steps: { show: [2], highlight: [2] } },
    { id: 'hl2', type: 'rect', x: BX, y: by(2), w: 110, h: BH, style: { fill: 'none', strokeWidth: 'bold' }, steps: { show: [2], highlight: [2, 3, 4] } },
    { id: 'p2', type: 'ellipse', x: 517, y: by(2) + 17, w: 6, h: 6, style: { fill: 'shade' } },
    { id: 'c1', type: 'line', x: 520, y: by(2) + 20, x2: 600, y2: by(2) + 20, endArrow: true, steps: { highlight: [3] } },
    { id: 'apple', type: 'rect', x: 600, y: by(2), w: 130, h: BH, text: 'apple → 3', steps: { highlight: [3] } },
    { id: 'c2', type: 'line', x: 730, y: by(2) + 20, x2: 800, y2: by(2) + 20, endArrow: true, steps: { highlight: [4] } },
    { id: 'grape', type: 'rect', x: 800, y: by(2), w: 130, h: BH, text: 'grape → 8', steps: { highlight: [4] } },
    { id: 'b3', type: 'badge', x: 665, y: by(2), n: 3, steps: { show: [3], highlight: [3] } },
    { id: 'b4', type: 'badge', x: 865, y: by(2), n: 4, steps: { show: [4], highlight: [4] } },
    { id: 'p4', type: 'ellipse', x: 517, y: by(4) + 17, w: 6, h: 6, style: { fill: 'shade' } },
    { id: 'c3', type: 'line', x: 520, y: by(4) + 20, x2: 600, y2: by(4) + 20, endArrow: true },
    { id: 'kiwi', type: 'rect', x: 600, y: by(4), w: 130, h: BH, text: 'kiwi → 1' },
    { id: 'co1', type: 'callout', x: 560, y: 66, tx: 500, ty: by(0), text: 'Bucket array' },
    { id: 'co2', type: 'callout', x: 590, y: by(5) + 30, tx: 520, ty: by(5) + 20, text: 'Empty slots are hatched' },
    { id: 'co3', type: 'callout', x: 790, y: 120, tx: 765, ty: by(2) + 20, text: 'Collision chain' },
  ],
};
