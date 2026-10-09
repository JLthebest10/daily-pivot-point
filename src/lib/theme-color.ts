/**
 * User-chosen primary color. `null` means the factory green defined in styles.css
 * (light: oklch(0.46 0.062 152), dark: oklch(0.78 0.09 152)) — restored by removing overrides.
 */
const KEY = "lifehub-primary";
const VARS = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring"];
const FG_VARS = ["--primary-foreground", "--sidebar-primary-foreground"];

export function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Readable text color on top of the given hex (WCAG relative luminance). */
export function foregroundFor(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  return L > 0.4 ? "oklch(0.2 0.02 150)" : "oklch(0.985 0.005 120)";
}

export function applyPrimaryColor(hex: string | null | undefined) {
  if (typeof document === "undefined") return;
  const s = document.documentElement.style;
  if (!hex || !isValidHex(hex)) {
    [...VARS, ...FG_VARS].forEach((v) => s.removeProperty(v));
    return;
  }
  VARS.forEach((v) => s.setProperty(v, hex));
  const fg = foregroundFor(hex);
  FG_VARS.forEach((v) => s.setProperty(v, fg));
}

export function cachePrimaryColor(hex: string | null) {
  try {
    if (hex) localStorage.setItem(KEY, hex);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function cachedPrimaryColor(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/* ---------------- Background color (independent from primary) ---------------- */
const BG_KEY = "lifehub-background";
const BG_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground", "--accent-foreground",
  "--border", "--input", "--sidebar", "--sidebar-foreground", "--sidebar-accent",
  "--sidebar-accent-foreground", "--sidebar-border", "--accent",
];

export function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** Derived surface palette for a background hex; keeps cards/fields distinguishable. */
export function backgroundPalette(hex: string): Record<string, string> {
  const dark = luminance(hex) < 0.18;
  const mix = (to: string, p: number) => `color-mix(in oklch, ${hex}, ${to} ${p}%)`;
  const fg = dark ? "oklch(0.96 0.005 110)" : "oklch(0.22 0.012 145)";
  const mutedFg = dark ? "oklch(0.96 0.005 110 / 0.65)" : "oklch(0.22 0.012 145 / 0.62)";
  const card = dark ? mix("white", 6) : mix("white", 65);
  return {
    "--background": hex,
    "--foreground": fg,
    "--card": card,
    "--card-foreground": fg,
    "--popover": card,
    "--popover-foreground": fg,
    "--secondary": dark ? mix("white", 10) : mix("black", 5),
    "--secondary-foreground": fg,
    "--muted": dark ? mix("white", 9) : mix("black", 4),
    "--muted-foreground": mutedFg,
    "--accent": dark ? mix("white", 12) : mix("black", 7),
    "--accent-foreground": fg,
    "--border": dark ? "oklch(1 0 0 / 11%)" : "oklch(0 0 0 / 9%)",
    "--input": dark ? "oklch(1 0 0 / 15%)" : "oklch(0 0 0 / 12%)",
    "--sidebar": dark ? mix("white", 3) : mix("black", 2),
    "--sidebar-foreground": fg,
    "--sidebar-accent": dark ? mix("white", 10) : mix("black", 6),
    "--sidebar-accent-foreground": fg,
    "--sidebar-border": dark ? "oklch(1 0 0 / 11%)" : "oklch(0 0 0 / 9%)",
  };
}

export function applyBackgroundColor(hex: string | null | undefined) {
  if (typeof document === "undefined") return;
  const s = document.documentElement.style;
  if (!hex || !isValidHex(hex)) {
    BG_VARS.forEach((v) => s.removeProperty(v));
    return;
  }
  Object.entries(backgroundPalette(hex)).forEach(([k, v]) => s.setProperty(k, v));
}

export function cacheBackgroundColor(hex: string | null) {
  try {
    if (hex) localStorage.setItem(BG_KEY, hex);
    else localStorage.removeItem(BG_KEY);
  } catch {
    /* ignore */
  }
}

export function cachedBackgroundColor(): string | null {
  try {
    return localStorage.getItem(BG_KEY);
  } catch {
    return null;
  }
}
