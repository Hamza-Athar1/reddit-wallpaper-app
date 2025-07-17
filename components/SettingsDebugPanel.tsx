import React from "react";
import { StyleSheet, View } from "react-native";
import { useColorScheme } from "./ColorSchemeContext";
import { useSettings } from "./SettingsContext";
import { useTheme } from "./ThemeContext";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export const SettingsDebugPanel: React.FC = () => {
  const { theme, themeMode, isDark } = useTheme();
  const { currentColorScheme, customColorSchemes, isLoaded } = useColorScheme();
  const { subreddits, duration } = useSettings();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Settings Debug Panel
      </ThemedText>

      <View style={styles.section}>
        <ThemedText variant="secondary" style={styles.sectionTitle}>
          Theme Settings
        </ThemedText>
        <ThemedText style={styles.item}>
          Mode: {themeMode} (isDark: {isDark.toString()})
        </ThemedText>
        <ThemedText style={styles.item}>
          Primary Color: {theme.primary}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText variant="secondary" style={styles.sectionTitle}>
          Color Scheme Settings
        </ThemedText>
        <ThemedText style={styles.item}>
          Loaded: {isLoaded.toString()}
        </ThemedText>
        <ThemedText style={styles.item}>
          Current: {currentColorScheme.displayName} ({currentColorScheme.id})
        </ThemedText>
        <ThemedText style={styles.item}>
          Custom Schemes: {customColorSchemes.length}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText variant="secondary" style={styles.sectionTitle}>
          App Settings
        </ThemedText>
        <ThemedText style={styles.item}>
          Subreddits: {subreddits.join(", ") || "None"}
        </ThemedText>
        <ThemedText style={styles.item}>Duration: {duration}</ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  item: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: "monospace",
  },
});
