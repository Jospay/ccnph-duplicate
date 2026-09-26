import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import {
  Slot,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import "../../global.css";

const queryClient = new QueryClient();

// --- NAVIGATION BAR WRAPPER ---
function NavigationBarWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const setupNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync("visible");
        await NavigationBar.setButtonStyleAsync("dark");
      } catch (error) {
        console.log("NavigationBar setup error:", error);
      }
    };

    setupNavigationBar();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ flex: 1 }}>{children}</View>

      {/* Solid white bottom bar covering Android Navigation Bar */}
      {Platform.OS === "android" && (
        <View style={{ height: insets.bottom, backgroundColor: "#ffffff" }} />
      )}
    </View>
  );
}

// --- CUSTOM HEADER COMPONENT ---
function CustomHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // --- ROUTE & HISTORY TRACKING ---
  const currentHref = useMemo(() => {
    const qs = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        },
        {} as Record<string, string>,
      ),
    ).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, params]);

  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    const stack = historyRef.current;
    const top = stack[stack.length - 1];
    const belowTop = stack[stack.length - 2];

    if (top === currentHref) {
      return;
    }
    if (belowTop === currentHref) {
      stack.pop();
      return;
    }
    stack.push(currentHref);
  }, [currentHref]);

  // --- SMART BACK PRESS HANDLER ---
  const handleBackPress = () => {
    try {
      const stack = historyRef.current;

      if (stack.length > 1) {
        stack.pop();
        const prevHref = stack[stack.length - 1];
        console.log("↩️ [Coop Back] Popping to", prevHref);
        router.replace(prevHref as any);
        return;
      }

      if (params.from === "notification") {
        console.log("↩️ [Coop Back] Returning to notification");
        router.replace("/(main)/notification");
        return;
      }
      if (params.from === "home") {
        console.log("↩️ [Coop Back] Returning to home");
        router.replace("/(main)/");
        return;
      }

      // Default fallback if opened directly or no history
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)/");
      }
    } catch (e) {
      console.log("Back navigation error:", e);
      router.replace("/(main)/");
    }
  };

  return (
    <View>
      <StatusBar hidden={true} />

      {/* --- GLOBAL HEADER --- */}
      <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4">
        <View className="flex-row justify-between items-center w-full px-6">
          <TouchableOpacity
            onPress={handleBackPress}
            style={{ width: 31 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>

          <Text
            className="text-white text-2xl font-bold text-center flex-1"
            numberOfLines={1}
          >
            Coop Membership
          </Text>

          <View style={{ width: 31 }} />
        </View>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationBarWrapper>
        <CustomHeader />
        <View className="flex-1">
          <Slot />
        </View>
      </NavigationBarWrapper>
    </QueryClientProvider>
  );
}
