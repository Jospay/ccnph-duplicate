import { useAuthStore } from "@/store/useAuthStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "../../global.css";

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

      {/* 🔴 Solid white bottom bar covering the Android Navigation Bar region */}
      {Platform.OS === "android" && (
        <View style={{ height: insets.bottom, backgroundColor: "#ffffff" }} />
      )}
    </View>
  );
}

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const isCongratsPage = segments.some((s) => s.includes("congratulations"));

    if (!isLoading && token && !isCongratsPage) {
      router.replace("/(main)");
    }
  }, [isLoading, token, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar hidden={true} />

        <NavigationBarWrapper>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              navigationBarColor: "#ffffff",
              contentStyle: {
                backgroundColor: "#f8fafc",
              },
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen
              name="register"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen name="otpSend" />
            <Stack.Screen name="otpVerification" />
            <Stack.Screen name="successVerification" />
            <Stack.Screen name="createPassword" />
            <Stack.Screen name="congratulations" />
          </Stack>
        </NavigationBarWrapper>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
