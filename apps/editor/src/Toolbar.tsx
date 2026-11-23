import type { ReactNode } from 'react';
import { useEditor, type Tool } from './store';
import { TOOLS } from './tools';

const ICONS: Record<Tool, ReactNode> = {
  select: <path d="M5 3l11 6.5-5 1.2-2.3 4.8z" />,
  hand: <path d="M7 10V5.5a1.2 1.2 0 012.4 0V9m0-4.8a1.2 1.2 0 012.4 0V9m0-3.5a1.2 1.2 0 012.4 0V10m0-2.5a1.2 1.2 0 012.4 0v4.5c0 3-2 5-5 5s-4-1.5-5.5-4L4 10.5a1.2 1.2 0 012-1.3L7 10.5" />,
  rect: <rect x="3.5" y="5.5" width="13" height="9" />,
  rounded: <rect x="3.5" y="5.5" width="13" height="9" rx="3" />,
  ellipse: <ellipse cx="10" cy="10" rx="6.5" ry="5" />,
  isobox: <path d="M10 3l6 3.5v7L10 17l-6-3.5v-7zM4 6.5L10 10l6-3.5M10 10v7" />,
  isostack: <path d="M10 3l6 3-6 3-6-3zM4 9.5l6 3 6-3M4 13l6 3 6-3" />,
  cylinder: <path d="M4.5 5.5c0-1.4 2.5-2.5 5.5-2.5s5.5 1.1 5.5 2.5S13 8 10 8 4.5 6.9 4.5 5.5zm0 0v9c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-9" />,
  line: <path d="M4 16L16 4" />,
  arrow: <path d="M4 16L16 4M9.5 4H16v6.5" />,
  text: <path d="M5 5h10M10 5v11M8 16h4" />,
  callout: <path d="M3 6h8M11 6l5 8M16 14h.01" />,
  dimension: <path d="M3 12h14M3 9v6M17 9v6M2 14l2-2M16 14l2-2" />,
  frame: <path d="M3 6h14v10H3zM3 6V3.5h6V6" strokeDasharray="0" />,
  badge: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M9 8l1.5-1v6" />
    </>
  ),
};

/** Vertical tool palette. */
export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLS.map((t, i) => (
        <button
          key={t.id}
          type="button"
          className={tool === t.id ? 'tool active' : 'tool'}
          title={`${t.label}  (${t.key.toUpperCase()})`}
          onClick={() => setTool(t.id)}
          style={i === 2 || i === 8 || i === 10 ? { marginTop: 10 } : undefined}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
            {ICONS[t.id]}
          </svg>
        </button>
      ))}
    </nav>
  );
}
