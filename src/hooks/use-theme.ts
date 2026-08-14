import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("lifehub-theme") as Theme | null) ?? "system";
    setThemeState(stored);
    apply(stored);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem("lifehub-theme", next);
    apply(next);
  }, []);

  return { theme, setTheme };
}
