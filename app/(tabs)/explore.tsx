import React from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { useSettings } from "@/components/SettingsContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useDebounce } from "@/hooks/useDebounce";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";

const DURATION_OPTIONS = [
  { label: "Hour", value: "hour" },
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

export default function SettingsScreen() {
  const { subreddits, setSubreddits, resizeToDevice, setResizeToDevice } =
    useSettings();

  // Persist subreddits to AsyncStorage
  React.useEffect(() => {
    AsyncStorage.setItem("user-subreddits", JSON.stringify(subreddits));
  }, [subreddits]);

  // Load subreddits from AsyncStorage on mount
  React.useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("user-subreddits");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setSubreddits(parsed);
        } catch {}
      }
    })();
  }, []);
  const [newSubreddit, setNewSubreddit] = React.useState("");
  // Remove old suggestions state (string[])
  const [showSuggestions, setShowSuggestions] = React.useState(false);
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
    const subreddit = (sub || newSubreddit).trim().replace(/^r\//, "");
    if (subreddit && !subreddits.includes(subreddit)) {
      if (subreddits.length >= 5) {
        alert("You can only add up to 5 subreddits.");
        return;
      }
      const updated = [...subreddits, subreddit];
      setSubreddits(updated);
      await AsyncStorage.setItem("user-subreddits", JSON.stringify(updated));
      setNewSubreddit("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  const removeSubreddit = async (sub: string) => {
    const updated = subreddits.filter((s) => s !== sub);
    setSubreddits(updated);
    await AsyncStorage.setItem("user-subreddits", JSON.stringify(updated));
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

      {/* Resolution download toggle only */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionHeader}>
          Wallpaper Resolution
        </ThemedText>
        <View style={styles.row}>
          <ThemedText>
            Resize/crop wallpapers to device resolution on download
          </ThemedText>
          <Switch
            value={resizeToDevice}
            onValueChange={setResizeToDevice}
            thumbColor={resizeToDevice ? "#0a7ea4" : "#eee"}
          />
        </View>
        <ThemedText style={styles.note}>
          (If enabled, downloaded images will be resized/cropped to fit your
          screen.)
        </ThemedText>
      </ThemedView>
      {/* Subreddit management */}
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
            }}
            placeholder="Add subreddit (e.g. earthporn)"
            style={styles.input}
            autoCapitalize="none"
            onSubmitEditing={() => addSubreddit()}
            returnKeyType="done"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            editable={subreddits.length < 5}
          />
          {/* Add button can be removed if not needed */}
          {(showSuggestions || newSubreddit.length > 1) &&
            suggestions.length > 0 && (
              <View style={styles.suggestionDropdown}>
                <ScrollView style={{ maxHeight: 220 }}>
                  {suggestions.map((sub: SubredditSuggestion) => (
                    <TouchableOpacity
                      key={sub.name}
                      style={styles.suggestionItem}
                      onPress={() => addSubreddit(sub.name)}
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
                        <View>
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
    zIndex: 100,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#444",
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  suggestionText: {
    color: "#fff",
    fontSize: 16,
  },
});
