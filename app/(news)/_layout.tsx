import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

// --- MAIN BUSINESS LAYOUT ---
export default function BusinessLayout() {
  const { token, isLoading } = useAuthStore(); // Access auth state
  const pathname = usePathname();
  const router = useRouter();

  // 1. LOADING GATE: Wait for SecureStore check
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  // 2. SECURITY GATE: If no token exists, send back to login
  if (!token) {
    return <Redirect href="/login" />;
  }

  // --- ROUTE DISPLAY TITLE ---
  const getRouteTitle = (path: string) => {
    if (path.includes("details")) return "News Details";
    if (path.includes("search")) return "Search News";
    return "News & Events";
  };

  const title = getRouteTitle(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationBarWrapper>
        <StatusBar hidden={true} />

        <View className="flex-1 bg-white">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            {/* --- GLOBAL HEADER --- */}
            <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4">
              <View className="flex-row justify-between items-center w-full px-6">
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{ width: 31 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>

                <Text
                  className="text-white text-2xl font-bold text-center flex-1"
                  numberOfLines={1}
                >
                  {title}
                </Text>

                <View style={{ width: 31 }} />
              </View>
            </View>

            {/* --- MAIN CONTENT AREA --- */}
            <View className="flex-1">
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  contentStyle: { backgroundColor: "transparent" },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="details" />
                <Stack.Screen name="search" />
              </Stack>
            </View>
          </KeyboardAvoidingView>
        </View>
      </NavigationBarWrapper>
    </QueryClientProvider>
  );
}
