import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "user-favorites-v2";

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

// Save an array of wallpaper objects with error handling
export async function saveFavorites(favorites: Wallpaper[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn('Failed to save favorites:', error);
  }
}

// Load an array of wallpaper objects with validation
export async function loadFavorites(): Promise<Wallpaper[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Validate each item has required properties
    return parsed.filter((item): item is Wallpaper => 
      item && 
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.url === 'string'
    );
  } catch (error) {
    console.warn('Failed to load favorites:', error);
    return [];
  }
}

// Add or remove a wallpaper object from favorites
export async function toggleFavorite(wallpaper: Wallpaper): Promise<Wallpaper[]> {
  const favs = await loadFavorites();
  const exists = favs.find((w) => w.id === wallpaper.id);
  
  let newFaves: Wallpaper[];
  if (exists) {
    newFaves = favs.filter((w) => w.id !== wallpaper.id);
  } else {
    newFaves = [wallpaper, ...favs];
  }
  
  await saveFavorites(newFaves);
  return newFaves;
}

// Check if a wallpaper is favorited
export async function isFavorite(id: string): Promise<boolean> {
  const favs = await loadFavorites();
  return favs.some((w) => w.id === id);
}
