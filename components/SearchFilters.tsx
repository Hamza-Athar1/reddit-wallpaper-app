import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSettings } from "./SettingsContext";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

type SearchFiltersType = {
  subreddit?: string;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: "square" | "landscape" | "portrait" | "any";
};

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  isSmallScreen: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  isSmallScreen,
}) => {
  const { subreddits } = useSettings();

  const aspectRatioOptions = [
    { label: "Any", value: "any" },
    { label: "Square", value: "square" },
    { label: "Landscape", value: "landscape" },
    { label: "Portrait", value: "portrait" },
  ];

  return (
    <ThemedView
      style={[styles.container, isSmallScreen && styles.containerSmall]}
    >
      {/* Subreddit Filter */}
      <View style={styles.filterGroup}>
        <ThemedText style={styles.filterLabel}>Subreddit</ThemedText>
        <View style={styles.subredditOptions}>
          <TouchableOpacity
            style={[
              styles.subredditButton,
              !filters.subreddit && styles.subredditButtonActive,
            ]}
            onPress={() =>
              onFiltersChange({ ...filters, subreddit: undefined })
            }
          >
            <ThemedText
              style={[
                styles.subredditButtonText,
                !filters.subreddit && styles.subredditButtonTextActive,
              ]}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          {subreddits?.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.subredditButton,
                filters.subreddit === sub && styles.subredditButtonActive,
              ]}
              onPress={() => onFiltersChange({ ...filters, subreddit: sub })}
            >
              <ThemedText
                style={[
                  styles.subredditButtonText,
                  filters.subreddit === sub && styles.subredditButtonTextActive,
                ]}
              >
                r/{sub}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dimension Filter */}
      <View style={styles.filterGroup}>
        <ThemedText style={styles.filterLabel}>Minimum Resolution</ThemedText>
        <View style={styles.dimensionInputs}>
          <TextInput
            style={styles.dimensionInput}
            placeholder="Width"
            placeholderTextColor="#888"
            value={filters.minWidth?.toString() || ""}
            onChangeText={(text) =>
              onFiltersChange({
                ...filters,
                minWidth: text ? parseInt(text) || undefined : undefined,
              })
            }
            keyboardType="numeric"
          />
          <ThemedText style={styles.dimensionSeparator}>×</ThemedText>
          <TextInput
            style={styles.dimensionInput}
            placeholder="Height"
            placeholderTextColor="#888"
            value={filters.minHeight?.toString() || ""}
            onChangeText={(text) =>
              onFiltersChange({
                ...filters,
                minHeight: text ? parseInt(text) || undefined : undefined,
              })
            }
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Aspect Ratio Filter */}
      <View style={styles.filterGroup}>
        <ThemedText style={styles.filterLabel}>Aspect Ratio</ThemedText>
        <View style={styles.aspectRatioButtons}>
          {aspectRatioOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.aspectRatioButton,
                (filters.aspectRatio === option.value ||
                  (!filters.aspectRatio && option.value === "any")) &&
                  styles.aspectRatioButtonActive,
              ]}
              onPress={() =>
                onFiltersChange({
                  ...filters,
                  aspectRatio:
                    option.value === "any" ? undefined : (option.value as any),
                })
              }
            >
              <ThemedText
                style={[
                  styles.aspectRatioButtonText,
                  (filters.aspectRatio === option.value ||
                    (!filters.aspectRatio && option.value === "any")) &&
                    styles.aspectRatioButtonTextActive,
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Clear Filters */}
      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => onFiltersChange({})}
      >
        <ThemedText style={styles.clearButtonText}>
          Clear All Filters
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#23272e",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
  },
  containerSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0a7ea4",
    marginBottom: 8,
  },
  subredditOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subredditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#353b48",
    borderWidth: 1,
    borderColor: "#444",
  },
  subredditButtonActive: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  subredditButtonText: {
    fontSize: 12,
    color: "#fff",
  },
  subredditButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  dimensionInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dimensionInput: {
    flex: 1,
    backgroundColor: "#181a20",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 14,
  },
  dimensionSeparator: {
    color: "#888",
    fontSize: 16,
    fontWeight: "bold",
  },
  aspectRatioButtons: {
    flexDirection: "row",
    gap: 8,
  },
  aspectRatioButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#353b48",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
  },
  aspectRatioButtonActive: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  aspectRatioButtonText: {
    fontSize: 12,
    color: "#fff",
  },
  aspectRatioButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
