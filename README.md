# bass-ui

Personal component library. Radix/shadcn primitives, **Tailwind v4**
(CSS-first — there is no `tailwind.config.ts`), TanStack Table for grids,
lucide-react for icons. Motion is an optional peer dependency — nothing here
requires it until something actually uses it.

Theme tokens live in `src/styles/globals.css`: `:root` holds the raw values in
`oklch()`, `@theme` holds fonts and scale, and `@theme inline` maps each one to
a Tailwind utility name.

## Rule

Nothing lands in `registry/` on day one. A component graduates here only
after it's been built once in a real project's `/lab` route, used for real,
and needed again somewhere else. Two real uses, not "this seems generally
useful."

## Structure

- `registry/ui` — primitives (buttons, inputs, cards). shadcn-format: one
  component per file, styled with the tokens in `src/styles/globals.css`.
- `registry/blocks` — composite patterns built from two or more primitives
  (a status-row, a filter bar, whatever repeats across projects).
- `registry/motion` — anything that imports `motion`. Isolated on purpose so
  a project that hasn't installed `motion` never breaks on an import from
  this folder.
- `src/styles/globals.css` — the actual product. Currently shadcn's default
  zinc placeholder tokens; swap for the real theme once it's picked in
  tweakcn.
- `src/lib/utils.ts` — the `cn()` helper every shadcn-format component
  expects.
- `registry-index.json` — a plain tracking list of what's in here, not a
  CLI-consumable manifest yet. That gets built per-component once there's a
  reason to serve this to another project via `npx shadcn add`.

## Adding a component

```bash
npx shadcn@latest add button
```

Reads `components.json`, drops the file into `registry/ui` per the aliases
configured there.

## Using this in another project

Components are **copied in**, not imported — the shadcn model. That's why
`@/lib/utils` works on the other side: the file becomes theirs and resolves
against their alias.

Regenerate the CLI-consumable output after any change to `src/registry/`:

```bash
npm run registry:build
```

That writes `r/` — one registry-item JSON per component, plus `r/registry.json`.

### New project (needs the tokens too)

```bash
npx shadcn@latest add ./r/theme.json
npx shadcn@latest add ./r/button.json ./r/card.json
```

`theme.json` carries the token block from `globals.css`. Skip it on an
existing project that already has its own theme — the components read
whatever `--primary`, `--border` etc. are already defined.

### Existing project

```bash
npx shadcn@latest add ./r/button.json
```

Radix and `cva` deps install automatically from each item's `dependencies`.

### Paths

The CLI takes a **relative** path or an **http(s) URL**. Absolute Windows
paths and `file://` URLs both fail (`unknown scheme` / `not implemented`),
so from another repo either point at a relative path:

```bash
npx shadcn@latest add ../Assets/Bass-UI/r/button.json
```

or serve `r/` over http and use the URL form. Once hosted, `components.json`
can carry it as a named registry:

```json
"registries": { "@bass-ui": "https://<host>/r/{name}.json" }
```

then `npx shadcn@latest add @bass-ui/button`.

## Changing the theme

Themes come from tweakcn, which authors for Tailwind v4 — so colours pass
through as `oklch()` with no conversion:

```bash
npm run theme:import -- https://tweakcn.com/themes/<id>
npm run registry:build
```

The importer rewrites `src/styles/globals.css` wholesale, so don't hand-edit
that file — change the theme in tweakcn and re-import. Skipping
`registry:build` means `r/theme.json` keeps serving the previous theme.

Current theme: **B-01** — navy `#19398d`, square corners (`--radius: 0rem`),
Inter / Source Code Pro.
