import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "user-favorites-v2";

// Save an array of wallpaper objects
export async function saveFavorites(favorites: any[]) {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

// Load an array of wallpaper objects
export async function loadFavorites(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Add or remove a wallpaper object from favorites
export async function toggleFavorite(wallpaper: any) {
  const favs = await loadFavorites();
  const exists = favs.find((w: any) => w.id === wallpaper.id);
  let newFaves;
  if (exists) {
    newFaves = favs.filter((w: any) => w.id !== wallpaper.id);
  } else {
    newFaves = [wallpaper, ...favs];
  }
  await saveFavorites(newFaves);
  return newFaves;
}

// Check if a wallpaper is favorited
export async function isFavorite(id: string): Promise<boolean> {
  const favs = await loadFavorites();
  return favs.some((w: any) => w.id === id);
}
