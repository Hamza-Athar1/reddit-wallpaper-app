// Types
type Wallpaper = {
  id: string;
  title: string;
  url: string;
  width: number;
  height: number;
  preview: string | null;
  subreddit?: string;
  time?: string;
  postType?: string;
  created_utc?: number;
  score?: number;
  author?: string;
  permalink?: string;
};

type WallpaperItemProps = {
  item: Wallpaper;
  IMAGE_WIDTH: number;
  IMAGE_HEIGHT_RATIO: number;
  numColumns: number;
  handleDownload: (
    url: string,
    id: string,
    width?: number,
    height?: number
  ) => void;
  downloadingId: string | null;
  handleFavorite: (id: string) => void;
  favorites: string[];
  handleShare: (url: string) => void;
};

// WallpaperItem component to allow hooks usage per item
function WallpaperItem({
  item,
  IMAGE_WIDTH,
  IMAGE_HEIGHT_RATIO,
  numColumns,
  handleDownload,
  downloadingId,
  handleFavorite,
  favorites,
  handleShare,
}: WallpaperItemProps) {
  const [imgLoading, setImgLoading] = React.useState(true);
  return (
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
        accessibilityLabel={`View wallpaper: ${item.title}`}
        onPress={() => {
          setPreviewUrl(item.url);
          setPreviewVisible(true);
        }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: item.url }}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO,
              borderRadius: 12,
              backgroundColor: imgLoading ? "#000" : "#111",
            }}
            contentFit="cover"
            transition={300}
            onLoadStart={() => setImgLoading(true)}
            onLoadEnd={() => setImgLoading(false)}
            // Use low-res preview if available, else fallback to blurred main image
            placeholder={item.preview ? { uri: item.preview } : undefined}
            placeholderContentFit="cover"
          />
          {imgLoading && (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: IMAGE_WIDTH,
                height: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#000",
              }}
            >
              <ActivityIndicator size={32} color="#0a7ea4" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <ThemedText numberOfLines={2} style={styles.imageTitle}>
        {item.title}
      </ThemedText>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() =>
            handleDownload(item.url, item.id, item.width, item.height)
          }
          accessibilityLabel={`Download wallpaper: ${item.title}`}
          disabled={downloadingId === item.id}
        >
          {downloadingId === item.id ? (
            <ActivityIndicator size={22} color="#0a7ea4" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#0a7ea4" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleFavorite(item.id)}
          accessibilityLabel={`$${
            favorites.includes(item.id) ? "Unfavorite" : "Favorite"
          } wallpaper: ${item.title}`}
        >
          <Ionicons
            name={favorites.includes(item.id) ? "heart" : "heart-outline"}
            size={22}
            color={favorites.includes(item.id) ? "#e74c3c" : "#0a7ea4"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleShare(item.url)}
          accessibilityLabel={`Share a: ${item.title}`}
        >
          <Ionicons name="share-social-outline" size={22} color="#0a7ea4" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
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
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useEffect as useLocalEffect, useState as useLocalState } from "react";
import { Share } from "react-native";
import {
  loadFavorites,
  saveFavorites,
} from "../../components/favorites-storage";
import { fetchExtendedWallpapers } from "../../scripts/redditfetch";
import ImagePreviewModal from "../ImagePreviewModal";

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
  const {
    subreddits,
    duration,
    setDuration,
    filterByResolution,
    resizeToDevice,
  } = useSettings();
  type Wallpaper = {
    id: string;
    title: string;
    url: string;
    width: number;
    height: number;
    preview: string | null;
    subreddit?: string;
    time?: string;
    postType?: string;
    created_utc?: number;
    score?: number;
    author?: string;
    permalink?: string;
  };
  const [images, setImages] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // For UX: only show a limited number of images at a time
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
    // Also persist all currently loaded wallpapers for the Favorites tab
    if (images.length > 0) {
      try {
        localStorage.setItem("user-wallpapers", JSON.stringify(images));
      } catch {}
    }
  }, [favorites, images]);
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
      setImages(Array.isArray(fetchedImages) ? fetchedImages : []);
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
    setVisibleCount(PAGE_SIZE);
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
      setImages((prev: Wallpaper[]) => {
        const ids = new Set(prev.map((i) => i.id));
        return [...prev, ...newImages.filter((i: Wallpaper) => !ids.has(i.id))];
      });
      setAfterMap(newAfterMap);
      setVisibleCount((prev) => Math.max(prev, PAGE_SIZE));
    } catch (e) {
      // Optionally show error
    } finally {
      setLoadingMore(false);
    }
  };

  // Download image to device, optionally resize/crop to device resolution
  const handleDownload = async (
    url: string,
    id: string,
    width?: number,
    height?: number
  ) => {
    setDownloadingId(id);
    try {
      const filename = url.split("/").pop()?.split("?")[0] || `${id}.jpg`;
      let fileUri = FileSystem.cacheDirectory + filename;
      let finalUri = fileUri;
      // Download original image
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      // Optionally resize/crop to device resolution
      if (resizeToDevice && width && height) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [
            {
              resize: {
                width: Math.round(window.width),
                height: Math.round(window.height),
              },
            },
            {
              crop: {
                originX: 0,
                originY: 0,
                width: Math.round(window.width),
                height: Math.round(window.height),
              },
            },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipResult.uri;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") throw new Error("Permission denied");
      const asset = await MediaLibrary.createAssetAsync(finalUri);
      try {
        await MediaLibrary.createAlbumAsync("Reddit Wallpapers", asset, false);
      } catch (err) {
        // Ignore error if album already exists
      }
      alert("Image saved to your Photos!");
    } catch (e) {
      alert("Failed to save image: " + e);
    } finally {
      setDownloadingId(null);
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

  // Filter images by device resolution if enabled
  const filteredImages = filterByResolution
    ? images.filter(
        (img) =>
          img.width >= Math.round(window.width) &&
          img.height >= Math.round(window.height)
      )
    : images;
  // Only show up to visibleCount images
  const pagedImages = filteredImages.slice(0, visibleCount);

  return (
    <>
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
        <View
          style={[
            styles.pickerRow,
            {
              paddingTop: 16,
              paddingBottom: 16,
              backgroundColor: "#23272e",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#444",
              marginHorizontal: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            },
          ]}
        >
          <Picker
            selectedValue={duration}
            onValueChange={(val) => setDuration(val)}
            style={[
              styles.picker,
              {
                color: "#fff",
                backgroundColor: "transparent",
                fontWeight: "bold",
                fontSize: 18,
                borderRadius: 12,
              },
            ]}
            itemStyle={[
              styles.pickerItem,
              { color: "#000", fontWeight: "bold", fontSize: 18 },
            ]}
            dropdownIconColor="#0a7ea4"
            enabled={true}
            mode="dropdown"
          >
            {DURATION_OPTIONS.map((opt) => (
              <Picker.Item
                key={opt.value}
                label={opt.label}
                value={opt.value}
                color="#000"
              />
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
            {images.length === 0 ? (
              <View style={styles.centered}>
                <ThemedText>No wallpapers found.</ThemedText>
              </View>
            ) : (
              <FlatList
                data={pagedImages}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                columnWrapperStyle={
                  numColumns > 1 ? { gap: IMAGE_MARGIN } : undefined
                }
                contentContainerStyle={{
                  gap: IMAGE_MARGIN,
                  padding: IMAGE_MARGIN,
                }}
                renderItem={({ item }) => (
                  <WallpaperItem
                    item={item}
                    IMAGE_WIDTH={IMAGE_WIDTH}
                    IMAGE_HEIGHT_RATIO={IMAGE_HEIGHT_RATIO}
                    numColumns={numColumns}
                    handleDownload={handleDownload}
                    downloadingId={downloadingId}
                    handleFavorite={handleFavorite}
                    favorites={favorites}
                    handleShare={handleShare}
                  />
                )}
                removeClippedSubviews={true}
                initialNumToRender={6}
                windowSize={7}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator style={{ margin: 16 }} />
                  ) : null
                }
              />
            )}
            <View style={{ alignItems: "center", marginVertical: 16 }}>
              {/* Show Load More button for paged images */}
              {visibleCount < filteredImages.length && (
                <TouchableOpacity
                  onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  style={{
                    backgroundColor: "#0a7ea4",
                    borderRadius: 8,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    marginTop: 8,
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                  disabled={loadingMore}
                  accessibilityLabel="Load more wallpapers"
                >
                  <ThemedText
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                  >
                    {loadingMore ? "Loading..." : "Load More Wallpapers"}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ParallaxScrollView>
      <ImagePreviewModal
        visible={previewVisible}
        imageUrl={previewUrl}
        onClose={() => setPreviewVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    // boxShadow: "0 2px 8px rgba(0,0,0,0.08)", // Use boxShadow for web
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
    // boxShadow: "0 4px 24px rgba(0,0,0,0.12)", // Use boxShadow for web
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
    // boxShadow: "0 1px 4px rgba(0,0,0,0.10)", // Use boxShadow for web
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
