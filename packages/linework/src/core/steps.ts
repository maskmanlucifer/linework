import type { Doc, Element } from './types';

/** How an element is drawn in a given step. */
export type StepState = 'visible' | 'hidden' | 'highlight' | 'dim';

/** Number of steps in a document (0 when it has none). */
export function stepCount(doc: Doc): number {
  return doc.steps?.length ?? 0;
}

/**
 * Tells if any element is highlighted in a step. When one is, the other
 * visible elements are dimmed so the eye goes to the change.
 */
export function stepHasHighlight(doc: Doc, step: number): boolean {
  return doc.elements.some((el) => el.steps?.highlight?.includes(step) && isVisible(el, step));
}

function isVisible(el: Element, step: number): boolean {
  const show = el.steps?.show;
  if (!show) return true;
  return step >= show[0] && step <= (show[1] ?? Infinity);
}

/**
 * State of one element in a step.
 *
 * @param step - 1-based step. `undefined` means "no step-through": everything is visible.
 * @param anyHighlight - Pass the result of {@link stepHasHighlight} to avoid a scan per element.
 */
export function stepState(el: Element, step: number | undefined, anyHighlight = false): StepState {
  if (step === undefined) return 'visible';
  if (!isVisible(el, step)) return 'hidden';
  if (el.steps?.highlight?.includes(step)) return 'highlight';
  return anyHighlight ? 'dim' : 'visible';
}

/** CSS class for a {@link StepState}; empty for plain visible. */
export function stepClass(state: StepState): string {
  return state === 'hidden' ? 'lw-hidden' : state === 'highlight' ? 'lw-hl' : state === 'dim' ? 'lw-dim' : '';
}
