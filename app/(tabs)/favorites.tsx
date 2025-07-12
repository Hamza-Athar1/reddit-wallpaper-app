import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image as RNImage,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { loadFavorites } from "../../components/favorites-storage";
import { ThemedText } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
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
  const [favorites, setFavorites] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reload favorites every time the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        setLoading(true);
        const favs = await loadFavorites();
        if (isActive) setFavorites(Array.isArray(favs) ? favs : []);
        setLoading(false);
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <ThemedView style={{ flex: 1, paddingTop: 32 }}>
      <ThemedText type="title" style={{ margin: 16 }}>
        Favorites
      </ThemedText>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText>No favorites yet.</ThemedText>
        </View>
      ) : (
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
                  <RNImage
                    source={{ uri: item.url }}
                    style={{
                      width: 160,
                      height: 90,
                      borderRadius: 12,
                      backgroundColor: "#111",
                    }}
                    resizeMode="cover"
                  />
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
                  onPress={() => {
                    // Download logic: open image in new tab for web, or use download logic for native
                    if (
                      typeof window !== "undefined" &&
                      window.navigator &&
                      window.navigator.userAgent
                    ) {
                      window.open(item.url, "_blank");
                    } else {
                      // Optionally implement native download logic here
                    }
                  }}
                  accessibilityLabel={`Download wallpaper: ${item.title}`}
                >
                  <Ionicons name="download-outline" size={22} color="#0a7ea4" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setFavorites((prev) =>
                      prev.filter((f) => f.id !== item.id)
                    );
                  }}
                  accessibilityLabel={`Unfavorite wallpaper: ${item.title}`}
                >
                  <Ionicons name={"heart"} size={22} color="#e74c3c" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.navigator &&
                      window.navigator.share
                    ) {
                      window.navigator.share({ url: item.url });
                    } else {
                      // Optionally implement native share logic here
                    }
                  }}
                  accessibilityLabel={`Share a: ${item.title}`}
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
