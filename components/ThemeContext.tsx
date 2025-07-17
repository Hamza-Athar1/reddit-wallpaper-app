import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import {
  applyColorSchemeToTheme,
  useColorScheme as useColorSchemeManager,
} from "./ColorSchemeContext";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  header: string;

  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;

  // UI colors
  primary: string;
  accent: string;
  border: string;
  divider: string;

  // Status colors
  success: string;
  warning: string;
  error: string;

  // Interactive colors
  buttonBackground: string;
  buttonText: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;

  // Tag/pill colors
  tagBackground: string;
  tagText: string;
  tagActiveBackground: string;
  tagActiveText: string;
}

const lightTheme: ThemeColors = {
  background: "#ffffff",
  surface: "#f8f9fa",
  card: "#ffffff",
  header: "#f1f3f4",

  text: "#1a1a1a",
  textSecondary: "#666666",
  textMuted: "#999999",

  primary: "#0a7ea4",
  accent: "#0a7ea4",
  border: "#e0e0e0",
  divider: "#f0f0f0",

  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",

  buttonBackground: "#0a7ea4",
  buttonText: "#ffffff",
  inputBackground: "#f8f9fa",
  inputBorder: "#e0e0e0",
  inputText: "#1a1a1a",

  tagBackground: "#e8f4f8",
  tagText: "#0a7ea4",
  tagActiveBackground: "#0a7ea4",
  tagActiveText: "#ffffff",
};

const darkTheme: ThemeColors = {
  background: "#11151c",
  surface: "#1a1d23",
  card: "#23272e",
  header: "#2a2f36",

  text: "#ffffff",
  textSecondary: "#b0b0b0",
  textMuted: "#888888",

  primary: "#0a7ea4",
  accent: "#0a7ea4",
  border: "#404040",
  divider: "#333333",

  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",

  buttonBackground: "#0a7ea4",
  buttonText: "#ffffff",
  inputBackground: "#181a20",
  inputBorder: "#444444",
  inputText: "#ffffff",

  tagBackground: "#353b48",
  tagText: "#0a7ea4",
  tagActiveBackground: "#0a7ea4",
  tagActiveText: "#ffffff",
};

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Get the current color scheme from ColorSchemeContext (with fallback)
  let colorSchemeManager;
  try {
    colorSchemeManager = useColorSchemeManager();
  } catch {
    // Fallback for when ColorSchemeProvider is not available
    colorSchemeManager = {
      currentColorScheme: {
        id: "default",
        name: "default",
        displayName: "Default",
        primary: "#0a7ea4",
        accent: "#0a7ea4",
        isCustom: false,
      },
    };
  }

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("themeMode");
        if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      }
    };

    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Save theme preference
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem("themeMode", mode);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  // Determine current theme
  const isDark =
    themeMode === "dark" ||
    (themeMode === "system" && systemColorScheme === "dark");

  // Apply color scheme to base theme
  const baseTheme = isDark ? darkTheme : lightTheme;
  const theme = applyColorSchemeToTheme(
    baseTheme,
    colorSchemeManager.currentColorScheme
  );

  // Toggle between light and dark (doesn't affect system mode)
  const toggleTheme = () => {
    if (themeMode === "system") {
      setThemeMode(isDark ? "light" : "dark");
    } else {
      setThemeMode(themeMode === "light" ? "dark" : "light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
