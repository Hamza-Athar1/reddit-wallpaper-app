import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";

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

export const WallpaperItem = React.memo(function WallpaperItem({
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

  // Calculate dynamic height based on image aspect ratio, with reasonable bounds
  const imageHeight = useMemo(() => {
    if (item.width && item.height) {
      const aspectRatio = item.height / item.width;
      // Clamp aspect ratio between 0.8 and 2.0 for reasonable display
      const clampedRatio = Math.min(Math.max(aspectRatio, 0.8), 2.0);
      return IMAGE_WIDTH * clampedRatio;
    }
    return IMAGE_WIDTH * IMAGE_HEIGHT_RATIO; // Fallback
  }, [item.width, item.height, IMAGE_WIDTH, IMAGE_HEIGHT_RATIO]);

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
              height: imageHeight, // Use dynamic height instead of fixed ratio
              borderRadius: 12,
              backgroundColor: imgLoading ? "#000" : "#111",
            }}
            onLoadStart={() => setImgLoading(true)}
            onLoadEnd={() => setImgLoading(false)}
            resizeMode="contain" // Changed from "cover" to "contain" to show full image
          />
          {imgLoading && (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: IMAGE_WIDTH,
                height: imageHeight, // Use dynamic height for loading overlay too
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
          accessibilityLabel={`Share: ${item.title}`}
        >
          <Ionicons name="share-social-outline" size={22} color="#0a7ea4" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = {
  imageTitle: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 2,
  },
  buttonRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    alignItems: "center" as const,
    marginTop: 6,
    marginBottom: 2,
    gap: 12,
  },
};
