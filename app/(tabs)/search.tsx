import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SearchFilters } from "../../components/SearchFilters";
import { SearchHistory } from "../../components/SearchHistory";
import { ThemedText } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { WallpaperItem } from "../../components/WallpaperItem";
import {
  loadFavorites,
  saveFavorites,
} from "../../components/favorites-storage";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useDebounce } from "../../hooks/useDebounce";

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

type SearchFiltersType = {
  subreddit?: string;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: "square" | "landscape" | "portrait" | "any";
};

const IMAGE_MARGIN = 14;
const IMAGE_HEIGHT_RATIO = 1;

// Simple search function using Reddit API
const performSearch = async (
  query: string,
  filters: SearchFiltersType
): Promise<Wallpaper[]> => {
  try {
    const subreddit = filters.subreddit || "wallpapers+earthporn+spaceporn";
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
      query
    )}&restrict_sr=on&sort=relevance&t=all&limit=25`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data?.children) return [];

    const wallpapers = data.data.children
      .filter((post: any) => {
        const url = post.data.url;
        return (
          url &&
          (url.includes(".jpg") ||
            url.includes(".png") ||
            url.includes(".jpeg"))
        );
      })
      .map((post: any) => ({
        id: post.data.id,
        title: post.data.title,
        url: post.data.url,
        width: post.data.preview?.images?.[0]?.source?.width || 1920,
        height: post.data.preview?.images?.[0]?.source?.height || 1080,
        preview: post.data.thumbnail !== "self" ? post.data.thumbnail : null,
        subreddit: post.data.subreddit,
        score: post.data.score,
        created_utc: post.data.created_utc,
        author: post.data.author,
        permalink: post.data.permalink,
      }))
      .filter((wallpaper: Wallpaper) => {
        // Apply dimension filters
        if (filters.minWidth && wallpaper.width < filters.minWidth)
          return false;
        if (filters.minHeight && wallpaper.height < filters.minHeight)
          return false;

        // Apply aspect ratio filter
        if (filters.aspectRatio && filters.aspectRatio !== "any") {
          const ratio = wallpaper.width / wallpaper.height;
          switch (filters.aspectRatio) {
            case "square":
              if (Math.abs(ratio - 1) > 0.2) return false;
              break;
            case "landscape":
              if (ratio <= 1.2) return false;
              break;
            case "portrait":
              if (ratio >= 0.8) return false;
              break;
          }
        }

        return true;
      });

    return wallpapers;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};

export default function SearchScreen() {
  const window = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Wallpaper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation states
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const filterSlideAnim = React.useRef(new Animated.Value(0)).current;

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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

  // Memoize responsive calculations
  const { numColumns, IMAGE_WIDTH, isSmallScreen } = useMemo(() => {
    const cols = window.width < 500 ? 1 : 2;
    const width = Math.floor((window.width - IMAGE_MARGIN * (cols + 1)) / cols);
    const small = window.width < 400;
    return { numColumns: cols, IMAGE_WIDTH: width, isSmallScreen: small };
  }, [window.width]);

  // Perform search when query or filters change
  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      handleSearch(debouncedSearchQuery, filters);
      setShowHistory(false);
    } else {
      setSearchResults([]);
      setShowHistory(true);
      setError(null);
    }
  }, [debouncedSearchQuery, filters]);

  const handleSearch = async (
    query: string,
    searchFilters: SearchFiltersType
  ) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await performSearch(query, searchFilters);
      setSearchResults(results);

      // Save to search history
      await saveSearchHistory(query);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const saveSearchHistory = async (query: string) => {
    try {
      const existing = await AsyncStorage.getItem("search-history");
      const history = existing ? JSON.parse(existing) : [];
      const newHistory = [
        query,
        ...history.filter((h: string) => h !== query),
      ].slice(0, 10);
      await AsyncStorage.setItem("search-history", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  const handleDownload = useCallback(
    async (url: string, id: string, width?: number, height?: number) => {
      setDownloadingId(id);
      try {
        const filename = url.split("/").pop()?.split("?")[0] || `${id}.jpg`;
        const fileUri = FileSystem.cacheDirectory + filename;

        // Download original image
        const { uri } = await FileSystem.downloadAsync(url, fileUri);

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") throw new Error("Permission denied");

        const asset = await MediaLibrary.createAssetAsync(uri);
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
      const { Share } = await import("react-native");
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
        onPreview={() => {}} // Implement preview if needed
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

  return (
    <ThemedView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <Animated.View style={[
          styles.searchInputContainer,
          {
            shadowColor: isDark ? "#000" : "#333",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            backgroundColor: isDark ? "#2a2a2a" : "#ffffff",
            borderColor: isDark ? "#444" : "#e0e0e0",
            borderWidth: 1,
            borderRadius: 12,
            transform: [{ scale: fadeAnim }],
          }
        ]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? "#ccc" : "#888"}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: isDark ? "#fff" : "#000",
                backgroundColor: 'transparent',
              }
            ]}
            placeholder="Search wallpapers..."
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery, filters)}
            selectionColor="#0a7ea4"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  {
                    backgroundColor: isDark ? "#444" : "#f0f0f0",
                    borderRadius: 12,
                  }
                ]}
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowHistory(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="close" 
                  size={16} 
                  color={isDark ? "#ccc" : "#666"} 
                />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            showFilters && styles.filterButtonActive,
            {
              backgroundColor: showFilters 
                ? "#0a7ea4" 
                : (isDark ? "#2a2a2a" : "#ffffff"),
              borderColor: isDark ? "#444" : "#e0e0e0",
              borderWidth: 1,
              shadowColor: isDark ? "#000" : "#333",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }
          ]}
          onPress={() => {
            setShowFilters(!showFilters);
            Animated.timing(filterSlideAnim, {
              toValue: showFilters ? 0 : 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options"
            size={20}
            color={showFilters ? "#fff" : (isDark ? "#ccc" : "#0a7ea4")}
          />
        </TouchableOpacity>
      </View>

      {/* Search Filters */}
      {showFilters && (
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          isSmallScreen={isSmallScreen}
        />
      )}

      {/* Content */}
      {showHistory && !isSearching && searchResults.length === 0 && (
        <SearchHistory onSearchSelect={handleSearchSelect} />
      )}

      {isSearching && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <ThemedText style={styles.loadingText}>Searching...</ThemedText>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleSearch(searchQuery, filters)}
          >
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {!isSearching &&
        !error &&
        searchResults.length === 0 &&
        searchQuery.length > 0 && (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={48} color="#888" />
            <ThemedText style={styles.noResultsText}>
              No wallpapers found
            </ThemedText>
            <ThemedText style={styles.noResultsSubtext}>
              Try adjusting your search terms or filters
            </ThemedText>
          </View>
        )}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={
            numColumns > 1 ? { gap: IMAGE_MARGIN } : undefined
          }
          contentContainerStyle={{
            gap: IMAGE_MARGIN,
            padding: IMAGE_MARGIN,
            paddingTop: 8,
          }}
          renderItem={renderItem}
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={10}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <ThemedText style={styles.resultsText}>
                {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
              </ThemedText>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#11151c",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60, // Account for status bar
    backgroundColor: "#23272e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a20",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    height: "100%",
    borderWidth: 0,
    ...(Platform.OS === "web" && {
      outline: "none",
      border: "none",
    }),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#181a20",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#888",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  noResultsText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: "#888",
  },
  noResultsSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0a7ea4",
  },
});
