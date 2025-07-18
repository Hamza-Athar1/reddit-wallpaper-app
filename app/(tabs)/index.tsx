import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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
import { WallpaperItem } from "../../components/WallpaperItem";
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

const IMAGE_MARGIN = 14; // Increased gap
const IMAGE_HEIGHT_RATIO = 1; // Taller aspect ratio to show full wallpapers
const SCREEN_WIDTH = Dimensions.get("window").width;

// Post order options for filtering - simplified for app consistency
const POST_ORDER_OPTIONS = [
  { label: "🔥 Hot", value: "hot", description: "Trending" },
  { label: "⭐ Top", value: "top", description: "Best" },
  { label: "🆕 New", value: "new", description: "Latest" },
  { label: "📈 Rising", value: "rising", description: "Popular" },
];

export default function HomeScreen() {
  const window = useWindowDimensions();
  const { subreddits, filterByResolution } = useSettings();
  // Always use 'all' as the duration
  const duration = "all";
  const [postOrder, setPostOrder] = useState<string>("top"); // Default to top posts
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
  const { numColumns, IMAGE_WIDTH, isSmallScreen } = useMemo(() => {
    const cols = window.width < 500 ? 1 : 2;
    const width = Math.floor((window.width - IMAGE_MARGIN * (cols + 1)) / cols);
    const small = window.width < 400; // Define small screen threshold
    return { numColumns: cols, IMAGE_WIDTH: width, isSmallScreen: small };
  }, [window.width]);
  /**
   * Fetch wallpapers from multiple time ranges for unlimited variety.
   * This fetches from all available time periods to give users maximum wallpapers.
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
          : subreddits?.length > 0
          ? subreddits
          : ["wallpapers", "earthporn", "natureporn"]; // Multiple fallback subreddits

      console.log(
        "Fetching wallpapers for subreddits:",
        srList,
        "Post order:",
        postOrder
      );

      // Start with "week" time range for reliable fetching, then expand
      const timeRanges = ["week"];

      const fetchResult = await (fetchExtendedWallpapers as any)({
        subreddits: srList,
        timeRanges,
        postType: postOrder, // Use selected post order instead of hardcoded "top"
        limit: 50, // Start with reasonable limit for testing
        after: reset ? {} : afterMap,
      });

      const { images: fetchedImages, after: newAfterMap } = fetchResult;

      console.log("Fetched images count:", fetchedImages?.length || 0);
      console.log("After map:", newAfterMap);

      if (reset) {
        setImages(Array.isArray(fetchedImages) ? fetchedImages : []);
      } else {
        setImages((prev: Wallpaper[]) => {
          const ids = new Set(prev.map((i: Wallpaper) => i.id));
          const newUniqueImages = fetchedImages.filter(
            (i: Wallpaper) => !ids.has(i.id)
          );
          console.log("Adding", newUniqueImages.length, "new unique images");
          return [...prev, ...newUniqueImages];
        });
      }
      setAfterMap(newAfterMap);

      // If we got fewer than expected images, try expanding time ranges for unlimited content
      if (reset && fetchedImages.length < 20) {
        console.log(
          "Got few images, attempting to fetch from more time ranges..."
        );
        setTimeout(() => {
          fetchMoreTimeRanges();
        }, 1000);
      }
    } catch (e: any) {
      console.error("Error fetching wallpapers:", e);

      // Try fallback simple fetch
      console.log("Attempting fallback fetch...");
      try {
        const srList =
          subreddits?.length > 0 ? subreddits : ["wallpapers", "earthporn"];
        const fallbackImages: Wallpaper[] = [];

        for (const subreddit of srList.slice(0, 3)) {
          // Limit to 3 subreddits for fallback
          const images = await simpleFetch(subreddit, postOrder);
          fallbackImages.push(...images);
        }

        console.log("Fallback fetch got", fallbackImages.length, "images");

        if (fallbackImages.length > 0) {
          if (reset) {
            setImages(fallbackImages);
          } else {
            setImages((prev: Wallpaper[]) => {
              const ids = new Set(prev.map((i: Wallpaper) => i.id));
              return [
                ...prev,
                ...fallbackImages.filter((i: Wallpaper) => !ids.has(i.id)),
              ];
            });
          }
          setAfterMap({}); // Reset after map for fallback
          return; // Success with fallback
        }
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError);
      }

      setError(
        `Failed to load images: ${
          e?.message || "Network error"
        }. Please check your internet connection.`
      );
    } finally {
      setLoading(false);
    }
  };
  // Initial fetch and on subreddits/postOrder change
  useEffect(() => {
    // Always try to fetch, even if subreddits array is empty (will use default "wallpapers")
    fetchAll(true); // Reset images and afterMap
    // eslint-disable-next-line
  }, [subreddits?.join(","), postOrder]);
  /**
   * Load more wallpapers from all time ranges.
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

      // Start with "week" time range for reliable fetching, then expand
      const timeRanges = ["week"];

      const { images: newImages, after: newAfterMap } = await (
        fetchExtendedWallpapers as any
      )({
        subreddits: srList,
        timeRanges,
        postType: postOrder, // Use selected post order
        limit: 50, // Start with reasonable limit for testing
        after: afterMap,
      });
      setImages((prev: Wallpaper[]) => {
        const ids = new Set(prev.map((i: Wallpaper) => i.id));
        return [...prev, ...newImages.filter((i: Wallpaper) => !ids.has(i.id))];
      });
      setAfterMap(newAfterMap);
    } catch (e) {
      console.error("Error loading more wallpapers:", e);
      // Optionally show error
    } finally {
      setLoadingMore(false);
    }
  };

  // Function to fetch from additional time ranges for unlimited content
  const fetchMoreTimeRanges = async () => {
    try {
      console.log(
        "Fetching from additional time ranges for unlimited content..."
      );
      const settings = await import("../../components/settings-storage");
      const loaded = await settings.loadSettings();
      const srList =
        Array.isArray(loaded.subreddits) && loaded.subreddits.length > 0
          ? loaded.subreddits
          : subreddits?.length > 0
          ? subreddits
          : ["wallpapers", "earthporn", "natureporn"];

      // Fetch from additional time ranges for unlimited variety
      const additionalTimeRanges = ["day", "month", "year", "all"];

      const fetchResult = await (fetchExtendedWallpapers as any)({
        subreddits: srList,
        timeRanges: additionalTimeRanges,
        postType: postOrder,
        limit: 75, // Higher limit for additional content
        after: {}, // Start fresh for additional time ranges
      });

      const { images: additionalImages } = fetchResult;
      console.log(
        "Additional time ranges fetched:",
        additionalImages?.length || 0,
        "images"
      );

      if (additionalImages?.length > 0) {
        setImages((prev: Wallpaper[]) => {
          const ids = new Set(prev.map((i: Wallpaper) => i.id));
          const newUniqueImages = additionalImages.filter(
            (i: Wallpaper) => !ids.has(i.id)
          );
          console.log(
            "Adding",
            newUniqueImages.length,
            "additional unique images"
          );
          return [...prev, ...newUniqueImages];
        });
      }
    } catch (error) {
      console.error("Error fetching additional time ranges:", error);
    }
  };

  // Memoized handler functions
  const handlePostOrderChange = useCallback((newOrder: string) => {
    setPostOrder(newOrder);
    // Show loading state when changing filter
    setLoading(true);
  }, []);

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
              <ThemedText style={styles.subtitle}>
                Unlimited collection from all time periods
              </ThemedText>
            </ThemedView>

            {/* Enhanced Post Order Filter - Optimized for Small Screens */}
            <ThemedView
              style={[
                styles.filterContainer,
                isSmallScreen && styles.filterContainerSmall,
              ]}
            >
              <View style={styles.filterHeader}>
                <View style={styles.filterTitleSection}>
                  <ThemedText
                    style={[
                      styles.filterLabel,
                      isSmallScreen && styles.filterLabelSmall,
                    ]}
                  >
                    Sort by
                  </ThemedText>
                  {!loading && images.length > 0 && (
                    <ThemedText style={styles.filterSubtitle}>
                      {filteredImages.length} wallpapers from all time periods
                    </ThemedText>
                  )}
                </View>
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0a7ea4" />
                  </View>
                )}
              </View>
              <View style={styles.filterRow}>
                {POST_ORDER_OPTIONS.map((option, index) => {
                  const isActive = postOrder === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterPill,
                        isSmallScreen && styles.filterPillSmall,
                        isActive && styles.filterPillActive,
                        loading && styles.filterPillDisabled,
                        { flex: 1, marginHorizontal: isSmallScreen ? 1 : 2 },
                      ]}
                      onPress={() => handlePostOrderChange(option.value)}
                      accessibilityLabel={`Sort by ${option.label} - ${option.description}`}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <View style={styles.filterPillContent}>
                        <ThemedText
                          style={[
                            styles.filterPillText,
                            isSmallScreen && styles.filterPillTextSmall,
                            isActive && styles.filterPillTextActive,
                          ]}
                        >
                          {isSmallScreen
                            ? option.label.split(" ")[0]
                            : option.label}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ThemedView>
            {loading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" />
              </View>
            )}
            {error && (
              <View style={styles.centered}>
                <ThemedText
                  style={{
                    color: "red",
                    textAlign: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  {error}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => fetchAll(true)}
                  style={{
                    backgroundColor: "#0a7ea4",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  <ThemedText style={{ color: "white" }}>Retry</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            {!loading && !error && images.length === 0 && (
              <View style={styles.centered}>
                <ThemedText
                  style={{ textAlign: "center", paddingHorizontal: 20 }}
                >
                  No wallpapers found. Check your internet connection or try
                  different subreddits.
                </ThemedText>
                <TouchableOpacity
                  onPress={() => fetchAll(true)}
                  style={{
                    backgroundColor: "#0a7ea4",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                >
                  <ThemedText style={{ color: "white" }}>Retry</ThemedText>
                </TouchableOpacity>
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
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 16,
    // If you want a shadow, use boxShadow for web compatibility
    // boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    marginTop: 2,
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
  filterContainer: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#23272e", // Match app's dark background
    borderRadius: 10,
    marginHorizontal: 4,
    // Subtle shadow matching app style
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0a7ea4", // Match app's primary blue
  },
  filterSubtitle: {
    fontSize: 11,
    color: "#888", // Match app's muted text
    marginTop: 1,
  },
  filterTitleSection: {
    flex: 1,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  filterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: "#0a7ea4", // Match app's primary color
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: "center",
  },
  loadingContainer: {
    width: 28,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imageCount: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "bold",
  },
  filterRow: {
    flexDirection: "row",
    gap: 4, // Reduced gap for smaller screens
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#353b48", // Match app's dark pill color
    minHeight: 36, // Reduced height for mobile
    justifyContent: "center",
    alignItems: "center",
  },
  filterPillActive: {
    backgroundColor: "#0a7ea4", // Match app's active state
  },
  filterPillDisabled: {
    opacity: 0.6,
  },
  filterPillContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  filterPillText: {
    fontSize: 11, // Reduced font size for mobile
    fontWeight: "600",
    color: "#fff", // Consistent white text
    textAlign: "center",
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  filterPillDescription: {
    fontSize: 8, // Smaller description text
    color: "#ccc", // Lighter gray for description
    textAlign: "center",
    fontWeight: "500",
  },
  filterPillDescriptionActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  // Small screen optimizations
  filterContainerSmall: {
    padding: 8,
    marginBottom: 10,
    borderRadius: 8,
  },
  filterLabelSmall: {
    fontSize: 14,
  },
  filterPillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 32,
    borderRadius: 8,
  },
  filterPillTextSmall: {
    fontSize: 10,
  },
});

// Simple fallback fetch function in case the main fetch fails
const simpleFetch = async (subreddit: string, postType: string = "top") => {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/${postType}.json?limit=25&t=week&raw_json=1`;
    console.log("Fallback fetch from:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Reddit-Wallpaper-App/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.data?.children) {
      return [];
    }

    return data.data.children
      .map((c: any) => c.data)
      .filter((p: any) => {
        return (
          p.post_hint === "image" &&
          p.preview?.images?.[0]?.source?.url &&
          !p.over_18 &&
          !p.url.includes("gif")
        );
      })
      .map((p: any) => {
        const source = p.preview.images[0].source;
        return {
          id: p.id,
          title: p.title?.trim() || "Untitled",
          url: p.url.replace(/&amp;/g, "&"),
          width: source.width,
          height: source.height,
          preview:
            p.preview.images[0].resolutions?.[0]?.url?.replace(/&amp;/g, "&") ||
            null,
          subreddit,
          time: "week",
          postType,
          created_utc: p.created_utc,
          score: p.score || 0,
          author: p.author,
          permalink: p.permalink,
        };
      });
  } catch (error) {
    console.error("Simple fetch failed for", subreddit, error);
    return [];
  }
};
