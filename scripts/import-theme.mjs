// Pull a tweakcn theme into src/styles/globals.css, Tailwind v4 shape.
//
//   npm run theme:import -- https://tweakcn.com/themes/<id>
//
// Then `npm run registry:build` so r/theme.json ships the new values.
//
// tweakcn authors for v4, so colours pass through as oklch() untouched — no
// conversion, no gamut clamping, full fidelity. scripts/lib/oklch.mjs is still
// used, but only to print hex comments so the values are eyeballable in a diff.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { convertColor } from "./lib/oklch.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// Keys that are not colours. Everything else becomes a --color-* theme entry.
// shadow-* values contain hsl() but are shadows, so they match on key, not value.
const NON_COLOR = /^(radius$|font-|shadow|spacing$|letter-spacing$|tracking-)/;

const input = process.argv[2];
if (!input) {
  console.error("usage: npm run theme:import -- <tweakcn theme url or id>");
  process.exit(1);
}

const id = input.trim().replace(/\/+$/, "").split("/").pop();
const url = `https://tweakcn.com/r/themes/${id}`;

const res = await fetch(url);
if (!res.ok) {
  console.error(`fetch failed: ${res.status} ${url}`);
  process.exit(1);
}

const theme = await res.json();
const light = theme.cssVars?.light;
if (!light) {
  console.error("no cssVars.light in response — is that a tweakcn theme id?");
  process.exit(1);
}

const colors = [];
const scale = []; // shadows, spacing, tracking — literals that belong in @theme
const fonts = [];
let radius = "0.5rem";

for (const [key, raw] of Object.entries(light)) {
  if (key === "radius") {
    radius = raw;
    continue;
  }
  if (key.startsWith("font-")) {
    fonts.push(`  --${key}: ${raw};`);
    continue;
  }
  if (NON_COLOR.test(key)) {
    scale.push(`  --${key}: ${raw};`);
    continue;
  }

  // hex comment purely so a diff is readable; oklch is what actually ships
  const preview = convertColor(raw);
  colors.push(`  --${key}: ${raw};${preview ? ` /* ${preview.hex} */` : ""}`);
}

// tracking-* from cssVars.theme depends on --tracking-normal, which lives in light
for (const [key, raw] of Object.entries(theme.cssVars?.theme ?? {})) {
  if (key.startsWith("tracking-") && !scale.some((l) => l.includes(`--${key}:`))) {
    scale.push(`  --${key}: ${raw};`);
  }
}

const colorNames = colors.map((l) => l.match(/--([\w-]+):/)[1]);

const css = `@import "tailwindcss";
@import "tw-animate-css";

/*
  Theme: ${theme.name ?? id}
  Imported from ${url} by scripts/import-theme.mjs — re-run that, don't hand-edit.

  Tailwind v4, CSS-first: there is no tailwind.config.ts. Colours stay in the
  oklch() tweakcn authored them in — wider gamut than hex, and no conversion
  step to get wrong. Hex comments are sRGB approximations for eyeballing only.

  Light-only on purpose: no .dark block, per the light-background rule.
*/

:root {
${colors.join("\n")}
  --radius: ${radius};
}

@theme {
${fonts.join("\n")}
${scale.join("\n")}
}

/*
  @theme inline resolves var() at definition time, which is what lets a token
  defined in :root above drive a Tailwind utility name below.
*/
@theme inline {
${colorNames.map((n) => `  --color-${n}: var(--${n});`).join("\n")}

  /*
    max() guards a zero radius: this theme sets --radius: ${radius}, and a bare
    calc(0rem - 4px) is a negative radius, which invalidates the declaration.
  */
  --radius-sm: max(0px, calc(var(--radius) - 4px));
  --radius-md: max(0px, calc(var(--radius) - 2px));
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

await writeFile(join(ROOT, "src", "styles", "globals.css"), css);

console.log(`imported "${theme.name ?? id}" -> src/styles/globals.css`);
console.log(`  ${colors.length} colours (oklch, unconverted)`);
console.log(`  ${fonts.length} font tokens, ${scale.length} scale tokens, radius ${radius}`);
console.log(`  next: npm run registry:build`);
