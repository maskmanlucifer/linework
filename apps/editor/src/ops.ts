/**
 * Pure document operations used by the editor store. They take and return
 * immutable documents so undo/redo is a stack of snapshots.
 * @module
 */
import { getBounds, translateElement, type Doc, type Element, type StepRange } from '@maskmanlucifer/linework';
import { nanoid } from 'nanoid';

/** Creates a short element id. */
export const newId = (): string => nanoid(8);

/** Applies `fn` to the elements whose id is in `ids`. */
export function mapElements(doc: Doc, ids: Iterable<string>, fn: (el: Element) => Element): Doc {
  const set = new Set(ids);
  return { ...doc, elements: doc.elements.map((el) => (set.has(el.id) ? fn(el) : el)) };
}

/** Removes the given elements. */
export function removeElements(doc: Doc, ids: string[]): Doc {
  const set = new Set(ids);
  return { ...doc, elements: doc.elements.filter((el) => !set.has(el.id)) };
}

/**
 * Copies the given elements, offset by 20 units, keeping group membership
 * inside the copy but not shared with the source.
 *
 * @returns The new document and the ids of the copies.
 */
export function duplicateElements(doc: Doc, ids: string[]): { doc: Doc; ids: string[] } {
  const set = new Set(ids);
  const groups = new Map<string, string>();
  const copies = doc.elements
    .filter((el) => set.has(el.id))
    .map((el) => {
      const copy = translateElement({ ...el, id: newId() }, 20, 20);
      if (el.groupId) {
        if (!groups.has(el.groupId)) groups.set(el.groupId, newId());
        copy.groupId = groups.get(el.groupId);
      }
      return copy;
    });
  return { doc: { ...doc, elements: [...doc.elements, ...copies] }, ids: copies.map((c) => c.id) };
}

/** Z-order moves. */
export type Reorder = 'front' | 'back' | 'forward' | 'backward';

/** Moves the given elements in paint order, keeping their relative order. */
export function reorder(doc: Doc, ids: string[], how: Reorder): Doc {
  const set = new Set(ids);
  const els = doc.elements.slice();
  if (how === 'front' || how === 'back') {
    const picked = els.filter((e) => set.has(e.id));
    const rest = els.filter((e) => !set.has(e.id));
    return { ...doc, elements: how === 'front' ? [...rest, ...picked] : [...picked, ...rest] };
  }
  const dir = how === 'forward' ? 1 : -1;
  const order = dir === 1 ? [...els.keys()].reverse() : [...els.keys()];
  for (const i of order) {
    const j = i + dir;
    if (set.has(els[i].id) && j >= 0 && j < els.length && !set.has(els[j].id)) [els[i], els[j]] = [els[j], els[i]];
  }
  return { ...doc, elements: els };
}

/** Alignment modes. */
export type Align = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** Aligns the given elements to the edge or center of their common bounds. */
export function align(doc: Doc, ids: string[], how: Align): Doc {
  const set = new Set(ids);
  const boxes = doc.elements.filter((e) => set.has(e.id)).map(getBounds);
  if (boxes.length < 2) return doc;
  const l = Math.min(...boxes.map((b) => b.x));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const t = Math.min(...boxes.map((b) => b.y));
  const btm = Math.max(...boxes.map((b) => b.y + b.h));
  return mapElements(doc, ids, (el) => {
    const b = getBounds(el);
    const dx = how === 'left' ? l - b.x : how === 'right' ? r - b.x - b.w : how === 'center' ? (l + r) / 2 - b.x - b.w / 2 : 0;
    const dy = how === 'top' ? t - b.y : how === 'bottom' ? btm - b.y - b.h : how === 'middle' ? (t + btm) / 2 - b.y - b.h / 2 : 0;
    return translateElement(el, dx, dy);
  });
}

/** Expands a selection so it includes every member of each touched group. */
export function expandGroups(doc: Doc, ids: string[]): string[] {
  const groups = new Set(doc.elements.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId));
  return doc.elements.filter((e) => ids.includes(e.id) || (e.groupId && groups.has(e.groupId))).map((e) => e.id);
}

/** Puts the elements in one new group (or ungroups them when `group` is false). */
export function setGroup(doc: Doc, ids: string[], group: boolean): Doc {
  const gid = group ? newId() : undefined;
  return mapElements(doc, ids, (el) => ({ ...el, groupId: gid }));
}

/**
 * Removes a step (1-based) and shifts later step numbers down, so element
 * ranges keep pointing at the same captions.
 */
export function removeStep(doc: Doc, k: number): Doc {
  const shift = (n: number) => (n > k ? n - 1 : n);
  const elements = doc.elements.map((el) => {
    if (!el.steps) return el;
    const steps: StepRange = {};
    if (el.steps.show) {
      const [from, to] = el.steps.show;
      steps.show = to === undefined ? [shift(from)] : [shift(from), Math.max(shift(from), to >= k ? to - 1 : to)];
    }
    const hl = el.steps.highlight?.filter((s) => s !== k).map(shift);
    if (hl?.length) steps.highlight = hl;
    return { ...el, steps: steps.show || steps.highlight ? steps : undefined };
  });
  return { ...doc, elements, steps: (doc.steps ?? []).filter((_, i) => i !== k - 1) };
}
