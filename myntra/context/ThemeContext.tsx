import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import React from "react";
import { useColorScheme, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Theme,
  ThemeMode,
  lightTheme,
  darkTheme,
  themes,
} from "@/constants/theme";

const STORAGE_KEY = "app_theme_mode";

// ─── Context Type ────────────────────────────────────────────────────────────

type ThemeContextType = {
  /** The fully resolved theme object (never "system" — always a concrete theme). */
  theme: Theme;
  /** The user's current preference ("system" | "light" | "dark" | "highContrast"). */
  themeMode: ThemeMode;
  /** Update the theme mode. Persists automatically. */
  setThemeMode: (mode: ThemeMode) => void;
  /** All available theme modes for building a picker. */
  availableModes: { id: ThemeMode; label: string }[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function readPersistedMode(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === "web") {
      return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? null;
    }
    return (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
  } catch {
    return null;
  }
}

async function persistMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_KEY, mode);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {
    // Silently ignore storage errors
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceScheme = useColorScheme(); // "light" | "dark" | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isHydrated, setIsHydrated] = useState(false);

  // On mount, read the persisted preference
  useEffect(() => {
    (async () => {
      const persisted = await readPersistedMode();
      if (persisted) {
        setThemeModeState(persisted);
      }
      setIsHydrated(true);
    })();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    persistMode(mode);
  }, []);

  // Resolve the concrete theme
  const theme: Theme = useMemo(() => {
    if (themeMode === "system") {
      return deviceScheme === "dark" ? darkTheme : lightTheme;
    }
    return themes[themeMode] ?? lightTheme;
  }, [themeMode, deviceScheme]);

  const availableModes: { id: ThemeMode; label: string }[] = useMemo(
    () => [
      { id: "system", label: "System Default" },
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark" },
      { id: "highContrast", label: "High Contrast" },
    ],
    []
  );

  // Don't render children until we've loaded the persisted preference
  // to avoid a flash of the wrong theme
  if (!isHydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, availableModes }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
