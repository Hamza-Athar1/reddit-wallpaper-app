import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeColors } from "./ThemeContext";

export interface ColorScheme {
  id: string;
  name: string;
  displayName: string;
  primary: string;
  accent: string;
  isCustom: boolean;
  colors?: Partial<ThemeColors>;
}

// Preset color schemes
export const presetColorSchemes: ColorScheme[] = [
  {
    id: "default",
    name: "default",
    displayName: "Default Blue",
    primary: "#0a7ea4",
    accent: "#0a7ea4",
    isCustom: false,
  },
  {
    id: "material_design",
    name: "material_design",
    displayName: "Material Design",
    primary: "#1976d2",
    accent: "#03dac6",
    isCustom: false,
  },
  {
    id: "ios_style",
    name: "ios_style",
    displayName: "iOS Style",
    primary: "#007aff",
    accent: "#ff9500",
    isCustom: false,
  },
  {
    id: "purple_theme",
    name: "purple_theme",
    displayName: "Purple Theme",
    primary: "#8b5cf6",
    accent: "#a855f7",
    isCustom: false,
  },
  {
    id: "green_theme",
    name: "green_theme",
    displayName: "Green Theme",
    primary: "#22c55e",
    accent: "#16a34a",
    isCustom: false,
  },
  {
    id: "orange_theme",
    name: "orange_theme",
    displayName: "Orange Theme",
    primary: "#f97316",
    accent: "#ea580c",
    isCustom: false,
  },
  {
    id: "pink_theme",
    name: "pink_theme",
    displayName: "Pink Theme",
    primary: "#ec4899",
    accent: "#db2777",
    isCustom: false,
  },
  {
    id: "teal_theme",
    name: "teal_theme",
    displayName: "Teal Theme",
    primary: "#14b8a6",
    accent: "#0d9488",
    isCustom: false,
  },
];

interface ColorSchemeContextType {
  currentColorScheme: ColorScheme;
  customColorSchemes: ColorScheme[];
  isLoaded: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  addCustomColorScheme: (scheme: Omit<ColorScheme, "id">) => void;
  deleteCustomColorScheme: (id: string) => void;
  updateCustomColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(
  undefined
);

export const ColorSchemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentColorScheme, setCurrentColorSchemeState] =
    useState<ColorScheme>(presetColorSchemes[0]);
  const [customColorSchemes, setCustomColorSchemes] = useState<ColorScheme[]>(
    []
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved color scheme and custom schemes
  useEffect(() => {
    const loadColorSchemeData = async () => {
      try {
        // Load custom color schemes first
        const savedCustomSchemes = await AsyncStorage.getItem(
          "customColorSchemes"
        );
        let customSchemes: ColorScheme[] = [];
        if (savedCustomSchemes) {
          customSchemes = JSON.parse(savedCustomSchemes);
          setCustomColorSchemes(customSchemes);
        }

        // Load current color scheme
        const savedSchemeId = await AsyncStorage.getItem("currentColorScheme");
        if (savedSchemeId) {
          const allSchemes = [...presetColorSchemes, ...customSchemes];
          const foundScheme = allSchemes.find((s) => s.id === savedSchemeId);
          if (foundScheme) {
            setCurrentColorSchemeState(foundScheme);
          }
        }

        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load color scheme data:", error);
        setIsLoaded(true);
      }
    };

    loadColorSchemeData();
  }, []);

  // Save current color scheme when it changes (but not on initial load)
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load

    const saveCurrentColorScheme = async () => {
      try {
        await AsyncStorage.setItem("currentColorScheme", currentColorScheme.id);
      } catch (error) {
        console.error("Failed to save current color scheme:", error);
      }
    };

    saveCurrentColorScheme();
  }, [currentColorScheme, isLoaded]);

  // Save custom color schemes when they change (but not on initial load)
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load

    const saveCustomColorSchemes = async () => {
      try {
        await AsyncStorage.setItem(
          "customColorSchemes",
          JSON.stringify(customColorSchemes)
        );
      } catch (error) {
        console.error("Failed to save custom color schemes:", error);
      }
    };

    saveCustomColorSchemes();
  }, [customColorSchemes, isLoaded]);

  const setColorScheme = (scheme: ColorScheme) => {
    setCurrentColorSchemeState(scheme);
  };

  const addCustomColorScheme = (scheme: Omit<ColorScheme, "id">) => {
    const newScheme: ColorScheme = {
      ...scheme,
      id: `custom_${Date.now()}`,
      isCustom: true,
    };
    setCustomColorSchemes((prev) => [...prev, newScheme]);
  };

  const deleteCustomColorScheme = (id: string) => {
    setCustomColorSchemes((prev) => prev.filter((s) => s.id !== id));
    // If the deleted scheme was current, switch to default
    if (currentColorScheme.id === id) {
      setCurrentColorSchemeState(presetColorSchemes[0]);
    }
  };

  const updateCustomColorScheme = (scheme: ColorScheme) => {
    setCustomColorSchemes((prev) =>
      prev.map((s) => (s.id === scheme.id ? scheme : s))
    );
    // If the updated scheme is current, update it
    if (currentColorScheme.id === scheme.id) {
      setCurrentColorSchemeState(scheme);
    }
  };

  return (
    <ColorSchemeContext.Provider
      value={{
        currentColorScheme,
        customColorSchemes,
        isLoaded,
        setColorScheme,
        addCustomColorScheme,
        deleteCustomColorScheme,
        updateCustomColorScheme,
      }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
};

export const useColorScheme = (): ColorSchemeContextType => {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context;
};

// Helper function to apply color scheme to theme
export const applyColorSchemeToTheme = (
  baseTheme: ThemeColors,
  colorScheme: ColorScheme
): ThemeColors => {
  return {
    ...baseTheme,
    primary: colorScheme.primary,
    accent: colorScheme.accent,
    buttonBackground: colorScheme.primary,
    tagActiveBackground: colorScheme.primary,
    tagText: colorScheme.primary,
    ...colorScheme.colors,
  };
};
