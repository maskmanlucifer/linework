import { stepCount, type Element, type StepRange } from '@maskmanlucifer/linework';
import { useEffect, useState } from 'react';
import { updateSelected } from './actions';
import { removeStep } from './ops';
import { useEditor } from './store';

function withSteps(el: Element, steps: StepRange): Element {
  const clean: StepRange = {};
  if (steps.show) clean.show = steps.show;
  if (steps.highlight?.length) clean.highlight = steps.highlight;
  return { ...el, steps: clean.show || clean.highlight ? clean : undefined };
}

/** Builds a show range; an open end is left out so the JSON stays clean. */
function range(from: number, to: number | undefined | null): [number, number?] {
  return to == null ? [from] : [from, Math.max(from, to)];
}

/** Describes when an element shows, for the panel summary. */
function describe(el: Element, n: number): string {
  const show = el.steps?.show;
  const range = show ? (show[1] == null ? `${show[0]}–${n}` : show[0] === show[1] ? `${show[0]}` : `${show[0]}–${show[1]}`) : 'all';
  const hl = el.steps?.highlight?.length ? ` · highlight ${el.steps.highlight.join(', ')}` : '';
  return `visible ${range}${hl}`;
}

/**
 * Bottom panel: define steps, pick which selected elements appear or are
 * highlighted in the current step, and preview playback.
 */
export function StepsPanel() {
  const doc = useEditor((s) => s.doc);
  const step = useEditor((s) => s.step);
  const selection = useEditor((s) => s.selection);
  const { setStep, commit } = useEditor.getState();
  const [playing, setPlaying] = useState(false);
  const n = stepCount(doc);
  const sel = doc.elements.filter((e) => selection.includes(e.id));

  useEffect(() => {
    if (!playing || !n) return;
    const t = setTimeout(() => setStep(step === null || step >= n ? 1 : step + 1), step === null ? 0 : 1800);
    return () => clearTimeout(t);
  }, [playing, step, n, setStep]);

  const go = (s: number) => {
    setPlaying(false);
    setStep(Math.min(Math.max(1, s), n));
  };
  const addStep = () => {
    commit({ ...doc, steps: [...(doc.steps ?? []), { caption: '' }] });
    setStep(n + 1);
  };
  const delStep = () => {
    if (step === null) return;
    commit(removeStep(doc, step));
    setStep(n > 1 ? Math.min(step, n - 1) : null);
  };
  const setCaption = (caption: string) => {
    const s = useEditor.getState();
    s.setDoc({ ...s.doc, steps: (s.doc.steps ?? []).map((st, i) => (i === (step ?? 0) - 1 ? { ...st, caption } : st)) });
  };
  const k = step ?? 0;
  const highlighted = sel.length > 0 && sel.every((e) => e.steps?.highlight?.includes(k));

  return (
    <div className="steps">
      <div className="steps-row">
        <span className="label">Steps</span>
        <button type="button" className={step === null ? 'chip active' : 'chip'} onClick={() => (setPlaying(false), setStep(null))} title="Edit the full drawing">
          All
        </button>
        {Array.from({ length: n }, (_, i) => (
          <button key={i} type="button" className={step === i + 1 ? 'chip active' : 'chip'} onClick={() => go(i + 1)}>
            {String(i + 1).padStart(2, '0')}
          </button>
        ))}
        <button type="button" className="chip" onClick={addStep} title="Add step">
          +
        </button>
        {step !== null && (
          <button type="button" className="chip" onClick={delStep} title="Remove this step">
            −
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="ctl" onClick={() => go((step ?? 1) - 1)} disabled={!n || (step ?? 1) <= 1}>
          ◀ Prev
        </button>
        <button type="button" className="ctl" onClick={() => setPlaying(!playing)} disabled={!n}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button type="button" className="ctl" onClick={() => go((step ?? 0) + 1)} disabled={!n || (step ?? 0) >= n}>
          Next ▶
        </button>
        <span className="counter">
          Step {step ?? '–'} / {n}
        </span>
      </div>
      {step !== null && (
        <div className="steps-row">
          <input
            className="caption"
            placeholder={`Caption for step ${step}`}
            value={doc.steps?.[step - 1]?.caption ?? ''}
            onFocus={() => useEditor.getState().checkpoint()}
            onChange={(e) => setCaption(e.target.value)}
          />
          {sel.length > 0 ? (
            <>
              <span className="label">Selection</span>
              <button type="button" className="ctl" onClick={() => updateSelected((e) => withSteps(e, { ...e.steps, show: range(k, e.steps?.show?.[1]) }))} title="Hidden before this step">
                Appear here
              </button>
              <button type="button" className="ctl" onClick={() => updateSelected((e) => withSteps(e, { ...e.steps, show: range(Math.min(e.steps?.show?.[0] ?? 1, k), k) }))} title="Hidden after this step">
                Last here
              </button>
              <button type="button" className="ctl" onClick={() => updateSelected((e) => withSteps(e, { ...e.steps, show: [k, k] }))}>
                Only here
              </button>
              <button type="button" className="ctl" onClick={() => updateSelected((e) => withSteps(e, { ...e.steps, show: undefined }))}>
                Always
              </button>
              <button
                type="button"
                className={highlighted ? 'ctl active' : 'ctl'}
                onClick={() =>
                  updateSelected((e) => {
                    const hl = e.steps?.highlight ?? [];
                    return withSteps(e, { ...e.steps, highlight: highlighted ? hl.filter((x) => x !== k) : [...new Set([...hl, k])].sort((a, b) => a - b) });
                  })
                }
              >
                Highlight
              </button>
              {sel.length === 1 && <span className="hint">{describe(sel[0], n)}</span>}
            </>
          ) : (
            <span className="hint">Select elements to set when they appear or are highlighted.</span>
          )}
        </div>
      )}
    </div>
  );
}
