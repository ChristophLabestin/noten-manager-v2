export type ThemeChoice = "default" | "feminine";

const THEME_KEY = "nm-theme";
const DARK_MODE_KEY = "nm-dark-mode";

export function applyTheme(theme: ThemeChoice, darkMode: boolean): void {
  if (typeof document === "undefined") return;

  const body = document.body;
  if (!body) return;

  body.classList.remove("theme-default", "theme-feminine", "dark-mode");

  const themeClass = theme === "feminine" ? "theme-feminine" : "theme-default";
  body.classList.add(themeClass);

  if (darkMode) {
    body.classList.add("dark-mode");
  }
}

export function saveThemeToStorage(
  theme: ThemeChoice,
  darkMode: boolean
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(THEME_KEY, theme);
  window.localStorage.setItem(DARK_MODE_KEY, darkMode ? "1" : "0");
}

export function loadThemeFromStorage(): {
  theme: ThemeChoice;
  darkMode: boolean;
} {
  if (typeof window === "undefined") {
    return { theme: "default", darkMode: false };
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  const storedDark = window.localStorage.getItem(DARK_MODE_KEY);

  const theme: ThemeChoice =
    storedTheme === "feminine" ? "feminine" : "default";
  const darkMode = storedDark === "1";

  return { theme, darkMode };
}

