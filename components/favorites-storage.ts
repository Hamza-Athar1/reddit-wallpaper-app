import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "user-favorites-v1";

export async function saveFavorites(favorites: string[]) {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

export async function loadFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
