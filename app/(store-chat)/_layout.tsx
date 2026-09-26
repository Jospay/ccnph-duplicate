// app/(store)/layout.tsx
import * as NavigationBar from "expo-navigation-bar";
import { Slot, useLocalSearchParams, usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1 }}>{children}</View>

      {/* Solid white bottom bar covering Android Navigation Bar */}
      {Platform.OS === "android" && (
        <View style={{ height: insets.bottom, backgroundColor: "#ffffff" }} />
      )}
    </View>
  );
}

// --- MAIN LAYOUT ---
export default function StoreChatLayout() {
  const pathname = usePathname();
  const params = useLocalSearchParams();

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
      // same screen re-render, ignore
      return;
    }
    if (belowTop === currentHref) {
      // moved BACK via swipe/hardware — sync stack by popping
      stack.pop();
      return;
    }
    // forward navigation — track it
    stack.push(currentHref);
  }, [currentHref]);

  return (
    <NavigationBarWrapper>
      <StatusBar hidden={true} />
      <Slot />
    </NavigationBarWrapper>
  );
}
