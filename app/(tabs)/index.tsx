// If you see a module error, run: npm install @react-native-picker/picker
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
// @ts-ignore
import { useSettings } from "@/components/SettingsContext";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { useEffect as useLocalEffect, useState as useLocalState } from "react";
import { Share } from "react-native";
import {
  loadFavorites,
  saveFavorites,
} from "../../components/favorites-storage";
import { fetchExtendedWallpapers } from "../../scripts/redditfetch.js";

const IMAGE_MARGIN = 14; // Increased gap
const IMAGE_HEIGHT_RATIO = 0.55; // Slightly shorter images
const SCREEN_WIDTH = Dimensions.get("window").width;

const DURATION_OPTIONS = [
  { label: "Hour", value: "hour" },
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
  { label: "All", value: "all" },
];

export default function HomeScreen() {
  const window = useWindowDimensions();
  const { subreddits, duration, setDuration } = useSettings();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalState<string[]>([]);

  // Load favorites from persistent storage on mount
  useLocalEffect(() => {
    (async () => {
      const favs = await loadFavorites();
      setFavorites(favs);
    })();
  }, []);

  // Save favorites to persistent storage when changed
  useLocalEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);
  const [afterMap, setAfterMap] = useState<Record<string, string | null>>({});
  // Responsive columns: 1 column for small screens, 2 for larger
  const numColumns = window.width < 500 ? 1 : 2;
  const IMAGE_WIDTH = Math.floor(
    (window.width - IMAGE_MARGIN * (numColumns + 1)) / numColumns
  );

  // Fetch images from all subreddits and all time ranges (multi-subreddit, multi-time, with afterMap)
  const fetchAll = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const settings = await import("../../components/settings-storage");
      const loaded = await settings.loadSettings();
      const srList =
        Array.isArray(loaded.subreddits) && loaded.subreddits.length > 0
          ? loaded.subreddits
          : subreddits;
      const timeRanges = [duration];
      const { images: fetchedImages, after: newAfterMap } =
        await fetchExtendedWallpapers({
          subreddits: srList,
          timeRanges,
          postType: "top",
          limit: 50,
          after: reset ? {} : afterMap,
        });
      setImages(fetchedImages);
      setAfterMap(newAfterMap);
    } catch (e) {
      setError("Failed to load images.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and on duration/subreddits change
  useEffect(() => {
    fetchAll(true);
    // eslint-disable-next-line
  }, [duration, subreddits.join(",")]);

  // Load more images (pagination, multi-subreddit, multi-time)
  const loadMore = async () => {
    if (loadingMore) return;
    if (Object.values(afterMap).every((v) => v == null)) return;
    setLoadingMore(true);
    try {
      const settings = await import("../../components/settings-storage");
      const loaded = await settings.loadSettings();
      const srList =
        Array.isArray(loaded.subreddits) && loaded.subreddits.length > 0
          ? loaded.subreddits
          : subreddits;
      const timeRanges = [duration];
      const { images: newImages, after: newAfterMap } =
        await fetchExtendedWallpapers({
          subreddits: srList,
          timeRanges,
          postType: "top",
          limit: 50,
          after: afterMap,
        });
      setImages((prev) => {
        const ids = new Set(prev.map((i: any) => i.id));
        return [...prev, ...newImages.filter((i: any) => !ids.has(i.id))];
      });
      setAfterMap(newAfterMap);
    } catch (e) {
      // Optionally show error
    } finally {
      setLoadingMore(false);
    }
  };

  // Download image to device
  const handleDownload = async (url: string, id: string) => {
    try {
      const filename = url.split("/").pop()?.split("?")[0] || `${id}.jpg`;
      const fileUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") throw new Error("Permission denied");
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync("Reddit Wallpapers", asset, false);
      alert("Image saved to your Photos!");
    } catch (e) {
      alert("Failed to save image: " + e);
    }
  };

  // Share image
  const handleShare = async (url: string) => {
    try {
      await Share.share({ url });
    } catch (e) {
      alert("Failed to share: " + e);
    }
  };

  // Toggle favorite
  const handleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Reddit Wallpapers</ThemedText>
      </ThemedView>
      {/* Duration filter as dropdown */}
      <View style={styles.pickerRow}>
        <Picker
          selectedValue={duration}
          onValueChange={(val) => setDuration(val)}
          style={styles.picker}
          itemStyle={styles.pickerItem}
          dropdownIconColor="#0a7ea4"
          enabled={true}
        >
          {DURATION_OPTIONS.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <ThemedText>{error}</ThemedText>
        </View>
      )}

      {!loading && !error && (
        <>
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={
              numColumns > 1 ? { gap: IMAGE_MARGIN } : undefined
            }
            contentContainerStyle={{ gap: IMAGE_MARGIN, padding: IMAGE_MARGIN }}
            renderItem={({ item }) => (
              <View
                style={{
                  width: IMAGE_WIDTH,
                  marginBottom: IMAGE_MARGIN,
                  alignSelf: numColumns === 1 ? "center" : undefined,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={{
                      width: IMAGE_WIDTH,
                      height: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO,
                      borderRadius: 12,
                      backgroundColor: "#eee",
                    }}
                    contentFit="cover"
                    transition={300}
                  />
                </TouchableOpacity>
                <ThemedText numberOfLines={2} style={styles.imageTitle}>
                  {item.title}
                </ThemedText>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => handleDownload(item.url, item.id)}
                  >
                    <Ionicons
                      name="download-outline"
                      size={22}
                      color="#0a7ea4"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleFavorite(item.id)}>
                    <Ionicons
                      name={
                        favorites.includes(item.id) ? "heart" : "heart-outline"
                      }
                      size={22}
                      color={
                        favorites.includes(item.id) ? "#e74c3c" : "#0a7ea4"
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShare(item.url)}>
                    <Ionicons
                      name="share-social-outline"
                      size={22}
                      color="#0a7ea4"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            // Remove infinite scroll trigger
            // onEndReached={loadMore}
            // onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null
            }
          />
          <View style={{ alignItems: "center", marginVertical: 16 }}>
            <TouchableOpacity
              onPress={loadMore}
              style={{
                backgroundColor: "#0a7ea4",
                borderRadius: 8,
                paddingHorizontal: 24,
                paddingVertical: 12,
                marginTop: 8,
                opacity: loadingMore ? 0.6 : 1,
              }}
              disabled={loadingMore}
            >
              <ThemedText
                style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
              >
                {loadingMore ? "Loading..." : "Load More Wallpapers"}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
  imageTitle: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 2,
    gap: 12,
  },
  pickerRow: {
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  picker: {
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    color: "#0a7ea4",
    height: 40,
    width: "100%",
  },
  pickerItem: {
    fontSize: 16,
    color: "#0a7ea4",
  },
});

// Sort images by duration (ordering only, not fetch)
function sortImagesByDuration(images: any[], duration: string) {
  // Helper to get age bucket
  const now = Date.now() / 1000;
  function getBucket(img: any) {
    const age = now - (img.created_utc || 0);
    if (duration === "hour") return age <= 60 * 60 ? 0 : 1;
    if (duration === "day")
      return age <= 60 * 60 * 24 ? 0 : age <= 60 * 60 * 24 * 7 ? 1 : 2;
    if (duration === "week")
      return age <= 60 * 60 * 24 * 7
        ? 0
        : age <= 60 * 60 * 24 * 30
        ? 1
        : age <= 60 * 60 * 24 * 365
        ? 2
        : 3;
    if (duration === "month")
      return age <= 60 * 60 * 24 * 30 ? 0 : age <= 60 * 60 * 24 * 365 ? 1 : 2;
    if (duration === "year") return age <= 60 * 60 * 24 * 365 ? 0 : 1;
    return 0;
  }
  // Group by bucket, then sort each bucket by score (top)
  const buckets: Record<number, any[]> = {};
  for (const img of images) {
    const b = getBucket(img);
    if (!buckets[b]) buckets[b] = [];
    buckets[b].push(img);
  }
  const sorted: any[] = [];
  const bucketOrder = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b);
  for (const b of bucketOrder) {
    sorted.push(...buckets[b].sort((a, b) => (b.score || 0) - (a.score || 0)));
  }
  return sorted;
}
