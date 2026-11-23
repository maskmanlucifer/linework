import type { Doc, Theme } from '@maskmanlucifer/linework';
import { create } from 'zustand';
import { examples } from './examples';

/** Drawing tools. `hand` only pans. */
export type Tool =
  | 'select'
  | 'hand'
  | 'rect'
  | 'rounded'
  | 'ellipse'
  | 'isobox'
  | 'isostack'
  | 'cylinder'
  | 'line'
  | 'arrow'
  | 'text'
  | 'callout'
  | 'dimension'
  | 'frame'
  | 'badge';

/** Canvas viewport: `screen = world * zoom + (x, y)`. */
export interface View {
  x: number;
  y: number;
  zoom: number;
}

/** Editor state. The document is immutable; history keeps snapshots. */
export interface EditorState {
  doc: Doc;
  selection: string[];
  tool: Tool;
  view: View;
  /** Step previewed on the canvas; `null` edits the full drawing. */
  step: number | null;
  snap: boolean;
  theme: Theme;
  past: Doc[];
  future: Doc[];
  /** Saves the current document to the undo stack. Call once before a drag. */
  checkpoint: () => void;
  /** Replaces the document without a history entry (for drags after {@link EditorState.checkpoint}). */
  setDoc: (doc: Doc) => void;
  /** Replaces the document as one undoable change. */
  commit: (doc: Doc) => void;
  /** Loads a new document and clears history. */
  load: (doc: Doc) => void;
  undo: () => void;
  redo: () => void;
  select: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setView: (view: View) => void;
  setStep: (step: number | null) => void;
  toggleSnap: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'linework:doc';
const HISTORY_LIMIT = 200;

function loadSaved(): Doc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const doc = JSON.parse(raw) as Doc;
      if (doc.version === 1 && Array.isArray(doc.elements)) return doc;
    }
  } catch {
    // Corrupt or blocked storage: start from the first example.
  }
  return examples[0].doc;
}

/** The editor store. */
export const useEditor = create<EditorState>((set, get) => ({
  doc: loadSaved(),
  selection: [],
  tool: 'select',
  view: { x: 0, y: 0, zoom: 1 },
  step: null,
  snap: true,
  theme: 'light',
  past: [],
  future: [],
  checkpoint: () => set((s) => ({ past: [...s.past.slice(-HISTORY_LIMIT), s.doc], future: [] })),
  setDoc: (doc) => set({ doc }),
  commit: (doc) => {
    if (doc === get().doc) return;
    get().checkpoint();
    set({ doc });
  },
  load: (doc) => set({ doc, past: [], future: [], selection: [], step: null }),
  undo: () =>
    set((s) => {
      const prev = s.past.at(-1);
      if (!prev) return s;
      return { doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], selection: keep(s.selection, prev) };
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return { doc: next, past: [...s.past, s.doc], future: s.future.slice(1), selection: keep(s.selection, next) };
    }),
  select: (selection) => set({ selection }),
  setTool: (tool) => set({ tool }),
  setView: (view) => set({ view }),
  setStep: (step) => set({ step }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  setTheme: (theme) => set({ theme }),
}));

function keep(ids: string[], doc: Doc): string[] {
  return ids.filter((id) => doc.elements.some((e) => e.id === id));
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useEditor.subscribe((s, prev) => {
  if (s.doc === prev.doc) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s.doc));
    } catch {
      // Storage full or blocked: autosave is best effort; Save to file still works.
    }
  }, 300);
});
