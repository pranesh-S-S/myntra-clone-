import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 20;

export type LocalViewedItem = {
  productId: string;
  viewedAt: string; // ISO string
};

// --- Platform-aware read/write (matches storage.ts pattern) ---

async function readStorage(): Promise<LocalViewedItem[]> {
  try {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {
    return [];
  }
}

async function writeStorage(items: LocalViewedItem[]): Promise<void> {
  const json = JSON.stringify(items);
  if (Platform.OS === "web") {
    localStorage.setItem(STORAGE_KEY, json);
  } else {
    await AsyncStorage.setItem(STORAGE_KEY, json);
  }
}

// --- Public API ---

/**
 * Get the locally-stored recently viewed list (most-recent-first).
 */
export async function getLocalRecentlyViewed(): Promise<LocalViewedItem[]> {
  return readStorage();
}

/**
 * Add a product view locally. Deduplicates (moves to top) and caps at 20.
 */
export async function addLocalRecentlyViewed(
  productId: string
): Promise<LocalViewedItem[]> {
  const items = await readStorage();

  // Remove existing entry for this product (dedup)
  const filtered = items.filter((item) => item.productId !== productId);

  // Add to the front with current timestamp
  const updated: LocalViewedItem[] = [
    { productId, viewedAt: new Date().toISOString() },
    ...filtered,
  ].slice(0, MAX_ITEMS);

  await writeStorage(updated);
  return updated;
}

/**
 * Replace the local list entirely (used after merge sync).
 */
export async function setLocalRecentlyViewed(
  items: LocalViewedItem[]
): Promise<void> {
  await writeStorage(items.slice(0, MAX_ITEMS));
}

/**
 * Clear the local recently viewed list.
 */
export async function clearLocalRecentlyViewed(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
