import { useEffect, useState, type CSSProperties } from 'react';
import { stepCount, type Doc, type Theme } from '../index';
import { Diagram } from './Diagram';

/** Props of {@link DiagramPlayer}. */
export interface DiagramPlayerProps {
  doc: Doc;
  /** @default 'light' */
  theme?: Theme;
  /** @default 1 */
  initialStep?: number;
  /** Time per step while playing, in ms. @default 2000 */
  interval?: number;
  /** Start over after the last step while playing. @default true */
  loop?: boolean;
  /** Start playing on mount. @default false */
  autoPlay?: boolean;
  className?: string;
  style?: CSSProperties;
}

const btn: CSSProperties = {
  font: 'inherit',
  letterSpacing: 'inherit',
  color: 'var(--lw-ink)',
  background: 'transparent',
  border: '1px solid var(--lw-shade)',
  borderRadius: 3,
  padding: '5px 10px',
  cursor: 'pointer',
};

/**
 * A step-through figure with PREV / PLAY / NEXT controls, styled like a
 * figure in a technical manual. Without steps it renders a plain {@link Diagram}.
 *
 * The figure carries the `lw` theme classes, so the controls follow the
 * same `--lw-*` variables as the drawing.
 */
export function DiagramPlayer({
  doc,
  theme = 'light',
  initialStep = 1,
  interval = 2000,
  loop = true,
  autoPlay = false,
  className,
  style,
}: DiagramPlayerProps) {
  const n = stepCount(doc);
  const [step, setStep] = useState(Math.min(Math.max(1, initialStep), Math.max(1, n)));
  const [playing, setPlaying] = useState(autoPlay && n > 1);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step < n) setStep(step + 1);
      else if (loop) setStep(1);
      else setPlaying(false);
    }, interval);
    return () => clearTimeout(t);
  }, [playing, step, n, interval, loop]);

  if (n === 0) return <Diagram doc={doc} theme={theme} className={className} style={style} />;

  const go = (s: number) => {
    setPlaying(false);
    setStep(Math.min(Math.max(1, s), n));
  };
  const caption = doc.steps?.[step - 1]?.caption;
  return (
    <figure
      className={`lw lw-${theme}${className ? ` ${className}` : ''}`}
      style={{ margin: 0, background: 'var(--lw-bg)', color: 'var(--lw-ink)', ...style }}
    >
      <Diagram doc={doc} step={step} theme={theme} />
      <figcaption
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid var(--lw-shade)',
          fontFamily: 'var(--lw-font-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <button type="button" style={btn} onClick={() => go(step - 1)} disabled={step <= 1}>
          ◀ Prev
        </button>
        <button type="button" style={btn} onClick={() => setPlaying(!playing)} aria-pressed={playing}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button type="button" style={btn} onClick={() => go(step + 1)} disabled={step >= n}>
          Next ▶
        </button>
        <span style={{ color: 'var(--lw-muted)', marginLeft: 4 }}>
          Step {step} / {n}
        </span>
        {caption && <span style={{ flexBasis: '100%', paddingTop: 4, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--lw-font-sans)', fontSize: 14 }}>{caption}</span>}
      </figcaption>
    </figure>
  );
}
