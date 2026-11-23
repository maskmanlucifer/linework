/**
 * File and clipboard I/O: JSON save/load and SVG/PNG export.
 * @module
 */
import { renderToSVG, type Doc, type Theme } from '@maskmanlucifer/linework';

function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** File-name-safe slug of the document title. */
export function slug(doc: Doc): string {
  return (doc.title ?? 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';
}

/** Downloads the document as JSON. */
export function saveJSON(doc: Doc): void {
  download(`${slug(doc)}.linework.json`, new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
}

/**
 * Asks the user for a JSON file and parses it.
 *
 * @throws When the file is not a linework document.
 */
export function openJSON(): Promise<Doc> {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const doc = JSON.parse(await file.text()) as Doc;
        if (doc.version !== 1 || !Array.isArray(doc.elements)) throw new Error('Not a linework document');
        resolve(doc);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

/** Export settings shared by SVG, PNG and clipboard. */
export interface ExportOptions {
  theme: Theme;
  step?: number;
}

/** Renders the export SVG. */
export function exportSVGString(doc: Doc, o: ExportOptions): string {
  return renderToSVG(doc, { theme: o.theme, step: o.step });
}

/** Downloads a standalone SVG. */
export function exportSVG(doc: Doc, o: ExportOptions): void {
  download(`${slug(doc)}.svg`, new Blob([exportSVGString(doc, o)], { type: 'image/svg+xml' }));
}

/** Copies the SVG markup to the clipboard. */
export function copySVG(doc: Doc, o: ExportOptions): Promise<void> {
  return navigator.clipboard.writeText(exportSVGString(doc, o));
}

/**
 * Downloads a PNG at 2× scale. The SVG is drawn as an image, so web fonts of
 * the page are not available inside it and system fallbacks are used.
 */
export async function exportPNG(doc: Doc, o: ExportOptions, scale = 2): Promise<void> {
  // `auto` cannot be resolved inside an image; pick the current OS preference.
  const theme = o.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : o.theme;
  const svg = renderToSVG(doc, { theme, step: o.step });
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/png'));
  download(`${slug(doc)}.png`, blob);
}
