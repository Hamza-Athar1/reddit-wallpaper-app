import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "user-settings-v1";

export type PersistedSettings = {
  isDark: boolean;
  subreddits: string[];
  duration: string;
  filterByResolution?: boolean;
  resizeToDevice?: boolean;
};

export async function saveSettings(settings: PersistedSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export async function loadSettings(): Promise<Partial<PersistedSettings>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
