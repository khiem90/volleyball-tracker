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

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored || "system";
}

function getInitialResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  const theme = getInitialTheme();
  if (theme === "system") return getSystemTheme();
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(getInitialResolvedTheme);
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

  // Apply theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme);
    mountedRef.current = true;
  }, [applyTheme, resolvedTheme]);

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
