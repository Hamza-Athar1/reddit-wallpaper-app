import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme, type ThemeMode } from "./ThemeContext";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: string;
}

const themeOptions: ThemeOption[] = [
  {
    mode: "light",
    label: "Light",
    description: "Light mode",
    icon: "sunny-outline",
  },
  {
    mode: "dark",
    label: "Dark",
    description: "Dark mode",
    icon: "moon-outline",
  },
  {
    mode: "system",
    label: "System",
    description: "Follow system setting",
    icon: "phone-portrait-outline",
  },
];

export const ThemeSettings: React.FC = () => {
  const { theme, themeMode, setThemeMode } = useTheme();

  return (
    <ThemedView
      variant="card"
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <ThemedText
        type="subtitle"
        style={[styles.title, { color: theme.primary }]}
      >
        Theme
      </ThemedText>
      <ThemedText variant="secondary" style={styles.subtitle}>
        Choose your preferred theme
      </ThemedText>

      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.option,
              { borderColor: theme.border },
              themeMode === option.mode && {
                backgroundColor: theme.primary + "20",
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setThemeMode(option.mode)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${option.label} theme`}
          >
            <View style={styles.optionContent}>
              <Ionicons
                name={option.icon as any}
                size={24}
                color={themeMode === option.mode ? theme.primary : theme.text}
              />
              <View style={styles.optionText}>
                <ThemedText
                  style={[
                    styles.optionLabel,
                    themeMode === option.mode && { color: theme.primary },
                  ]}
                >
                  {option.label}
                </ThemedText>
                <ThemedText
                  variant="secondary"
                  style={styles.optionDescription}
                >
                  {option.description}
                </ThemedText>
              </View>
              {themeMode === option.mode && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.primary}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});
