import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeartBlue from "../../assets/images/icon/heartblue.png";
import HeartGrey from "../../assets/images/icon/heartgrey.png";

import LikeBlue from "../../assets/images/icon/likeblue.png";
import LikeGrey from "../../assets/images/icon/likegrey.png";

import NotifBlue from "../../assets/images/icon/notifblue.png";
import NotifGrey from "../../assets/images/icon/notifgrey.png";

import ProfileBlue from "../../assets/images/icon/profileblue.png";
import ProfileGrey from "../../assets/images/icon/profilegrey.png";

import api from "@/services/api";
import echo from "@/services/echo";
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

  const isHome = pathname === "/home" || pathname === "/(store)/home";

  const isCollection =
    pathname === "/collection" || pathname === "/(store)/collection";

  const isNotification =
    pathname === "/notification" || pathname === "/(store)/notification";

  const isProfile = pathname === "/profile" || pathname === "/(store)/profile";

  const showFooter = isHome || isCollection || isNotification || isProfile;

  const isCart = pathname === "/cart";
  const isCheckout = pathname === "/checkout";
  const isOrrderList = pathname === "/order-list";
  const isChatList = pathname === "/chat-list";
  const isChatSeller =
    pathname === "/chat-seller" || pathname === "/(store-chat)";
  const isProducts = pathname.startsWith("/products/");
  const isShop = pathname === "/store";

  // Ref so the echo listener always knows the latest screen without
  // re-subscribing every time pathname changes (mirrors intellectual layout).
  const isChatSellerRef = useRef(isChatSeller);
  useEffect(() => {
    isChatSellerRef.current = isChatSeller;
  }, [isChatSeller]);

  // ===== Notification & Global Unread Badging State =====
  const [userId, setUserId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notification, setNotification] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  // ===== Fetch Current User ID & Initial Unread Count =====
  useEffect(() => {
    api
      .get("/profile")
      .then((res) => {
        const rawData = res.data?.data;
        const id = rawData?.id || res.data?.id || res.data?.user?.id;

        if (id) {
          console.log("✅ Store layout User ID fetched for notifications:", id);
          setUserId(id);
          fetchUnreadCount();
        } else {
          console.log("⚠️ Could not find User ID in response:", res.data);
        }
      })
      .catch((err) =>
        console.error(
          "❌ Failed to fetch user profile for store notifications",
          err,
        ),
      );
  }, []);

  // Re-sync unread count whenever we land back on a non-chat screen
  useEffect(() => {
    if (userId && !isChatSeller && !isChatList) {
      fetchUnreadCount();
    }
  }, [pathname, userId]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/shop-conversations");
      const data = res.data?.data || res.data || [];
      const total = data.reduce(
        (sum: number, item: any) => sum + (item.unread_count || 0),
        0,
      );
      setUnreadCount(total);
    } catch (err) {
      console.error(
        "Failed to fetch initial unread count in store layout:",
        err,
      );
    }
  };

  // ===== Subscribe to Real-time Notifications =====
  useEffect(() => {
    if (!userId || !echo) return;

    const channelName = `App.Models.User.${userId}`;
    const channel = echo.private(channelName);

    channel.subscribed(() => {
      console.log(
        `✅ Subscribed to global store notification channel: ${channelName}`,
      );
    });

    channel.notification((notificationData: any) => {
      console.log("🔔 New Shop Notification Received:", notificationData);

      setUnreadCount((prev) => prev + 1);

      // Don't show the toast if the user is already inside a chat screen
      if (isChatSellerRef.current) {
        console.log(
          "🔕 User is currently in the seller chat screen, ignoring toast.",
        );
        return;
      }

      setNotification(notificationData);

      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        closeNotification();
      }, 5000);
    });

    return () => {
      if (echo) {
        echo.leave(channelName);
        console.log(`👋 Left store notification channel: ${channelName}`);
      }
    };
  }, [userId]);

  const closeNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  };

  const handleNotificationPress = () => {
    if (!notification?.shop_id) return;

    const { shop_id, shop_name } = notification;
    closeNotification();

    router.push({
      pathname: "/(store-chat)/",
      params: {
        storeId: String(shop_id),
        storeName: shop_name || "Seller",
      },
    });
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
            {/* --- NOTIFICATION TOAST --- */}
            {notification && (
              <Animated.View
                style={{
                  transform: [{ translateY: slideAnim }],
                  position: "absolute",
                  top: 0,
                  left: 16,
                  right: 16,
                  zIndex: 999,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleNotificationPress}
                  className="bg-white rounded-2xl p-4 shadow-lg flex-row items-center border border-slate-100"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  <View className="bg-[#0084FF]/10 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={20}
                      color="#034194"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-bold text-sm">
                      {notification.shop_name || "New Message"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-slate-500 text-xs mt-0.5"
                    >
                      {notification.body || "You received a new message."}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeNotification} className="p-2">
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* HEADER */}
            {!isProfile && !isProducts && (
              <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4">
                <View className="flex-row justify-between items-center w-full px-6">
                  <View className="w-[31px]">
                    <TouchableOpacity onPress={() => router.back()}>
                      <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-white text-2xl font-bold">
                    {isCart
                      ? "My Shopping Cart"
                      : isCheckout
                        ? "Checkout"
                        : isOrrderList
                          ? "My Purchases"
                          : isChatList
                            ? "Messages"
                            : isChatSeller
                              ? "Seller"
                              : isShop
                                ? "Store Shop"
                                : "FISMPC Online Store"}
                  </Text>

                  {/* Right Side: Message Icon with Unread Badge (hidden on chat screens) */}
                  {!isChatList && !isChatSeller ? (
                    <View className="w-[31px] items-end">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/chat-list")}
                        className="relative p-1"
                      >
                        <Ionicons
                          name="chatbubbles-outline"
                          size={24}
                          color="white"
                        />
                        {unreadCount > 0 && (
                          <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-primary">
                            <Text className="text-white text-[10px] font-extrabold text-center">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="w-[31px]" />
                  )}
                </View>
              </View>
            )}

            {/* CONTENT */}
            <View className="flex-1">
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  contentStyle: {
                    backgroundColor: "transparent",
                  },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(store)/cart" />
                <Stack.Screen name="/products/" />
                <Stack.Screen name="(store)/profile" />
              </Stack>
            </View>

            {/* FOOTER */}
            {showFooter && (
              <View
                style={{
                  width: "100%",
                  height: 80,
                }}
                className="bg-blue justify-center"
              >
                <View className="flex-row items-center justify-around w-full">
                  {/* FOR YOU */}
                  <TouchableOpacity
                    className="items-center flex-1"
                    onPress={() => router.push("/home")}
                  >
                    <Image
                      source={isHome ? LikeBlue : LikeGrey}
                      style={{
                        width: 26,
                        height: 26,
                      }}
                      resizeMode="contain"
                    />

                    <Text
                      className={
                        isHome
                          ? "text-primary text-xs mt-2 font-bold"
                          : "text-gray-500 text-xs mt-2"
                      }
                    >
                      For you
                    </Text>
                  </TouchableOpacity>

                  {/* COLLECTION */}
                  <TouchableOpacity
                    className="items-center flex-1"
                    onPress={() => router.push("/collection")}
                  >
                    <Image
                      source={isCollection ? HeartBlue : HeartGrey}
                      style={{
                        width: 26,
                        height: 26,
                      }}
                      resizeMode="contain"
                    />

                    <Text
                      className={
                        isCollection
                          ? "text-primary text-xs mt-2 font-bold"
                          : "text-gray-500 text-xs mt-2"
                      }
                    >
                      Collection
                    </Text>
                  </TouchableOpacity>

                  {/* NOTIFICATION */}
                  <TouchableOpacity
                    className="items-center flex-1"
                    onPress={() => router.push("/(store)/notification")}
                  >
                    <Image
                      source={isNotification ? NotifBlue : NotifGrey}
                      style={{
                        width: 26,
                        height: 26,
                      }}
                      resizeMode="contain"
                    />

                    <Text
                      className={
                        isNotification
                          ? "text-primary text-xs mt-2 font-bold"
                          : "text-gray-500 text-xs mt-2"
                      }
                    >
                      Notification
                    </Text>
                  </TouchableOpacity>

                  {/* PROFILE */}
                  <TouchableOpacity
                    className="items-center flex-1"
                    onPress={() => router.push("/(store)/profile")}
                  >
                    <Image
                      source={isProfile ? ProfileBlue : ProfileGrey}
                      style={{
                        width: 26,
                        height: 26,
                      }}
                      resizeMode="contain"
                    />

                    <Text
                      className={
                        isProfile
                          ? "text-primary text-xs mt-2 font-bold"
                          : "text-gray-500 text-xs mt-2"
                      }
                    >
                      Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </NavigationBarWrapper>
    </QueryClientProvider>
  );
}
