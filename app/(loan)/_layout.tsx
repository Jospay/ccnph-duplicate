import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import {
  Stack,
  useLocalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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

// --- MAIN LAYOUT ---
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ from?: string }>();
  const segments = useSegments() as string[];

  const isCongratulationsPage = segments.some((s) => s === "congratulations");
  const isSharedCapital =
    pathname === "/shared-breakdown" ||
    pathname === "/shared-checkout" ||
    pathname === "/shared-payment" ||
    pathname === "/shared-qrph";

  const isLoanIndex =
    segments.length === 0 ||
    segments[segments.length - 1] === "index" ||
    (segments.includes("(loan)") && segments.length === 1);

  // --- HISTORY STACK TRACKING ---
  const currentHref = React.useMemo(() => {
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
      // same screen re-render, ignore
      return;
    }
    if (belowTop === currentHref) {
      // we've moved BACK to the previous tracked entry
      // (e.g. hardware back / swipe gesture) — sync by popping
      stack.pop();
      return;
    }
    // otherwise this is a forward navigation — track it
    stack.push(currentHref);
  }, [currentHref]);

  const handleBackPress = () => {
    try {
      const stack = historyRef.current;

      if (stack.length > 1) {
        // We're deeper than the entry screen — step back one screen within this group.
        stack.pop();
        const prevHref = stack[stack.length - 1];
        console.log("↩️ [Loan Back] Popping to", prevHref);
        router.replace(prevHref as any);
        return;
      }

      // We're at the entry screen of this group — exit based on how we originally arrived.
      if (params.from === "notification") {
        console.log("↩️ [Loan Back] Entry screen, returning to notification");
        router.replace("/(main)/notification");
        return;
      }
      console.log("↩️ [Loan Back] Entry screen, returning to home");
      router.replace("../(main)/");
    } catch (e) {
      console.error("❌ [Loan Back] Error:", e);
      router.replace("../(main)/");
    }
  };

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
              <View className="flex-row justify-between w-full px-6 items-center">
                {/* --- DYNAMIC BACK BUTTON --- */}
                <View className="w-[31px]">
                  {/* Back button is strictly hidden on the congratulations page */}
                  {!isCongratulationsPage && (
                    <TouchableOpacity onPress={handleBackPress}>
                      <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                  )}
                </View>

                <View>
                  <Text className="text-white text-2xl font-bold">
                    {isSharedCapital ? "Shared Capital" : "Loan Assistance"}
                  </Text>
                </View>

                <View className="w-[31px]" />
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
                <Stack.Screen name="congratulations" />
              </Stack>
            </View>
          </KeyboardAvoidingView>
        </View>
      </NavigationBarWrapper>
    </QueryClientProvider>
  );
}
