import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { Entypo, Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as NavigationBar from "expo-navigation-bar";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getSupportConversation,
  markConversationAsRead,
} from "@/services/chatService";
import echo from "@/services/echo";
import { getNotifications } from "@/services/notificationService";

import Camera from "../../assets/images/icon/camera.png";
import History from "../../assets/images/icon/History.png";
import Home from "../../assets/images/icon/Home.png";
import Notification from "../../assets/images/icon/notification.png";
import logo from "../../assets/images/logo.png";

import "../../global.css";

const queryClient = new QueryClient();

export default function MainLayout() {
  const { token, isLoading, user } = useAuthStore();
  const { comingSoonVisible, setComingSoonVisible } = useUIStore();

  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // ===== SUPPORT CHAT: unread badge + realtime toast =====
  const [supportConversationId, setSupportConversationId] = useState<
    number | null
  >(null);

  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [supportNotification, setSupportNotification] = useState<any>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const supportSlideAnim = useRef(new Animated.Value(-100)).current;

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== Route matches =====

  const isMainIndex =
    pathname === "/" || pathname === "/(main)" || pathname === "/(main)/";

  const isProfileIndex =
    pathname === "/profile" || pathname === "/(main)/profile";

  const isProfileCongrats = pathname === "/profile/congratulations";
  const isProfileEdit = pathname === "/profile/editProfile";
  const isProfileSetup = pathname === "/profile/setupProfile";
  const isMembership = pathname === "/profile/membership";
  const isMembershipFee = pathname === "/profile/membership-breakdown";
  const isMembershipPay = pathname === "/profile/membership-checkout";
  const isMembershipQr = pathname === "/profile/membership-qrph";
  const isChangePassword = pathname === "/profile/changePassword";
  const isLoadWallet = pathname === "/load";
  const isInfo = pathname === "/info";
  const isPaymentSuccess = pathname === "/profile/payment-success";
  const isNotification = pathname === "/notification";
  const isBiometric = pathname === "/profile/biometricSettings";

  const isHistory = pathname === "/history";
  const isCameraQr = pathname === "/camera";

  const isWelcomePage =
    pathname === "/welcomePage" || pathname === "/(main)/welcomePage";

  const isChatSupportScreen = pathname.includes("chat-support");

  const showFooter =
    isMainIndex || isProfileIndex || isHistory || isNotification;

  // ============================================================
  // FORCE ANDROID NAVIGATION BAR TO STAY VISIBLE
  // ============================================================
  //
  // Do NOT use setBackgroundColorAsync here.
  // The native configuration in app.json handles the white
  // navigation-bar background.
  //
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

  // ============================================================
  // SUPPORT CHAT
  // ============================================================

  const handleComingSoon = () => {
    setComingSoonVisible(true);
  };

  // ===== Load initial support conversation state =====
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadSupportChatState = async () => {
      try {
        const res = await getSupportConversation();

        if (isMounted && res.exists && res.conversation) {
          setSupportConversationId(res.conversation.id);
          setSupportUnreadCount(res.unread_count || 0);
        }
      } catch (err) {
        console.error("Failed to load support chat state:", err);
      }
    };

    loadSupportChatState();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // ===== Sync support chat state on route changes =====
  useEffect(() => {
    if (!user?.id || isChatSupportScreen) return;

    let isMounted = true;

    getSupportConversation()
      .then((res) => {
        if (isMounted && res.exists) {
          setSupportConversationId(res.conversation?.id || null);
          setSupportUnreadCount(res.unread_count || 0);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname, user?.id, isChatSupportScreen]);

  // ===== Realtime Broadcast Subscription =====
  useEffect(() => {
    if (!user?.id || !echo) return;

    const channelName = `App.Models.User.${user.id}`;
    const channel = echo.private(channelName);

    channel.notification((notificationData: any) => {
      if (notificationData.conversation_type !== "support") return;

      if (!isChatSupportScreen) {
        setSupportUnreadCount((prev) => prev + 1);
        setSupportNotification(notificationData);

        Animated.spring(supportSlideAnim, {
          toValue: 50,
          useNativeDriver: true,
        }).start();

        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }

        dismissTimerRef.current = setTimeout(() => {
          closeSupportNotification();
        }, 5000);
      }
    });

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      if (echo) {
        echo.leave(channelName);
      }
    };
  }, [user?.id, isChatSupportScreen]);

  // ===== Notification count fetch =====
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadNotificationCount = async () => {
      try {
        const { unreadCount } = await getNotifications();

        if (isMounted) {
          setNotificationUnreadCount(unreadCount);
        }
      } catch (error) {
        console.error("Failed to load notification count:", error);
      }
    };

    loadNotificationCount();

    return () => {
      isMounted = false;
    };
  }, [user?.id, pathname]);

  // ===== Close support notification =====
  const closeSupportNotification = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    Animated.timing(supportSlideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSupportNotification(null));
  };

  // ===== Support notification press =====
  const handleSupportNotificationPress = async () => {
    const convoId =
      supportNotification?.conversation_id || supportConversationId;

    closeSupportNotification();

    try {
      await markConversationAsRead(convoId || undefined);
    } catch (err) {
      console.error("Failed to mark support conversation as read:", err);
    }

    setSupportUnreadCount(0);

    router.push({
      pathname: "/(chat-support)/" as any,
      params: { from: pathname },
    });
  };

  const handleHeaderSupportPress = async () => {
    try {
      await markConversationAsRead(supportConversationId || undefined);
    } catch (err) {
      console.error("Failed to mark support conversation as read:", err);
    }

    setSupportUnreadCount(0);
    router.push({
      pathname: "/(chat-support)/" as any,
      params: { from: pathname },
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  // ============================================================
  // AUTH
  // ============================================================

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Keep status bar dark because the app uses a light background */}
      <StatusBar hidden={true} />

      {/* ============================================================
          COMING SOON MODAL
          ============================================================ */}
      <Modal
        visible={comingSoonVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setComingSoonVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "80%",
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
            }}
          >
            <Text className="text-xl font-bold text-center mb-3 text-primary">
              Coming Soon
            </Text>

            <View className="mb-6 px-2">
              <Text className="text-slate-500 text-center leading-6">
                This feature is not available yet. Please wait for future
                updates.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setComingSoonVisible(false)}
              className="bg-primary w-full py-4 rounded-2xl active:opacity-90"
            >
              <Text className="text-white text-center font-bold text-lg">
                Okay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          SUPPORT CHAT NOTIFICATION TOAST
          ============================================================ */}
      {supportNotification && (
        <Animated.View
          style={{
            transform: [{ translateY: supportSlideAnim }],
            position: "absolute",
            top: 0,
            left: 16,
            right: 16,
            zIndex: 999,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSupportNotificationPress}
            className="bg-white rounded-2xl p-4 flex-row items-center border border-slate-100"
            style={{
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View className="bg-[#0084FF]/10 w-10 h-10 rounded-full items-center justify-center mr-3">
              <Ionicons name="chatbubble-ellipses" size={20} color="#034194" />
            </View>

            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-sm">
                Support Reply
              </Text>

              <Text numberOfLines={1} className="text-slate-500 text-xs mt-0.5">
                {supportNotification.body || "You received a new message."}
              </Text>
            </View>

            <TouchableOpacity
              onPress={closeSupportNotification}
              className="p-2"
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ============================================================
          MAIN APPLICATION
          ============================================================ */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* ============================================================
              GLOBAL HEADER
              ============================================================ */}

          {isWelcomePage ? null : isMainIndex ? (
            <View className="bg-primary mb-12 z-10 w-full h-28 items-center justify-between pt-8">
              {/* Information Icon */}
              <View
                style={{ elevation: 8 }}
                className="absolute start-0 bottom-[-34px] pe-2 py-2 ps-7 bg-white rounded-r-full"
              >
                <TouchableOpacity
                  // onPress={handleComingSoon}
                  onPress={() => router.push("/info" as any)}
                >
                  <View className="bg-white rounded-full border border-primary/20 p-2">
                    <Ionicons
                      name="information-circle"
                      size={35}
                      color="#034194"
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Logo */}
              <View
                style={{ elevation: 6 }}
                className="absolute bottom-[-43px] bg-white rounded-full"
              >
                <Image
                  source={logo}
                  style={{
                    width: 96,
                    height: 96,
                  }}
                  resizeMode="contain"
                />
              </View>

              {/* Chat Support Action Icon */}
              <View
                style={{ elevation: 8 }}
                className="absolute end-0 bottom-[-34px] ps-2 py-2 pe-7 bg-white rounded-l-full"
              >
                <TouchableOpacity
                  onPress={handleHeaderSupportPress}
                  // onPress={handleComingSoon}
                  className="relative"
                  activeOpacity={0.7}
                >
                  <View className="bg-white rounded-full border border-primary/20 p-2">
                    <Entypo name="message" size={35} color="#034194" />
                  </View>

                  {/* Unread badge */}
                  {supportUnreadCount > 0 && (
                    <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white">
                      <Text className="text-white text-[10px] font-extrabold text-center">
                        {supportUnreadCount > 9 ? "9+" : supportUnreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : isCameraQr || isInfo || isPaymentSuccess ? null : (
            <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4">
              <View className="flex-row justify-between items-center w-full px-6">
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{
                    width: 31,
                  }}
                >
                  <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>

                <Text className="text-white text-2xl font-bold">
                  {isProfileIndex || isProfileCongrats
                    ? "Profile"
                    : isProfileEdit
                      ? "Edit Profile"
                      : isProfileSetup
                        ? "Setup Profile"
                        : isMembership
                          ? "Membership"
                          : isMembershipFee
                            ? "Membership Fee"
                            : isMembershipPay
                              ? "Checkout"
                              : isMembershipQr
                                ? "Payment QR"
                                : isHistory
                                  ? "Transaction History"
                                  : isChangePassword
                                    ? "Security & Password"
                                    : isNotification
                                      ? "Notification"
                                      : isLoadWallet
                                        ? "Load Wallet"
                                        : isBiometric
                                          ? "Quick & Secure Login"
                                          : ""}
                </Text>

                <View style={{ width: 31 }} />
              </View>
            </View>
          )}

          {/* ============================================================
              MAIN CONTENT STACK
              ============================================================ */}
          <View
            style={{
              flex: 1,
              paddingBottom: showFooter ? 0 : insets.bottom,
              backgroundColor: "#ffffff",
            }}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />

              <Stack.Screen
                name="profile/index"
                options={{ animation: "fade" }}
              />

              <Stack.Screen
                name="history/index"
                options={{ animation: "fade" }}
              />

              <Stack.Screen
                name="notification/index"
                options={{ animation: "fade" }}
              />
            </Stack>
          </View>

          {/* ============================================================
              FOOTER
              ============================================================ */}
          {showFooter && (
            <View
              style={{
                borderTopWidth: 5,
                borderTopColor: "#D70127",
                width: "100%",
                paddingBottom: insets.bottom,
                zIndex: 99,
              }}
              className="justify-center items-center"
            >
              <View
                style={{
                  height: 80,
                }}
                className="flex-row w-full bg-primary max-w-[600px] px-4 items-center"
              >
                {/* Home */}
                <TouchableOpacity
                  className="items-center flex-1 mt-1"
                  onPress={() => router.push("/" as any)}
                >
                  <Image
                    source={Home}
                    style={{
                      width: 28,
                      height: 28,
                    }}
                  />

                  <Text className="text-white text-[10px] mt-1">Home</Text>
                </TouchableOpacity>

                {/* History */}
                <TouchableOpacity
                  className="items-center pe-2 flex-1 mt-1"
                  onPress={() => router.push("/history")}
                  // onPress={handleComingSoon}
                >
                  <Image
                    source={History}
                    style={{
                      width: 28,
                      height: 28,
                    }}
                  />

                  <Text className="text-white text-[10px] mt-1">
                    Transactions
                  </Text>
                </TouchableOpacity>

                {/* Camera */}
                <View
                  className="flex-1 items-center justify-center"
                  style={{
                    height: 50,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => router.push("/(transper)/scanqrcode")}
                    // onPress={handleComingSoon}
                    style={{
                      position: "absolute",
                      top: -43,
                      width: 85,
                      height: 85,
                      borderRadius: 45,
                      backgroundColor: "white",
                      borderWidth: 3,
                      borderColor: "#C6890F",
                      alignItems: "center",
                      justifyContent: "center",
                      elevation: 10,
                    }}
                  >
                    <Image
                      source={Camera}
                      style={{
                        width: 50,
                        height: 50,
                      }}
                    />
                  </TouchableOpacity>
                </View>

                {/* Notification */}
                <TouchableOpacity
                  className="items-center ps-2 mt-1 flex-1"
                  onPress={() => router.push("/notification" as any)}
                  activeOpacity={0.7}
                >
                  <View className="relative">
                    <Image
                      source={Notification}
                      style={{
                        width: 28,
                        height: 28,
                      }}
                    />

                    {notificationUnreadCount > 0 && (
                      <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white">
                        <Text className="text-white text-[9px] font-extrabold text-center">
                          {notificationUnreadCount > 9
                            ? "9+"
                            : notificationUnreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-white text-[10px] mt-1">
                    Notification
                  </Text>
                </TouchableOpacity>

                {/* Profile */}
                <TouchableOpacity
                  className="items-center flex-1"
                  onPress={() => router.push("/profile" as any)}
                >
                  <View
                    style={{
                      width: 31,
                      height: 31,
                    }}
                  >
                    {user?.avatar ? (
                      <Image
                        source={{
                          uri: user.avatar,
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 999,
                        }}
                      />
                    ) : (
                      <Ionicons name="person-circle" size={33} color="white" />
                    )}
                  </View>

                  <Text className="text-white text-[10px] mt-1">Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </QueryClientProvider>
  );
}
