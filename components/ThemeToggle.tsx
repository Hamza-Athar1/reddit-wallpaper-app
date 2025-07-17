import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "./ThemeContext";
import { ThemedText } from "./ThemedText";

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
  style?: any;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
  size = "medium",
  style,
}) => {
  const { theme, themeMode, isDark, toggleTheme } = useTheme();

  const iconSize = size === "small" ? 20 : size === "large" ? 28 : 24;

  const getIcon = () => {
    switch (themeMode) {
      case "light":
        return "sunny-outline";
      case "dark":
        return "moon-outline";
      case "system":
        return isDark ? "phone-portrait-outline" : "phone-portrait-outline";
      default:
        return "sunny-outline";
    }
  };

  const getLabel = () => {
    switch (themeMode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "Auto";
      default:
        return "Light";
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
      onPress={toggleTheme}
      accessibilityLabel={`Switch to ${isDark ? "light" : "dark"} theme`}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Ionicons name={getIcon()} size={iconSize} color={theme.text} />
        {showLabel && (
          <ThemedText style={styles.label}>{getLabel()}</ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
