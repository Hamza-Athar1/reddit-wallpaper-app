import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "./ThemeContext";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface ColorPickerProps {
  visible: boolean;
  currentColor: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  title?: string;
}

// Predefined color palette
const colorPalette = [
  // Blues
  "#0a7ea4",
  "#1976d2",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  // Purples
  "#8b5cf6",
  "#a855f7",
  "#9c27b0",
  "#673ab7",
  "#3f51b5",
  // Greens
  "#22c55e",
  "#16a34a",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  // Oranges & Reds
  "#f97316",
  "#ea580c",
  "#ff9800",
  "#ff5722",
  "#f44336",
  // Pinks
  "#ec4899",
  "#db2777",
  "#e91e63",
  "#ad1457",
  "#880e4f",
  // Teals & Cyans
  "#14b8a6",
  "#0d9488",
  "#009688",
  "#00acc1",
  "#0097a7",
  // Yellows
  "#fbbf24",
  "#f59e0b",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  // Grays
  "#6b7280",
  "#4b5563",
  "#374151",
  "#1f2937",
  "#111827",
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  visible,
  currentColor,
  onColorSelect,
  onClose,
  title = "Select Color",
}) => {
  const { theme } = useTheme();
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    onColorSelect(selectedColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <TouchableOpacity onPress={handleConfirm}>
            <ThemedText
              style={[styles.confirmButton, { color: theme.primary }]}
            >
              Done
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.selectedColorContainer}>
            <ThemedText style={styles.selectedColorLabel}>
              Selected Color
            </ThemedText>
            <View style={styles.selectedColorWrapper}>
              <View
                style={[
                  styles.selectedColorPreview,
                  { backgroundColor: selectedColor },
                ]}
              />
              <ThemedText style={styles.selectedColorCode}>
                {selectedColor.toUpperCase()}
              </ThemedText>
            </View>
          </View>

          <View style={styles.paletteContainer}>
            <ThemedText style={styles.paletteLabel}>Color Palette</ThemedText>
            <View style={styles.colorGrid}>
              {colorPalette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedSwatch,
                  ]}
                  onPress={() => handleColorSelect(color)}
                >
                  {selectedColor === color && (
                    <View style={styles.checkmark}>
                      <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.recentColorsContainer}>
            <ThemedText style={styles.recentColorsLabel}>
              Popular Choices
            </ThemedText>
            <View style={styles.recentColorsGrid}>
              {[
                "#0a7ea4", // Default blue
                "#1976d2", // Material blue
                "#8b5cf6", // Purple
                "#22c55e", // Green
                "#f97316", // Orange
                "#ec4899", // Pink
              ].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.recentColorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedSwatch,
                  ]}
                  onPress={() => handleColorSelect(color)}
                >
                  {selectedColor === color && (
                    <View style={styles.checkmark}>
                      <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  cancelButton: {
    fontSize: 16,
    color: "#666",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectedColorContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  selectedColorLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  selectedColorWrapper: {
    alignItems: "center",
    gap: 8,
  },
  selectedColorPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedColorCode: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  paletteContainer: {
    marginBottom: 32,
  },
  paletteLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSwatch: {
    borderColor: "#333",
    borderWidth: 3,
  },
  checkmark: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
  },
  recentColorsContainer: {
    marginBottom: 32,
  },
  recentColorsLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
  },
  recentColorsGrid: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  recentColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
