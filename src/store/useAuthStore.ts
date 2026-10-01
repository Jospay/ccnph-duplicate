import type { CoopBranding } from "@/services/cooperativeService";
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: any | null;
  cooperative: CoopBranding | null;
  isLoading: boolean;
  hydrated: boolean;

  setAuth: (
    token: string,
    user: any,
    cooperative?: CoopBranding | null,
  ) => Promise<void>;
  setUser: (user: any) => Promise<void>;
  setCooperative: (coop: CoopBranding | null) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuth: () => Promise<void>;
  initialize: () => Promise<void>;
}

const storage = {
  async getItem(key: string) {
    try {
      if (Platform.OS === "web") return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error("Storage getItem error:", e);
      return null;
    }
  },

  async setItem(key: string, value: string) {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error("Storage setItem error:", e);
    }
  },

  async removeItem(key: string) {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error("Storage removeItem error:", e);
    }
  },
};

const flattenUser = (obj: any) => {
  if (!obj) return null;
  if (obj.data?.attributes) return { id: obj.data.id, ...obj.data.attributes };
  if (obj.attributes) return { id: obj.id, ...obj.attributes };
  if (obj.data) return obj.data;
  return obj;
};

// Keep only the 3 fields we need, whatever shape the API sends
// ({ cooperative: {...} }, { data: {...} } or the plain object).
const toBranding = (raw: any): CoopBranding | null => {
  const c = raw?.cooperative ?? raw?.data ?? raw;
  if (!c || (!c.primary_color && !c.secondary_color && !c.logo)) return null;
  return {
    primary_color: c.primary_color,
    secondary_color: c.secondary_color,
    logo: c.logo ?? null,
  };
};

// Cache the logo, but never block login for more than 1.5s.
const prefetchLogo = async (logo?: string | null) => {
  if (!logo) return;
  try {
    await Promise.race([
      Image.prefetch(logo),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {}
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  cooperative: null,
  isLoading: true,
  hydrated: false,

  initialize: async () => {
    try {
      const token = await storage.getItem("auth_token");
      const userStr = await storage.getItem("user_data");
      const coopStr = await storage.getItem("coop_data");

      if (token) set({ token });
      if (userStr) set({ user: JSON.parse(userStr) });
      if (coopStr) set({ cooperative: JSON.parse(coopStr) });

      set({ hydrated: true, isLoading: false });

      if (token) {
        setTimeout(() => get().refreshUser(), 0);
      }
    } catch (e) {
      console.error("Failed to initialize auth store:", e);

      await storage.removeItem("auth_token");
      await storage.removeItem("user_data");
      await storage.removeItem("coop_data");

      set({
        token: null,
        user: null,
        cooperative: null,
        hydrated: true,
        isLoading: false,
      });
    }
  },

  refreshUser: async () => {
    const { token } = get();
    if (!token) return;

    // 1. Profile
    try {
      const api = (await import("@/services/api")).default;
      const response = await api.get("/profile");
      const freshUser = flattenUser(response.data);

      await storage.setItem("user_data", JSON.stringify(freshUser));
      set({ user: freshUser });
    } catch (e) {
      console.error("Auth Store: Failed to sync user data:", e);
    }

    // 2. Branding (separate block, so a /profile failure never skips it)
    try {
      const { cooperativeService } =
        await import("@/services/cooperativeService");
      const coop = toBranding(await cooperativeService.getMyCooperative());

      if (coop) {
        await prefetchLogo(coop.logo);
        await get().setCooperative(coop);
      }
    } catch (e) {
      console.error("Auth Store: Failed to sync cooperative:", e);
    }
  },

  setAuth: async (token, user, cooperative = null) => {
    try {
      const userRaw = typeof user === "string" ? JSON.parse(user) : user;
      const userObject = flattenUser(userRaw);
      const coop = toBranding(cooperative);

      await storage.setItem("auth_token", token);
      await storage.setItem("user_data", JSON.stringify(userObject));

      if (coop) {
        await storage.setItem("coop_data", JSON.stringify(coop));
        await prefetchLogo(coop.logo); // logo is cached before home renders
      } else {
        await storage.removeItem("coop_data");
      }

      set({
        token,
        user: userObject,
        cooperative: coop,
        isLoading: false,
        hydrated: true,
      });
    } catch (e) {
      console.error("Error saving auth session:", e);
      throw e;
    }
  },

  setCooperative: async (coop) => {
    if (coop) await storage.setItem("coop_data", JSON.stringify(coop));
    else await storage.removeItem("coop_data");
    set({ cooperative: coop });
  },

  setUser: async (user) => {
    try {
      const currentState = get();
      const userUpdate = flattenUser(user);
      const updatedUser = { ...currentState.user, ...userUpdate };

      await storage.setItem("user_data", JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (e) {
      console.error("Error updating user data:", e);
    }
  },

  clearAuth: async () => {
    try {
      await storage.removeItem("auth_token");
      await storage.removeItem("user_data");
      await storage.removeItem("coop_data");

      set({
        token: null,
        user: null,
        cooperative: null,
        isLoading: false,
        hydrated: true,
      });
    } catch (e) {
      console.error("Error clearing auth session:", e);
    }
  },
}));
