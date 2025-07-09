import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import React, {
  useEffect,
  useEffect as useLocalEffect,
  useState as useLocalState,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image as RNImage,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  loadFavorites,
  saveFavorites,
} from "../../components/favorites-storage";
import { useSettings } from "../../components/SettingsContext";
import { ThemedText } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import fetchExtendedWallpapers from "../../scripts/redditfetch";
import ImagePreviewModal from "../ImagePreviewModal";

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
  handleFavorite: (item: Wallpaper) => void;
  favorites: Wallpaper[];
  handleShare: (url: string) => void;
  onPreview: (url: string) => void;
};

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
  onPreview,
}: WallpaperItemProps) {
  const [imgLoading, setImgLoading] = useState(true);
  return (
    <View
      style={{
        width: IMAGE_WIDTH,
        marginBottom: 14,
        alignSelf: numColumns === 1 ? "center" : undefined,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={{ borderRadius: 12, overflow: "hidden" }}
        accessibilityLabel={`View wallpaper: ${item.title}`}
        onPress={() => onPreview(item.url)}
      >
        <View style={{ position: "relative" }}>
          <RNImage
            source={{ uri: item.url }}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO,
              borderRadius: 12,
              backgroundColor: imgLoading ? "#000" : "#111",
            }}
            onLoadStart={() => setImgLoading(true)}
            onLoadEnd={() => setImgLoading(false)}
            resizeMode="cover"
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
          onPress={() => handleFavorite(item)}
          accessibilityLabel={`$${
            favorites.some((f) => f.id === item.id) ? "Unfavorite" : "Favorite"
          } wallpaper: ${item.title}`}
        >
          <Ionicons
            name={
              favorites.some((f) => f.id === item.id)
                ? "heart"
                : "heart-outline"
            }
            size={22}
            color={
              favorites.some((f) => f.id === item.id) ? "#e74c3c" : "#0a7ea4"
            }
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
  const [favorites, setFavorites] = useLocalState<Wallpaper[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // For UX: only show a limited number of images at a time
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Load favorites from persistent storage on mount
  useLocalEffect(() => {
    (async () => {
      const favs = await loadFavorites();
      setFavorites(Array.isArray(favs) ? favs : []);
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
      // No resizing or cropping; always save the original image
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
  const handleFavorite = (item: Wallpaper) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      if (exists) {
        return prev.filter((f) => f.id !== item.id);
      } else {
        return [item, ...prev];
      }
    });
  };

  // Filter images by device resolution if enabled
  const filteredImages = filterByResolution
    ? images.filter((img) => {
        // Use device window dimensions, but account for orientation
        const deviceWidth = Math.max(window.width, window.height);
        const deviceHeight = Math.min(window.width, window.height);
        // Accept if image is at most as large as device in both dimensions, regardless of orientation
        return (
          (img.width <= deviceWidth && img.height <= deviceHeight) ||
          (img.width <= deviceHeight && img.height <= deviceWidth)
        );
      })
    : images;
  // Only show up to visibleCount images
  const pagedImages = filteredImages.slice(0, visibleCount);

  return (
    <>
      <FlatList
        data={pagedImages}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: IMAGE_MARGIN } : undefined}
        contentContainerStyle={{
          gap: IMAGE_MARGIN,
          padding: IMAGE_MARGIN,
          paddingTop: 0,
          paddingBottom: 32,
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
            onPreview={setPreviewUrl}
          />
        )}
        removeClippedSubviews={true}
        initialNumToRender={6}
        windowSize={7}
        ListHeaderComponent={
          <>
            <View
              style={{
                backgroundColor: "#A1CEDC",
                height: 178,
                width: "100%",
                position: "relative",
                marginBottom: 8,
              }}
            >
              <ExpoImage
                source={require("../../assets/images/partial-react-logo.png")}
                style={styles.reactLogo}
                contentFit="contain"
              />
            </View>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Reddit Wallpapers</ThemedText>
            </ThemedView>
            <View
              style={[
                styles.pickerRow,
                {
                  paddingTop: 16,
                  paddingBottom: 16,
                  zIndex: 200,
                  elevation: 20,
                },
              ]}
            >
              <Picker
                selectedValue={duration}
                onValueChange={(val) => setDuration(val)}
                style={[styles.picker, { zIndex: 201, elevation: 21 }]}
                itemStyle={styles.pickerItem}
                dropdownIconColor="#0a7ea4"
                enabled={true}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <Picker.Item
                    key={opt.value}
                    label={opt.label}
                    value={opt.value}
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
            {!loading && !error && images.length === 0 && (
              <View style={styles.centered}>
                <ThemedText>No wallpapers found.</ThemedText>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          <View style={{ alignItems: "center", marginVertical: 16 }}>
            {loadingMore && <ActivityIndicator style={{ margin: 16 }} />}
            {/* Show Load More button for paged images */}
            {visibleCount < filteredImages.length && !loadingMore && (
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
        }
        ListEmptyComponent={null}
      />
      <ImagePreviewModal
        url={previewUrl}
        visible={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
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
    // If you want a shadow, use boxShadow for web compatibility
    // boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
    // boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
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
    // boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
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
