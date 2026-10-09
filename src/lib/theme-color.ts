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
