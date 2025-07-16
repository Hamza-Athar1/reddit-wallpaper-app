import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface SearchHistoryProps {
  onSearchSelect: (query: string) => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSearchSelect,
}) => {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem("search-history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  };

  const removeFromHistory = async (query: string) => {
    try {
      const newHistory = history.filter((h) => h !== query);
      setHistory(newHistory);
      await AsyncStorage.setItem("search-history", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to remove from history:", error);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem("search-history");
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  // Popular search suggestions
  const popularSearches = [
    "nature",
    "abstract",
    "space",
    "minimal",
    "dark",
    "anime",
    "gaming",
    "cars",
    "architecture",
    "landscape",
    "cityscape",
    "forest",
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {history.length > 0 && (
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Searches</ThemedText>
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
            </TouchableOpacity>
          </View>
          {history.map((query, index) => (
            <TouchableOpacity
              key={index}
              style={styles.historyItem}
              onPress={() => onSearchSelect(query)}
            >
              <Ionicons name="time-outline" size={16} color="#666" />
              <ThemedText style={styles.historyText}>{query}</ThemedText>
              <TouchableOpacity
                onPress={() => removeFromHistory(query)}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Popular Searches</ThemedText>
        <View style={styles.suggestionsGrid}>
          {popularSearches.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => onSearchSelect(suggestion)}
            >
              <ThemedText style={styles.suggestionText}>
                {suggestion}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Search Tips</ThemedText>
        <View style={styles.tipsContainer}>
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={16} color="#0a7ea4" />
            <ThemedText style={styles.tipText}>
              Use specific keywords like "mountain landscape" or "space nebula"
            </ThemedText>
          </View>
          <View style={styles.tip}>
            <Ionicons name="filter-outline" size={16} color="#0a7ea4" />
            <ThemedText style={styles.tipText}>
              Apply filters to narrow down results by resolution or aspect ratio
            </ThemedText>
          </View>
          <View style={styles.tip}>
            <Ionicons name="heart-outline" size={16} color="#0a7ea4" />
            <ThemedText style={styles.tipText}>
              Save your favorites to access them later from the Favorites tab
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    backgroundColor: "#23272e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0a7ea4",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#FF6B6B",
    borderRadius: 6,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#181a20",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  historyText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#fff",
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#353b48",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  suggestionText: {
    fontSize: 12,
    color: "#fff",
  },
  tipsContainer: {
    gap: 12,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#ccc",
    lineHeight: 18,
  },
});
