import type { Element, Style } from './types';

/** Theme of a rendered drawing. `auto` follows `prefers-color-scheme`. */
export type Theme = 'light' | 'dark' | 'auto';

/** CSS variable values of one palette. Hosts may override any `--lw-*` variable on `svg.lw`. */
export interface Palette {
  bg: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  teal: string;
  shade: string;
  accentSoft: string;
  tealSoft: string;
  /** Overlay on the left / right faces of isometric shapes. */
  side1: string;
  side2: string;
}

/** Warm paper palette. */
export const LIGHT: Palette = {
  bg: '#FAF8F4',
  paper: '#FAF8F4',
  ink: '#1A1A1A',
  muted: '#8C877F',
  accent: '#E4572E',
  teal: '#1F6F6B',
  shade: '#ECE8E1',
  accentSoft: '#F9DDD3',
  tealSoft: '#D6E7E5',
  side1: 'rgba(60,45,25,0.06)',
  side2: 'rgba(60,45,25,0.13)',
};

/** Dark palette: same roles, ink and paper swapped, accents lifted for contrast. */
export const DARK: Palette = {
  bg: '#161514',
  paper: '#161514',
  ink: '#ECE8E1',
  muted: '#8F8A82',
  accent: '#F0714E',
  teal: '#5DB3AB',
  shade: '#2A2826',
  accentSoft: '#43251C',
  tealSoft: '#173230',
  side1: 'rgba(255,245,230,0.05)',
  side2: 'rgba(0,0,0,0.28)',
};

/** Font stacks. The named fonts are used when the host page loads them. */
export const FONTS = {
  sans: "Geist, 'Inter', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  serif: "'Instrument Serif', Georgia, 'Times New Roman', serif",
};

/** Stroke widths of the {@link Style.strokeWidth} presets. */
export const STROKE_WIDTHS = { thin: 1, regular: 1.5, bold: 2.5 } as const;

/** Style used when an element sets nothing. Tuned so a fresh drawing looks finished. */
export const DEFAULT_STYLE: Required<Style> = { stroke: 'ink', fill: 'paper', strokeWidth: 'regular', dashed: false };

const TYPE_STYLE: Partial<Record<Element['type'], Style>> = {
  line: { fill: 'none' },
  text: { fill: 'none' },
  callout: { fill: 'none', strokeWidth: 'thin' },
  dimension: { stroke: 'muted', fill: 'none', strokeWidth: 'thin' },
  frame: { stroke: 'muted', fill: 'none', strokeWidth: 'thin', dashed: true },
  badge: { stroke: 'accent', fill: 'none' },
};

/**
 * Merges the element style over the defaults of its type.
 *
 * @returns A style with every field set.
 */
export function resolveStyle(el: Element): Required<Style> {
  return { ...DEFAULT_STYLE, ...TYPE_STYLE[el.type], ...stripUndefined(el.style) };
}

function stripUndefined(s: Style | undefined): Style {
  const out: Style = {};
  for (const [k, v] of Object.entries(s ?? {})) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

function vars(p: Palette): string {
  return [
    `--lw-bg:${p.bg}`,
    `--lw-paper:${p.paper}`,
    `--lw-ink:${p.ink}`,
    `--lw-muted:${p.muted}`,
    `--lw-accent:${p.accent}`,
    `--lw-teal:${p.teal}`,
    `--lw-shade:${p.shade}`,
    `--lw-accent-soft:${p.accentSoft}`,
    `--lw-teal-soft:${p.tealSoft}`,
    `--lw-side1:${p.side1}`,
    `--lw-side2:${p.side2}`,
  ].join(';');
}

/**
 * The stylesheet every rendered drawing embeds. Colors come from CSS
 * variables so one SVG can switch theme with a class (`lw-light`,
 * `lw-dark`, `lw-auto`) or be restyled by the host page.
 */
export function themeCSS(): string {
  const colors = ['ink', 'muted', 'accent', 'teal'];
  return [
    `.lw{${vars(LIGHT)};--lw-font-sans:${FONTS.sans};--lw-font-mono:${FONTS.mono};--lw-font-serif:${FONTS.serif}}`,
    `.lw.lw-dark{${vars(DARK)}}`,
    `@media (prefers-color-scheme:dark){.lw.lw-auto{${vars(DARK)}}}`,
    `.lw .lw-bg{fill:var(--lw-bg)}`,
    ...colors.map((c) => `.lw .lw-s-${c}{stroke:var(--lw-${c})}.lw .lw-c-${c}{fill:var(--lw-${c})}`),
    `.lw .lw-f-none{fill:none}.lw .lw-f-paper{fill:var(--lw-paper)}.lw .lw-f-shade{fill:var(--lw-shade)}`,
    `.lw .lw-f-accent{fill:var(--lw-accent-soft)}.lw .lw-f-teal{fill:var(--lw-teal-soft)}`,
    `.lw .lw-side1{fill:var(--lw-side1)}.lw .lw-side2{fill:var(--lw-side2)}`,
    `.lw .lw-pat-bg{fill:var(--lw-paper)}.lw .lw-pat-ink{stroke:var(--lw-muted);fill:var(--lw-muted)}`,
    `.lw text{font-family:var(--lw-font-sans)}.lw .lw-mono{font-family:var(--lw-font-mono);letter-spacing:.08em}.lw .lw-serif{font-family:var(--lw-font-serif)}`,
    `.lw .lw-el{transition:opacity .35s ease}.lw .lw-el *{transition:stroke .35s ease,fill .35s ease}`,
    `.lw .lw-hidden{opacity:0;pointer-events:none}.lw .lw-dim{opacity:.28}`,
    `.lw .lw-hl .lw-s-ink,.lw .lw-hl .lw-s-muted,.lw .lw-hl .lw-s-teal{stroke:var(--lw-accent)}`,
    `.lw .lw-hl .lw-c-ink,.lw .lw-hl .lw-c-muted,.lw .lw-hl .lw-c-teal{fill:var(--lw-accent)}`,
    `.lw .lw-hl .lw-f-paper,.lw .lw-hl .lw-f-shade{fill:var(--lw-accent-soft)}`,
  ].join('\n');
}

/**
 * Pattern definitions for `hatch` and `dots` fills. Ids are prefixed so
 * several drawings can live on one HTML page.
 */
export function patternDefs(prefix: string): string {
  return (
    `<pattern id="${prefix}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect class="lw-pat-bg" width="6" height="6"/><line class="lw-pat-ink" x1="0" y1="0" x2="0" y2="6" stroke-width="1"/></pattern>` +
    `<pattern id="${prefix}-dots" width="6" height="6" patternUnits="userSpaceOnUse">` +
    `<rect class="lw-pat-bg" width="6" height="6"/><circle class="lw-pat-ink" cx="3" cy="3" r="0.9" stroke="none"/></pattern>`
  );
}
