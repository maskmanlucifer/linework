import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import { renderParts, stepClass, stepHasHighlight, stepState, type Doc, type Theme } from '../index';

/** Props of {@link Diagram}. */
export interface DiagramProps {
  doc: Doc;
  /** 1-based step. Omit to show the full drawing. */
  step?: number;
  /** @default 'light' */
  theme?: Theme;
  /** @default 24 */
  padding?: number;
  /** Paint the paper background. @default true */
  background?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Sets step classes on the rendered groups in place. Changing classes
 * (not markup) is what lets CSS transitions animate between steps.
 */
function applyStep(svg: SVGSVGElement, doc: Doc, step: number | undefined): void {
  const any = step !== undefined && stepHasHighlight(doc, step);
  const byId = new Map(doc.elements.map((el) => [el.id, el]));
  svg.querySelectorAll<SVGGElement>('g[data-id]').forEach((g) => {
    const el = byId.get(g.dataset.id ?? '');
    if (!el) return;
    const cls = stepClass(stepState(el, step, any));
    g.setAttribute('class', cls ? `lw-el ${cls}` : 'lw-el');
  });
}

/**
 * Renders a document as inline SVG. Steps animate: elements fade in and out
 * and highlighted elements switch to the accent color.
 *
 * @example
 * ```tsx
 * <Diagram doc={doc} step={2} theme="dark" />
 * ```
 */
export function Diagram({ doc, step, theme = 'light', padding, background, className, style }: DiagramProps) {
  const idPrefix = 'lw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const ref = useRef<SVGSVGElement>(null);
  // The first step is baked into the markup so server rendering shows the right state.
  const firstStep = useRef(step);
  const parts = useMemo(
    () => renderParts(doc, { step: firstStep.current, theme, padding, background, idPrefix }),
    [doc, theme, padding, background, idPrefix],
  );
  useEffect(() => {
    if (ref.current) applyStep(ref.current, doc, step);
  }, [doc, step, parts]);
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={doc.title}
      viewBox={parts.viewBox}
      width={parts.width}
      height={parts.height}
      className={className ? `${parts.className} ${className}` : parts.className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', ...style }}
      dangerouslySetInnerHTML={{ __html: parts.inner }}
    />
  );
}
