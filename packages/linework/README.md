# @maskmanlucifer/linework

Calm technical explainer diagrams: a JSON document model, a framework-agnostic SVG renderer, and React components with step-through animation.

The house style: thin even strokes, off-white paper, one warm accent, mono uppercase labels with leader lines, isometric boxes and stacks, dimension lines.

## Usage

### Core (no React)

```ts
import { renderToSVG, type Doc } from '@maskmanlucifer/linework';

const doc: Doc = {
  version: 1,
  title: 'Cache',
  steps: [{ caption: 'The CPU asks the cache' }, { caption: 'Miss: go to RAM' }],
  elements: [
    { id: 'cpu', type: 'rect', x: 0, y: 0, w: 120, h: 60, text: 'CPU' },
    { id: 'l1', type: 'isobox', x: 200, y: -20, w: 60, d: 60, h: 24, text: 'L1' },
    { id: 'a', type: 'line', x: 120, y: 30, x2: 200, y2: 30, endArrow: true, steps: { highlight: [1] } },
    { id: 'ram', type: 'cylinder', x: 360, y: -10, w: 80, h: 90, text: 'RAM', steps: { show: [2], highlight: [2] } },
    { id: 'note', type: 'callout', x: 220, y: 110, tx: 250, ty: 60, text: '64 KB' },
  ],
};

const svg = renderToSVG(doc, { theme: 'auto', step: 2 });
```

The SVG embeds its own stylesheet. Colors are CSS variables (`--lw-ink`, `--lw-accent`, `--lw-paper`, …) on the root `svg.lw`. The theme class is `lw-light`, `lw-dark` or `lw-auto` (follows `prefers-color-scheme`). Override any variable from the host page to restyle a drawing.

Other core exports: `iso()`, `isoBoxFaces()`, `routePoints()`, `dimensionGeometry()`, `getBounds()`, `hitTest()`, `stepState()`, `renderElement()`, `renderParts()`, `themeCSS()`, `LIGHT`, `DARK`.

### React

```tsx
import { Diagram, DiagramPlayer } from '@maskmanlucifer/linework/react';

<Diagram doc={doc} step={2} theme="dark" />
<DiagramPlayer doc={doc} interval={2000} />
```

`DiagramPlayer` shows `◀ PREV / ▶ PLAY / NEXT ▶ / STEP n / N` controls and the step caption. Elements fade in and out between steps, and highlighted elements turn to the accent color while the rest dims.

### Document model

| Element     | Fields                                                    |
| ----------- | --------------------------------------------------------- |
| `rect`      | `x y w h radius? text?`                                   |
| `ellipse`   | `x y w h text?`                                           |
| `isobox`    | `x y w d h text?` (x/y is the top-left of its bounds)     |
| `isostack`  | `x y w d h layers gap`                                    |
| `cylinder`  | `x y w h text?`                                           |
| `line`      | `x y x2 y2 route? (straight, elbow, curved) startArrow? endArrow?` |
| `text`      | `x y text size? font? (sans, mono, serif) align?`         |
| `callout`   | `x y` label, `tx ty` target, `text`                       |
| `dimension` | `x y x2 y2 offset? text?`                                 |
| `frame`     | `x y w h title?`                                          |
| `badge`     | `x y` center, `n`, `r?`                                   |

Every element has `id`, optional `style` (`stroke`: ink, muted, accent, teal; `fill`: none, paper, shade, accent, teal, hatch, dots; `strokeWidth`: thin, regular, bold; `dashed`), optional `steps` (`show: [from, to?]`, `highlight: number[]`, 1-based) and optional `groupId`.

## Install privately

The package is not on the public npm registry. Use one of these three ways.

### 1. GitHub Packages (recommended)

Make a GitHub personal access token (classic) with the `read:packages` scope. Your account must have access to the `maskmanlucifer/linework` repository. Then add an `.npmrc` file next to your `package.json`:

```ini
@maskmanlucifer:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Do not commit the token. Keep it in the environment (`export GITHUB_TOKEN=...`) or in CI secrets. Then install:

```sh
pnpm add @maskmanlucifer/linework   # or: npm install @maskmanlucifer/linework
```

To publish a new version (maintainers), use a token with the `write:packages` scope:

```sh
cd packages/linework
pnpm version patch && pnpm publish --no-git-checks
```

`publishConfig` already points at `https://npm.pkg.github.com` with `access: restricted`.

### 2. Git dependency (pnpm)

pnpm can install one package from a subfolder of a git repository. Pin a tag or commit:

```sh
pnpm add "github:maskmanlucifer/linework#v0.1.0&path:packages/linework"
```

The repository has no built files, so pnpm runs the `prepare` script (it builds `dist/` with tsup). pnpm 10 and later block that script until you allow it. Add the key that pnpm prints in the `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` message to `pnpm-workspace.yaml`. The key contains the resolved commit:

```yaml
allowBuilds:
  "@maskmanlucifer/linework@git+https://github.com/maskmanlucifer/linework.git#<commit>&path:packages/linework": true
  esbuild: true
```

For a private repository, git must be able to clone it (an SSH key, or `gh auth setup-git`). npm cannot install a subfolder of a git repository, so npm users must use option 1 or 3.

### 3. Local tarball (offline)

```sh
cd packages/linework
pnpm run pack            # builds, then writes dist-pack/maskmanlucifer-linework-<version>.tgz
```

Copy the `.tgz` file to the other project and install it:

```sh
pnpm add ./maskmanlucifer-linework-0.1.0.tgz   # or: npm install ./maskmanlucifer-linework-0.1.0.tgz
```

## Development

```sh
pnpm build   # tsup → dist/ (ESM + .d.ts)
pnpm test    # vitest
```
