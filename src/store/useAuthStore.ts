// import * as SecureStore from "expo-secure-store";
// import { create } from "zustand";

// interface AuthState {
//   token: string | null;
//   user: any | null;
//   isLoading: boolean;
//   hydrated: boolean;

//   setAuth: (token: string, user: any) => Promise<void>;
//   setUser: (user: any) => Promise<void>;
//   refreshUser: () => Promise<void>;
//   clearAuth: () => Promise<void>;
//   initialize: () => Promise<void>;
// }

// const flattenUser = (obj: any) => {
//   if (!obj) return null;
//   if (obj.data?.attributes) return { id: obj.data.id, ...obj.data.attributes };
//   if (obj.attributes) return { id: obj.id, ...obj.attributes };
//   if (obj.data) return obj.data;
//   return obj;
// };

// export const useAuthStore = create<AuthState>((set, get) => ({
//   token: null,
//   user: null,
//   isLoading: true,
//   hydrated: false,

//   initialize: async () => {
//     try {
//       const token = await SecureStore.getItemAsync("auth_token");
//       const userStr = await SecureStore.getItemAsync("user_data");

//       if (token) {
//         set({ token });
//       }

//       if (userStr) {
//         set({ user: JSON.parse(userStr) });
//       }

//       set({ hydrated: true, isLoading: false });

//       if (token) {
//         setTimeout(() => {
//           get().refreshUser();
//         }, 0);
//       }
//     } catch (e) {
//       console.error("Failed to initialize auth store:", e);
//       await SecureStore.deleteItemAsync("auth_token");
//       await SecureStore.deleteItemAsync("user_data");
//       set({ token: null, user: null, hydrated: true, isLoading: false });
//     }
//   },

//   refreshUser: async () => {
//     try {
//       const { token } = get();
//       if (!token) return;

//       const api = (await import("@/services/api")).default;

//       const response = await api.get("/profile");
//       const freshUser = flattenUser(response.data);

//       await SecureStore.setItemAsync("user_data", JSON.stringify(freshUser));
//       set({ user: freshUser });
//     } catch (e) {
//       console.error("Auth Store: Failed to sync user data:", e);
//     }
//   },

//   setAuth: async (token: string, user: any) => {
//     try {
//       const userRaw = typeof user === "string" ? JSON.parse(user) : user;
//       const userObject = flattenUser(userRaw);

//       await SecureStore.setItemAsync("auth_token", token);
//       await SecureStore.setItemAsync("user_data", JSON.stringify(userObject));

//       set({
//         token,
//         user: userObject,
//         isLoading: false,
//         hydrated: true,
//       });
//     } catch (e) {
//       console.error("Error saving auth session:", e);
//       throw e;
//     }
//   },

//   setUser: async (user) => {
//     try {
//       const currentState = get();
//       const userUpdate = flattenUser(user);
//       const updatedUser = { ...currentState.user, ...userUpdate };

//       await SecureStore.setItemAsync("user_data", JSON.stringify(updatedUser));

//       set({ user: updatedUser });
//     } catch (e) {
//       console.error("Error updating user data:", e);
//     }
//   },

//   clearAuth: async () => {
//     try {
//       await SecureStore.deleteItemAsync("auth_token");
//       await SecureStore.deleteItemAsync("user_data");

//       set({
//         token: null,
//         user: null,
//         isLoading: false,
//         hydrated: true,
//       });
//     } catch (e) {
//       console.error("Error clearing auth session:", e);
//     }
//   },
// }));

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  hydrated: boolean;

  setAuth: (token: string, user: any) => Promise<void>;
  setUser: (user: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuth: () => Promise<void>;
  initialize: () => Promise<void>;
}

const storage = {
  async getItem(key: string) {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      }

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

  if (obj.data?.attributes) {
    return {
      id: obj.data.id,
      ...obj.data.attributes,
    };
  }

  if (obj.attributes) {
    return {
      id: obj.id,
      ...obj.attributes,
    };
  }

  if (obj.data) {
    return obj.data;
  }

  return obj;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  hydrated: false,

  initialize: async () => {
    try {
      const token = await storage.getItem("auth_token");
      const userStr = await storage.getItem("user_data");

      if (token) {
        set({ token });
      }

      if (userStr) {
        set({ user: JSON.parse(userStr) });
      }

      set({
        hydrated: true,
        isLoading: false,
      });

      if (token) {
        setTimeout(() => {
          get().refreshUser();
        }, 0);
      }
    } catch (e) {
      console.error("Failed to initialize auth store:", e);

      await storage.removeItem("auth_token");
      await storage.removeItem("user_data");

      set({
        token: null,
        user: null,
        hydrated: true,
        isLoading: false,
      });
    }
  },

  refreshUser: async () => {
    try {
      const { token } = get();

      if (!token) return;

      const api = (await import("@/services/api")).default;

      const response = await api.get("/profile");

      const freshUser = flattenUser(response.data);

      await storage.setItem("user_data", JSON.stringify(freshUser));

      set({
        user: freshUser,
      });
    } catch (e) {
      console.error("Auth Store: Failed to sync user data:", e);
    }
  },

  setAuth: async (token: string, user: any) => {
    try {
      const userRaw = typeof user === "string" ? JSON.parse(user) : user;

      const userObject = flattenUser(userRaw);

      await storage.setItem("auth_token", token);

      await storage.setItem("user_data", JSON.stringify(userObject));

      set({
        token,
        user: userObject,
        isLoading: false,
        hydrated: true,
      });
    } catch (e) {
      console.error("Error saving auth session:", e);
      throw e;
    }
  },

  setUser: async (user) => {
    try {
      const currentState = get();

      const userUpdate = flattenUser(user);

      const updatedUser = {
        ...currentState.user,
        ...userUpdate,
      };

      await storage.setItem("user_data", JSON.stringify(updatedUser));

      set({
        user: updatedUser,
      });
    } catch (e) {
      console.error("Error updating user data:", e);
    }
  },

  clearAuth: async () => {
    try {
      await storage.removeItem("auth_token");
      await storage.removeItem("user_data");

      set({
        token: null,
        user: null,
        isLoading: false,
        hydrated: true,
      });
    } catch (e) {
      console.error("Error clearing auth session:", e);
    }
  },
}));
