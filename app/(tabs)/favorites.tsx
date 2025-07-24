import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  loadFavorites,
  saveFavorites,
} from "../../components/favorites-storage";
import { ThemedText } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { useColorScheme } from "../../hooks/useColorScheme";
import ImagePreviewModal from "../ImagePreviewModal";

// Types must match main screen
export type Wallpaper = {
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

import { useFocusEffect } from "@react-navigation/native";

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Animation states
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  // Reload favorites every time the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        setLoading(true);
        // Reset animations
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.9);

        const favs = await loadFavorites();
        if (isActive) {
          setFavorites(Array.isArray(favs) ? favs : []);

          // Animate in the content
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
        setLoading(false);
      })();
      return () => {
        isActive = false;
      };
    }, [fadeAnim, scaleAnim])
  );

  // Download handler - same as main screen
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

  // Share handler
  const handleShare = async (url: string) => {
    try {
      await Share.share({ url });
    } catch (e) {
      alert("Failed to share: " + e);
    }
  };

  // Remove from favorites handler
  const handleRemoveFavorite = async (item: Wallpaper) => {
    const newFavorites = favorites.filter((f) => f.id !== item.id);
    setFavorites(newFavorites);
    // Save to persistent storage
    await saveFavorites(newFavorites);
  };

  return (
    <ThemedView style={{ flex: 1, paddingTop: 32 }}>
      <ThemedText
        type="title"
        style={{
          margin: 16,
          color: isDark ? "#fff" : "#000",
        }}
      >
        ❤️ Favorites
      </ThemedText>
      {loading ? (
        <View style={[styles.centered, { paddingVertical: 40 }]}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <ThemedText
            style={{
              marginTop: 16,
              color: isDark ? "#ccc" : "#666",
              fontSize: 16,
            }}
          >
            Loading favorites...
          </ThemedText>
        </View>
      ) : favorites.length === 0 ? (
        <Animated.View
          style={[
            styles.centered,
            {
              paddingVertical: 40,
              paddingHorizontal: 20,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View
            style={{
              backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              borderWidth: 1,
              borderColor: isDark ? "#444" : "#e0e0e0",
              shadowColor: isDark ? "#000" : "#333",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <ThemedText
              style={{
                fontSize: 64,
                marginBottom: 16,
              }}
            >
              💔
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 8,
                color: isDark ? "#fff" : "#333",
                textAlign: "center",
              }}
            >
              No favorites yet
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 16,
                color: isDark ? "#ccc" : "#666",
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Start exploring wallpapers and tap the heart icon to save your
              favorites here!
            </ThemedText>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={{ gap: 14, padding: 14 }}
            columnWrapperStyle={{ gap: 14 }}
            renderItem={({ item }) => (
              <View style={{ width: 160, marginBottom: 14 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ borderRadius: 12, overflow: "hidden" }}
                  accessibilityLabel={`View wallpaper: ${item.title}`}
                  onPress={() => setPreviewUrl(item.url)}
                >
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: item.preview || item.url }} // Use preview for faster loading, fallback to full URL
                      style={{
                        width: 160,
                        height: 90,
                        borderRadius: 12,
                        backgroundColor: "#111",
                      }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                    {downloadingId === item.id && (
                      <View
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: 160,
                          height: 90,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          borderRadius: 12,
                        }}
                      >
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <ThemedText
                  numberOfLines={2}
                  style={{ fontSize: 12, marginTop: 4, marginHorizontal: 2 }}
                >
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
                    disabled={downloadingId === item.id}
                    style={{ opacity: downloadingId === item.id ? 0.6 : 1 }}
                  >
                    <Ionicons
                      name={
                        downloadingId === item.id
                          ? "download"
                          : "download-outline"
                      }
                      size={22}
                      color="#0a7ea4"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveFavorite(item)}
                    accessibilityLabel={`Remove from favorites: ${item.title}`}
                  >
                    <Ionicons name="heart" size={22} color="#e74c3c" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShare(item.url)}
                    accessibilityLabel={`Share wallpaper: ${item.title}`}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={22}
                      color="#0a7ea4"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </Animated.View>
      )}
      <ImagePreviewModal
        url={previewUrl}
        visible={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
});
