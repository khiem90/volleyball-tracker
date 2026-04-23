"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "tournament-tracker-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR-safe defaults — real values are loaded from localStorage in the mount effect.
  // A pre-hydration script in the root layout applies the correct class to <html> to prevent a flash.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const mountedRef = useRef(false);

  // Resolve theme based on setting
  const resolveTheme = useCallback((t: Theme): ResolvedTheme => {
    if (t === "system") return getSystemTheme();
    return t;
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    // Also set color-scheme for native elements
    root.style.colorScheme = resolved;
  }, []);

  // Load persisted theme and apply after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) || "system";
    const resolved = stored === "system" ? getSystemTheme() : stored;
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    mountedRef.current = true;
  }, [applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      const resolved = resolveTheme(newTheme);
      setThemeState(newTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
      localStorage.setItem(STORAGE_KEY, newTheme);
    },
    [resolveTheme, applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Prevent flash by not rendering until mounted
  // The CSS will handle the initial state via :root
  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
