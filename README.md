# luiskr.com V3 — cms

The content-management interface — the private admin surface behind the public
site. `cms/` is a completely separate bundle served under `/cms`, excluded from
indexing (robots + `X-Robots-Tag`), and never shipped to public visitors.

Where `website/` reads the Firebase `translations/<locale>/` tree to render
localized pages, `cms/` is the tool that **writes** it — every editor maps to one
or more RTDB nodes, and structural fields sync across all 16 locales so a
reordering or a media change propagates everywhere.

## Access model

1. `main.ts` mounts `<admin-login>` when the Firebase auth session reports no
   user — a single Google OAuth card.
2. Success flips to `<view-cms-dashboard>` — the authenticated shell with the
   tab strip routing between editors.
3. Every editor writes through the Firebase SDK; parse errors and auth failures
   surface inline (the raw JSON editor blocks saves on malformed input so bad
   content can never reach the site).

## Routes — the shell

| File                      | What it does                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`                 | CMS bundle entry — mounts login or dashboard by auth session, re-swaps on auth-changed.                                     |
| `routes/AdminLogin.tsx`   | `<view-admin-login>` — Google OAuth gate; cancelled popups stay silent (a user action, not a failure).                      |
| `routes/CmsDashboard.tsx` | `<view-cms-dashboard>` — the authenticated shell: header (brand + user + logout), tab strip between editors, toast surface. |

## Editors — one per content domain

Each editor follows the same facade pattern: the `Cms*.tsx` element owns the
store and delegates to `data.ts` (Firebase I/O), `model.ts`/`sections.ts`
(mutations), `events.ts` (form wiring), `render.tsx` (JSX), `types.ts`.

| Editor                                      | Node(s) it edits                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `portfolio/CmsPortfolioList.tsx`            | Home page's ordered project grid — item order, media dimensions, cover assignment per locale; structural fields synced across locales. |
| `projects/CmsProjectsList.tsx`              | Full case-study editing — project list, per-project sections (text blocks + media slots), create/delete.                               |
| `about/CmsAboutEditor.tsx`                  | Bio paragraphs per column, mentions list, Gravatar picture URL (with size presets).                                                    |
| `footer/CmsFooterEditor.tsx`                | Credit/source lines + social/other channel lists across three nodes (contact, legal-footer, related).                                  |
| `playground-editor/CmsPlaygroundEditor.tsx` | Earth-playground labels, the `defaults` control sub-node (initial slider/toggle values the site merges), localized route slugs.        |
| `lang/CmsLangEditor.tsx`                    | Raw JSON dictionary escape hatch — any `translations` node editable as formatted JSON per locale.                                      |

## `deploy-info/` — the quality bundle viewer

`<cms-deploy-info>` renders `dist/deploy-info/` (written by
`shared/scripts/build/deploy-info.mjs` at build time): Lighthouse scores per URL,
Jest coverage totals, axe-core violations, Snyk/yarn-audit vulnerabilities, and
the console-* governance scan — grouped into a report wall with score chips.
Each report degrades independently if missing.

## `media-convert/` — the localhost-only media pipeline

`<cms-media-converter>` is a **localhost-only** batch converter — it exists only
on the dev server (the API is a Vite plugin, never part of the built bundle).
Drop a folder of images/videos in any format → files stream to a temp job dir →
the `tasks/*` pipelines run server-side → results download as a ZIP with the
site's exact CDN naming (`-mozjpg*`, `.mp4-scaled*`, MSSIM blur-up variants).

| File                                              | What it does                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `CmsMediaConverter.tsx`                           | The drop-zone converter UI — queue, progress, ZIP download.                                                     |
| `job.ts`                                          | Job lifecycle — create → upload → convert → poll → finish.                                                      |
| `files.ts`                                        | Recursive drop/input collection (generator-based traversal) + byte formatting.                                  |
| `events.ts`, `render.tsx`, `consts.ts`, `exts.ts` | Wiring, phase-switched templates, job phases/poll cadence, accepted extensions (shared with the node pipeline). |

### Required external tools (per OS)

The converter shells out to three tools; missing ones surface in the tab's
tools panel (`GET /api/media-convert/tools`) with a copy/paste install command,
and `yarn setup` prints the same hints before you ever open the CMS.

| OS               | ffmpeg / ffprobe                     | ImageMagick                                      | mozjpeg / cjpeg                            |
| ---------------- | ------------------------------------ | ------------------------------------------------ | ------------------------------------------ |
| Debian/Ubuntu    | `sudo apt-get install ffmpeg`        | `sudo apt-get install imagemagick`               | `sudo apt-get install libjpeg-turbo-progs` |
| Fedora/RHEL      | `sudo dnf install ffmpeg`            | `sudo dnf install ImageMagick`                   | `sudo dnf install libjpeg-turbo-utils`     |
| macOS (brew)     | `brew install ffmpeg`                | `brew install imagemagick`                       | `brew install mozjpeg`                     |
| Windows (winget) | `winget install -e --id Gyan.FFmpeg` | `winget install -e --id ImageMagick.ImageMagick` | `npm install -g mozjpeg`                   |
| Windows (choco)  | `choco install ffmpeg`               | `choco install imagemagick`                      | `npm install -g mozjpeg`                   |

Windows has no winget/choco mozjpeg package — `npm install -g mozjpeg` drops a
prebuilt `cjpeg.exe` into npm's global bin dir (already on PATH for any Node
user). Alternatives: `vcpkg install mozjpeg`, or the win64 zip under
[mozilla/mozjpeg releases](https://github.com/mozilla/mozjpeg/releases) added
to PATH manually. `cjpeg` is optional — without it JPEGs re-encode through
ffmpeg's `-q:v` ladder instead of mozjpeg's trellis quantizer.

On Windows the converter calls `magick` (not `convert`); on macOS/Linux it calls
`convert`. PATH must be refreshed — restart the dev server after installing.

## `dev/` — offline development

| File                   | What it does                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev/firebase-mock.ts` | Dev-only Firebase Auth + RTDB stub — `CMS_MOCK=1 yarn dev` aliases the SDK to this module. Reads the committed `database.json` so every editor works without credentials; writes go nowhere. |

## `tokens/` — CMS-private vocabulary

The CMS keeps its own token tree (BEM classes, control IDs, field groups) under
`tokens/` — strictly isolated for the admin bundle, never imported by the public
site. Grouped per feature: `tokens/editors/`, `tokens/fields/`, `tokens/shell/`,
composed from `tokens/base.ts` fragments so spellings stay single-sourced.

## Root files

| File             | What it does                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`       | Barrel — every editor/route element + the CMS token tree. The CMS targets ESNext only (author tool, never shipped to public visitors). |
| `vite.config.js` | Library build — emits `cms/dist/cms.js`.                                                                                               |

## Commands

```bash
yarn dev            # CMS dev server against live Firebase
CMS_MOCK=1 yarn dev # offline mode — committed database.json, no credentials needed
yarn test           # jest suite for cms
yarn build          # emits cms/dist/cms.js
```

---

Submodule of [luiskr.com-V3](https://github.com/LuisKrotz/luiskr.com-V3). Install
deps from the superproject (`yarn install` at the root), then run `yarn dev` /
`yarn test` / `yarn build` in this folder — see `package.json` scripts.

License: [MPL-2.0](https://github.com/LuisKrotz/luiskr.com-V3/blob/development/LICENSE)
