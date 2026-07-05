import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import axios from "axios";
import {
  getLocalRecentlyViewed,
  addLocalRecentlyViewed,
  setLocalRecentlyViewed,
  LocalViewedItem,
} from "@/utils/recentlyViewed";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/recently-viewed`;

type RecentlyViewedContextType = {
  recentlyViewed: any[];
  trackView: (productId: string, userId?: string | null) => Promise<void>;
  syncOnLogin: (userId: string) => Promise<void>;
  loadLocal: () => Promise<void>;
};

const RecentlyViewedContext = createContext<
  RecentlyViewedContextType | undefined
>(undefined);

export const RecentlyViewedProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const syncInProgress = useRef(false);
  const { registerLoginSync, user } = useAuth();

  /**
   * Load the local recently viewed list into state.
   * Called on app startup or when user is anonymous.
   */
  const loadLocal = useCallback(async () => {
    const items = await getLocalRecentlyViewed();
    setRecentlyViewed(items);
  }, []);

  /**
   * Track a product view.
   * - Always writes to local storage immediately (offline-first).
   * - If userId is provided (authenticated), also fires a server request.
   */
  const trackView = useCallback(
    async (productId: string, userId?: string | null) => {
      // 1. Write locally first (instant)
      const localItems = await addLocalRecentlyViewed(productId);
      setRecentlyViewed(localItems);

      // 2. If authenticated, fire-and-forget to server
      if (userId) {
        try {
          await axios.post(`${API_BASE}/view`, { userId, productId });
        } catch (err) {
          // Silently fail — local storage is the source of truth until next sync
          console.warn("Failed to sync view to server:", err);
        }
      }
    },
    []
  );

  /**
   * Sync local history with server on login.
   * Sends local items to the server merge endpoint,
   * receives the merged list, and replaces local storage.
   */
  const syncOnLogin = useCallback(async (userId: string) => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;

    try {
      const localItems = await getLocalRecentlyViewed();

      // Call the server merge endpoint
      const res = await axios.post(`${API_BASE}/sync`, {
        userId,
        localItems,
      });

      // The server returns the merged, populated items
      const mergedItems = res.data;

      // Update local storage with the merged result
      // Store only productId + viewedAt locally
      const localVersion: LocalViewedItem[] = mergedItems.map((item: any) => ({
        productId:
          typeof item.productId === "object"
            ? item.productId._id
            : item.productId,
        viewedAt: item.viewedAt,
      }));
      await setLocalRecentlyViewed(localVersion);

      // Update state with the full populated data from server
      setRecentlyViewed(mergedItems);
    } catch (err) {
      console.warn("Failed to sync recently viewed on login:", err);
      // Fall back to local data
      await loadLocal();
    } finally {
      syncInProgress.current = false;
    }
  }, [loadLocal]);

  useEffect(() => {
    // Register the sync callback for future login transitions
    registerLoginSync(syncOnLogin);

    // Load initial data
    if (user && user._id) {
      syncOnLogin(user._id);
    } else {
      loadLocal();
    }
  }, [user, registerLoginSync, syncOnLogin, loadLocal]);

  return (
    <RecentlyViewedContext.Provider
      value={{ recentlyViewed, trackView, syncOnLogin, loadLocal }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) {
    throw new Error(
      "useRecentlyViewed must be used within a RecentlyViewedProvider"
    );
  }
  return ctx;
};
