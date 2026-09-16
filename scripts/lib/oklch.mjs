// oklch() -> "H S% L%", the bare triplet Tailwind v3 needs because
// tailwind.config.ts wraps every token as hsl(var(--token)).
//
// tweakcn authors themes for Tailwind v4, which takes oklch() directly.
// Pasting those in unconverted yields hsl(oklch(...)) — invalid CSS, silently
// no color. Same failure mode as v4's fractional spacing classes on v3.

export function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab -> LMS -> linear sRGB
  const l3 = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ];

  // gamma encode, tracking whether we had to clamp an out-of-gamut channel
  let clamped = false;
  const rgb = linear.map((c) => {
    const enc = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    if (enc < -0.0001 || enc > 1.0001) clamped = true;
    return Math.min(1, Math.max(0, enc));
  });

  return { rgb, clamped };
}

export function rgbToHslTriplet([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }

  return `${+h.toFixed(2)} ${+(s * 100).toFixed(2)}% ${+(l * 100).toFixed(2)}%`;
}

export function toHex([r, g, b]) {
  return "#" + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
}

// Returns null for values that aren't oklch() — callers pass those through
// untouched (radius, font stacks, anything already in triplet form).
export function convertColor(value) {
  const m = String(value).match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([-\d.]+)/i);
  if (!m) return null;

  const { rgb, clamped } = oklchToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  return { triplet: rgbToHslTriplet(rgb), hex: toHex(rgb), clamped };
}
