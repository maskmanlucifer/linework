/**
 * Editor commands shared by menus, panels and keyboard shortcuts.
 * @module
 */
import { translateElement, type Element } from '@maskmanlucifer/linework';
import { align, duplicateElements, mapElements, removeElements, reorder, setGroup, type Align, type Reorder } from './ops';
import { useEditor } from './store';

const st = () => useEditor.getState();

/** Applies a change to every selected element as one undoable step. */
export function updateSelected(fn: (el: Element) => Element): void {
  const s = st();
  if (s.selection.length) s.commit(mapElements(s.doc, s.selection, fn));
}

export const actions = {
  remove: () => {
    const s = st();
    s.commit(removeElements(s.doc, s.selection));
    s.select([]);
  },
  duplicate: () => {
    const s = st();
    if (!s.selection.length) return;
    const r = duplicateElements(s.doc, s.selection);
    s.commit(r.doc);
    s.select(r.ids);
  },
  reorder: (how: Reorder) => st().commit(reorder(st().doc, st().selection, how)),
  align: (how: Align) => st().commit(align(st().doc, st().selection, how)),
  group: (on: boolean) => st().commit(setGroup(st().doc, st().selection, on)),
  nudge: (dx: number, dy: number) => updateSelected((el) => translateElement(el, dx, dy)),
  selectAll: () => st().select(st().doc.elements.map((e) => e.id)),
};
