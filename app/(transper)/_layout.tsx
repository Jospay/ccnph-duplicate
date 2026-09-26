// Polyfill global Buffer for React Native / Expo
import { Buffer } from "buffer";

import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import "../../global.css";
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

const queryClient = new QueryClient();

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
      {Platform.OS === "android" && (
        <View style={{ height: insets.bottom, backgroundColor: "#ffffff" }} />
      )}
    </View>
  );
}

export default function BusinessLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isLoading } = useAuthStore();

  const isScannerScreen = pathname.includes("scanqrcode");

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationBarWrapper>
          <StatusBar hidden={isScannerScreen} />

          <View className="flex-1 bg-white">
            {/* GLOBAL HEADER (Hidden on Scan QR Code Screen) */}
            {!isScannerScreen && (
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
                    Transfer Funds
                  </Text>

                  <View style={{ width: 31 }} />
                </View>
              </View>
            )}

            {/* ROUTE STACK */}
            <View className="flex-1">
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  contentStyle: { backgroundColor: "transparent" },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="scanqrcode" />
              </Stack>
            </View>
          </View>
        </NavigationBarWrapper>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
