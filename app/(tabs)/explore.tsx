import React from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ColorSchemeSelector } from "@/components/ColorSchemeSelector";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useSettings } from "@/components/SettingsContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemeSettings } from "@/components/ThemeSettings";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
  const [isLoading, setIsLoading] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-10)).current;

  // Animate suggestions in/out
  React.useEffect(() => {
    if (
      (showSuggestions || newSubreddit.length > 1) &&
      suggestions.length > 0
    ) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSuggestions, newSubreddit.length, suggestions.length]);

  React.useEffect(() => {
    let ignore = false;
    const fetchSuggestions = async () => {
      const query = debouncedSubreddit.trim();

      if (query.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Fallback popular subreddits for development
      const popularSubreddits = [
        { name: "earthporn", title: "Earth Porn", subscribers: 22000000 },
        { name: "spaceporn", title: "Space Porn", subscribers: 1500000 },
        { name: "cityporn", title: "City Porn", subscribers: 800000 },
        { name: "natureporn", title: "Nature Porn", subscribers: 600000 },
        { name: "wallpapers", title: "Wallpapers", subscribers: 1800000 },
        { name: "wallpaper", title: "Wallpaper", subscribers: 900000 },
        { name: "nature", title: "Nature", subscribers: 2000000 },
        { name: "pics", title: "Pictures and Images", subscribers: 29000000 },
        { name: "photographs", title: "Photographs", subscribers: 400000 },
        {
          name: "itookapicture",
          title: "I Took a Picture",
          subscribers: 3000000,
        },
        {
          name: "amoledbackgrounds",
          title: "AMOLED Backgrounds",
          subscribers: 1200000,
        },
        {
          name: "mobilewallpaper",
          title: "Mobile Wallpaper",
          subscribers: 300000,
        },
        { name: "art", title: "Art", subscribers: 22000000 },
        { name: "sunset", title: "Sunset", subscribers: 800000 },
        { name: "sunrise", title: "Sunrise", subscribers: 200000 },
      ];

      try {
        // Use CORS proxy for web development
        const baseUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(
          query
        )}&limit=6`;
        const url =
          Platform.OS === "web"
            ? `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`
            : baseUrl;

        const res = await fetch(url);

        if (ignore) return;

        if (res.ok) {
          const json = await res.json();
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
        } else {
          throw new Error("API request failed");
        }
      } catch (error) {
        // Fallback to popular subreddits on CORS/network error
        const fallbackSuggestions = popularSubreddits
          .filter(
            (sub) =>
              (sub.name.toLowerCase().includes(query.toLowerCase()) ||
                sub.title.toLowerCase().includes(query.toLowerCase())) &&
              !subreddits.includes(sub.name)
          )
          .slice(0, 6)
          .map((sub) => ({
            name: sub.name,
            title: sub.title,
            icon: null,
            subscribers: sub.subscribers,
          }));

        if (!ignore) setSuggestions(fallbackSuggestions);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    fetchSuggestions();
    return () => {
      ignore = true;
    };
  }, [debouncedSubreddit, subreddits]);

  // Enhanced function to handle adding subreddits with animation
  const handleAddSubreddit = async (sub?: string) => {
    const rawInput = sub || newSubreddit;
    const subreddit = extractSubredditFromUrl(rawInput).trim();

    if (subreddit && !subreddits.includes(subreddit)) {
      if (subreddits.length >= 5) {
        alert("You can only add up to 5 subreddits.");
        return;
      }

      // Animate out the suggestions first
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Then update the state
        const updated = [...subreddits, subreddit];
        setSubreddits(updated); // SettingsContext will handle persistence
        setNewSubreddit("");
        setSuggestions([]);
        setShowSuggestions(false);
        setIsUrlDetected(false);
      });
    } else if (subreddit && subreddits.includes(subreddit)) {
      alert(`r/${subreddit} is already in your list.`);
      setNewSubreddit("");
      setIsUrlDetected(false);
    }
  };

  // Legacy function for backward compatibility
  const addSubreddit = handleAddSubreddit;

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
        <View style={styles.inputContainer}>
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
            placeholderTextColor="#888"
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
            (suggestions.length > 0 || isLoading) && (
              <Animated.View
                style={[
                  styles.suggestionDropdown,
                  {
                    maxHeight: 300, // Reduced max height for better mobile experience
                    minHeight: 80,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: isDark ? "#333" : "#e0e0e0",
                  },
                ]}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingVertical: 4,
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true} // Enable scroll indicator for Android
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  bounces={Platform.OS === "ios"} // Only enable bounces on iOS
                  overScrollMode={
                    Platform.OS === "android" ? "always" : "never"
                  } // Enable overscroll on Android
                  removeClippedSubviews={false}
                  scrollEventThrottle={16} // Improve scroll performance
                  directionalLockEnabled={true} // Lock scroll direction
                >
                  {isLoading ? (
                    <View
                      style={{
                        padding: 20,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        style={{
                          color: isDark ? "#888" : "#666",
                          fontSize: 14,
                          fontStyle: "italic",
                        }}
                      >
                        Searching...
                      </ThemedText>
                    </View>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((sub: SubredditSuggestion, index) => (
                      <TouchableOpacity
                        key={sub.name}
                        style={[
                          styles.suggestionItem,
                          {
                            borderBottomWidth:
                              index < suggestions.length - 1 ? 1 : 0,
                            borderBottomColor: isDark ? "#333" : "#f0f0f0",
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                          },
                        ]}
                        onPress={() => handleAddSubreddit(sub.name)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <View
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            {sub.icon ? (
                              <ExpoImage
                                source={{ uri: sub.icon }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: isDark ? "#333" : "#f0f0f0",
                                }}
                                contentFit="cover"
                              />
                            ) : (
                              <View
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: isDark ? "#333" : "#f0f0f0",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ThemedText
                                  style={{ fontSize: 14, fontWeight: "600" }}
                                >
                                  r/
                                </ThemedText>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <ThemedText
                                style={[
                                  styles.suggestionText,
                                  {
                                    fontSize: 16,
                                    fontWeight: "600",
                                    marginBottom: 2,
                                  },
                                ]}
                              >
                                r/{sub.name}
                              </ThemedText>
                              {sub.title ? (
                                <ThemedText
                                  style={{
                                    color: isDark ? "#ccc" : "#666",
                                    fontSize: 13,
                                    marginBottom: 2,
                                  }}
                                  numberOfLines={1}
                                >
                                  {sub.title}
                                </ThemedText>
                              ) : null}
                              {typeof sub.subscribers === "number" ? (
                                <ThemedText
                                  style={{
                                    color: isDark ? "#888" : "#999",
                                    fontSize: 12,
                                  }}
                                >
                                  {sub.subscribers.toLocaleString()} members
                                </ThemedText>
                              ) : null}
                            </View>
                          </View>
                          <View
                            style={{
                              backgroundColor: isDark ? "#333" : "#f5f5f5",
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                            }}
                          >
                            <ThemedText
                              style={{
                                color: isDark ? "#ccc" : "#666",
                                fontSize: 12,
                                fontWeight: "500",
                              }}
                            >
                              Add
                            </ThemedText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View
                      style={{
                        padding: 20,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ThemedText
                        style={{
                          color: isDark ? "#888" : "#666",
                          fontSize: 14,
                          fontStyle: "italic",
                        }}
                      >
                        No subreddits found
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
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
    position: "relative", // Ensure proper stacking context
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
  inputContainer: {
    position: "relative",
    marginBottom: 16,
    zIndex: 1000,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 44,
    backgroundColor: "#181a20", // dark input
    color: "#fff",
    fontSize: 16,
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
    top: 48, // Position below the input (44px height + 4px margin)
    left: 0,
    right: 0,
    backgroundColor: "#181a20", // Match input background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    borderTopWidth: 0, // Remove top border to connect with input
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    elevation: 10,
    zIndex: 1001,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "transparent",
    minHeight: 56,
  },
  suggestionText: {
    color: "#fff",
    fontSize: 16,
  },
  urlPreview: {
    backgroundColor: "#2a3441",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0a7ea4",
  },
  urlPreviewText: {
    fontSize: 13,
    color: "#0a7ea4",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
