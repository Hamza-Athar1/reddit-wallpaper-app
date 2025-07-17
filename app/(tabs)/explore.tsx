import React from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ColorSchemeSelector } from "@/components/ColorSchemeSelector";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useSettings } from "@/components/SettingsContext";
import { SettingsDebugPanel } from "@/components/SettingsDebugPanel";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeSettings } from "@/components/ThemeSettings";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useDebounce } from "@/hooks/useDebounce";
import { Image as ExpoImage } from "expo-image";

// Utility function to extract subreddit name from various URL formats
const extractSubredditFromUrl = (input: string): string => {
  const trimmed = input.trim();

  // Direct subreddit name (e.g., "earthporn" or "r/earthporn")
  if (!trimmed.includes("http") && !trimmed.includes("reddit.com")) {
    return trimmed.replace(/^r\//, "");
  }

  // Reddit URL patterns
  const urlPatterns = [
    // https://www.reddit.com/r/earthporn/
    /reddit\.com\/r\/([^\/\?#]+)/i,
    // https://old.reddit.com/r/earthporn
    /old\.reddit\.com\/r\/([^\/\?#]+)/i,
    // https://new.reddit.com/r/earthporn
    /new\.reddit\.com\/r\/([^\/\?#]+)/i,
    // Mobile URLs like https://m.reddit.com/r/earthporn
    /m\.reddit\.com\/r\/([^\/\?#]+)/i,
  ];

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If no pattern matches, return the original input (cleaned)
  return trimmed.replace(/^r\//, "");
};

const DURATION_OPTIONS = [
  { label: "Hour", value: "hour" },
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

export default function SettingsScreen() {
  const { subreddits, setSubreddits } = useSettings();

  // Remove the duplicate persistence effects since SettingsContext handles this
  const [newSubreddit, setNewSubreddit] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isUrlDetected, setIsUrlDetected] = React.useState(false);
  const debouncedSubreddit = useDebounce(newSubreddit, 300);

  // Fetch subreddit suggestions (improved: show similar names, allow click to add)
  type SubredditSuggestion = {
    name: string;
    title: string;
    icon: string | null;
    subscribers: number | null;
  };
  const [suggestions, setSuggestions] = React.useState<SubredditSuggestion[]>(
    []
  );

  React.useEffect(() => {
    let ignore = false;
    const fetchSuggestions = async () => {
      const query = debouncedSubreddit.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(
          `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(
            query
          )}&limit=8`
        );
        const json = await res.json();
        if (ignore) return;
        // Get display_name and title for better matching
        const subs: SubredditSuggestion[] = (json.data?.children || [])
          .map((c: any) => ({
            name: c.data.display_name,
            title: c.data.title,
            icon: c.data.icon_img || c.data.community_icon || null,
            subscribers:
              typeof c.data.subscribers === "number"
                ? c.data.subscribers
                : null,
          }))
          .filter(
            (sub: SubredditSuggestion) =>
              (sub.name.toLowerCase().includes(query.toLowerCase()) ||
                (sub.title &&
                  sub.title.toLowerCase().includes(query.toLowerCase()))) &&
              !subreddits.includes(sub.name)
          );
        setSuggestions(subs);
      } catch {
        if (!ignore) setSuggestions([]);
      }
    };
    fetchSuggestions();
    return () => {
      ignore = true;
    };
  }, [debouncedSubreddit, subreddits]);

  // Limit to 5 subreddits
  const addSubreddit = async (sub?: string) => {
    const rawInput = sub || newSubreddit;
    const subreddit = extractSubredditFromUrl(rawInput).trim();

    if (subreddit && !subreddits.includes(subreddit)) {
      if (subreddits.length >= 5) {
        alert("You can only add up to 5 subreddits.");
        return;
      }
      const updated = [...subreddits, subreddit];
      setSubreddits(updated); // SettingsContext will handle persistence
      setNewSubreddit("");
      setSuggestions([]);
      setShowSuggestions(false);
      setIsUrlDetected(false);
    } else if (subreddit && subreddits.includes(subreddit)) {
      alert(`r/${subreddit} is already in your list.`);
      setNewSubreddit("");
      setIsUrlDetected(false);
    }
  };

  const removeSubreddit = async (sub: string) => {
    const updated = subreddits.filter((s) => s !== sub);
    setSubreddits(updated); // SettingsContext will handle persistence
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Settings</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionHeader}>
          Appearance
        </ThemedText>
        <ThemeSettings />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionHeader}>
          Color Scheme
        </ThemedText>
        <ColorSchemeSelector />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionHeader}>
          Subreddits
        </ThemedText>
        <View
          style={[
            styles.row,
            { marginBottom: 8, position: "relative", zIndex: 101 },
          ]}
        >
          <TextInput
            value={newSubreddit}
            onChangeText={(text) => {
              setNewSubreddit(text);
              setShowSuggestions(true);

              // Check if input looks like a URL
              const isUrl =
                text.includes("reddit.com") || text.includes("http");
              setIsUrlDetected(isUrl);
            }}
            placeholder="Add subreddit (e.g. earthporn) or paste Reddit URL"
            style={[styles.input, isUrlDetected && styles.inputWithUrl]}
            autoCapitalize="none"
            onSubmitEditing={() => addSubreddit()}
            returnKeyType="done"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            editable={subreddits.length < 5}
            multiline={false}
            textContentType="URL"
          />

          {/* Show extracted subreddit name when URL is detected */}
          {isUrlDetected && newSubreddit.trim() && (
            <View style={styles.urlPreview}>
              <ThemedText style={styles.urlPreviewText}>
                📎 Will add: r/{extractSubredditFromUrl(newSubreddit)}
              </ThemedText>
            </View>
          )}

          {/* Helper text */}
          {subreddits.length < 5 && (
            <ThemedText style={styles.helperText}>
              💡 Tip: You can paste Reddit URLs like reddit.com/r/earthporn
            </ThemedText>
          )}

          {/* Suggestions dropdown */}
          {(showSuggestions || newSubreddit.length > 1) &&
            suggestions.length > 0 && (
              <View
                style={[
                  styles.suggestionDropdown,
                  {
                    maxHeight: Math.min(suggestions.length * 60, 240), // Dynamic height based on content
                    minHeight: 60,
                    bottom: undefined,
                    top: 44,
                  },
                ]}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingVertical: 4,
                    flexGrow: 1,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  bounces={false}
                  overScrollMode="never"
                  removeClippedSubviews={false}
                >
                  {suggestions.map((sub: SubredditSuggestion) => (
                    <TouchableOpacity
                      key={sub.name}
                      style={styles.suggestionItem}
                      onPress={() => addSubreddit(sub.name)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {sub.icon ? (
                          <ExpoImage
                            source={{ uri: sub.icon }}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: "#222",
                              marginRight: 6,
                            }}
                            contentFit="cover"
                          />
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.suggestionText}>
                            r/{sub.name}
                          </ThemedText>
                          {sub.title ? (
                            <ThemedText
                              style={{ color: "#aaa", fontSize: 12 }}
                              numberOfLines={1}
                            >
                              {sub.title}
                            </ThemedText>
                          ) : null}
                          {typeof sub.subscribers === "number" ? (
                            <ThemedText style={{ color: "#888", fontSize: 11 }}>
                              {sub.subscribers.toLocaleString()} subscribers
                            </ThemedText>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
        </View>
        <View style={styles.tagList}>
          {subreddits.length === 0 && (
            <ThemedText style={styles.note}>No subreddits added.</ThemedText>
          )}
          {subreddits.length >= 5 && (
            <ThemedText style={styles.note}>
              Maximum of 5 subreddits reached.
            </ThemedText>
          )}
          {subreddits.map((item) => (
            <View key={item} style={styles.tag}>
              <ThemedText style={styles.tagText}>r/{item}</ThemedText>
              <TouchableOpacity
                onPress={() => removeSubreddit(item)}
                style={styles.tagRemove}
                accessibilityLabel={`Remove subreddit ${item}`}
              >
                <ThemedText style={styles.tagRemoveText}>×</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ThemedView>

      {/* Debug panel to verify settings persistence */}
      <SettingsDebugPanel />

      {/* Duration selection removed: now only available on the home page */}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#23272e", // dark background
    overflow: "visible", // Allow dropdown to overflow
  },
  sectionHeader: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "bold",
    color: "#0a7ea4",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: "#181a20", // dark input
    color: "#fff",
  },
  inputWithUrl: {
    borderColor: "#0a7ea4",
    borderWidth: 2,
  },
  addButton: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#353b48", // dark tag
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    color: "#0a7ea4",
    fontWeight: "bold",
    marginRight: 4,
  },
  tagRemove: {
    marginLeft: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#c00",
  },
  tagRemoveText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    lineHeight: 16,
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  durationPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#353b48", // dark pill
    marginRight: 4,
    marginBottom: 4,
  },
  durationPillActive: {
    backgroundColor: "#0a7ea4",
  },
  note: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  suggestionDropdown: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: "#23272e", // dark dropdown
    borderRadius: 8,
    // boxShadow for web compatibility, replaces shadow* props
    boxShadow: "0px 4px 12px rgba(0,0,0,0.16)",
    elevation: 20, // much higher z-index
    zIndex: 1000, // Very high z-index to ensure it appears above everything
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#444",
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 60, // Ensure consistent item height
  },
  suggestionText: {
    color: "#fff",
    fontSize: 16,
  },
  urlPreview: {
    backgroundColor: "#2a3441",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#0a7ea4",
  },
  urlPreviewText: {
    fontSize: 12,
    color: "#0a7ea4",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    marginBottom: 8,
    fontStyle: "italic",
  },
});
