import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import {
  Stack,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// --- MAIN INTELLECTUAL LAYOUT ---
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ from?: string }>();
  const isChat = pathname === "/chat-intellectual";
  const isChatList = pathname === "/chat-list";

  // 1. Use a ref to track if we are in the chat without causing re-renders/re-subscriptions
  const isChatRef = useRef(isChat);
  useEffect(() => {
    isChatRef.current = isChat;
  }, [isChat]);

  // Notification & Global Unread Badging States
  const [userId, setUserId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notification, setNotification] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      // we've moved BACK to the previous tracked entry sync by popping
      stack.pop();
      return;
    }
    // forward navigation — track it
    stack.push(currentHref);
  }, [currentHref]);

  const handleBackPress = () => {
    try {
      const stack = historyRef.current;

      if (stack.length > 1) {
        stack.pop();
        const prevHref = stack[stack.length - 1];
        console.log("↩️ [Intellectual Back] Popping to", prevHref);
        router.replace(prevHref as any);
        return;
      }

      if (params.from === "notification") {
        console.log(
          "↩️ [Intellectual Back] Entry screen, returning to notification",
        );
        router.replace("/(main)/notification");
        return;
      }
      if (params.from === "home") {
        console.log("↩️ [Intellectual Back] Entry screen, returning to home");
        router.replace("/(main)");
        return;
      }
      console.log("↩️ [Intellectual Back] Fallback to home");
      router.replace("/(main)");
    } catch (e) {
      console.error("❌ [Intellectual Back] Error:", e);
      router.replace("/(main)");
    }
  };

  // 2. Fetch Current User ID & Initial Unread Message Count
  useEffect(() => {
    api
      .get("/profile")
      .then((res) => {
        const rawData = res.data?.data;
        const id = rawData?.id || res.data?.id || res.data?.user?.id;

        if (id) {
          console.log("✅ Layout User ID fetched for notifications:", id);
          setUserId(id);
          fetchUnreadCount();
        } else {
          console.log("⚠️ Could not find User ID in response:", res.data);
        }
      })
      .catch((err) =>
        console.error("❌ Failed to fetch user profile for notifications", err),
      );
  }, []);

  // Re-fetch counts when navigating back onto generic screens
  useEffect(() => {
    if (userId && !isChat && !isChatList) {
      fetchUnreadCount();
    }
  }, [pathname, userId]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/conversations");
      const data = res.data?.data || res.data || [];
      const total = data.reduce(
        (sum: number, item: any) => sum + (item.unread_count || 0),
        0,
      );
      setUnreadCount(total);
    } catch (err) {
      console.error("Failed to fetch initial unread count inside layout:", err);
    }
  };

  // 3. Subscribe to Real-time Notifications
  useEffect(() => {
    if (!userId || !echo) return;

    const channelName = `App.Models.User.${userId}`;
    const channel = echo.private(channelName);

    channel.subscribed(() => {
      console.log(
        `✅ Subscribed to global notification channel: ${channelName}`,
      );
    });

    channel.notification((notificationData: any) => {
      console.log("🔔 New Notification Received:", notificationData);

      if (notificationData.conversation_type !== "intellectual") {
        console.log(
          "🔕 Ignoring notification, not an intellectual-property message.",
        );
        return;
      }

      setUnreadCount((prev) => prev + 1);

      if (isChatRef.current) {
        console.log("🔕 User is currently in the chat screen, ignoring toast.");
        return;
      }

      setNotification(notificationData);

      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
      }).start();

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        closeNotification();
      }, 5000);
    });

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (echo) {
        echo.leave(channelName);
        console.log(`👋 Left notification channel: ${channelName}`);
      }
    };
  }, [userId]);

  const closeNotification = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  };

  const handleNotificationPress = async () => {
    if (!notification?.conversation_id) return;

    const convoId = notification.conversation_id;
    closeNotification();

    try {
      await api.post(`/conversations/${convoId}/read`);
    } catch (err) {
      console.error("❌ Failed to mark conversation as read:", err);
    }

    fetchUnreadCount();

    router.push({
      pathname: "/(intellectual-chat)/",
      params: {
        conversationId: convoId,
        title: "Chat Support",
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
                      New Message
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

            {/* --- GLOBAL HEADER --- */}
            {!isChat && (
              <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4 z-10">
                <View className="flex-row justify-between items-center w-full px-6">
                  {/* Left Side: Back Arrow */}
                  <View className="w-10">
                    <TouchableOpacity onPress={handleBackPress}>
                      <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* Center Title Layout */}
                  <View className="flex-1">
                    <Text className="text-white text-center text-xl font-bold">
                      Intellectual Property Assistance
                    </Text>
                  </View>

                  {/* Right Side: Message Icon with Unread Red Dot Count */}
                  {!isChatList ? (
                    <View className="w-10 items-end">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push("/chat-list")}
                        className="relative p-1"
                      >
                        <Ionicons
                          name="chatbubbles-outline"
                          size={26}
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
                    <View className="w-10" />
                  )}
                </View>
              </View>
            )}

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
              </Stack>
            </View>
          </KeyboardAvoidingView>
        </View>
      </NavigationBarWrapper>
    </QueryClientProvider>
  );
}
