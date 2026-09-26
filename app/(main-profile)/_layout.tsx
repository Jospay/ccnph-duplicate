import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import {
  Slot,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --------------------------------------------------
// NAVIGATION BAR WRAPPER
// --------------------------------------------------

function NavigationBarWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

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
    <View
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
    >
      <View style={{ flex: 1 }}>{children}</View>

      {Platform.OS === "android" && (
        <View
          style={{
            height: insets.bottom,
            backgroundColor: "#ffffff",
          }}
        />
      )}
    </View>
  );
}

// --------------------------------------------------
// CUSTOM HEADER
// --------------------------------------------------

function CustomHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();

  const historyRef = useRef<string[]>([]);

  // --------------------------------------------------
  // ROUTE HISTORY
  // --------------------------------------------------

  useEffect(() => {
    const currentHref = pathname;

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
  }, [pathname]);

  // --------------------------------------------------
  // BACK BUTTON
  // --------------------------------------------------

  const handleBackPress = () => {
    try {
      const stack = historyRef.current;

      if (stack.length > 1) {
        stack.pop();

        const previousRoute = stack[stack.length - 1];

        if (previousRoute) {
          router.replace(previousRoute as any);
          return;
        }
      }

      if (params.from === "home") {
        router.replace("/(main)");
        return;
      }

      router.replace("/(main)/profile");
    } catch (error) {
      console.error("Profile back navigation error:", error);

      router.replace("/(main)/profile");
    }
  };

  // --------------------------------------------------
  // HEADER TITLE
  // --------------------------------------------------

  const isProfileEdit = pathname.includes("editProfile");
  const isProfileSetup = pathname.includes("setupProfile");
  const isCongratulations = pathname.includes("congratulations");
  const isChangePassword = pathname.includes("changePassword");
  const isBiometric = pathname.includes("biometricSettings");
  const isDeleteAccount = pathname.includes("deleteAccount");
  const isDeleteVerification = pathname.includes("deleteVerification");

  const title = isProfileEdit
    ? "Edit Profile"
    : isProfileSetup
      ? "Setup Profile"
      : isCongratulations
        ? "Profile"
        : isChangePassword
          ? "Security & Password"
          : isBiometric
            ? "Quick & Secure Login"
            : isDeleteAccount
              ? "Account Deletion"
              : isDeleteVerification
                ? "Deletion Verification"
                : "";

  if (!title) {
    return null;
  }

  return (
    <View
      className="bg-primary w-full items-center rounded-b-2xl"
      style={{
        paddingTop: 56,
        paddingBottom: 16,
      }}
    >
      <View className="flex-row justify-between items-center w-full px-6">
        {!isCongratulations ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={{
              width: 31,
            }}
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            }}
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 31 }} />
        )}

        <Text
          className="text-white text-2xl font-bold text-center flex-1"
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={{ width: 31 }} />
      </View>
    </View>
  );
}

// --------------------------------------------------
// MAIN PROFILE LAYOUT
// --------------------------------------------------

export default function MainProfileLayout() {
  return (
    <KeyboardProvider>
      <NavigationBarWrapper>
        <StatusBar hidden={true} />

        <CustomHeader />

        <Slot />
      </NavigationBarWrapper>
    </KeyboardProvider>
  );
}
