import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ColorPicker } from "./ColorPicker";
import {
  ColorScheme,
  presetColorSchemes,
  useColorScheme,
} from "./ColorSchemeContext";
import { useTheme } from "./ThemeContext";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export const ColorSchemeSelector: React.FC = () => {
  const { theme } = useTheme();
  const {
    currentColorScheme,
    customColorSchemes,
    setColorScheme,
    addCustomColorScheme,
    deleteCustomColorScheme,
  } = useColorScheme();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPrimaryColorPicker, setShowPrimaryColorPicker] = useState(false);
  const [showAccentColorPicker, setShowAccentColorPicker] = useState(false);
  const [customSchemeName, setCustomSchemeName] = useState("");
  const [customPrimaryColor, setCustomPrimaryColor] = useState("#0a7ea4");
  const [customAccentColor, setCustomAccentColor] = useState("#0a7ea4");

  const allColorSchemes = [...presetColorSchemes, ...customColorSchemes];

  const handleAddCustomScheme = () => {
    if (!customSchemeName.trim()) {
      Alert.alert("Error", "Please enter a name for your color scheme");
      return;
    }

    const newScheme: Omit<ColorScheme, "id"> = {
      name: customSchemeName.toLowerCase().replace(/\s+/g, "_"),
      displayName: customSchemeName,
      primary: customPrimaryColor,
      accent: customAccentColor,
      isCustom: true,
    };

    addCustomColorScheme(newScheme);
    setShowColorPicker(false);
    setCustomSchemeName("");
    setCustomPrimaryColor("#0a7ea4");
    setCustomAccentColor("#0a7ea4");
  };

  const handleDeleteCustomScheme = (scheme: ColorScheme) => {
    Alert.alert(
      "Delete Color Scheme",
      `Are you sure you want to delete "${scheme.displayName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomColorScheme(scheme.id),
        },
      ]
    );
  };

  const ColorPreview: React.FC<{
    scheme: ColorScheme;
    isSelected: boolean;
  }> = ({ scheme, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.colorSchemeCard,
        {
          backgroundColor: theme.card,
          borderColor: isSelected ? scheme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={() => setColorScheme(scheme)}
    >
      <View style={styles.colorPreviewContainer}>
        <View
          style={[
            styles.colorPreviewCircle,
            { backgroundColor: scheme.primary },
          ]}
        />
        <View
          style={[
            styles.colorPreviewCircle,
            styles.colorPreviewAccent,
            { backgroundColor: scheme.accent },
          ]}
        />
      </View>

      <ThemedText style={styles.colorSchemeName}>
        {scheme.displayName}
      </ThemedText>

      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={scheme.primary}
          style={styles.selectedIcon}
        />
      )}

      {scheme.isCustom && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCustomScheme(scheme)}
        >
          <Ionicons name="trash-outline" size={16} color={theme.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const ColorPickerInput: React.FC<{
    label: string;
    value: string;
    onPress: () => void;
  }> = ({ label, value, onPress }) => (
    <View style={styles.colorInputContainer}>
      <ThemedText style={styles.colorInputLabel}>{label}</ThemedText>
      <TouchableOpacity style={styles.colorInputButton} onPress={onPress}>
        <View style={[styles.colorInputPreview, { backgroundColor: value }]} />
        <ThemedText style={styles.colorInputText}>
          {value.toUpperCase()}
        </ThemedText>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ThemedText variant="secondary" style={styles.description}>
        Choose from preset themes or create your own custom color scheme
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorSchemeList}
        contentContainerStyle={styles.colorSchemeListContent}
      >
        {allColorSchemes.map((scheme) => (
          <ColorPreview
            key={scheme.id}
            scheme={scheme}
            isSelected={currentColorScheme.id === scheme.id}
          />
        ))}

        <TouchableOpacity
          style={[
            styles.addCustomButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setShowColorPicker(true)}
        >
          <Ionicons name="add" size={24} color={theme.primary} />
          <ThemedText variant="secondary" style={styles.addCustomText}>
            Custom
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowColorPicker(false)}>
              <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText type="title" style={styles.modalTitle}>
              Create Custom Theme
            </ThemedText>
            <TouchableOpacity onPress={handleAddCustomScheme}>
              <ThemedText style={[styles.modalSave, { color: theme.primary }]}>
                Save
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.nameInputContainer}>
              <ThemedText style={styles.inputLabel}>Theme Name</ThemedText>
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.inputBorder,
                    color: theme.inputText,
                  },
                ]}
                value={customSchemeName}
                onChangeText={setCustomSchemeName}
                placeholder="Enter theme name"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <ColorPickerInput
              label="Primary Color"
              value={customPrimaryColor}
              onPress={() => setShowPrimaryColorPicker(true)}
            />

            <ColorPickerInput
              label="Accent Color"
              value={customAccentColor}
              onPress={() => setShowAccentColorPicker(true)}
            />

            <View style={styles.previewContainer}>
              <ThemedText style={styles.previewLabel}>Preview</ThemedText>
              <View style={styles.previewCard}>
                <View
                  style={[
                    styles.previewPrimary,
                    { backgroundColor: customPrimaryColor },
                  ]}
                />
                <View
                  style={[
                    styles.previewAccent,
                    { backgroundColor: customAccentColor },
                  ]}
                />
                <ThemedText style={styles.previewText}>
                  {customSchemeName || "Custom Theme"}
                </ThemedText>
              </View>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Color Picker Modals */}
      <ColorPicker
        visible={showPrimaryColorPicker}
        currentColor={customPrimaryColor}
        onColorSelect={setCustomPrimaryColor}
        onClose={() => setShowPrimaryColorPicker(false)}
        title="Primary Color"
      />

      <ColorPicker
        visible={showAccentColorPicker}
        currentColor={customAccentColor}
        onColorSelect={setCustomAccentColor}
        onClose={() => setShowAccentColorPicker(false)}
        title="Accent Color"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  colorSchemeList: {
    marginVertical: 8,
  },
  colorSchemeListContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  colorSchemeCard: {
    width: 80,
    height: 100,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  colorPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  colorPreviewCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  colorPreviewAccent: {
    marginLeft: -8,
    borderWidth: 2,
    borderColor: "white",
  },
  colorSchemeName: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  selectedIcon: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    left: 4,
    padding: 2,
  },
  addCustomButton: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addCustomText: {
    fontSize: 11,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalCancel: {
    fontSize: 16,
    color: "#666",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSave: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  nameInputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  colorInputContainer: {
    marginBottom: 24,
  },
  colorInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  colorInputButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  colorInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorInputPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  colorInputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "500",
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "monospace",
  },
  previewContainer: {
    marginTop: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  previewPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  previewAccent: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  previewText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
