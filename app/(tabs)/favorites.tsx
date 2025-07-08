import { ThemedText } from "@/components/ThemedText";
import { loadFavorites, saveFavorites } from "@/components/favorites-storage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// Wallpaper type (should match your app)
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

const IMAGE_MARGIN = 14;
const IMAGE_HEIGHT_RATIO = 0.55;
const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 2;
const IMAGE_WIDTH =
  (SCREEN_WIDTH - IMAGE_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

import { useFocusEffect } from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
export default function FavoritesScreen() {
  const window = useWindowDimensions();
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [allWallpapers, setAllWallpapers] = React.useState<Wallpaper[]>([]);
  const [loading, setLoading] = React.useState(true);
  const IMAGE_WIDTH =
    (window.width - IMAGE_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

  // Reload favorites and wallpapers every time the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        setLoading(true);
        const favs = await loadFavorites();
        let wallpapers: Wallpaper[] = [];
        try {
          const raw = await AsyncStorage.getItem("user-wallpapers");
          if (raw) wallpapers = JSON.parse(raw);
        } catch {}
        if (isActive) {
          setFavorites(favs);
          setAllWallpapers(wallpapers);
          setLoading(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const favoriteWallpapers = allWallpapers.filter((w) =>
    favorites.includes(w.id)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size={32} color="#0a7ea4" />
      </View>
    );
  }

  if (favoriteWallpapers.length === 0) {
    return (
      <View style={styles.centered}>
        <ThemedText>No favorites yet.</ThemedText>
      </View>
    );
  }
  // Download image to device, optionally resize/crop to device resolution
  const handleDownload = async (
    url: string,
    id: string,
    width?: number,
    height?: number
  ) => {
    try {
      const filename = url.split("/").pop()?.split("?")[0] || `${id}.jpg`;
      let fileUri = FileSystem.cacheDirectory + filename;
      let finalUri = fileUri;
      // Download original image
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      // Optionally resize/crop to device resolution (not available here, but could be added)
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
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      saveFavorites(updated);
      return updated;
    });
  };

  return (
    <FlatList
      data={favoriteWallpapers}
      keyExtractor={(item) => item.id}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={{ padding: IMAGE_MARGIN }}
      renderItem={({ item }) => (
        <View style={{ width: IMAGE_WIDTH, margin: IMAGE_MARGIN / 2 }}>
          <ExpoImage
            source={{ uri: item.url }}
            style={{
              width: IMAGE_WIDTH,
              height: IMAGE_WIDTH * IMAGE_HEIGHT_RATIO,
              borderRadius: 12,
              backgroundColor: "#000",
            }}
            contentFit="cover"
            placeholder={item.preview ? { uri: item.preview } : undefined}
            placeholderContentFit="cover"
          />
          <ThemedText numberOfLines={2} style={{ marginTop: 6, color: "#fff" }}>
            {item.title}
          </ThemedText>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              marginTop: 6,
              marginBottom: 2,
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                handleDownload(item.url, item.id, item.width, item.height)
              }
              accessibilityLabel={`Download wallpaper: ${item.title}`}
            >
              <Ionicons name="download-outline" size={22} color="#0a7ea4" />
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
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181a20",
  },
});
