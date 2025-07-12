import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const WallpaperItem = React.memo(function WallpaperItem({
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

  const isFavorited = useMemo(
    () => favorites.some((f) => f.id === item.id),
    [favorites, item.id]
  );

  const handleImagePress = useCallback(() => {
    onPreview(item.url);
  }, [onPreview, item.url]);

  const handleDownloadPress = useCallback(() => {
    handleDownload(item.url, item.id, item.width, item.height);
  }, [handleDownload, item.url, item.id, item.width, item.height]);

  const handleFavoritePress = useCallback(() => {
    handleFavorite(item);
  }, [handleFavorite, item]);

  const handleSharePress = useCallback(() => {
    handleShare(item.url);
  }, [handleShare, item.url]);

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
        onPress={handleImagePress}
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
          onPress={handleDownloadPress}
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
          onPress={handleFavoritePress}
          accessibilityLabel={`${
            isFavorited ? "Unfavorite" : "Favorite"
          } wallpaper: ${item.title}`}
        >
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={22}
            color={isFavorited ? "#e74c3c" : "#0a7ea4"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSharePress}
          accessibilityLabel={`Share a: ${item.title}`}
        >
          <Ionicons name="share-social-outline" size={22} color="#0a7ea4" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const IMAGE_MARGIN = 14; // Increased gap
const IMAGE_HEIGHT_RATIO = 0.55; // Slightly shorter images
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function HomeScreen() {
  const window = useWindowDimensions();
  const { subreddits, filterByResolution } = useSettings();
  // Always use 'all' as the duration
  const duration = "all";
  const [images, setImages] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load favorites from persistent storage on mount
  useEffect(() => {
    (async () => {
      const favs = await loadFavorites();
      setFavorites(Array.isArray(favs) ? favs : []);
    })();
  }, []);

  // Save favorites to persistent storage when changed
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);
  const [afterMap, setAfterMap] = useState<Record<string, string | null>>({});

  // Memoize responsive calculations
  const { numColumns, IMAGE_WIDTH } = useMemo(() => {
    const cols = window.width < 500 ? 1 : 2;
    const width = Math.floor((window.width - IMAGE_MARGIN * (cols + 1)) / cols);
    return { numColumns: cols, IMAGE_WIDTH: width };
  }, [window.width]);
  /**
   * Fetch the first page for all subreddit/time combos (reset = true), or next page for each (reset = false).
   * On reset, replaces images and afterMap. Otherwise, appends new images and updates afterMap.
   */
  const fetchAll = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const settings = await import("../../components/settings-storage");
      const loaded = await settings.loadSettings();
      const srList =
        Array.isArray(loaded.subreddits) && loaded.subreddits.length > 0
          ? loaded.subreddits
          : subreddits || ["wallpapers"];
      const timeRanges = [duration];
      const { images: fetchedImages, after: newAfterMap } = await (
        fetchExtendedWallpapers as any
      )({
        subreddits: srList,
        timeRanges,
        postType: "top",
        limit: 30,
        after: reset ? {} : afterMap,
      });
      if (reset) {
        setImages(Array.isArray(fetchedImages) ? fetchedImages : []);
      } else {
        setImages((prev: Wallpaper[]) => {
          const ids = new Set(prev.map((i: Wallpaper) => i.id));
          return [
            ...prev,
            ...fetchedImages.filter((i: Wallpaper) => !ids.has(i.id)),
          ];
        });
      }
      setAfterMap(newAfterMap);
    } catch (e) {
      setError("Failed to load images.");
    } finally {
      setLoading(false);
    }
  };
  // Initial fetch and on duration/subreddits change
  useEffect(() => {
    if (subreddits && subreddits.length > 0) {
      fetchAll(true); // Reset images and afterMap
    }
    // eslint-disable-next-line
  }, [duration, subreddits?.join(",")]);
  /**
   * Fetch the next page for each subreddit/time combo using afterMap.
   * Appends new images, updates afterMap, disables button if all afterMap values are null.
   */
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
          : subreddits || ["wallpapers"];
      const timeRanges = [duration];
      const { images: newImages, after: newAfterMap } = await (
        fetchExtendedWallpapers as any
      )({
        subreddits: srList,
        timeRanges,
        postType: "top",
        limit: 30,
        after: afterMap,
      });
      setImages((prev: Wallpaper[]) => {
        const ids = new Set(prev.map((i: Wallpaper) => i.id));
        return [...prev, ...newImages.filter((i: Wallpaper) => !ids.has(i.id))];
      });
      setAfterMap(newAfterMap);
    } catch (e) {
      // Optionally show error
    } finally {
      setLoadingMore(false);
    }
  };

  // Memoized handler functions
  const handleDownload = useCallback(
    async (url: string, id: string, width?: number, height?: number) => {
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
          await MediaLibrary.createAlbumAsync(
            "Reddit Wallpapers",
            asset,
            false
          );
        } catch (err) {
          // Ignore error if album already exists
        }
        alert("Image saved to your Photos!");
      } catch (e) {
        alert("Failed to save image: " + e);
      } finally {
        setDownloadingId(null);
      }
    },
    []
  );

  const handleShare = useCallback(async (url: string) => {
    try {
      await Share.share({ url });
    } catch (e) {
      alert("Failed to share: " + e);
    }
  }, []);

  const handleFavorite = useCallback((item: Wallpaper) => {
    setFavorites((prev: Wallpaper[]) => {
      const exists = prev.some((f: Wallpaper) => f.id === item.id);
      if (exists) {
        return prev.filter((f: Wallpaper) => f.id !== item.id);
      } else {
        return [item, ...prev];
      }
    });
  }, []);

  // Memoize filtered images calculation
  const filteredImages = useMemo(() => {
    if (!filterByResolution) return images;

    return images.filter((img) => {
      // Use device window dimensions, but account for orientation
      const deviceWidth = Math.max(window.width, window.height);
      const deviceHeight = Math.min(window.width, window.height);
      // Accept if image is at most as large as device in both dimensions, regardless of orientation
      return (
        (img.width <= deviceWidth && img.height <= deviceHeight) ||
        (img.width <= deviceHeight && img.height <= deviceWidth)
      );
    });
  }, [images, filterByResolution, window.width, window.height]);
  // Memoized render function for FlatList
  const renderItem = useCallback(
    ({ item }: { item: Wallpaper }) => (
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
    ),
    [
      IMAGE_WIDTH,
      numColumns,
      handleDownload,
      downloadingId,
      handleFavorite,
      favorites,
      handleShare,
    ]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO + 60,
      offset: (IMAGE_WIDTH * IMAGE_HEIGHT_RATIO + 60) * index,
      index,
    }),
    [IMAGE_WIDTH]
  );

  return (
    <>
      <FlatList
        data={filteredImages}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: IMAGE_MARGIN } : undefined}
        contentContainerStyle={{
          gap: IMAGE_MARGIN,
          padding: IMAGE_MARGIN,
          paddingTop: 0,
          paddingBottom: 32,
        }}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        getItemLayout={numColumns === 1 ? getItemLayout : undefined}
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
            {Object.values(afterMap).some((v) => v != null) && !loadingMore && (
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
        refreshing={loading}
        onRefresh={() => fetchAll(true)}
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
