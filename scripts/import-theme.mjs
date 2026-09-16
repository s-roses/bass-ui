// Pull a tweakcn theme and write it into src/styles/globals.css as v3-shaped
// HSL triplets.
//
//   npm run theme:import -- https://tweakcn.com/themes/<id>
//
// Then `npm run registry:build` so r/theme.json ships the new values.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { convertColor } from "./lib/oklch.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// v4-only machinery that does nothing on Tailwind v3. --spacing drives v4's
// dynamic spacing scale; the shadow/tracking vars are consumed by v4's @theme.
// Carrying them here would just be decoration nothing reads.
const V4_ONLY = /^(spacing|shadow-|tracking-|letter-spacing|radius-)/;

// Tokens kept as-is: not colors, so no conversion, but still real on v3.
const PASSTHROUGH = new Set(["radius", "font-sans", "font-serif", "font-mono"]);

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

const lines = [];
const clampedTokens = [];
let dropped = 0;

for (const [key, raw] of Object.entries(light)) {
  if (V4_ONLY.test(key)) {
    dropped++;
    continue;
  }

  if (PASSTHROUGH.has(key)) {
    lines.push(`    --${key}: ${raw};`);
    continue;
  }

  const converted = convertColor(raw);
  if (!converted) {
    // already a triplet or some other literal — leave it alone
    lines.push(`    --${key}: ${raw};`);
    continue;
  }

  if (converted.clamped) clampedTokens.push(key);
  lines.push(`    --${key}: ${converted.triplet}; /* ${converted.hex} */`);
}

const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/*
  Theme: ${theme.name ?? id}
  Imported from ${url} by scripts/import-theme.mjs — re-run that, don't hand-edit.

  tweakcn authors in oklch() for Tailwind v4. These are converted to the bare
  "H S% L%" triplets v3 needs, because tailwind.config.ts wraps each one as
  hsl(var(--token)). Hex comments are the resolved colour, for eyeballing.

  Light-only on purpose: no .dark block, per the light-background rule.
*/
@layer base {
  :root {
${lines.join("\n")}
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }
}
`;

await writeFile(join(ROOT, "src", "styles", "globals.css"), css);

console.log(`imported "${theme.name ?? id}" -> src/styles/globals.css`);
console.log(`  ${lines.length} tokens written, ${dropped} v4-only tokens dropped`);
if (clampedTokens.length) {
  console.log(`  NOTE: out of sRGB gamut, clamped: ${clampedTokens.join(", ")}`);
}
console.log(`  next: npm run registry:build`);
